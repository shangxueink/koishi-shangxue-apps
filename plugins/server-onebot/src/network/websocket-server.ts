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

const kClient = Symbol('client')

type ServerConfig = {
  path: string
  token?: string
  selfId?: string
  selfname?: string
  groupname?: string
  appName?: string
}

type CachedResponse = {
  timestamp: number
  response: OneBotActionResponse
}

export class WebSocketServer {
  private route: any
  private cleanupTimer?: NodeJS.Timeout
  private recentRequests = new Map<string, CachedResponse>()

  constructor(
    private ctx: Context,
    private dispatcher: OneBotActionDispatcher,
    private config: ServerConfig,
  ) {
    this.setupWebSocketServer()
    this.cleanupTimer = setInterval(() => this.cleanupRecentRequests(), 10000)
  }

  private setupWebSocketServer() {
    this.route = this.ctx.server.ws(this.config.path, async (socket, { headers }) => {
      const client: ClientState = {
        authorized: false,
        lastHeartbeat: Date.now(),
      }
      socket[kClient] = client

      const clientRole = headers['x-client-role']?.toString()
      if (clientRole && clientRole !== 'Universal') {
        return socket.close(1008, 'invalid x-client-role')
      }

      const selfId = headers['x-self-id']?.toString() || this.config.selfId || '114514'
      if (!this.checkAuth(headers)) {
        logInfo('OneBot WebSocket client authentication failed')
        return socket.close(1008, 'invalid token')
      }

      client.authorized = true
      client.selfId = selfId
      const clientInfo = this.getClientInfo(socket)
      loggerInfo('OneBot WebSocket client connected: %s (selfId: %s)', clientInfo, selfId)

      socket.addEventListener('message', async (event) => {
        await this.handleMessage(socket, client, event.data.toString(), selfId)
      })

      socket.addEventListener('close', () => {
        loggerInfo('OneBot WebSocket client disconnected: %s', clientInfo)
      })

      socket.addEventListener('error', (error) => {
        loggerError('OneBot WebSocket error:', error)
      })
    })
  }

  private checkAuth(headers: Record<string, any>): boolean {
    if (!this.config.token || this.config.token.trim() === '') return true
    const auth = headers.authorization || headers.Authorization
    return auth === `Bearer ${this.config.token}`
  }

  private async handleMessage(
    socket: WebSocket,
    client: ClientState,
    data: string,
    selfId: string,
  ) {
    let request: OneBotActionRequest
    try {
      request = JSON.parse(data)
    } catch {
      logInfo('Invalid JSON message received: %s', data)
      return socket.close(4000, 'invalid message')
    }

    if (request && typeof request === 'object' && !request.action && (request as any).post_type) {
      logInfo('Received OneBot event from forward WebSocket client')
      return
    }

    const requestKey = this.getRequestKey(request, client)
    const cached = this.recentRequests.get(requestKey)
    if (cached && Date.now() - cached.timestamp < 5000) {
      return this.sendResponse(socket, cached.response)
    }

    const context = this.createContext(request, client, selfId)
    const response = await this.dispatch(request, context)
    this.recentRequests.set(requestKey, { timestamp: Date.now(), response })
    this.sendResponse(socket, response)
  }

  private async dispatch(
    request: OneBotActionRequest,
    context: OneBotRequestContext,
  ): Promise<OneBotActionResponse> {
    try {
      return await this.dispatcher.dispatch(request, context)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      loggerError('[onebot:websocket-dispatch-error] %s', message)
      return {
        status: 'failed',
        retcode: 1400,
        message,
        echo: request?.echo,
      }
    }
  }

  private createContext(
    request: OneBotActionRequest,
    client: ClientState,
    selfId: string,
  ): OneBotRequestContext {
    if (request?.action?.includes('send_') && request.params?.message_id) {
      client.lastMessageId = String(request.params.message_id)
    }

    return {
      request,
      client,
      endpoint: {
        id: `forward:${selfId}`,
        direction: 'forward',
        transport: 'websocket',
        selfId,
        appName: this.config.appName,
      },
    }
  }

  private sendResponse(socket: WebSocket, response: OneBotActionResponse) {
    if (socket.readyState !== WebSocket.OPEN) return
    try {
      socket.send(JSON.stringify(response))
    } catch (error) {
      loggerError('Failed to send OneBot response:', error)
    }
  }

  private getRequestKey(request: OneBotActionRequest, client: ClientState) {
    return `${client.selfId ?? 'unknown'}:${request?.action ?? ''}:${JSON.stringify(request?.params ?? {})}:${request?.echo ?? 'no-echo'}`
  }

  private cleanupRecentRequests() {
    const now = Date.now()
    for (const [key, cached] of this.recentRequests) {
      if (now - cached.timestamp > 5000) this.recentRequests.delete(key)
    }
  }

  private getClientInfo(socket: WebSocket) {
    const address = 'remoteAddress' in socket ? socket.remoteAddress : 'unknown'
    const port = 'remotePort' in socket ? socket.remotePort : 'unknown'
    return `${address}:${port}`
  }

  broadcast(event: any): number {
    if (!this.route) return 0
    let sentCount = 0
    for (const socket of this.route.clients) {
      const client = socket[kClient] as ClientState
      if (!client?.authorized || socket.readyState !== WebSocket.OPEN) continue
      try {
        socket.send(JSON.stringify(event))
        sentCount++
      } catch (error) {
        loggerError('Failed to broadcast OneBot event:', error)
      }
    }
    return sentCount
  }

  getClientCount() {
    return this.route?.clients.size || 0
  }

  close() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
    if (!this.route) return
    for (const socket of this.route.clients) {
      try {
        socket.close(1000, 'Server shutting down')
      } catch (error) {
        loggerError('Error closing WebSocket connection:', error)
      }
    }
    this.route = undefined
    this.recentRequests.clear()
  }
}
