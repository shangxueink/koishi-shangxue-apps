import { Context, Service } from "koishi"
import { Config } from "./config"


// 服务声明
declare module "koishi" {
        interface Context {
                dgluna: DgLuna
        }
}

type sendMsg = {
        type: string | number
        clientId: string
        targetId: string
        message: string
}

type channelMsg = {
        type: string | number
        clientId: string
        targetId: string
        message: string
        strength: number
        channel: number
}

type feedbackMsg = {
        type: string | number
        clientId: string
        targetId: string
        message: string
        channel: string
        time: number
}

const feedBackMsg = {
        "feedback-0": "A通道：○",
        "feedback-1": "A通道：△",
        "feedback-2": "A通道：□",
        "feedback-3": "A通道：☆",
        "feedback-4": "A通道：⬡",
        "feedback-5": "B通道：○",
        "feedback-6": "B通道：△",
        "feedback-7": "B通道：□",
        "feedback-8": "B通道：☆",
        "feedback-9": "B通道：⬡",
}

// 孩子，我不会写波形
const waveData = {
        "1": `["0A0A0A0A00000000","0A0A0A0A0A0A0A0A","0A0A0A0A14141414","0A0A0A0A1E1E1E1E","0A0A0A0A28282828","0A0A0A0A32323232","0A0A0A0A3C3C3C3C","0A0A0A0A46464646","0A0A0A0A50505050","0A0A0A0A5A5A5A5A","0A0A0A0A64646464"]`,
        "2": `["0A0A0A0A00000000","0D0D0D0D0F0F0F0F","101010101E1E1E1E","1313131332323232","1616161641414141","1A1A1A1A50505050","1D1D1D1D64646464","202020205A5A5A5A","2323232350505050","262626264B4B4B4B","2A2A2A2A41414141"]`,
        "3": `["4A4A4A4A64646464","4545454564646464","4040404064646464","3B3B3B3B64646464","3636363664646464","3232323264646464","2D2D2D2D64646464","2828282864646464","2323232364646464","1E1E1E1E64646464","1A1A1A1A64646464"]`
}

class DgLab {
        private ctx: Context
        private ws: WebSocket
        private endpoint: string
        private connectionId: string
        private targetWSId: string
        private connectUrl: string
        // 通道强度以及软上限
        private channelA: number
        private channelB: number
        private softA: number
        private softB: number

        constructor(ctx: Context, endpoint: string) {
                this.ctx = ctx
                this.endpoint = endpoint

                // 连接到默认dg-lab ws服务器
                this.ws = ((): WebSocket => {
                        try {
                                return this.ctx.http.ws(endpoint)
                        } catch (error) {
                                // 抛出错误
                                throw new Error("无法连接至" + endpoint)
                        }
                })()

                this.connectInit()
        }

