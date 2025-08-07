import { Context, Bot, Session } from 'koishi'
import { logInfo, loggerError, loggerInfo } from './index'
import { decodeStringId } from './utils'

// 私聊频道表结构
declare module 'koishi' {
    interface Tables {
        privatechannel: PrivateChannel
    }
}

export interface PrivateChannel {
    id: number
    userId: string
    channelId: string
    botSelfId: string
    platform: string
    createdAt: Date
    updatedAt: Date
}

/**
 * Bot 查找工具类
 */
export class BotFinder {
    private recordingLocks: Set<string> = new Set() // 防止并发写入
    private recordingDebounce: Map<string, NodeJS.Timeout> = new Map() // 防抖

    constructor(private ctx: Context) {
        this.initializeDatabase()
        this.setupEventListeners()
        // 延迟清理重复记录，等待数据库准备好
        this.ctx.on('ready', () => {
            this.cleanupDuplicateRecords()
        })
    }

    /**
     * 初始化数据库表
     */
    private initializeDatabase() {
        this.ctx.model.extend('privatechannel', {
            id: 'unsigned',
            userId: 'string',
            channelId: 'string',
            botSelfId: 'string',
            platform: 'string',
            createdAt: 'timestamp',
            updatedAt: 'timestamp',
        }, {
            primary: 'id',
            autoInc: true,
            unique: [['userId', 'channelId']],
        })
    }

    /**
     * 设置事件监听器
     */
    private setupEventListeners() {
        this.ctx.on('ready', () => {
            // 只监听 message-created 事件，避免重复
            this.ctx.on('message-created', (session: Session) => {
                this.handleMessageForPrivateChannel(session)
            })

            logInfo('Private channel event listeners set up')
        })
    }

    /**
     * 处理消息事件，记录私聊频道信息
     */
    private async handleMessageForPrivateChannel(session: Session) {
        // // 不处理有【at别人的前缀】消息
        // if (session.stripped.hasAt && !session.stripped.atSelf) return
        // 只处理私聊消息
        if (!session.isDirect) {
            return
        }

        try {
            // 查找对应的 bot
            const bot = this.ctx.bots.find(b =>
                b.platform === session.platform &&
                b.selfId === session.selfId
            )

            if (!bot) {
                logInfo('No bot found for session: %s/%s', session.platform, session.selfId)
                return
            }

            // 记录私聊频道信息
            await this.recordPrivateChannel(
                session.userId,
                session.channelId || `private:${session.userId}`,
                bot.selfId,
                session.platform
            )
        } catch (error) {
            loggerError('Error handling private channel message: %s', error.message)
        }
    }

    /**
     * 记录私聊频道信息到数据库 
     */
    private recordPrivateChannel(userId: string, channelId: string, botSelfId: string, platform: string) {
        const key = `${userId}|${channelId}`

        // 清除之前的防抖定时器
        const existingTimer = this.recordingDebounce.get(key)
        if (existingTimer) {
            clearTimeout(existingTimer)
        }

        // 设置新的防抖定时器
        const timer = setTimeout(async () => {
            await this.doRecordPrivateChannel(userId, channelId, botSelfId, platform)
            this.recordingDebounce.delete(key)
        }, 100) // 100ms 防抖

        this.recordingDebounce.set(key, timer)
    }

    /**
     * 实际执行数据库记录操作
     */
    private async doRecordPrivateChannel(userId: string, channelId: string, botSelfId: string, platform: string) {
        if (!this.isDatabaseAvailable()) {
            logInfo('Database not available, skipping private channel record')
            return
        }

        const key = `${userId}|${channelId}`

        // 检查是否已经在处理中
        if (this.recordingLocks.has(key)) {
            logInfo('Already recording for %s, skipping', key)
            return
        }

        // 加锁
        this.recordingLocks.add(key)

        try {
            // 使用 upsert 操作，如果存在就更新，不存在就创建
            const existing = await this.ctx.database.get('privatechannel', {
                userId,
                channelId,
            })

            if (existing.length > 0) {
                // 更新现有记录
                await this.ctx.database.set('privatechannel', {
                    userId,
                    channelId,
                }, {
                    botSelfId,
                    platform,
                    updatedAt: new Date(),
                })

                logInfo('Updated private channel record: %s -> %s', channelId, botSelfId)
            } else {
                // 创建新记录
                await this.ctx.database.create('privatechannel', {
                    userId,
                    channelId,
                    botSelfId,
                    platform,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })

                logInfo('Created private channel record: %s -> %s', channelId, botSelfId)
            }
        } catch (error) {
            loggerError('Error recording private channel: %s', error.message)
        } finally {
            // 释放锁
            this.recordingLocks.delete(key)
        }
    }

