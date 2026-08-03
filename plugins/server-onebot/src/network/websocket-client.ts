import {
  ClientState,
  OneBotActionDispatcher,
  OneBotActionRequest,
  OneBotActionResponse,
  OneBotRequestContext,
} from '../types'
import { logInfo, loggerError, loggerInfo } from '../index'
import { Context } from 'koishi'
import { WebSocket } from 'ws'

type ClientConfig = {
  url: string
  name?: string
  token?: string
  reconnectInterval: number
  maxReconnectAttempts?: number
  selfId: string
  selfname?: string
  groupname?: string
  appName?: string
}

type CachedResponse = {
  timestamp: number
  response: OneBotActionResponse
}

export class WebSocketClient {
  private socket: WebSocket | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private cleanupTimer?: NodeJS.Timeout
  private isConnecting = false
  private isStopped = false
  private reconnectAttempts = 0
  private recentRequests = new Map<string, CachedResponse>()

  constructor(
    private ctx: Context,
    private dispatcher: OneBotActionDispatcher,
    private config: ClientConfig,
  ) {
    this.cleanupTimer = setInterval(() => this.cleanupRecentRequests(), 10000)
  }

  start() {
    this.isStopped = false
    this.reconnectAttempts = 0
    void this.connect()
  }

  stop() {
    logInfo('Stopping WebSocket client for: %s', this.getDisplayName())
    this.isStopped = true

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.close(1000, 'Server shutting down')
      this.socket = null
    }
    this.isConnecting = false
  }

  private async connect() {
    if (this.isStopped || this.isConnecting || this.socket?.readyState === WebSocket.OPEN) return

    this.isConnecting = true
    logInfo('Connecting to reverse WebSocket: %s', this.getDisplayName())

    try {
      const headers: Record<string, string> = {
        'x-client-role': 'Universal',
        'x-self-id': this.config.selfId,
        'user-agent': 'Koishi-OneBot-Server',
      }
      if (this.config.token?.trim()) {
        headers.Authorization = `Bearer ${this.config.token}`
      }

      this.socket = new WebSocket(this.config.url, { headers })
      this.socket.addEventListener('open', () => {
        this.isConnecting = false
        this.reconnectAttempts = 0
        loggerInfo('Reverse WebSocket connected successfully to: %s', this.getDisplayName())
        this.sendLifecycleEvent('connect')
      })
      this.socket.addEventListener('message', async (event) => {
        await this.handleMessage(event.data.toString())
      })
      this.socket.addEventListener('close', (event) => {
        this.isConnecting = false
        this.socket = null
        loggerInfo(
          'Reverse WebSocket disconnected from: %s (code: %d, reason: %s)',
          this.getDisplayName(), event.code, event.reason || 'none',
        )
        this.scheduleReconnect()
      })
      this.socket.addEventListener('error', (error) => {
        this.isConnecting = false
        loggerError('Reverse WebSocket connection error for %s: %o', this.getDisplayName(), error)
      })
    } catch (error) {
      this.isConnecting = false
      loggerError('Failed to connect reverse WebSocket to %s: %s', this.getDisplayName(), this.getErrorMessage(error))
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (this.isStopped || this.reconnectTimer) return

    const maxAttempts = this.config.maxReconnectAttempts || 5
    if (this.reconnectAttempts >= maxAttempts) {
      loggerError('Max reconnection attempts (%d) reached for %s, giving up', maxAttempts, this.getDisplayName())
      return
    }

    this.reconnectAttempts++
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      void this.connect()
    }, this.config.reconnectInterval)
    logInfo(
      'Will reconnect to %s in %d ms (attempt %d/%d)',
      this.getDisplayName(), this.config.reconnectInterval, this.reconnectAttempts, maxAttempts,
    )
  }

  private async handleMessage(data: string) {
    let request: OneBotActionRequest
    try {
      request = JSON.parse(data)
    } catch {
      logInfo('Invalid JSON message received from %s: %s', this.getDisplayName(), data)
      return
    }

    if (request && typeof request === 'object' && !request.action && (request as any).post_type) {
      logInfo('Received OneBot event from %s', this.getDisplayName())
      return
    }

    if (!request?.action) {
      return this.send({
        status: 'failed',
        retcode: 1400,
        message: 'Missing action field',
        echo: request?.echo,
      })
    }

    const client: ClientState = {
      authorized: true,
      selfId: this.config.selfId,
    }
    if (request?.action?.includes('send_') && request.params?.message_id) {
      client.lastMessageId = String(request.params.message_id)
    }

    const requestKey = this.getRequestKey(request)
    const cached = this.recentRequests.get(requestKey)
    if (cached && Date.now() - cached.timestamp < 5000) {
      return this.send(cached.response)
    }

    const context: OneBotRequestContext = {
      request,
      client,
      endpoint: {
        id: `reverse:${this.config.name ?? this.config.url}`,
        direction: 'reverse',
        transport: 'websocket',
        selfId: this.config.selfId,
        appName: this.config.appName,
      },
    }
    const response = await this.dispatch(request, context)
    this.recentRequests.set(requestKey, { timestamp: Date.now(), response })
    this.send(response)
  }

  private async dispatch(
    request: OneBotActionRequest,
    context: OneBotRequestContext,
  ): Promise<OneBotActionResponse> {
    try {
      return await this.dispatcher.dispatch(request, context)
    } catch (error) {
      const message = this.getErrorMessage(error)
      loggerError('[onebot:reverse-dispatch-error] %s', message)
      return {
        status: 'failed',
        retcode: 1400,
        message,
        echo: request?.echo,
      }
    }
  }

  send(event: any) {
    if (this.socket?.readyState !== WebSocket.OPEN) return false
    try {
      this.socket.send(JSON.stringify(event))
      return true
    } catch (error) {
      loggerError('Failed to send event to reverse WebSocket: %s', this.getErrorMessage(error))
      return false
    }
  }

  isConnected() {
    return this.socket?.readyState === WebSocket.OPEN
  }

  getConnectionInfo() {
    const maxAttempts = this.config.maxReconnectAttempts || 5
    return {
      url: this.config.url,
      name: this.config.name,
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: maxAttempts,
      canReconnect: this.reconnectAttempts < maxAttempts && !this.isStopped,
      isStopped: this.isStopped,
    }
  }

  resetReconnectState() {
    this.reconnectAttempts = 0
    this.isStopped = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    void this.connect()
  }

  private sendLifecycleEvent(subType: 'connect' | 'enable' | 'disable') {
    this.send({
      time: Math.floor(Date.now() / 1000),
      self_id: Number(this.config.selfId) || this.config.selfId,
      post_type: 'meta_event',
      meta_event_type: 'lifecycle',
      sub_type: subType,
    })
  }

  private getRequestKey(request: OneBotActionRequest) {
    return `${this.config.url}:${request?.action ?? ''}:${JSON.stringify(request?.params ?? {})}:${request?.echo ?? 'no-echo'}`
  }

  private cleanupRecentRequests() {
    const now = Date.now()
    for (const [key, cached] of this.recentRequests) {
      if (now - cached.timestamp > 5000) this.recentRequests.delete(key)
    }
  }

  private getDisplayName() {
    return this.config.name ? `${this.config.name} (${this.config.url})` : this.config.url
  }

  private getErrorMessage(error: any) {
    return error instanceof Error ? error.message : String(error)
  }
}
