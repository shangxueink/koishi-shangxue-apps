import WebSocket from 'ws'
import { Context, Logger } from "koishi"
import { v4 as uuidv4 } from 'uuid'

type SendData = {
        type: string
        clientId: string
        targetId: string
        message: string
}

export class WsServer {
        static inject = ['server']
        public readonly clients = new Map<string, WebSocket>()
        public readonly relations = new Map<string, string>()
        public readonly clientTimers = new Map<string, NodeJS.Timeout>()
        public readonly punishmentDuration = 5
        public readonly punishmentTime = 1
        public readonly heartbeatMsg = {
                type: "heartbeat",
                clientId: "",
                targetId: "",
                message: "200"
        }

        public heartbeatInterval: any
        public logger: Logger
        public wsServer?: WebSocket.Server

        constructor(ctx: Context, port: number) {
                this.logger = ctx.logger('dg-lab-ws')

                this.wsServer = new WebSocket.Server({ port: port })

                this.wsServer.on('connection', (socket) => {
                        // 生成唯一的标识符
                        const clientId = uuidv4()

                        this.logger.info('新的 WebSocket 连接已建立，标识符为:', clientId)

                        // 存储客户端
                        this.clients.set(clientId, socket)

                        // 发送标识符给客户端（格式固定，双方都必须获取才可以进行后续通信：比如浏览器和APP）
                        socket.send(
                                JSON.stringify({
                                        type: 'bind',
                                        clientId,
                                        message: 'targetId',
                                        targetId: ''
                                })
                        )

                        this.MessageOn(socket)
                        this.CloseOn(socket)
                        this.ErrorOn(socket)
                })

                this.logger.info('WebSocket 正在监听:', port)

                ctx.on('dispose', () => {
                        this.logger.debug('ws server closing')
                        this.wsServer.close()
                })
        }

