
import { sessionToOneBotEvent, createHeartbeatEvent, createLifecycleEvent } from './utils'
import { logInfo, loggerError, loggerInfo } from './index'
import { Context, Logger, Session } from 'koishi'
import { WebSocketServer } from './network/websocket-server'
import { WebSocketClient } from './network/websocket-client'
import { BotFinder } from './bot-finder'
import { Config } from './index'

export class OneBotServer {
    private wsServer?: WebSocketServer
    private wsClients: WebSocketClient[] = []
    private heartbeatTimer?: NodeJS.Timeout
    private pendingMessages: Map<string, NodeJS.Timeout> = new Map()
    private botFinder: BotFinder
    private isDisposed = false

    constructor(
        private ctx: Context,
        private config: Config
    ) {
        this.botFinder = new BotFinder(ctx)
    }

    async start() {
        if (this.isDisposed) {
            logInfo('OneBot server is disposed, cannot start')
            return
        }

        logInfo('Starting OneBot server with config: %o', this.config)

        // 根据协议类型启动相应的服务
        if (this.config.protocol === 'ws') {
            // 启动正向 WebSocket 服务器
            this.wsServer = new WebSocketServer(this.ctx, {
                path: this.config.path || '/onebotserver',
                token: this.config.token,
                selfId: this.config.selfId,
            })
            logInfo('WebSocket server started at: %s', this.config.path || '/onebotserver')
        } else if (this.config.protocol === 'ws-reverse') {
            // 启动反向 WebSocket 客户端
            const connections = this.config.reverseConnections?.filter(conn => conn.enabled && conn.url) || []
            if (connections.length > 0) {
                for (const connection of connections) {
                    const wsClient = new WebSocketClient(this.ctx, {
                        url: connection.url,
                        name: connection.name,
                        token: this.config.token,
                        reconnectInterval: this.config.reconnectInterval || 3000,
                        maxReconnectAttempts: this.config.maxReconnectAttempts || 5,
                        selfId: this.config.selfId,
                    })
                    this.wsClients.push(wsClient)
                    wsClient.start()
                    const displayName = connection.name ? `${connection.name} (${connection.url})` : connection.url
                    logInfo('Reverse WebSocket client connecting to: %s', displayName)
                }
                logInfo('Started %d reverse WebSocket clients', connections.length)
            } else {
                logInfo('No enabled reverse WebSocket connections configured')
            }
        }

        // 设置事件监听
        this.setupEventListeners()

        // 启动心跳
        if (this.config.heartbeat?.enabled !== false) {
            this.startHeartbeat()
        }

        // 显示所有已实现的 API
        const availableActions = this.wsServer ?
            Array.from((this.wsServer as any).actionRouter.getActions()).sort() : []
        logInfo('OneBot server started successfully with %d implemented APIs: %o',
            availableActions.length, availableActions)

        logInfo('OneBot server ready to accept connections')

        // 发送 lifecycle connect 事件
        this.sendLifecycleEvent('connect')
    }

