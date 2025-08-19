import { OneBotActionRequest, OneBotActionResponse, ClientState } from '../types'
import { logInfo, loggerError, loggerInfo } from '../index'
import { ActionRouter } from '../action'
import { Context, } from 'koishi'
import { WebSocket } from 'ws'

const kClient = Symbol('client')

export class WebSocketServer {
    private actionRouter: ActionRouter
    private route: any
    private recentRequests: Map<string, number> = new Map() // 存储最近的请求，用于去重

    constructor(
        private ctx: Context,
        private config: { path: string; token?: string; selfId?: string; selfname?: string }
    ) {
        this.actionRouter = new ActionRouter(ctx, {
            selfId: this.config.selfId || '114514',
            selfname: this.config.selfname
        })
        this.setupWebSocketServer()

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

    private setupWebSocketServer() {
        this.route = (this.ctx as any).server.ws(this.config.path, async (socket, { headers }) => {
            logInfo('OneBot client connected with headers:', headers)

            const client: ClientState = {
                authorized: false,
                lastHeartbeat: Date.now(),
            }
            socket[kClient] = client

            // 检查必要的头信息
            if (headers['x-client-role'] !== 'Universal') {
                logInfo('Invalid x-client-role:', headers['x-client-role'])
                return socket.close(1008, 'invalid x-client-role')
            }

            const selfId = headers['x-self-id']?.toString()
            if (!selfId) {
                logInfo('Missing x-self-id header')
                return socket.close(1008, 'missing x-self-id')
            }

            // 鉴权检查
            if (!this.checkAuth(headers)) {
                logInfo('WebSocket client authentication failed')
                return socket.close(1008, 'invalid token')
            }

            client.authorized = true
            client.selfId = selfId

            // 获取客户端地址信息
            const clientAddress = socket.remoteAddress || 'unknown'
            const clientPort = socket.remotePort || 'unknown'
            const clientInfo = `${clientAddress}:${clientPort}`

            loggerInfo('OneBot WebSocket client connected: %s (selfId: %s)', clientInfo, selfId)
            loggerInfo('Current WebSocket connections: %d', this.route.clients.size)

            // 输出所有连接的详细信息
            const connections: string[] = []
            for (const client of this.route.clients) {
                const addr = client.remoteAddress || 'unknown'
                const port = client.remotePort || 'unknown'
                connections.push(`${addr}:${port}`)
            }
            loggerInfo('Active WebSocket clients: [%s]', connections.join(', '))

            // 连接建立后立即发送初始化请求
            this.sendInitializationRequests(socket, selfId)

            // 监听消息
            socket.addEventListener('message', async (event) => {
                await this.handleMessage(socket, client, event.data.toString())
            })

            // 监听断开连接
            socket.addEventListener('close', () => {
                const clientAddress = socket.remoteAddress || 'unknown'
                const clientPort = socket.remotePort || 'unknown'
                const clientInfo = `${clientAddress}:${clientPort}`

                loggerInfo('OneBot WebSocket client disconnected: %s', clientInfo)
                loggerInfo('Remaining WebSocket connections: %d', this.route.clients.size - 1)
            })

            // 监听错误
            socket.addEventListener('error', (error) => {
                loggerError('WebSocket error:', error)
            })
        })
    }

    private checkAuth(headers: any): boolean {
        if (!this.config.token) return true
        const auth = headers.authorization || headers['Authorization']
        return auth === `Bearer ${this.config.token}`
    }

    private async handleMessage(socket: WebSocket, client: ClientState, data: string) {
        let request: OneBotActionRequest
        try {
            request = JSON.parse(data)
        } catch (error) {
            logInfo('Invalid JSON message received:', data)
            return socket.close(4000, 'invalid message')
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

        // 更新客户端状态，记录最后的消息ID（如果是发送消息的请求）
        if (request.action.includes('send_') && request.params) {
            // 从参数中提取可能的消息ID信息，用于后续的被动消息发送
            if (request.params.message_id) {
                client.lastMessageId = request.params.message_id.toString()
            }
        }

        // 详细的请求日志
        logInfo('[onebot:api-request] Action: %s, Params: %o, Echo: %s',
            request.action, request.params, request.echo || 'none')

        const startTime = Date.now()

        try {
            const response = await this.actionRouter.handle(request, client)
            const duration = Date.now() - startTime

            socket.send(JSON.stringify(response))

            // 详细的响应日志
            logInfo('[onebot:api-response] Action: %s, Status: %s, Duration: %dms, Echo: %s',
                request.action, response.status, duration, request.echo || 'none')

            if (response.status === 'ok') {
                // 对于返回大量数据的请求，简化日志输出
                if (request.action.includes('_list') && Array.isArray(response.data)) {
                    logInfo('[onebot:api-success] Action: %s, Data count: %d', request.action, response.data.length)
                } else {
                    logInfo('[onebot:api-success] Action: %s, Data: %o', request.action, response.data)
                }
            } else {
                logInfo('[onebot:api-failed] Action: %s, Error: %s, Retcode: %d',
                    request.action, response.message, response.retcode)
            }
        } catch (error) {
            const duration = Date.now() - startTime
            const response: OneBotActionResponse = {
                status: 'failed',
                retcode: 1400,
                message: error.message,
                echo: request.echo,
            }
            socket.send(JSON.stringify(response))

            loggerError('[onebot:api-error] Action: %s, Duration: %dms, Error: %s, Echo: %s',
                request.action, duration, error.message, request.echo || 'none')
            loggerError('[onebot:api-error-stack] %s', error.stack)
        }
    }

    /**
     * 广播事件到所有已连接的客户端
     */
    broadcast(event: any) {
        if (!this.route) return

        const clientCount = this.route.clients.size
        if (clientCount === 0) {
            logInfo('No WebSocket clients connected, event will not be sent')
            return
        }

        let sentCount = 0
        for (const socket of this.route.clients) {
            const client = socket[kClient] as ClientState
            if (!client?.authorized) {
                logInfo('Skipping unauthorized WebSocket client')
                continue
            }

            try {
                const eventJson = JSON.stringify(event)
                socket.send(eventJson)
                sentCount++
            } catch (error) {
                loggerError('Failed to send event to WebSocket client:', error)
            }
        }

    }

    /**
     * 获取已连接的客户端数量
     */
    getClientCount(): number {
        return this.route?.clients.size || 0
    }

    /**
     * 发送初始化请求
     */
    private sendInitializationRequests(socket: WebSocket, selfId: string) {
        // 发送 get_login_info 请求
        const loginInfoRequest = {
            action: 'get_login_info',
            params: {},
            echo: this.generateEcho()
        }

        socket.send(JSON.stringify(loginInfoRequest))
        logInfo('[onebot:init-request] get_login_info sent')

        // 发送 get_guild_service_profile 请求
        const guildServiceRequest = {
            action: 'get_guild_service_profile',
            params: {},
            echo: this.generateEcho()
        }

        socket.send(JSON.stringify(guildServiceRequest))
        logInfo('[onebot:init-request] get_guild_service_profile sent')
    }

    /**
     * 生成请求 echo
     */
    private generateEcho(): number {
        return Math.floor(Math.random() * 1000000)
    }

    /**
     * 关闭服务器
     */
    close() {
        logInfo('Closing WebSocket server')
        if (this.route) {
            const clientCount = this.route.clients.size
            logInfo('Closing %d WebSocket connections', clientCount)

            for (const socket of this.route.clients) {
                try {
                    socket.close(1000, 'Server shutting down')
                } catch (error) {
                    loggerError('Error closing WebSocket connection:', error)
                }
            }

            // 清理路由
            this.route = null
            logInfo('WebSocket server closed')
        }
    }
}