        MessageOn(socket: WebSocket) {
                socket.on('message', (Message: string) => {
                        this.logger.info("收到消息：" + Message)

                        let data = null

                        try {
                                data = JSON.parse(Message)
                        }
                        catch (e) {
                                // 非JSON数据处理
                                socket.send(
                                        JSON.stringify({
                                                type: 'msg',
                                                clientId: "",
                                                targetId: "",
                                                message: '403'
                                        })
                                )
                                return
                        }

                        // 非法消息来源拒绝
                        if (
                                this.clients.get(data.clientId) !== socket &&
                                this.clients.get(data.targetId) !== socket
                        ) {
                                socket.send(
                                        JSON.stringify({
                                                type: 'msg',
                                                clientId: "",
                                                targetId: "",
                                                message: '404'
                                        })
                                )
                                return
                        }

                        if (
                                !data.type ||
                                !data.clientId ||
                                !data.message ||
                                !data.targetId
                        ) {
                                return
                        }

                        // 优先处理绑定关系
                        this.logger.info("收到消息" + JSON.stringify(data))
                        this.logger.info("type: " + data.type)
                        const { clientId, targetId, message, type } = data
                        switch (data.type) {
                                case "bind":
                                        // 服务器下发绑定关系
                                        if (
                                                this.clients.has(clientId) &&
                                                this.clients.has(targetId)
                                        ) {
                                                // relations的双方都不存在这俩id
                                                if (
                                                        ![clientId, targetId]
                                                                .some(
                                                                        id => this.relations.has(id) ||
                                                                                [...this.relations.values()].includes(id)
                                                                )
                                                ) {
                                                        this.relations.set(clientId, targetId)
                                                        const client = this.clients.get(clientId)
                                                        const sendData = {
                                                                clientId,
                                                                targetId,
                                                                message: "200",
                                                                type: "bind"
                                                        }
                                                        socket.send(JSON.stringify(sendData))
                                                        client.send(JSON.stringify(sendData))
                                                }
                                                else {
                                                        const data = {
                                                                type: "bind",
                                                                clientId,
                                                                targetId,
                                                                message: "400"
                                                        }
                                                        socket.send(JSON.stringify(data))
                                                        return
                                                }
                                        } else {
                                                const sendData = {
                                                        clientId,
                                                        targetId,
                                                        message: "401",
                                                        type: "bind"
                                                }
                                                socket.send(JSON.stringify(sendData))
                                                return
                                        }
                                        break

                                case 1:
                                case 2:
                                case 3:
                                        // 服务器下发APP强度调节                                        
                                        if (this.relations.get(clientId) !== targetId) {
                                                const data = {
                                                        type: "bind",
                                                        clientId,
                                                        targetId,
                                                        message: "402"
                                                }
                                                socket.send(JSON.stringify(data))
                                                return
                                        }
                                        if (this.clients.has(targetId)) {
                                                const client = this.clients.get(targetId)
                                                const sendType = data.type - 1
                                                const sendChannel = data.channel ? data.channel : 1
                                                const sendStrength = data.strength ? data.strength : 1
                                                const msg = "strength-" + sendChannel + "+" + sendType + "+" + sendStrength
                                                const sendData = {
                                                        type: "msg",
                                                        clientId,
                                                        targetId,
                                                        message: msg
                                                }
                                                this.logger.info("发送消息：" + JSON.stringify(sendData))
                                                client.send(JSON.stringify(sendData))
                                        }
                                        break
                                case 4:
                                        // 服务器下发指定APP强度
                                        if (this.relations.get(clientId) !== targetId) {
                                                const data = {
                                                        type: "bind",
                                                        clientId,
                                                        targetId,
                                                        message: "402"
                                                }
                                                socket.send(JSON.stringify(data))
                                                return
                                        }
                                        if (this.clients.has(targetId)) {
                                                const client = this.clients.get(targetId)
                                                const sendData = {
                                                        type: "msg",
                                                        clientId,
                                                        targetId,
                                                        message
                                                }
                                                client.send(JSON.stringify(sendData))
                                        }
                                        break
                                case "clientMsg":
                                        // 服务端下发给客户端的消息
                                        if (this.relations.get(clientId) !== targetId) {
                                                const data = {
                                                        type: "bind",
                                                        clientId,
                                                        targetId,
                                                        message: "402"
                                                }
                                                socket.send(JSON.stringify(data))
                                                return
                                        }
                                        if (!data.channel) {
                                                // 240531.现在必须指定通道(允许一次只覆盖一个正在播放的波形)
                                                const data = {
                                                        type: "error",
                                                        clientId,
                                                        targetId,
                                                        message: "406-channel is empty"
                                                }
                                                socket.send(JSON.stringify(data))
                                                return
                                        }
                                        if (this.clients.has(targetId)) {
                                                //消息体 默认最少一个消息
                                                let sendtime = data.time ? data.time : this.punishmentDuration // AB通道的执行时间
                                                const target = this.clients.get(targetId) //发送目标
                                                const sendData = {
                                                        type: "msg",
                                                        clientId,
                                                        targetId,
                                                        message: "pulse-" + data.message
                                                }
                                                let totalSends = this.punishmentTime * sendtime
                                                const timeSpace = 1000 / this.punishmentTime

                                                if (this.clientTimers.has(clientId + "-" + data.channel)) {
                                                        // A通道计时器尚未工作完毕, 清除计时器且发送清除APP队列消息，延迟150ms重新发送新数据
                                                        // 新消息覆盖旧消息逻辑
                                                        this.logger.info(
                                                                "通道" +
                                                                data.channel +
                                                                "覆盖消息发送中，总消息数：" +
                                                                totalSends + "持续时间A：" +
                                                                sendtime
                                                        )
                                                        socket.send("当前通道" + data.channel + "有正在发送的消息，覆盖之前的消息")

                                                        const timerId = this.clientTimers.get(clientId + "-" + data.channel)
                                                        clearInterval(timerId) // 清除定时器
                                                        this.clientTimers.delete(clientId + "-" + data.channel) // 清除 Map 中的对应项

                                                        // 发送APP波形队列清除指令
                                                        switch (data.channel) {
                                                                case "A":
                                                                        const clearDataA = {
                                                                                clientId,
                                                                                targetId,
                                                                                message: "clear-1",
                                                                                type: "msg"
                                                                        }
                                                                        target.send(JSON.stringify(clearDataA))
                                                                        break

                                                                case "B":
                                                                        const clearDataB = {
                                                                                clientId,
                                                                                targetId,
                                                                                message: "clear-2",
                                                                                type: "msg"
                                                                        }
                                                                        target.send(JSON.stringify(clearDataB))
                                                                        break
                                                                default:
                                                                        break
                                                        }

                                                        setTimeout(() => {
                                                                this.delaySendMsg(
                                                                        clientId,
                                                                        socket,
                                                                        target,
                                                                        sendData,
                                                                        totalSends,
                                                                        timeSpace,
                                                                        data.channel
                                                                )
                                                        }, 150)
                                                }
                                                else {
                                                        // 不存在未发完的消息 直接发送
                                                        this.delaySendMsg(
                                                                clientId,
                                                                socket,
                                                                target,
                                                                sendData,
                                                                totalSends,
                                                                timeSpace,
                                                                data.channel
                                                        )
                                                        this.logger.info(
                                                                "通道" +
                                                                data.channel +
                                                                "消息发送中，总消息数：" +
                                                                totalSends +
                                                                "持续时间：" +
                                                                sendtime
                                                        )
                                                }
                                        } else {
                                                this.logger.info(`未找到匹配的客户端，clientId: ${clientId}`)
                                                const sendData = {
                                                        clientId,
                                                        targetId,
                                                        message: "404",
                                                        type: "msg"
                                                }
                                                socket.send(JSON.stringify(sendData))
                                        }
                                        break
                                default:
                                        // 未定义的普通消息
                                        if (this.relations.get(clientId) !== targetId) {
                                                const data = {
                                                        type: "bind",
                                                        clientId,
                                                        targetId,
                                                        message: "402"
                                                }
                                                socket.send(JSON.stringify(data))
                                                return
                                        }
                                        if (this.clients.has(clientId)) {
                                                const client = this.clients.get(clientId)
                                                const sendData = {
                                                        type,
                                                        clientId,
                                                        targetId,
                                                        message
                                                }
                                                client.send(JSON.stringify(sendData))
                                        } else {
                                                // 未找到匹配的客户端
                                                const sendData = {
                                                        clientId,
                                                        targetId,
                                                        message: "404",
                                                        type: "msg"
                                                }
                                                socket.send(JSON.stringify(sendData))
                                        }
                                        break
                        }
                })
        }

