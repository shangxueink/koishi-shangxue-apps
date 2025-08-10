import { BotInfo, ChannelInfo, MessageInfo, QuoteInfo } from './types'
import { Context, Session, h, Logger } from 'koishi'
import { FileManager } from './file-manager'
import { Config } from './config'
import { Utils } from './utils'

export class MessageHandler {
    private logger: Logger
    private utils: Utils

    constructor(
        private ctx: Context,
        private config: Config,
        private fileManager: FileManager
    ) {
        this.logger = ctx.logger('chat-patch')
        this.utils = new Utils(config)
    }

    // 更新机器人信息到JSON文件
    async updateBotInfoToFile(session: Session) {
        const data = this.fileManager.readChatDataFromFile()

        const botInfo: BotInfo = {
            selfId: session.selfId,
            platform: session.platform || 'unknown',
            username: session.bot.user?.name || `Bot-${session.selfId}`,
            avatar: session.bot.user?.avatar,
            status: 'online'
        }

        data.bots[session.selfId] = botInfo
        this.fileManager.writeChatDataToFile(data)
        this.logInfo('更新机器人信息到文件:', botInfo.username)
    }

    // 更新频道信息到JSON文件
    async updateChannelInfoToFile(session: Session): Promise<string> {
        let guildName = session.channelId

        const data = this.fileManager.readChatDataFromFile()

        try {
            if (session.guildId && session.bot.getGuild && typeof session.bot.getGuild === 'function') {
                const guild = await session.bot.getGuild(session.guildId)
                guildName = guild?.name || session.channelId
            }
        } catch (guildError) {
            this.logInfo('获取群组信息失败，使用频道ID作为备用:', guildError)
            guildName = session.channelId
        }

        if (!data.channels[session.selfId]) {
            data.channels[session.selfId] = {}
        }

        const channelInfo: ChannelInfo = {
            id: session.channelId,
            name: session.guildId
                ? `${guildName} (${session.channelId})`
                : `私信 ${session.channelId}`,
            type: session.type || 0,
            guildId: session.guildId,
            guildName: guildName
        }

        data.channels[session.selfId][session.channelId] = channelInfo
        this.fileManager.writeChatDataToFile(data)
        this.logInfo('更新频道信息到文件:', channelInfo.name)

        return guildName
    }

    async broadcastMessageEvent(session: Session) {
        try {
            await this.updateBotInfoToFile(session)
            const guildName = await this.updateChannelInfoToFile(session)

            const timestamp = Date.now()

            // 处理 quote 信息
            let quoteInfo: QuoteInfo | undefined = undefined
            if (session.quote) {
                quoteInfo = {
                    messageId: session.quote.messageId || session.quote.id,
                    id: session.quote.id,
                    content: session.quote.content || '',
                    elements: session.quote.elements,
                    user: {
                        id: session.quote.user?.id || session.quote.user?.userId || 'unknown',
                        name: session.quote.user?.name || session.quote.user?.username || 'unknown',
                        userId: session.quote.user?.userId || session.quote.user?.id || 'unknown',
                        avatar: session.quote.user?.avatar,
                        username: session.quote.user?.username || session.quote.user?.name || 'unknown'
                    },
                    timestamp: session.quote.timestamp || Date.now()
                }
            }

            // 从 session 中提取用户消息内容
            let content = ''
            let elements: h[] = []

            if (session.content) {
                content = session.content
            } else if (session.stripped?.content) {
                content = session.stripped.content
            }

            if (session.elements) {
                elements = session.elements
                if (!content) {
                    content = session.elements
                        .filter((element: any) => element.type === 'text')
                        .map((element: any) => element.attrs?.content || '')
                        .join('')
                }
            }

            // 创建消息信息对象
            const messageInfo: MessageInfo = {
                id: session.event?.message?.id || `msg-${timestamp}`,
                content: content || session.content || '',
                userId: session.userId || session.event?.user?.id || 'unknown',
                username: session.username || session.event?.user?.name || session.userId || 'unknown',
                avatar: session.event?.user?.avatar,
                timestamp: timestamp,
                channelId: session.channelId,
                selfId: session.selfId,
                elements: this.utils.cleanBase64Content(elements),
                type: 'user',
                guildId: session.guildId,
                guildName: guildName,
                platform: session.platform || 'unknown',
                quote: quoteInfo ? this.utils.cleanBase64Content(quoteInfo) : undefined
            }

            await this.fileManager.addMessageToFile(messageInfo)

            const messageEvent = {
                type: 'message',
                selfId: session.selfId,
                platform: session.platform || 'unknown',
                channelId: session.channelId,
                messageId: session.event?.message?.id || `msg-${timestamp}`,
                content: content || session.content || '',
                userId: session.userId || session.event?.user?.id || 'unknown',
                username: session.username || session.event?.user?.name || session.userId || 'unknown',
                avatar: session.event?.user?.avatar,
                timestamp: timestamp,
                guildId: session.guildId,
                guildName: guildName,
                channelType: session.type || 0,
                elements: this.utils.cleanBase64Content(elements),
                quote: quoteInfo ? this.utils.cleanBase64Content(quoteInfo) : undefined,
                bot: {
                    avatar: session.bot.user?.avatar,
                    name: session.bot.user?.name,
                }
            }

            this.ctx.console.broadcast('chat-message-event', messageEvent)
        } catch (error) {
            this.logger.error('广播消息事件失败:', error)
        }
    }

