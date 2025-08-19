
import { OneBotMessage, OneBotNoticeEvent, OneBotRequestEvent, CQCode } from './types'
import { h, Session } from 'koishi'
import { logInfo, loggerError, loggerInfo } from './index'

/**
 * 生成唯一 ID
 */
export function generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

/**
 * 将 Koishi Session 转换为 OneBot 事件
 */
export function sessionToOneBotEvent(session: Session, configSelfId?: string): any | null {
    const baseEvent = {
        time: Math.floor((session.timestamp || Date.now()) / 1000),
        self_id: configSelfId ? (parseInt(configSelfId) || configSelfId) : (parseInt(session.selfId) || session.selfId),
    }

    switch (session.type) {
        case 'message':
        case 'message-created':
            return createMessageEvent(session, baseEvent, configSelfId)

        case 'friend-request':
            return createFriendRequestEvent(session, baseEvent, configSelfId)

        case 'guild-member-request':
            return createGroupRequestEvent(session, baseEvent, configSelfId)

        case 'message-deleted':
            return createMessageDeleteEvent(session, baseEvent, configSelfId)

        case 'guild-member-added':
        case 'guild-member-deleted':
            return createMemberChangeEvent(session, baseEvent, configSelfId)

        default:
            return null
    }
}

/**
 * 创建消息事件
 */
function createMessageEvent(session: Session, baseEvent: any, configSelfId?: string): any {
    // 确定消息类型
    const isGroupMessage = !session.isDirect && (session.guildId || session.channelId)

    const event: any = {
        post_type: 'message',
        message_type: isGroupMessage ? 'group' : 'private',
        sub_type: 'normal',
        message_id: parseInt(session.messageId) || session.messageId || generateId(),
        user_id: convertUserId(session.userId), // 转换为数字类型
        message: elementsToOneBotMessage(session.elements || []),
        raw_message: session.content || '',
        font: 0,
        sender: {
            user_id: convertUserId(session.userId), // 转换为数字类型
            nickname: session.author?.nick || session.author?.name || session.userId,
            card: session.author?.nick || '',
            sex: 'unknown',
            age: 0,
            area: '',
            level: '0',
            role: getMemberRole(session),
            title: '',
        },
        time: Math.floor((session.timestamp || Date.now()) / 1000),
        self_id: configSelfId ? (parseInt(configSelfId) || configSelfId) : (parseInt(session.selfId) || session.selfId),
    }

    // 如果是群消息，添加群组信息
    if (isGroupMessage) {
        const groupId = session.guildId || session.channelId
        event.group_id = convertUserId(groupId) // 使用相同的转换逻辑
    }

    return event
}

/**
 * 创建好友请求事件
 */
function createFriendRequestEvent(session: Session, baseEvent: any, configSelfId?: string): any {
    return {
        ...baseEvent,
        post_type: 'request',
        request_type: 'friend',
        sub_type: '',
        user_id: parseInt(session.userId) || session.userId,
        comment: session.content || '',
        flag: session.messageId || generateId(),
    }
}

/**
 * 创建群请求事件
 */
function createGroupRequestEvent(session: Session, baseEvent: any, configSelfId?: string): any {
    return {
        ...baseEvent,
        post_type: 'request',
        request_type: 'group',
        sub_type: 'add',
        user_id: parseInt(session.userId) || session.userId,
        group_id: parseInt(session.guildId) || session.guildId,
        comment: session.content || '',
        flag: session.messageId || generateId(),
    }
}

/**
 * 创建消息删除事件
 */
function createMessageDeleteEvent(session: Session, baseEvent: any, configSelfId?: string): any {
    return {
        ...baseEvent,
        post_type: 'notice',
        notice_type: session.isDirect ? 'friend_recall' : 'group_recall',
        sub_type: '',
        user_id: parseInt(session.userId) || session.userId,
        operator_id: parseInt(session.operatorId || session.userId) || (session.operatorId || session.userId),
        message_id: parseInt(session.messageId) || session.messageId,
        ...(session.guildId && !session.isDirect ? {
            group_id: parseInt(session.guildId) || session.guildId,
        } : {}),
    }
}