        CloseOn(socket: WebSocket) {
                socket.on('close', () => {
                        // 连接关闭时，清除对应的 clientId 和 WebSocket 实例
                        this.logger.info('WebSocket 连接已关闭')
                        // 遍历 clients Map，找到并删除对应的 clientId 条目
                        let clientId = ''
                        this.clients.forEach((value, key) => {
                                if (value === socket) {
                                        // 拿到断开的客户端id
                                        clientId = key
                                }
                        })
                        this.logger.info("断开的client id:" + clientId)
                        this.relations.forEach((value, key) => {
                                if (key === clientId) {
                                        //网页断开 通知app
                                        let appid = this.relations.get(key)
                                        let appClient = this.clients.get(appid)
                                        const data = {
                                                type: "break",
                                                clientId,
                                                targetId: appid,
                                                message: "209"
                                        }
                                        appClient.send(JSON.stringify(data))
                                        appClient.close() // 关闭当前 WebSocket 连接
                                        this.relations.delete(key) // 清除关系
                                        this.logger.info("对方掉线，关闭" + appid)
                                }
                                else if (value === clientId) {
                                        // app断开 通知网页
                                        let webClient = this.clients.get(key)
                                        const data = {
                                                type: "break",
                                                clientId: key,
                                                targetId: clientId,
                                                message: "209"
                                        }
                                        webClient.send(JSON.stringify(data))
                                        webClient.close() // 关闭当前 WebSocket 连接
                                        this.relations.delete(key) // 清除关系
                                        this.logger.info("对方掉线，关闭" + clientId)
                                }
                        })
                        this.clients.delete(clientId) //清除ws客户端
                        this.logger.info("已清除" + clientId + " ,当前size: " + this.clients.size)
                })
        }

        ErrorOn(socket: WebSocket) {
                socket.on('error', (error) => {
                        // 错误处理
                        this.logger.error('WebSocket 异常:', error.message);
                        // 在此通知用户异常，通过 WebSocket 发送消息给双方
                        let clientId = '';
                        // 查找当前 WebSocket 实例对应的 clientId
                        for (const [key, value] of this.clients.entries()) {
                                if (value === socket) {
                                        clientId = key;
                                        break;
                                }
                        }
                        if (!clientId) {
                                this.logger.error('无法找到对应的 clientId');
                                return;
                        }
                        // 构造错误消息
                        const errorMessage = 'WebSocket 异常: ' + error.message;

                        this.relations.forEach((value, key) => {
                                // 遍历关系 Map，找到并通知没掉线的那一方
                                if (key === clientId) {
                                        // 通知app
                                        let appid = this.relations.get(key)
                                        let appClient = this.clients.get(appid)
                                        const data = {
                                                type: "error",
                                                clientId: clientId,
                                                targetId: appid,
                                                message: "500"
                                        }
                                        appClient.send(JSON.stringify(data))
                                }
                                if (value === clientId) {
                                        // 通知网页
                                        let webClient = this.clients.get(key)
                                        const data = {
                                                type: "error",
                                                clientId: key,
                                                targetId: clientId,
                                                message: errorMessage
                                        }
                                        webClient.send(JSON.stringify(data))
                                }
                        })
                })
        }

        delaySendMsg(
                clientId: string,
                client: WebSocket,
                target: WebSocket,
                sendData: SendData,
                totalSends: number,
                timeSpace: number,
                channel: string
        ) {
                // 发信计时器 通道会分别发送不同的消息和不同的数量 必须等全部发送完才会取消这个消息 新消息可以覆盖
                target.send(JSON.stringify(sendData)) //立即发送一次通道的消息
                totalSends--
                if (totalSends > 0) {
                        return new Promise<void>((resolve, reject) => {
                                // 按频率发送消息给特定的客户端
                                const timerId = setInterval(() => {
                                        if (totalSends > 0) {
                                                target.send(JSON.stringify(sendData))
                                                totalSends--
                                        }
                                        // 如果达到发送次数上限，则停止定时器
                                        if (totalSends <= 0) {
                                                clearInterval(timerId)
                                                client.send("发送完毕")
                                                this.clientTimers.delete(clientId) // 删除对应的定时器
                                                resolve()
                                        }
                                }, timeSpace) // 每隔频率倒数触发一次定时器

                                // 存储clientId与其对应的timerId和通道
                                this.clientTimers.set(clientId + "-" + channel, timerId)
                        })
                }
        }
}
