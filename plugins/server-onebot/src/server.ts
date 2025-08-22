
import { sessionToOneBotEvent, createHeartbeatEvent, createLifecycleEvent, storeRecentSession } from './utils'
import { logInfo, loggerError, loggerInfo } from './index'
import { WebSocketServer } from './network/websocket-server'
import { WebSocketClient } from './network/websocket-client'
import { Context, Logger, Session } from 'koishi'
import { Config } from './index'

export class OneBotServer {
    private wsServer?: WebSocketServer
    private wsClients: WebSocketClient[] = []
    private heartbeatTimer?: NodeJS.Timeout
    private pendingMessages: Map<string, NodeJS.Timeout> = new Map()
    private isDisposed = false

    constructor(
        private ctx: Context,
        private config: Config
    ) {
    }

    async start() {
        if (this.isDisposed) {
            logInfo('OneBot server is disposed, cannot start')
            return
        }

        logInfo('Starting OneBot server with config: %o', this.config)

        // 启动 WebSocket 服务器（如果启用）
        if (this.config.enabledWs) {
            this.wsServer = new WebSocketServer(this.ctx, {
                path: this.config.path || '/onebotserver',
                token: this.config.token,
                selfId: this.config.selfId,
                selfname: this.config.selfname,
            })
            logInfo('WebSocket server started at: %s', this.config.path || '/onebotserver')
        }

        // 启动反向 WebSocket 客户端（如果启用）
        if (this.config.enabledWsReverse) {
            const connections = this.config.connections?.filter(conn => conn.enabled && conn.url) || []
            if (connections.length > 0) {
                for (const connection of connections) {
                    const wsClient = new WebSocketClient(this.ctx, {
                        url: connection.url,
                        name: connection.name,
                        token: this.config.token,
                        reconnectInterval: this.config.reconnectInterval || 3000,
                        maxReconnectAttempts: this.config.maxReconnectAttempts || 5,
                        selfId: this.config.selfId,
                        selfname: this.config.selfname,
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

    private async handleSessionEvent(session: Session) {
        // 不处理有【at别人的前缀】消息
        // if (session.stripped?.hasAt && !session.stripped?.atSelf) return

        // 存储最近的 session，用于被动消息发送
        storeRecentSession(session)

        const event = await sessionToOneBotEvent(session, this.ctx, this.config.selfId)
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

        let totalSent = 0

        // 向 WebSocket 服务器的客户端广播（如果启用）
        if (this.wsServer && this.config.enabledWs) {
            const wsServerClientCount = this.wsServer.broadcast(event)
            totalSent += wsServerClientCount
        }

        // 向反向 WebSocket 客户端广播（如果启用）
        if (this.config.enabledWsReverse && this.wsClients.length > 0) {
            let reverseSentCount = 0
            let hasActiveClients = false
            
            for (const wsClient of this.wsClients) {
                const connectionInfo = wsClient.getConnectionInfo()
                
                // 检查客户端是否仍然活跃（未放弃重连）
                if (connectionInfo.canReconnect || connectionInfo.connected) {
                    hasActiveClients = true
                    
                    if (wsClient.isConnected()) {
                        try {
                            wsClient.send(event)
                            reverseSentCount++
                        } catch (error) {
                            loggerError('Error sending event to WebSocket client:', error)
                        }
                    }
                }
            }
            
            totalSent += reverseSentCount
            
            // 如果没有活跃的反向WebSocket客户端，禁用反向WebSocket功能
            if (!hasActiveClients) {
                logInfo('All reverse WebSocket clients have given up reconnecting, disabling reverse WebSocket functionality')
                this.config.enabledWsReverse = false
            }
        }

        // 只有在有启用的功能但没有连接时才记录日志
        const hasEnabledFeatures = this.config.enabledWs || this.config.enabledWsReverse
        if (totalSent === 0 && hasEnabledFeatures) {
            logInfo('No WebSocket clients connected, event will not be sent')
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