/**
 * 创建成员变动事件
 */
function createMemberChangeEvent(session: Session, baseEvent: any, configSelfId?: string): any {
    return {
        ...baseEvent,
        post_type: 'notice',
        notice_type: session.type === 'guild-member-added' ? 'group_increase' : 'group_decrease',
        sub_type: session.subtype || '',
        user_id: parseInt(session.userId) || session.userId,
        operator_id: parseInt(session.operatorId || session.userId) || (session.operatorId || session.userId),
        group_id: parseInt(session.guildId) || session.guildId,
    }
}

/**
 * 获取成员角色
 */
function getMemberRole(session: Session): 'owner' | 'admin' | 'member' {
    if (session.author?.roles?.includes('owner')) return 'owner'
    if (session.author?.roles?.includes('admin')) return 'admin'
    return 'member'
}

/**
 * 将 Koishi 元素转换为 OneBot 消息段
 */
export function elementsToOneBotMessage(elements: h[]): OneBotMessage[] {
    const result: OneBotMessage[] = []

    for (const element of elements) {
        const segment = elementToSegment(element)
        if (segment) {
            result.push(segment)
        }
    }

    return result
}

/**
 * 将单个 Koishi 元素转换为 OneBot 消息段
 */
function elementToSegment(element: h): OneBotMessage | null {
    switch (element.type) {
        case 'text':
            return {
                type: 'text',
                data: { text: element.attrs.content || element.children?.join('') || '' }
            }

        case 'at':
            if (element.attrs.type === 'all') {
                return { type: 'at', data: { qq: 'all' } }
            } else {
                return {
                    type: 'at',
                    data: {
                        qq: element.attrs.id,
                        name: element.attrs.name || ''
                    }
                }
            }

        case 'img':
        case 'image':
            return {
                type: 'image',
                data: {
                    file: element.attrs.src || element.attrs.url,
                    url: element.attrs.src || element.attrs.url
                }
            }

        case 'audio':
            return {
                type: 'record',
                data: {
                    file: element.attrs.src || element.attrs.url,
                    url: element.attrs.src || element.attrs.url
                }
            }

        case 'video':
            return {
                type: 'video',
                data: {
                    file: element.attrs.src || element.attrs.url,
                    url: element.attrs.src || element.attrs.url
                }
            }

        case 'face':
            return {
                type: 'face',
                data: { id: element.attrs.id || '0' }
            }

        case 'reply':
            return {
                type: 'reply',
                data: { id: element.attrs.id }
            }

        default:
            // 对于不支持的元素类型，转换为文本
            return {
                type: 'text',
                data: { text: `[${element.type}]` }
            }
    }
}

/**
 * 将 OneBot 消息段转换为 Koishi 元素
 */
export function oneBotMessageToElements(message: string | OneBotMessage[]): h[] {
    if (typeof message === 'string') {
        return [h.text(message)]
    }

    const elements: h[] = []

    for (const segment of message) {
        const element = segmentToElement(segment)
        if (element) {
            elements.push(element)
        }
    }

    return elements
}

/**
 * 兼容处理旧的 base64:// 协议，转换为 data: 格式
 */
function convertBase64Url(url: string, mimeType: string): string {
    if (url && url.startsWith('base64://')) {
        const base64Data = url.slice(9) // 移除 'base64://' 前缀
        return `data:${mimeType};base64,${base64Data}`
    }
    return url
}

// 全局映射表，用于ID转换
const stringToNumericMap = new Map<string, number>()
const numericToStringMap = new Map<number, string>()
let nextNumericId = 2000000000 //  避免与真实ID冲突

/**
 * 将字符串ID编码为数字ID（可逆）
 */
