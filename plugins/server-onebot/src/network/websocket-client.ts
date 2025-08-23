import { OneBotActionRequest, OneBotActionResponse, ClientState } from '../types'
import { logInfo, loggerError, loggerInfo } from '../index'
import { ActionRouter } from '../action'
import { Context, Logger } from 'koishi'
import { WebSocket } from 'ws'

export class WebSocketClient {
    private actionRouter: ActionRouter
    private socket: WebSocket | null = null
    private reconnectTimer: NodeJS.Timeout | null = null
    private isConnecting = false
    private isStopped = false
    private reconnectAttempts = 0
    private recentRequests: Map<string, number> = new Map() // 存储最近的请求，用于去重

    constructor(
        private ctx: Context,
        private config: {
            url: string
            name?: string
            token?: string
            reconnectInterval: number
            maxReconnectAttempts?: number
            selfId: string
            selfname?: string
            groupname?: string
        }
    ) {
        this.actionRouter = new ActionRouter(ctx, {
            selfId: this.config.selfId,
            selfname: this.config.selfname,
            groupname: this.config.groupname
        })

        // 定期清理过期的请求记录
        setInterval(() => {
            const now = Date.now()
            for (const [key, timestamp] of this.recentRequests.entries()) {
                if (now - timestamp > 5000) { // 5秒后清理
                    this.recentRequests.delete(key)
                }
            }
        }, 10000) // 每10秒清理一次
    }

    /**
     * 获取显示名称
     */
    private getDisplayName(): string {
        return this.config.name ? `${this.config.name} (${this.config.url})` : this.config.url
    }

    /**
     * 启动反向 WebSocket 连接
     */
    start() {
        this.isStopped = false
        this.reconnectAttempts = 0 // 重置重连计数
        this.connect()
    }