    // 处理机器人发送的消息
    async broadcastBotMessageEvent(session: Session) {
        try {
            await this.updateBotInfoToFile(session)
            const guildName = await this.updateChannelInfoToFile(session)

            const timestamp = Date.now()

            let content = ''

            if (session.event?.message?.elements) {
                content = this.utils.extractTextContent(session.event.message.elements).trim()
            }

            // 创建机器人消息信息对象
            const messageInfo: MessageInfo = {
                id: `bot-msg-${timestamp}`,
                content: content,
                userId: session.selfId,
                username: session.bot.user?.name || `Bot-${session.selfId}`,
                avatar: session.bot.user?.avatar,
                timestamp: timestamp,
                channelId: session.event?.channel?.id || session.channelId,
                selfId: session.selfId,
                elements: this.utils.cleanBase64Content(session.event?.message?.elements),
                type: 'bot',
                guildId: session.event?.guild?.id || session.guildId,
                guildName: guildName,
                platform: session.platform || 'unknown'
            }

            await this.fileManager.addMessageToFile(messageInfo)

            const messageEvent = {
                type: 'bot-message',
                selfId: session.selfId,
                platform: session.platform || 'unknown',
                channelId: session.event?.channel?.id || session.channelId,
                messageId: `bot-msg-${timestamp}`,
                content: content,
                userId: session.selfId,
                username: session.bot.user?.name || `Bot-${session.selfId}`,
                avatar: session.bot.user?.avatar,
                timestamp: timestamp,
                guildId: session.event?.guild?.id || session.guildId,
                guildName: guildName,
                channelType: session.event?.channel?.type || session.type || 0,
                elements: this.utils.cleanBase64Content(session.event?.message?.elements),
                bot: {
                    avatar: session.bot.user?.avatar,
                    name: session.bot.user?.name,
                }
            }

            // 检查是否包含图片元素
            const imageElements = session.event?.message?.elements?.filter((element: any) =>
                element.type === 'img' || element.type === 'image' || element.type === 'mface'
            ) || []

            this.logInfo('机器人发送消息 (before-send):', {
                selfId: session.selfId,
                channelId: messageEvent.channelId,
                content: content,
                platform: session.platform,
                imageCount: imageElements.length,
                imageUrls: imageElements.map((el: any) => el.attrs?.src || el.attrs?.url || el.attrs?.file)
            })

            this.ctx.console.broadcast('chat-bot-message-event', messageEvent)
        } catch (error) {
            this.logger.error('广播机器人消息事件失败:', error)
        }
    }

    private logInfo(...args: any[]) {
        if (this.config.loggerinfo) {
            (this.logger.info as (...args: any[]) => void)(...args)
        }
    }
}