        private connectInit() {
                this.ws.onopen = () => {
                        this.ctx.logger.info("已创建新连接至", this.endpoint)
                }
                this.ws.onmessage = (event) => {
                        let message = null

                        try {
                                message = JSON.parse(event.data)
                        } catch (error) {
                                this.ctx.logger.error("无法解析消息: " + event.data)
                                return
                        }

                        switch (message.type) {
                                case "bind":
                                        if (!message.targetId) {
                                                // 绑定到目标
                                                this.connectionId = message.clientId
                                                this.ctx.logger.info(`[${this.connectionId}]已连接至${this.endpoint}`)
                                                this.connectUrl = `https://www.dungeon-lab.com/app-download.php#DGLAB-SOCKET#${this.endpoint}/${this.connectionId}`
                                                this.ctx.logger.info(`连接URL: ${this.connectUrl}`)
                                        } else {
                                                if (message.clientId != this.connectionId) {
                                                        this.ctx.logger.info('收到不正确的target消息' + message.message)
                                                        return
                                                }
                                                this.targetWSId = message.targetId
                                                this.ctx.logger.info(`[${this.connectionId}]已绑定至${this.targetWSId}`)
                                        }
                                        break

                                case "break":
                                        if (message.targetId != this.targetWSId) return
                                        this.ctx.logger.info(`[${this.connectionId}]连接已断开`)
                                        break

                                case "error":
                                        if (message.targetId != this.targetWSId) return
                                        this.ctx.logger.error(`[${this.connectionId}]发生错误: ${message.error}`)
                                        break

                                case "msg":
                                        if (message.targetId != this.targetWSId) return

                                        if (message.message.includes("strength")) {
                                                const numbers = message.message.match(/\d+/g).map(Number)
                                                this.channelA = numbers[0]
                                                this.channelB = numbers[1]
                                                this.softA = numbers[2]
                                                this.softB = numbers[3]
                                        } else if (message.message.includes("feedback")) {
                                                this.ctx.logger.info(`[${this.connectionId}]设置波形: ${feedBackMsg[message.message]}`)

                                                let msg: feedbackMsg = {
                                                        type: "clientMsg",
                                                        clientId: this.connectionId,
                                                        targetId: this.targetWSId,
                                                        message: "feedback",
                                                        channel: "",
                                                        time: 864000
                                                }

                                                const feedback = message.message.match(/\d+/g)[0]
                                                switch (feedback) {
                                                        case "0":
                                                                msg.message = "A:" + waveData["1"]
                                                                msg.channel = "A"
                                                                this.Send(msg)
                                                                break
                                                        case "1":
                                                                msg.message = "A:" + waveData["2"]
                                                                msg.channel = "A"
                                                                this.Send(msg)
                                                                break
                                                        case "2":
                                                        case "3":
                                                        case "4":
                                                                msg.message = "A:" + waveData["3"]
                                                                msg.channel = "A"
                                                                this.Send(msg)
                                                                break

                                                        case "5":
                                                                msg.message = "B:" + waveData["1"]
                                                                msg.channel = "B"
                                                                this.Send(msg)
                                                                break
                                                        case "6":
                                                                msg.message = "B:" + waveData["2"]
                                                                msg.channel = "B"
                                                                this.Send(msg)
                                                                break
                                                        case "7":
                                                        case "8":
                                                        case "9":
                                                                msg.message = "B:" + waveData["3"]
                                                                msg.channel = "B"
                                                                this.Send(msg)
                                                                break
                                                }
                                        }
                                        break

                                case 'heartbeat':
                                        //心跳包
                                        this.ctx.logger.debug("收到心跳")
                                        break

                                default:
                                        this.ctx.logger.info("收到其他消息：" + JSON.stringify(message)) // 输出其他类型的消息到控制台
                                        break
                        }
                }
                this.ws.onerror = () => {
                        this.ctx.logger.error(`[${this.connectionId}]连接发生错误`)
                }
                this.ws.onclose = () => {
                        this.ctx.logger.info(`[${this.connectionId}]连接已断开`)
                }
        }

        public GetConnectionId(): string {
                return this.connectionId
        }

        public GetTargetId(): string {
                return this.targetWSId
        }

        public Send(message: sendMsg | channelMsg | feedbackMsg) {
                this.ws.send(JSON.stringify(message))
        }

        public ChangeChannelA(value: number) {
                const strengthType = value < 0 ? 1 : 2
                this.Send({
                        type: strengthType,
                        clientId: this.connectionId,
                        targetId: this.targetWSId,
                        message: "set strength",
                        strength: value,
                        channel: 1
                })
        }

        public SetChannelA(value: number) {
                this.channelA = value
                this.Send({
                        type: 4,
                        clientId: this.connectionId,
                        targetId: this.targetWSId,
                        message: `strength-1+2+${value}`
                })
        }

        public ChangeChannelB(value: number) {
                const strengthType = value < 0 ? 1 : 2
                this.Send({
                        type: strengthType,
                        clientId: this.connectionId,
                        targetId: this.targetWSId,
                        message: "set strength",
                        strength: value,
                        channel: 2
                })
        }

        public SetChannelB(value: number) {
                this.channelB = value
                this.Send({
                        type: 4,
                        clientId: this.connectionId,
                        targetId: this.targetWSId,
                        message: `strength-2+2+${value}`
                })
        }

        // 关闭连接
        public Close() {
                this.ws.close()
        }
}

// DgLuna服务，管理DgLab连接，实现N对N连接
export default class DgLuna extends Service {
        private dglabs: Map<string, DgLab>
        private users: Map<string, string>
        private endpoint: string
        private timeout: number
        constructor(ctx: Context, config: Config) {
                super(ctx, "dgluna")
                this.dglabs = new Map<string, DgLab>()
                this.users = new Map<string, string>()
                this.endpoint = config.endpoint
                this.timeout = config.timeout

                /*
                // 定期清理无用户连接(每分钟)
                setInterval(() => {
                        // 遍历所有connectionId，如果不在users中，则删除
                        for (let connectionId of this.dglabs.keys()) {
                                if (!this.users.has(connectionId)) {
                                        this.Disconnect(connectionId)
                                }
                        }
                }, 60 * 1000)
                */
        }

