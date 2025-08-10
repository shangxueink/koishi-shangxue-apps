import path from 'node:path'
import fs from 'node:fs'
import { Context, Logger } from 'koishi'
import { ChatData, MessageInfo } from './types'
import { Config } from './config'
import { Utils } from './utils'

export class FileManager {
    private dataFilePath: string
    private fileOperationLock = Promise.resolve()
    private logger: Logger
    private utils: Utils

    constructor(
        private ctx: Context,
        private config: Config
    ) {
        this.dataFilePath = path.resolve(ctx.baseDir, 'data', 'chat-patch', 'chat-data.json')
        this.logger = ctx.logger('chat-patch')
        this.utils = new Utils(config)
    }

    // 确保目录存在
    private ensureDataDir() {
        const dir = path.dirname(this.dataFilePath)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
    }

    // 从JSON文件读取数据
    readChatDataFromFile(): ChatData {
        try {
            if (fs.existsSync(this.dataFilePath)) {
                const jsonData = fs.readFileSync(this.dataFilePath, 'utf8')
                const data = JSON.parse(jsonData)
                return {
                    bots: data.bots || {},
                    channels: data.channels || {},
                    messages: data.messages || {},
                    pinnedBots: data.pinnedBots || [],
                    pinnedChannels: data.pinnedChannels || [],
                    lastSaveTime: data.lastSaveTime
                }
            }
        } catch (error) {
            this.logger.error('读取聊天数据失败:', error)
        }
        return {
            bots: {},
            channels: {},
            messages: {},
            pinnedBots: [],
            pinnedChannels: []
        }
    }

    // 写入数据到JSON文件
    writeChatDataToFile(data: ChatData) {
        try {
            this.ensureDataDir()
            data.lastSaveTime = Date.now()
            const jsonData = JSON.stringify(data, null, 2)
            fs.writeFileSync(this.dataFilePath, jsonData, 'utf8')
        } catch (error) {
            this.logger.error('写入聊天数据失败:', error)
        }
    }

    // 清理超量消息
    cleanExcessMessages(data: ChatData): ChatData {
        let cleanedCount = 0
        const cleanedMessages: Record<string, MessageInfo[]> = {}

        for (const [channelKey, messages] of Object.entries(data.messages)) {
            if (messages.length > this.config.maxMessagesPerChannel) {
                const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp)
                const keptMessages = sortedMessages.slice(-this.config.maxMessagesPerChannel)
                cleanedCount += messages.length - keptMessages.length
                cleanedMessages[channelKey] = keptMessages
                this.logInfo(`频道 ${channelKey} 清理了 ${messages.length - keptMessages.length} 条旧消息，保留最新 ${keptMessages.length} 条`)
            } else {
                cleanedMessages[channelKey] = messages
            }
        }

        if (cleanedCount > 0) {
            this.logInfo('总共清理超量消息:', cleanedCount, '条')
        }

        return {
            ...data,
            messages: cleanedMessages
        }
    }

    // 添加消息到JSON文件（使用锁机制防止并发冲突）
    async addMessageToFile(messageInfo: MessageInfo) {
        this.fileOperationLock = this.fileOperationLock.then(async () => {
            const data = this.readChatDataFromFile()
            const channelKey = `${messageInfo.selfId}:${messageInfo.channelId}`

            if (!data.messages[channelKey]) {
                data.messages[channelKey] = []
            }

            // 检查消息是否已存在
            const existingMessage = data.messages[channelKey].find(m => m.id === messageInfo.id)
            if (existingMessage) {
                this.logInfo('消息已存在，跳过保存:', {
                    channelKey: channelKey,
                    messageId: messageInfo.id,
                    existingType: existingMessage.type,
                    existingContent: existingMessage.content,
                    newType: messageInfo.type,
                    newContent: messageInfo.content
                })
                return
            }

            if (!messageInfo.timestamp) {
                messageInfo.timestamp = Date.now()
            }

            // 清理消息中的base64内容
            const cleanedMessageInfo = this.utils.cleanBase64Content(messageInfo) as MessageInfo

            const beforeCount = data.messages[channelKey].length
            data.messages[channelKey].push(cleanedMessageInfo)
            const afterCount = data.messages[channelKey].length

            // 限制消息数量 - 保留最新的消息
            if (data.messages[channelKey].length > this.config.maxMessagesPerChannel) {
                data.messages[channelKey].sort((a, b) => a.timestamp - b.timestamp)
                const removedCount = data.messages[channelKey].length - this.config.maxMessagesPerChannel
                data.messages[channelKey] = data.messages[channelKey].slice(-this.config.maxMessagesPerChannel)
                this.logInfo(`频道 ${channelKey} 达到消息上限，清理了 ${removedCount} 条旧消息`)
            }

            this.writeChatDataToFile(data)

            const isCommandMessage = messageInfo.content?.startsWith('++') || messageInfo.content?.startsWith('.')

            this.logInfo('添加消息到文件:', {
                channelKey: channelKey,
                messageId: messageInfo.id,
                content: messageInfo.content,
                type: messageInfo.type,
                userId: messageInfo.userId,
                username: messageInfo.username,
                timestamp: messageInfo.timestamp,
                isCommandMessage: isCommandMessage,
                消息数变化: `${beforeCount} -> ${afterCount} -> ${data.messages[channelKey].length}`
            })

        }).catch(error => {
            this.logger.error('保存消息时发生错误:', error)
        })

        await this.fileOperationLock
    }

    private logInfo(...args: any[]) {
        if (this.config.loggerinfo) {
            (this.logger.info as (...args: any[]) => void)(...args)
        }
    }
}