    /**
     * 停止连接
     */
    stop() {
        logInfo('Stopping WebSocket client for: %s', this.getDisplayName())
        this.isStopped = true

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer)
            this.reconnectTimer = null
        }

        if (this.socket) {
            // 移除所有事件监听器以避免在关闭后触发事件
            this.socket.removeAllListeners()
            this.socket.close(1000, 'Server shutting down')
            this.socket = null
        }

        this.isConnecting = false
        logInfo('WebSocket client stopped for: %s', this.getDisplayName())
    }

    private async connect() {
        if (this.isStopped || this.isConnecting || this.socket?.readyState === WebSocket.OPEN) {
            return
        }

        this.isConnecting = true
        logInfo('Connecting to reverse WebSocket:', this.getDisplayName())

        try {
            const headers: Record<string, string> = {
                'x-client-role': 'Universal',
                'x-self-id': this.config.selfId,
                'user-agent': 'Koishi-OneBot-Server'
            }

            if (this.config.token && this.config.token.trim() !== '') {
                headers.Authorization = `Bearer ${this.config.token}`
            }

            this.socket = new WebSocket(this.config.url, { headers })

            this.socket.addEventListener('open', () => {
                this.isConnecting = false
                this.reconnectAttempts = 0 // 重置重连计数
                loggerInfo('Reverse WebSocket connected successfully to: %s', this.getDisplayName())
                // 连接成功后立即发送生命周期事件
                this.sendLifecycleEvent('connect')
            })

            this.socket.addEventListener('message', async (event) => {
                await this.handleMessage(event.data.toString())
            })

            this.socket.addEventListener('close', (event) => {
                this.isConnecting = false
                loggerInfo('Reverse WebSocket disconnected from: %s (code: %d, reason: %s)',
                    this.getDisplayName(), event.code, event.reason || 'none')
                this.scheduleReconnect()
            })

            this.socket.addEventListener('error', (error) => {
                this.isConnecting = false

                // 简化错误输出
                let errorMessage = 'Unknown error'
                if (error && typeof error === 'object') {
                    const errorObj = error as any
                    if (errorObj.error) {
                        const innerError = errorObj.error
                        if (innerError.code === 'ECONNREFUSED') {
                            errorMessage = `Connection refused (${innerError.address}:${innerError.port})`
                        } else if (innerError.code) {
                            errorMessage = `${innerError.code}: ${innerError.message || 'Connection error'}`
                        } else {
                            errorMessage = innerError.message || 'Connection error'
                        }
                    } else if (errorObj.message) {
                        errorMessage = errorObj.message
                    }
                }

                loggerError('Reverse WebSocket connection error for %s: %s', this.getDisplayName(), errorMessage)
                this.scheduleReconnect()
            })

        } catch (error) {
            this.isConnecting = false

            // 简化错误输出
            let errorMessage = 'Unknown error'
            if (error && typeof error === 'object') {
                const errorObj = error as any
                if (errorObj.code === 'ECONNREFUSED') {
                    errorMessage = `Connection refused`
                } else if (errorObj.message) {
                    errorMessage = errorObj.message
                } else {
                    errorMessage = String(error)
                }
            } else {
                errorMessage = String(error)
            }

            loggerError('Failed to connect reverse WebSocket to %s: %s', this.getDisplayName(), errorMessage)
            this.scheduleReconnect()
        }
    }

    private scheduleReconnect() {
        if (this.isStopped || this.reconnectTimer) return

        this.reconnectAttempts++
        const maxAttempts = this.config.maxReconnectAttempts || 5

        if (this.reconnectAttempts >= maxAttempts) {
            loggerError('Max reconnection attempts (%d) reached for %s, giving up', maxAttempts, this.getDisplayName())
            return
        }

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null
            if (!this.isStopped) {
                logInfo('Reconnection attempt %d/%d for %s', this.reconnectAttempts + 1, maxAttempts, this.getDisplayName())
                this.connect()
            }
        }, this.config.reconnectInterval)

        logInfo('Will reconnect to %s in %d ms (attempt %d/%d)',
            this.getDisplayName(), this.config.reconnectInterval, this.reconnectAttempts, maxAttempts)
    }

    private async handleMessage(data: string) {
        let request: OneBotActionRequest
        try {
            request = JSON.parse(data)
        } catch (error) {
            logInfo('Invalid JSON message received:', data)
            return
        }

        // 请求去重检查
        const requestKey = `${request.action}-${JSON.stringify(request.params)}-${request.echo || 'no-echo'}`
        const now = Date.now()
        const lastRequestTime = this.recentRequests.get(requestKey)

        if (lastRequestTime && (now - lastRequestTime) < 1000) { // 1秒内的重复请求
            logInfo('[onebot:duplicate-request] Ignoring duplicate request: %s', request.action)
            return
        }

        this.recentRequests.set(requestKey, now)

        logInfo('[onebot:reverse-request] %o', request)

        try {
            const clientState: ClientState = {
                authorized: true,
                selfId: this.config.selfId
            }

            // 更新客户端状态，记录最后的消息ID（如果是发送消息的请求）
            if (request.action.includes('send_') && request.params) {
                // 从参数中提取可能的消息ID信息，用于后续的被动消息发送
                if (request.params.message_id) {
                    clientState.lastMessageId = request.params.message_id.toString()
                }
            }

            const response = await this.actionRouter.handle(request, clientState)

            if (this.socket?.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify(response))

                // 对于返回大量数据的请求，简化日志输出
                if (request.action.includes('_list') && response.status === 'ok' && Array.isArray(response.data)) {
                    logInfo('[onebot:reverse-response] Action: %s, Status: %s, Data count: %d',
                        request.action, response.status, response.data.length)
                } else {
                    logInfo('[onebot:reverse-response] %o', response)
                }
            }
        } catch (error) {
            const response: OneBotActionResponse = {
                status: 'failed',
                retcode: 1400,
                message: error.message,
                echo: request.echo,
            }

            if (this.socket?.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify(response))
                loggerError('[onebot:reverse-error] %o', error)
            }
        }
    }

    /**
     * 发送事件到反向 WebSocket
     */
    send(event: any) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            try {
                const eventJson = JSON.stringify(event)
                this.socket.send(eventJson)
            } catch (error) {
                loggerError('Failed to send event to reverse WebSocket:', error)
            }
        } else {
            logInfo('Reverse WebSocket not connected, event will not be sent')
        }
    }

    /**
     * 检查连接状态
     */
    isConnected(): boolean {
        return this.socket?.readyState === WebSocket.OPEN
    }

    /**
     * 获取连接状态信息
     */
    getConnectionInfo() {
        const maxAttempts = this.config.maxReconnectAttempts || 5
        return {
            url: this.config.url,
            name: this.config.name,
            connected: this.isConnected(),
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: maxAttempts,
            canReconnect: this.reconnectAttempts < maxAttempts && !this.isStopped,
            isStopped: this.isStopped
        }
    }

    /**
     * 重置重连状态，允许重新开始连接
     */
    resetReconnectState() {
        this.reconnectAttempts = 0
        this.isStopped = false
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer)
            this.reconnectTimer = null
        }
        logInfo('Reset reconnect state for: %s', this.getDisplayName())
    }

    /**
     * 发送生命周期事件
     */
    private sendLifecycleEvent(subType: 'connect' | 'enable' | 'disable') {
        const event = {
            time: Math.floor(Date.now() / 1000),
            self_id: parseInt(this.config.selfId),
            post_type: 'meta_event',
            meta_event_type: 'lifecycle',
            sub_type: subType
        }

        this.send(event)
        logInfo('Sent lifecycle event:', event)
    }
}