    /**
     * 检查数据库是否可用
     */
    private isDatabaseAvailable(): boolean {
        return !!(this.ctx.database && typeof this.ctx.database.get === 'function')
    }

    /**
     * 清理重复的私聊频道记录
     */
    private async cleanupDuplicateRecords() {
        if (!this.isDatabaseAvailable()) {
            return
        }

        try {
            // 获取所有记录
            const allRecords = await this.ctx.database.get('privatechannel', {})

            // 按 userId + channelId 分组
            const groups = new Map<string, typeof allRecords>()

            for (const record of allRecords) {
                const key = `${record.userId}|${record.channelId}`
                if (!groups.has(key)) {
                    groups.set(key, [])
                }
                groups.get(key)!.push(record)
            }

            // 清理重复记录
            let cleanedCount = 0
            for (const [key, records] of groups) {
                if (records.length > 1) {
                    // 保留最新的记录，删除其他的
                    const latest = records.sort((a, b) =>
                        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                    )[0]

                    const toDelete = records.filter(r => r.id !== latest.id)

                    for (const record of toDelete) {
                        await this.ctx.database.remove('privatechannel', { id: record.id })
                        cleanedCount++
                    }
                }
            }

            if (cleanedCount > 0) {
                logInfo('Cleaned up %d duplicate private channel records', cleanedCount)
            }
        } catch (error) {
            loggerError('Error cleaning up duplicate records: %s', error.message)
        }
    }

    /**
     * 获取回退 bot
     */
    private getFallbackBot(): Bot | null {
        // 优先选择非 onebot 平台的 bot
        const nonOneBotBots = this.ctx.bots.filter(bot => bot.platform !== 'onebot')
        if (nonOneBotBots.length > 0) {
            return nonOneBotBots[0]
        }

        // 如果只有 onebot 平台的 bot，返回第一个
        if (this.ctx.bots.length > 0) {
            return this.ctx.bots[0]
        }

        return null
    }

    /**
     * 根据频道 ID 查找对应的 bot
     * @param channelId 频道 ID
     * @returns 对应的 bot 实例，如果没找到返回 null
     */
    async findBotByChannelId(channelId: string): Promise<Bot | null> {
        try {
            // 检查数据库是否可用
            if (!this.isDatabaseAvailable()) {
                return this.getFallbackBot()
            }

            // 查询 privatechannel 表
            const privateChannels = await this.ctx.database.get('privatechannel', {
                channelId: channelId
            })

            if (privateChannels.length > 0) {
                const privateChannel = privateChannels[0]
                const bot = this.ctx.bots.find(bot => bot.selfId === privateChannel.botSelfId)

                if (bot) {
                    return bot
                } else {
                    logInfo('Bot with selfId %s not found for private channel, trying fallback', privateChannel.botSelfId)
                }
            }

            // 私聊表中没有找到 // 查询 channel 表
            const channels = await this.ctx.database.get('channel', {
                guildId: channelId
            })

            if (channels.length === 0) {
                return this.getFallbackBot()
            }

            // 取第一个匹配的频道
            const channel = channels[0]
            const assignee = channel.assignee

            if (!assignee) {
                logInfo('No assignee found for channel: %s', channelId)
                return null
            }

            // 根据 assignee 查找对应的 bot
            const bot = this.ctx.bots.find(bot => bot.selfId === assignee)

            if (bot) {
                return bot
            } else {
                logInfo('Bot with selfId %s not found in active bots', assignee)
                return null
            }
        } catch (error) {
            loggerError('Error finding bot for channel %s: %s', channelId, error.message)
            return null
        }
    }