function encodeStringId(stringId: string): number {
    // 如果已经是数字，直接返回
    const parsed = parseInt(stringId)
    if (!isNaN(parsed) && parsed.toString() === stringId) {
        return parsed
    }

    // 检查是否已经编码过
    if (stringToNumericMap.has(stringId)) {
        return stringToNumericMap.get(stringId)!
    }

    // 生成新的数字ID
    const numericId = nextNumericId++

    // 建立双向映射
    stringToNumericMap.set(stringId, numericId)
    numericToStringMap.set(numericId, stringId)

    return numericId
}

/**
 * 将ID解码为字符串ID 
 * 支持数字和字符串参数
 */
function decodeStringId(id: number | string): string {
    let numericId: number

    // 统一转换为数字进行处理
    if (typeof id === 'string') {
        // 尝试将字符串转换为数字
        numericId = parseInt(id, 10)
        // 如果转换失败或不是纯数字字符串，直接返回原字符串
        if (isNaN(numericId) || numericId.toString() !== id) {
            return id
        }
    } else {
        numericId = id
        // 处理 NaN 的情况
        if (isNaN(numericId)) {
            return 'unknown'
        }
    }

    // 检查是否在映射表中
    if (numericToStringMap.has(numericId)) {
        return numericToStringMap.get(numericId)!
    }

    // 如果不在映射表中，可能是原始的数字ID
    if (numericId < 2000000000) {
        return numericId.toString()
    }

    // 对于 >= 2000000000 的ID，如果不在映射表中，可能是：
    // 1. 映射表丢失了（重启后）
    // 2. 这是一个真实的大数字ID（虽然不太可能）
    // 为了避免发送失败，直接返回数字字符串
    return numericId.toString()
}

/**
 * 将用户ID转换为数字
 */
function convertUserId(userId: string): number {
    return encodeStringId(userId)
}

/**
 * 将单个 OneBot 消息段转换为 Koishi 元素
 */
function segmentToElement(segment: OneBotMessage): h | null {
    switch (segment.type) {
        case 'text':
            return h.text(segment.data.text || '')

        case 'at':
            if (segment.data.qq === 'all') {
                return h('at', { type: 'all' })
            } else {
                // 解码加密的用户 ID
                const originalUserId = decodeStringId(segment.data.qq as number)
                return h.at(originalUserId, { name: segment.data.name })
            }

        case 'image':
            const imageUrl = convertBase64Url(segment.data.file || segment.data.url, 'image/jpeg')
            return h.image(imageUrl)

        case 'record':
            const audioUrl = convertBase64Url(segment.data.file || segment.data.url, 'audio/mpeg')
            return h.audio(audioUrl)

        case 'video':
            const videoUrl = convertBase64Url(segment.data.file || segment.data.url, 'video/mp4')
            return h.video(videoUrl)

        case 'face':
            return h('face', { id: segment.data.id })

        case 'reply':
            return h('reply', { id: segment.data.id })

        default:
            // 对于不支持的类型，转换为文本
            return h.text(`[${segment.type}]`)
    }
}

/**
 * 创建心跳事件
 */
export function createHeartbeatEvent(selfId: string, platform: string, interval: number): any {
    return {
        post_type: 'meta_event',
        meta_event_type: 'heartbeat',
        time: Math.floor(Date.now() / 1000),
        self_id: parseInt(selfId) || selfId,
        status: {
            app_initialized: true,
            app_enabled: true,
            app_good: true,
            online: true,
            good: true,
        },
        interval,
    }
}

/**
 * 创建生命周期事件
 */
/**
 * 导出编码解码函数供其他模块使用
 */
export { decodeStringId, encodeStringId }

/**
 * 使用 session 发送消息的智能函数
 * 优先使用 session.send（被动消息），失败时回退到主动消息发送
 */