    async stop() {
        if (this.isDisposed) {
            logInfo('OneBot server already disposed')
            return
        }

        logInfo('Stopping OneBot server')
        this.isDisposed = true

        // 发送 lifecycle disable 事件
        try {
            this.sendLifecycleEvent('disable')
        } catch (error) {
            loggerError('Error sending lifecycle disable event:', error)
        }

        // 停止心跳
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer)
            this.heartbeatTimer = undefined
            logInfo('Heartbeat stopped')
        }

        // 关闭 WebSocket 服务器
        if (this.wsServer) {
            try {
                this.wsServer.close()
                this.wsServer = undefined
                logInfo('WebSocket server closed')
            } catch (error) {
                loggerError('Error closing WebSocket server:', error)
            }
        }

        // 关闭所有反向 WebSocket 客户端
        if (this.wsClients.length > 0) {
            logInfo('Stopping %d reverse WebSocket clients', this.wsClients.length)
            const stopPromises = this.wsClients.map(async (wsClient) => {
                try {
                    wsClient.stop()
                } catch (error) {
                    loggerError('Error stopping WebSocket client:', error)
                }
            })

            await Promise.allSettled(stopPromises)
            this.wsClients = []
            logInfo('All reverse WebSocket clients stopped')
        }

        // 清理待处理的消息
        for (const [key, timer] of this.pendingMessages) {
            clearTimeout(timer)
        }
        this.pendingMessages.clear()

        logInfo('OneBot server stopped completely')
    }

    private setupEventListeners() {
        logInfo('Setting up event listeners')

        // 监听消息事件
        this.ctx.on('message', (session: Session) => {
            this.handleSessionEvent(session)
        })

        // // 监听消息创建事件（adapter-onebot 会触发这个事件）
        // 在这里不处理，防止重复下发
        // this.ctx.on('message-created', (session: Session) => {
        //     this.handleSessionEvent(session)
        // })

        // 监听其他事件
        const eventTypes = [
            'friend-request',
            'guild-member-request',
            'message-deleted',
            'guild-member-added',
            'guild-member-deleted'
        ]

        for (const eventType of eventTypes) {
            this.ctx.on(eventType as any, (session: Session) => {
                this.handleSessionEvent(session)
            })
        }

        // 监听 bot 状态变化
        this.ctx.on('bot-status-updated', (bot) => {
            this.handleBotStatusChange(bot)
        })

        logInfo('Event listeners set up successfully')
    }

    private handleSessionEvent(session: Session) {
        // 不处理有【at别人的前缀】消息
        // if (session.stripped?.hasAt && !session.stripped?.atSelf) return

        const event = sessionToOneBotEvent(session, this.config.selfId)
        if (!event) {
            logInfo('Session event could not be converted to OneBot event: %s', session.type)
            return
        }

        logInfo('Broadcasting OneBot event: %o', event)
        this.broadcastEvent(event)
    }

    private handleBotStatusChange(bot: any) {
        // 过滤掉 onebot 平台的 bot 状态变化，避免循环
        if (bot.platform === 'onebot') {
            return
        }

        const event = createLifecycleEvent(bot.selfId, bot.platform, 'connect')
        this.broadcastEvent(event)
    }

    private broadcastEvent(event: any) {
        if (this.isDisposed) {
            return
        }

        if (this.config.protocol === 'ws') {
            // 正向 WebSocket 模式：发送到连接的客户端
            if (this.wsServer) {
                this.wsServer.broadcast(event)
            }
        } else if (this.config.protocol === 'ws-reverse') {
            // 反向 WebSocket 模式：发送到所有连接的服务端
            let sentCount = 0
            for (const wsClient of this.wsClients) {
                if (wsClient.isConnected()) {
                    try {
                        wsClient.send(event)
                        sentCount++
                    } catch (error) {
                        loggerError('Error sending event to WebSocket client:', error)
                    }
                }
            }
            if (sentCount === 0) {
                // logInfo('No reverse WebSocket clients connected, event will not be sent')
            } else {
                // logInfo('Event broadcasted to %d reverse WebSocket clients', sentCount)
            }
        }
    }

    private startHeartbeat() {
        const interval = this.config.heartbeat?.interval || 5000

        this.heartbeatTimer = setInterval(() => {
            if (this.isDisposed) {
                if (this.heartbeatTimer) {
                    clearInterval(this.heartbeatTimer)
                    this.heartbeatTimer = undefined
                }
                return
            }

            // 只为配置的 selfId 发送心跳事件
            const heartbeat = createHeartbeatEvent(this.config.selfId, 'koishi', interval)
            this.broadcastEvent(heartbeat)
        }, interval)

        logInfo('Heartbeat started with interval: %d ms', interval)
    }

    /**
     * 发送生命周期事件
     */
    private sendLifecycleEvent(subType: 'enable' | 'disable' | 'connect') {
        // 只为配置的 selfId 发送生命周期事件
        const event = createLifecycleEvent(this.config.selfId, 'koishi', subType)
        this.broadcastEvent(event)
    }

    /**
     * 获取服务器状态
     */
    getStatus() {
        const connectedClients = this.wsClients.filter(client => client.isConnected()).length
        const clientsInfo = this.wsClients.map(client => client.getConnectionInfo())

        return {
            wsServer: {
                enabled: !!this.wsServer,
                clientCount: this.wsServer?.getClientCount() || 0,
            },
            wsClients: {
                enabled: this.wsClients.length > 0,
                total: this.wsClients.length,
                connected: connectedClients,
                details: clientsInfo,
            },
            heartbeat: {
                enabled: !!this.heartbeatTimer,
                interval: this.config.heartbeat?.interval || 5000,
            },
        }
    }
}

