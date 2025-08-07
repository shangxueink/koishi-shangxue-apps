
import { OneBotMessage, OneBotNoticeEvent, OneBotRequestEvent, CQCode } from './types'
import { h, Session } from 'koishi'

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