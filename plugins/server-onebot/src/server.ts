import {
  ActionHandler,
  ActionMiddleware,
  ClientState,
  OneBotActionDispatcher,
  OneBotActionRequest,
  OneBotActionResponse,
  OneBotRequestContext,
  RegisterActionOptions,
} from './types'
import { sessionToOneBotEvent, createHeartbeatEvent, createLifecycleEvent, storeRecentSession } from './utils'
import { logInfo, loggerError } from './index'
import { WebSocketServer } from './network/websocket-server'
import { WebSocketClient } from './network/websocket-client'
import { Context, Service, Session } from 'koishi'
import { Config } from './index'
import { ActionRouter } from './action'

export class OneBotService extends Service implements OneBotActionDispatcher {
  private wsServer?: WebSocketServer
  private wsClients: WebSocketClient[] = []
  private heartbeatTimer?: NodeJS.Timeout
  private isStarted = false
  private isDisposed = false
  private router: ActionRouter

  constructor(ctx: Context, private serverConfig: Config) {
    super(ctx, 'onebot')
    this.router = new ActionRouter(ctx, {
      selfId: serverConfig.selfId,
      selfname: serverConfig.selfname,
      groupname: serverConfig.groupname,
      appName: serverConfig.appName,
    })
  }

  async start() {
    if (this.isStarted || this.isDisposed) return
    this.isStarted = true
    logInfo('Starting OneBot server with config: %o', this.serverConfig)

    if (this.serverConfig.enabledWs) {
      this.wsServer = new WebSocketServer(this.ctx, this, {
        path: this.serverConfig.path || '/onebotserver',
        token: this.serverConfig.token,
        selfId: this.serverConfig.selfId,
        selfname: this.serverConfig.selfname,
        groupname: this.serverConfig.groupname,
        appName: this.serverConfig.appName,
      })
      logInfo('WebSocket server started at: %s', this.serverConfig.path || '/onebotserver')
    }

    if (this.serverConfig.enabledWsReverse) {
      const connections = this.serverConfig.connections?.filter(connection => connection.enabled && connection.url) || []
      for (const connection of connections) {
        const wsClient = new WebSocketClient(this.ctx, this, {
          url: connection.url,
          name: connection.name,
          token: connection.token,
          reconnectInterval: this.serverConfig.reconnectInterval || 3000,
          maxReconnectAttempts: this.serverConfig.maxReconnectAttempts || 5,
          selfId: this.serverConfig.selfId,
          selfname: this.serverConfig.selfname,
          groupname: this.serverConfig.groupname,
          appName: this.serverConfig.appName,
        })
        this.wsClients.push(wsClient)
        wsClient.start()
        logInfo(
          'Reverse WebSocket client connecting to: %s',
          connection.name ? `${connection.name} (${connection.url})` : connection.url,
        )
      }
      logInfo('Started %d reverse WebSocket clients', connections.length)
    }

    this.setupEventListeners()
    if (this.serverConfig.heartbeat?.enabled !== false) this.startHeartbeat()
    this.sendLifecycleEvent('connect')
    logInfo('OneBot server ready to accept connections')
  }

  async stop() {
    if (this.isDisposed) return

    try {
      this.sendLifecycleEvent('disable')
    } catch (error) {
      loggerError('Error sending lifecycle disable event:', error)
    }
    this.isDisposed = true

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
    if (this.wsServer) {
      this.wsServer.close()
      this.wsServer = undefined
    }
    for (const wsClient of this.wsClients) wsClient.stop()
    this.wsClients = []
    this.isStarted = false
  }

  dispatch(request: OneBotActionRequest, context: OneBotRequestContext): Promise<OneBotActionResponse> {
    return this.router.dispatch(request, context)
  }

  invoke(action: string, params: Record<string, any> = {}, context: Partial<OneBotRequestContext> = {}) {
    return this.router.invoke(action, params, context)
  }

  registerAction(action: string, handler: ActionHandler, options?: RegisterActionOptions) {
    return this.router.registerAction(action, handler, options)
  }

  useAction(action: string | '*', middleware: ActionMiddleware) {
    return this.router.useAction(action, middleware)
  }

  register(action: string, handler: ActionHandler, options?: RegisterActionOptions) {
    return this.registerAction(action, handler, options)
  }

  use(action: string | '*', middleware: ActionMiddleware) {
    return this.useAction(action, middleware)
  }

  getActions() {
    return this.router.getActions()
  }

  private setupEventListeners() {
    this.ctx.middleware(async (session, next) => {
      void this.handleSessionEvent(session)
      return next()
    })

    const eventTypes = [
      'friend-request',
      'guild-member-request',
      'message-deleted',
      'guild-member-added',
      'guild-member-deleted',
    ]
    for (const eventType of eventTypes) {
      this.ctx.on(eventType as keyof import('koishi').Events, (session: Session) => {
        void this.handleSessionEvent(session)
      })
    }

    this.ctx.on('bot-status-updated', (bot) => this.handleBotStatusChange(bot))
  }

  private async handleSessionEvent(session: Session) {
    storeRecentSession(session)
    const event = await sessionToOneBotEvent(session, this.ctx, this.serverConfig.selfId)
    if (!event) {
      logInfo('Session event could not be converted to OneBot event: %s', session.type)
      return
    }
    this.broadcastEvent(event)
  }

  private handleBotStatusChange(bot: any) {
    if (bot.platform === 'onebot') return
    this.broadcastEvent(createLifecycleEvent(bot.selfId, bot.platform, 'connect'))
  }

  private broadcastEvent(event: any) {
    if (this.isDisposed) return
    let totalSent = 0

    if (this.wsServer && this.serverConfig.enabledWs) {
      totalSent += this.wsServer.broadcast(event)
    }
    if (this.serverConfig.enabledWsReverse) {
      for (const wsClient of this.wsClients) {
        if (wsClient.isConnected() && wsClient.send(event)) totalSent++
      }
    }

    if (totalSent === 0 && (this.serverConfig.enabledWs || this.serverConfig.enabledWsReverse)) {
      logInfo('No OneBot WebSocket clients connected, event will not be sent')
    }
  }

  private startHeartbeat() {
    const interval = this.serverConfig.heartbeat?.interval || 5000
    this.heartbeatTimer = setInterval(() => {
      if (!this.isDisposed) {
        this.broadcastEvent(createHeartbeatEvent(this.serverConfig.selfId, 'koishi', interval))
      }
    }, interval)
  }

  private sendLifecycleEvent(subType: 'enable' | 'disable' | 'connect') {
    this.broadcastEvent(createLifecycleEvent(this.serverConfig.selfId, 'koishi', subType))
  }

  getStatus() {
    const connectedClients = this.wsClients.filter(client => client.isConnected()).length
    return {
      actions: this.getActions(),
      wsServer: {
        enabled: !!this.wsServer,
        clientCount: this.wsServer?.getClientCount() || 0,
      },
      wsClients: {
        enabled: this.wsClients.length > 0,
        total: this.wsClients.length,
        connected: connectedClients,
        details: this.wsClients.map(client => client.getConnectionInfo()),
      },
      heartbeat: {
        enabled: !!this.heartbeatTimer,
        interval: this.serverConfig.heartbeat?.interval || 5000,
      },
    }
  }
}

export { OneBotService as OneBotServer }