export async function sendWithSession(
    ctx: any,
    targetChannelId: string,
    targetUserId: string | null,
    elements: any[],
    isPrivate: boolean = false,
    selfId?: string
): Promise<string | string[]> {
    logInfo("=== sendWithSession called ===")
    logInfo(`targetChannelId: ${targetChannelId}`)
    logInfo(`targetUserId: ${targetUserId}`)
    logInfo(`isPrivate: ${isPrivate}`)
    logInfo(`selfId: ${selfId}`)
    logInfo("===============================")

    // 存储最近的 session，用于被动消息发送
    const recentSessions = getRecentSessions()

    // 查找匹配的 session（1分钟内的消息）
    const matchingSession = findMatchingSession(recentSessions, targetChannelId, targetUserId, isPrivate)

    if (matchingSession) {
        try {
            // 检查 session 是否还在有效期内
            const sessionAge = Date.now() - matchingSession.timestamp
            const maxAge = matchingSession.platform === 'qq' ? 5 * 60 * 1000 - 2000 : 60000 // QQ: 5分钟-2秒, 其他: 1分钟

            if (sessionAge < maxAge) {
                // 尝试使用 session.send 发送被动消息
                const result = await matchingSession.session.send(elements)
                if (result && (Array.isArray(result) ? result.length > 0 : true)) {
                    logInfo('Successfully sent message using session.send (passive message)')
                    return result
                }
            } else {
                logInfo(`Session expired (age: ${sessionAge}ms, max: ${maxAge}ms), falling back to active message`)
            }
        } catch (error) {
            // session.send 失败，继续尝试主动发送
            loggerError('Session.send failed, falling back to active message sending:', error.message)
        }

        // 如果被动消息发送失败，使用匹配 session 的 selfId 进行主动发送
        if (!selfId) {
            selfId = matchingSession.selfId
            logInfo(`Using selfId from matching session: ${selfId}`)
        }
    } else {
        logInfo('No matching session found, using active message sending')
    }

    // 回退到主动消息发送
    return await sendActiveMessage(ctx, targetChannelId, targetUserId, elements, isPrivate, selfId)
}

/**
 * 主动发送消息
 */
async function sendActiveMessage(
    ctx: any,
    targetChannelId: string,
    targetUserId: string | null,
    elements: any[],
    isPrivate: boolean,
    selfId?: string
): Promise<string | string[]> {
    logInfo("=== sendActiveMessage called ===")
    logInfo(`selfId: ${selfId}`)
    logInfo(`Available bots: ${Object.values(ctx.bots).map((b: any) => `${b.selfId}(${b.platform})`).join(', ')}`)

    let targetBot = null

    // 首先根据 targetChannelId 从数据库查找对应的 bot
    if (targetChannelId && ctx.database) {
        try {
            // 查询 channel 表获取 assignee
            const channels = await ctx.database.get('channel', {
                id: targetChannelId
            })

            if (channels.length > 0) {
                const assignee = channels[0].assignee
                if (assignee) {
                    targetBot = Object.values(ctx.bots).find((b: any) => b.selfId === assignee)
                    if (targetBot) {
                        logInfo(`Found bot by channel assignee: ${targetBot.selfId}(${targetBot.platform})`)
                    }
                }
            }
        } catch (error) {
            loggerError(`Error querying channel database: ${error.message}`)
        }
    }

    // 如果通过 channel 没找到，且提供了 selfId，尝试使用指定的 bot
    if (!targetBot && selfId) {
        targetBot = Object.values(ctx.bots).find((b: any) => b.selfId === selfId || b.user?.id === selfId)
        logInfo(`Found bot by selfId: ${targetBot ? `${targetBot.selfId}(${targetBot.platform})` : 'null'}`)
        if (targetBot) {
            logInfo(`Found specific bot by selfId: ${targetBot.selfId} (platform: ${targetBot.platform})`)
        } else {
            loggerError(`No bot found with selfId: ${selfId}, falling back to general selection`)
        }
    }

    // 如果没有找到指定的 bot，使用通用选择策略
    if (!targetBot) {
        targetBot = await findBestAvailableBot(ctx.bots, isPrivate)
    }

    if (!targetBot) {
        throw new Error(`No suitable bot found for sending message${selfId ? ` (requested selfId: ${selfId})` : ''}`)
    }

    logInfo(`Using bot: ${targetBot.selfId} (platform: ${targetBot.platform}) for ${isPrivate ? 'private' : 'group'} message`)
    // 根据平台特性发送消息
    if (isPrivate && targetUserId) {
        return await sendPrivateMessageWithPlatformAdaptation(targetBot, targetUserId, elements)
    } else {
        return await sendGroupMessageWithPlatformAdaptation(targetBot, targetChannelId, elements)
    }
}