    /**
     * 根据用户 ID 查找对应的 bot
     * @param userId 用户 ID
     * @returns 对应的 bot 实例，如果没找到返回第一个可用的 bot
     */
    async findBotByUserId(userId: string): Promise<Bot | null> {
        try {
            if (!this.isDatabaseAvailable()) {
                return this.getFallbackBot()
            }

            // 查询 privatechannel 表，寻找匹配的 userId
            const privateChannels = await this.ctx.database.get('privatechannel', {
                userId: userId
            })

            if (privateChannels.length > 0) {
                const privateChannel = privateChannels[0]
                const bot = this.ctx.bots.find(bot => bot.selfId === privateChannel.botSelfId)

                if (bot) {
                    return bot
                } else {
                    logInfo('Bot with selfId %s not found for user, using fallback', privateChannel.botSelfId)
                }
            }

            // 如果没有找到私聊记录，使用回退机制
            const bot = this.getFallbackBot()
            if (bot) {
                logInfo('Using fallback bot %s for user %s', bot.selfId, userId)
            }
            return bot
        } catch (error) {
            loggerError('Error finding bot for user %s: %s', userId, error.message)
            return this.getFallbackBot()
        }
    }

    /**
     * 通用的 bot 查找方法
     * @param params API 参数
     * @param clientState 客户端状态
     * @returns 对应的 bot 实例
     */
    async findBot(params: any, clientState: any): Promise<Bot | null> {
        // 如果请求中指定了 self，使用指定的 bot
        if (params.self) {
            const bot = this.ctx.bots.find(bot =>
                bot.platform === params.self.platform &&
                bot.selfId === params.self.user_id
            )
            if (bot) {
                return bot
            }
        }

        // 如果客户端状态中有平台和 selfId 信息，使用它们
        if (clientState.platform && clientState.selfId) {
            const bot = this.ctx.bots.find(bot =>
                bot.platform === clientState.platform &&
                bot.selfId === clientState.selfId
            )
            if (bot) {
                return bot
            }
        }

        // 如果是群组相关操作，根据群组 ID 查找
        if (params.group_id) {
            // 解码数字ID为原始字符串ID
            const originalGroupId = decodeStringId(params.group_id)
            logInfo('Decoded group_id %s to %s', params.group_id, originalGroupId)
            const bot = await this.findBotByChannelId(originalGroupId)
            if (bot) {
                return bot
            }
        }

        // 如果是用户相关操作，根据用户 ID 查找
        if (params.user_id) {
            // 解码数字ID为原始字符串ID
            const originalUserId = decodeStringId(params.user_id)
            logInfo('Decoded user_id %s to %s', params.user_id, originalUserId)
            const bot = await this.findBotByUserId(originalUserId)
            if (bot) {
                return bot
            }
        }

        // 优先选择非 onebot 平台的 bot，避免循环
        const nonOneBotBots = this.ctx.bots.filter(bot => bot.platform !== 'onebot')
        if (nonOneBotBots.length > 0) {
            logInfo('Using first non-onebot bot: %s', nonOneBotBots[0].selfId)
            return nonOneBotBots[0]
        }

        // 如果只有 onebot 平台的 bot，返回第一个
        if (this.ctx.bots.length > 0) {
            logInfo('Using first available bot: %s', this.ctx.bots[0].selfId)
            return this.ctx.bots[0]
        }

        logInfo('No bots available')
        return null
    }

    /**
     * 获取所有可用的 bot 列表
     */
    getAvailableBots(): Bot[] {
        return this.ctx.bots
    }

    /**
     * 根据用户ID获取私聊channel ID
     */
    async getPrivateChannelId(userId: string): Promise<string | null> {
        try {
            if (!this.isDatabaseAvailable()) {
                return null
            }

            const privateChannels = await this.ctx.database.get('privatechannel', {
                userId: userId
            })

            if (privateChannels.length > 0) {
                const channelId = privateChannels[0].channelId
                logInfo('Found private channel %s for user %s', channelId, userId)
                return channelId
            }

            return null
        } catch (error) {
            loggerError('Error finding private channel for user %s: %s', userId, error.message)
            return null
        }
    }

    /**
     * 根据平台和 selfId 查找 bot
     */
    findBotByPlatformAndId(platform: string, selfId: string): Bot | null {
        return this.ctx.bots.find(bot =>
            bot.platform === platform && bot.selfId === selfId
        ) || null
    }
}