        public async Connect(endpoint?: string): Promise<string> {
                if (endpoint === undefined) {
                        endpoint = this.endpoint
                }

                const dglab = new DgLab(this.ctx, endpoint)

                // 等待 connectionId 被设置
                const startTime = Date.now()
                while (!dglab.GetConnectionId()) {
                        if (Date.now() - startTime * 1000 > this.timeout) {
                                this.ctx.logger.error("连接超时")
                        }
                        await new Promise(resolve => setTimeout(resolve, 1000))
                }

                const connectionId = dglab.GetConnectionId()
                this.dglabs.set(connectionId, dglab)
                return connectionId
        }

        public async Disconnect(connectionId: string) {
                if (this.dglabs.has(connectionId)) {
                        this.dglabs.get(connectionId).Close()
                        this.dglabs.delete(connectionId)
                }
        }

        public async ConnectByUser(userId: string, endpoint?: string): Promise<string> {
                if (this.users.has(userId)) {
                        return this.users.get(userId)
                } else {
                        const connectionId = await this.Connect(endpoint)
                        this.users.set(userId, connectionId)
                        return connectionId
                }
        }

        // 用户退出当前连接(不关闭连接)
        public async UserExit(userId: string) {
                if (this.users.has(userId)) {
                        this.users.delete(userId)
                }
        }

        // 查找用户当前连接
        public async FindUserConnection(userId: string) {
                this.ctx.logger.info(this.users.has(userId))
                if (this.users.has(userId)) {
                        return this.users.get(userId)
                } else {
                        return null
                }
        }

        // 将User添加到现有连接组
        public async AddUserToConnection(userId: string, connectionId: string) {
                if (this.dglabs.has(connectionId)) {
                        this.users.set(userId, connectionId)
                }
        }

        public async Send(connectionId: string, message: sendMsg | channelMsg | feedbackMsg) {
                if (this.dglabs.has(connectionId)) {
                        this.dglabs.get(connectionId).Send(message)
                }
        }

        public async SendByUser(userId: string, message: sendMsg | channelMsg | feedbackMsg) {
                if (this.users.has(userId)) {
                        this.dglabs.get(this.users.get(userId)).Send(message)
                }
        }

        // 调节A通道强度
        public async ChangeChannelA(connectionId: string, value: number) {
                if (this.dglabs.has(connectionId)) {
                        this.dglabs.get(connectionId).ChangeChannelA(value)
                }
        }

        public async ChangeChannelAByUser(userId: string, value: number) {
                if (this.users.has(userId)) {
                        this.dglabs.get(this.users.get(userId)).ChangeChannelA(value)
                }
        }

        // 设置A通道强度
        public async SetChannelA(connectionId: string, value: number) {
                if (this.dglabs.has(connectionId)) {
                        this.dglabs.get(connectionId).SetChannelA(value)
                }
        }

        public async SetChannelAByUser(userId: string, value: number) {
                if (this.users.has(userId)) {
                        this.dglabs.get(this.users.get(userId)).SetChannelA(value)
                }
        }

        // 调节B通道强度
        public async ChangeChannelB(connectionId: string, value: number) {
                if (this.dglabs.has(connectionId)) {
                        this.dglabs.get(connectionId).ChangeChannelB(value)
                }
        }

        public async ChangeChannelBByUser(userId: string, value: number) {
                if (this.users.has(userId)) {
                        this.dglabs.get(this.users.get(userId)).ChangeChannelB(value)
                }
        }

        // 设置B通道强度
        public async SetChannelB(connectionId: string, value: number) {
                if (this.dglabs.has(connectionId)) {
                        this.dglabs.get(connectionId).SetChannelB(value)
                }
        }

        public async SetChannelBByUser(userId: string, value: number) {
                if (this.users.has(userId)) {
                        this.dglabs.get(this.users.get(userId)).SetChannelB(value)
                }
        }

        // 取出一个连接
        public async GetDglab(connectionId: string) {
                // 从Map中取出一个连接，并将其从Map中删除
                const dglab = this.dglabs.get(connectionId)
                this.dglabs.delete(connectionId)
                return dglab
        }

        public async PushDglab(connectionId: string, dglab: DgLab) {
                this.dglabs.set(connectionId, dglab)
        }
}