/**
 * 针对不同平台适配的私聊消息发送
 */
async function sendPrivateMessageWithPlatformAdaptation(
    bot: any,
    userId: string,
    elements: any[]
): Promise<string | string[]> {
    // QQ 官方平台特殊处理
    if (bot.platform === 'qq') {
        try {
            // 对于 QQ 平台，优先使用 sendPrivateMessage
            if (bot.sendPrivateMessage) {
                return await bot.sendPrivateMessage(userId, elements)
            }
        } catch (error) {
            // QQ 平台发送失败，记录错误但继续尝试其他方式
            loggerError('QQ platform sendPrivateMessage failed:', error.message)
            // 对于 QQ 平台，如果私聊发送失败，可能是因为缺少 msg_id
            throw new Error(`QQ platform private messaging failed (may require msg_id from recent session): ${error.message}`)
        }
    }

    // 通用发送方式，尝试多种频道 ID 格式
    const channelFormats = [
        `private:${userId}`,
        userId,
        `user:${userId}`,
        `dm:${userId}`
    ]

    for (const channelId of channelFormats) {
        try {
            const result = await bot.sendMessage(channelId, elements)
            if (result && (Array.isArray(result) ? result.length > 0 : true)) {
                return result
            }
        } catch (error) {
            // 继续尝试下一种格式
            continue
        }
    }

    throw new Error('Failed to send private message with all methods')
}

/**
 * 针对不同平台适配的群消息发送
 */
async function sendGroupMessageWithPlatformAdaptation(
    bot: any,
    channelId: string,
    elements: any[]
): Promise<string | string[]> {
    // QQ 官方平台特殊处理
    if (bot.platform === 'qq') {
        try {
            // 对于 QQ 平台，直接使用 sendMessage，QQ 适配器内部会处理 msg_id
            if (bot.sendMessage) {
                return await bot.sendMessage(channelId, elements)
            }
        } catch (error) {
            loggerError('QQ platform group message failed:', error.message)
            // 对于 QQ 平台，如果直接发送失败，可能是因为缺少 msg_id
            // 这种情况下应该抛出更明确的错误信息
            throw new Error(`QQ platform active messaging failed (may require msg_id from recent session): ${error.message}`)
        }
    }

    // 通用发送方式，尝试多种频道 ID 格式
    const channelFormats = [
        channelId,
        `public:${channelId}`,
        `group:${channelId}`,
        `channel:${channelId}`,
        `guild:${channelId}`
    ]

    for (const format of channelFormats) {
        try {
            const result = await bot.sendMessage(format, elements)
            if (result && (Array.isArray(result) ? result.length > 0 : true)) {
                return result
            }
        } catch (error) {
            continue
        }
    }

    throw new Error('Failed to send group message with all channel formats')
}

// 存储最近的 session 的全局变量
const recentSessionsMap = new Map<string, {
    session: any,
    timestamp: number,
    channelId: string,
    userId: string | null,
    isPrivate: boolean,
    platform: string,
    selfId: string
}>()

/**
 * 存储最近的 session
 */
export function storeRecentSession(session: any) {
    const key = `${session.platform}-${session.selfId}-${session.channelId || session.userId}`
    const sessionData = {
        session,
        timestamp: Date.now(),
        channelId: session.channelId,
        userId: session.userId,
        isPrivate: session.isDirect || false,
        platform: session.platform,
        selfId: session.selfId
    }

    recentSessionsMap.set(key, sessionData)

    // 清理超过5分钟的 session（适应 QQ 平台的超时时间）
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
    for (const [k, v] of recentSessionsMap.entries()) {
        if (v.timestamp < fiveMinutesAgo) {
            recentSessionsMap.delete(k)
        }
    }
}

