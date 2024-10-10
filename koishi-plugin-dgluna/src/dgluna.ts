import { Context, Service } from "koishi"
import { Config } from "./config"

export type sendMsg = {
        type: string | number
        clientId: string
        targetId: string
        message: string
}

export type channelMsg = {
        type: string | number
        clientId: string
        targetId: string
        message: string
        strength: number
        channel: number
}

export type feedbackMsg = {
        type: string | number
        clientId: string
        targetId: string
        message: string
        channel: string
        time: number
}

export type statusMsg = {
        channelA: number
        channelB: number
        softA: number
        softB: number
}

export const feedBackMsg = {
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
export const waveData = {
        "1": `["0A0A0A0A00000000","0A0A0A0A0A0A0A0A","0A0A0A0A14141414","0A0A0A0A1E1E1E1E","0A0A0A0A28282828","0A0A0A0A32323232","0A0A0A0A3C3C3C3C","0A0A0A0A46464646","0A0A0A0A50505050","0A0A0A0A5A5A5A5A","0A0A0A0A64646464"]`,
        "2": `["0A0A0A0A00000000","0D0D0D0D0F0F0F0F","101010101E1E1E1E","1313131332323232","1616161641414141","1A1A1A1A50505050","1D1D1D1D64646464","202020205A5A5A5A","2323232350505050","262626264B4B4B4B","2A2A2A2A41414141"]`,
        "3": `["4A4A4A4A64646464","4545454564646464","4040404064646464","3B3B3B3B64646464","3636363664646464","3232323264646464","2D2D2D2D64646464","2828282864646464","2323232364646464","1E1E1E1E64646464","1A1A1A1A64646464"]`
}

// 服务声明
declare module "koishi" {
        interface Context {
                dgluna: DgLuna
        }
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

        public async GetConnectionId(): Promise<string> {
                return new Promise((resolve) => {
                        setTimeout(() => {
                                if (this.connectionId) resolve(this.connectionId)
                        }, 1000)
                })
        }

        public GetTargetId(): string {
                return this.targetWSId
        }

        public GetStatus(): statusMsg {
                return {
                        channelA: this.channelA,
                        channelB: this.channelB,
                        softA: this.softA,
                        softB: this.softB
                }
        }

        public Send(message: sendMsg | channelMsg | feedbackMsg) {
                this.ws.send(JSON.stringify(message))
        }

        public ChangeStrength(channel: string, value: number) {
                if (channel !== "A" && channel !== "B") return
                const strengthType = value < 0 ? 1 : 2
                let msg: channelMsg = {
                        type: strengthType,
                        clientId: this.connectionId,
                        targetId: this.targetWSId,
                        message: "set strength",
                        strength: value,
                        channel: 1
                }

                if (channel === "A") {
                        this.channelA += value
                        if (this.channelA < 0 || this.channelA > this.softA) {
                                this.channelA -= value
                                return
                        }
                        msg.channel = 1
                } else if (channel === "B") {
                        this.channelB += value
                        if (this.channelB < 0 || this.channelB > this.softB) {
                                this.channelB -= value
                                return
                        }
                        msg.channel = 2
                }

                this.Send(msg)
        }

        public SetStrength(channel: string, value: number) {
                if (channel !== "A" && channel !== "B") return

                let msg: channelMsg = {
                        type: 3,
                        clientId: this.connectionId,
                        targetId: this.targetWSId,
                        message: "set strength",
                        strength: value,
                        channel: 1
                }

                if (channel === "A") {
                        if (value < 0 || value > this.softA) return
                        this.channelA = value
                        msg.channel = 1
                } else if (channel === "B") {
                        if (value < 0 || value > this.softB) return
                        this.channelB = value
                        msg.channel = 2
                }

                this.Send(msg)
        }


        // 设置波形
        public SetWave(channel: string, wave: string, time: number) {
                let msg: feedbackMsg = {
                        type: "clientMsg",
                        clientId: this.connectionId,
                        targetId: this.targetWSId,
                        message: "feedback",
                        channel: "",
                        time: time
                }

                msg.message = channel + ":" + wave
                msg.channel = channel
                this.Send(msg)
        }

        // 关闭连接
        public Close() {
                this.ws.close()
        }
}

class Room {
        private dglabs: Map<string, DgLab>
        private users: Set<string>

        constructor() {
                this.dglabs = new Map<string, DgLab>()
                this.users = new Set<string>()
        }

        public PushDglab(connectionId: string, dglab: DgLab) {
                this.dglabs.set(connectionId, dglab)
        }

        public PopDglab(connectionId: string): DgLab {
                const dglab = this.dglabs.get(connectionId)
                this.dglabs.delete(connectionId)
                return dglab
        }

        public AddUser(userId: string) {
                this.users.add(userId)
        }

        public RemoveUser(userId: string) {
                if (this.users.has(userId)) {
                        this.users.delete(userId)
                }
        }

        public FindUser(userId: string): boolean {
                return this.users.has(userId)
        }

        public FindDglab(connectionId: string): boolean {
                return this.dglabs.has(connectionId)
        }

        public UserCount(): number {
                return this.users.size
        }

        public ChangeStrength(channel: string, value: number) {
                this.dglabs.forEach((dglab, key) => {
                        try {
                                dglab.ChangeStrength(channel, value)
                        } catch (error) {
                                this.dglabs.delete(key)
                        }
                })
        }

        public SetStrength(channel: string, value: number) {
                this.dglabs.forEach((dglab, key) => {
                        try {
                                dglab.SetStrength(channel, value)
                        } catch (error) {
                                this.dglabs.delete(key)
                        }
                })
        }

        public SetWave(channel: string, wave: string, time: number) {
                this.dglabs.forEach((dglab, key) => {
                        try {
                                dglab.SetWave(channel, wave, time)
                        } catch (error) {
                                this.dglabs.delete(key)
                        }
                })
        }

        public Close() {
                this.dglabs.forEach((dglab) => {
                        dglab.Close()
                })
        }
}

// DgLuna服务，存储DgLab连接，除基础连接dglab连接功能外，还提供基于Room实现的N对N连接
export default class DgLuna extends Service {
        private dglabs: Map<string, DgLab>
        private rooms: Set<Room>
        private endpoint: string
        constructor(ctx: Context, config: Config) {
                super(ctx, "dgluna")
                this.dglabs = new Map<string, DgLab>()
                this.rooms = new Set<Room>()
                this.endpoint = config.endpoint
        }

        public async Connect(endpoint?: string): Promise<DgLab> {
                if (endpoint === undefined) {
                        endpoint = this.endpoint
                }

                const dglab = new DgLab(this.ctx, endpoint)

                return dglab
        }

        public async CreateRoom(userId: string, dglab: DgLab) {
                const room = new Room()
                const connectionId = await dglab.GetConnectionId()

                room.AddUser(userId)
                room.PushDglab(connectionId, dglab)
                this.rooms.add(room)
        }

        public AddUserToRoom(userId: string, invitedUserId: string) {
                this.rooms.forEach((room) => {
                        if (room.FindUser(userId)) {
                                if (room.FindUser(invitedUserId)) {
                                        return
                                }

                                room.AddUser(invitedUserId)
                                return
                        }
                })
        }

        public RemoveUserFromRoom(userId: string) {
                this.rooms.forEach((room) => {
                        if (room.FindUser(userId)) {
                                room.RemoveUser(userId)
                        }
                })
        }

        public AddDglabToRoom(userId: string, dglab: DgLab) {
                this.rooms.forEach(async (room) => {
                        if (room.FindUser(userId)) {
                                room.PushDglab(await dglab.GetConnectionId(), dglab)
                        }
                })
        }

        public ChangeStrengthByRoom(userID: string, channel: string, strength: number) {
                this.rooms.forEach((room) => {
                        if (room.FindUser(userID)) {
                                room.ChangeStrength(channel, strength)
                        }
                })
        }

        public SetStrengthByRoom(userID: string, channel: string, strength: number) {
                this.rooms.forEach((room) => {
                        if (room.FindUser(userID)) {
                                room.SetStrength(channel, strength)
                        }
                })
        }

        public SetWaveByRoom(userID: string, channel: string, wave: string, time: number) {
                this.rooms.forEach((room) => {
                        if (room.FindUser(userID)) {
                                room.SetWave(channel, wave, time)
                        }
                })
        }

        public UserExit(userID: string) {
                this.rooms.forEach((room) => {
                        if (room.FindUser(userID)) {
                                room.RemoveUser(userID)
                                if (room.UserCount() === 0) {
                                        room.Close()
                                        this.rooms.delete(room)
                                }
                        }
                })
        }

        public IsUserInRoom(userID: string): boolean {
                let result = false
                this.rooms.forEach((room) => {
                        if (room.FindUser(userID)) {
                                result = true
                        }
                })
                return result
        }

        public PopDglab(connectionId: string): DgLab {
                const dglab = this.dglabs.get(connectionId)
                this.dglabs.delete(connectionId)
                return dglab
        }

        public PushDglab(connectionId: string, dglab: DgLab) {
                this.dglabs.set(connectionId, dglab)
        }
}