/**
 * 获取最近的 sessions
 */
function getRecentSessions() {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
    const recentSessions = []

    for (const [key, sessionData] of recentSessionsMap.entries()) {
        if (sessionData.timestamp >= fiveMinutesAgo) {
            recentSessions.push(sessionData)
        }
    }

    return recentSessions
}

/**
 * 查找匹配的 session
 */
function findMatchingSession(
    recentSessions: any[],
    targetChannelId: string,
    targetUserId: string | null,
    isPrivate: boolean
) {
    for (const sessionData of recentSessions) {
        if (isPrivate) {
            // 私聊消息匹配
            if (sessionData.isPrivate && sessionData.userId === targetUserId) {
                return sessionData
            }
        } else {
            // 群消息匹配
            if (!sessionData.isPrivate && sessionData.channelId === targetChannelId) {
                return sessionData
            }
        }
    }

    return null
}

export function createLifecycleEvent(selfId: string, platform: string, subType: 'enable' | 'disable' | 'connect'): any {
    return {
        post_type: 'meta_event',
        meta_event_type: 'lifecycle',
        sub_type: subType,
        time: Math.floor(Date.now() / 1000),
        self_id: parseInt(selfId) || selfId,
    }
}

/**
 * 解析 CQ 码
 */
export function parseCQCode(message: string): CQCode[] {
    const segments: CQCode[] = []
    const regex = /\[CQ:([^,\]]+)(?:,([^\]]*))?\]/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(message)) !== null) {
        // 添加前面的文本
        if (match.index > lastIndex) {
            const text = message.slice(lastIndex, match.index)
            if (text) {
                segments.push({ type: 'text', data: { text } })
            }
        }

        // 解析 CQ 码参数
        const type = match[1]
        const paramStr = match[2] || ''
        const data: Record<string, any> = {}

        if (paramStr) {
            const params = paramStr.split(',')
            for (const param of params) {
                const [key, value] = param.split('=', 2)
                if (key && value !== undefined) {
                    data[key] = decodeURIComponent(value)
                }
            }
        }

        segments.push({ type, data })
        lastIndex = regex.lastIndex
    }

    // 添加剩余的文本
    if (lastIndex < message.length) {
        const text = message.slice(lastIndex)
        if (text) {
            segments.push({ type: 'text', data: { text } })
        }
    }

    return segments
}

/**
 * 将 CQ 码转换为 OneBot 消息段
 */
export function cqCodeToOneBotMessage(cqCodes: CQCode[]): OneBotMessage[] {
    return cqCodes.map(cq => ({
        type: cq.type,
        data: cq.data
    }))
}
/**
 
* 查找最佳可用的 bot（当没有指定 selfId 时使用）
 */
async function findBestAvailableBot(bots: any[], isPrivate: boolean): Promise<any | null> {
    // 优先查找非 QQ 平台的 bot（因为 QQ 平台对主动消息有限制）
    const nonQQBots = bots.filter((bot: any) => bot.platform !== 'qq')
    const qqBots = bots.filter((bot: any) => bot.platform === 'qq')

    // 先尝试非 QQ 平台的 bot
    for (const bot of nonQQBots) {
        if (isPrivate && (bot.sendPrivateMessage || bot.sendMessage)) {
            return bot
        } else if (!isPrivate && bot.sendMessage) {
            return bot
        }
    }

    // 如果没有找到非 QQ 平台的 bot，再尝试 QQ 平台的 bot
    for (const bot of qqBots) {
        if (isPrivate && (bot.sendPrivateMessage || bot.sendMessage)) {
            return bot
        } else if (!isPrivate && bot.sendMessage) {
            return bot
        }
    }

    return null
}