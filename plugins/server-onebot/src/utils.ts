import { OneBotMessage, OneBotNoticeEvent, OneBotRequestEvent, CQCode } from './types'
import { logInfo, loggerError, loggerInfo } from './index'
import { h, Session } from 'koishi'


const recentSessionsMap = new Map<string, {
  session: any,
  timestamp: number,
  channelId: string,
  userId: string | null,
  isPrivate: boolean,
  platform: string,
  selfId: string
}>()




export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}




export async function sessionToOneBotEvent(session: Session, ctx: any, configSelfId?: string): Promise<any | null> {
  const baseEvent = {
    time: Math.floor((session.timestamp || Date.now()) / 1000),
    self_id: configSelfId ? (parseInt(configSelfId) || configSelfId) : (parseInt(session.selfId) || session.selfId),
  }

  switch (session.type) {
    case 'message':
    case 'message-created':
      return await createMessageEvent(session, baseEvent, ctx, configSelfId)

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




async function createMessageEvent(session: Session, baseEvent: any, ctx: any, configSelfId?: string): Promise<any> {

  const isGroupMessage = !session.isDirect && (session.guildId || session.channelId)

  const userId = await encodeStringId(session.userId, ctx)


  const useStripped = session.platform === 'qq' || session.platform === 'qqguild'
  const rawMessage = useStripped
    ? (session.stripped?.content || session.content || '')
    : (session.content || '')

  const event: any = {
    post_type: 'message',
    message_type: isGroupMessage ? 'group' : 'private',
    sub_type: isGroupMessage ? 'normal' : 'friend',
    message_id: parseInt(session.messageId) || session.messageId || generateId(),
    user_id: userId,
    message: await elementsToOneBotMessage(session.elements || [], ctx, session.platform),
    raw_message: rawMessage,
    font: 0,
    sender: {
      user_id: userId,
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


  if (isGroupMessage) {
    const groupId = session.guildId || session.channelId
    event.group_id = await encodeChannelId(groupId, ctx)
  }

  return event
}




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




function getMemberRole(session: Session): 'owner' | 'admin' | 'member' {
  if (session.author?.roles?.some(role => String(role) === 'owner')) return 'owner'
  if (session.author?.roles?.some(role => String(role) === 'admin')) return 'admin'
  return 'member'
}




export async function elementsToOneBotMessage(elements: h[], ctx: any, platform?: string): Promise<OneBotMessage[]> {
  const result: OneBotMessage[] = []

  for (const element of elements) {

    if ((platform === 'qq' || platform === 'qqguild') && element.type === 'at' && element.attrs.type !== 'all') {
      continue
    }

    const segment = await elementToSegment(element, ctx)
    if (segment) {
      result.push(segment)
    }
  }

  return result
}




async function elementToSegment(element: h, ctx: any): Promise<OneBotMessage | null> {
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
        const encodedId = await encodeStringId(element.attrs.id, ctx)
        return {
          type: 'at',
          data: {
            qq: encodedId || element.attrs.id,
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

      return {
        type: 'text',
        data: { text: `[${element.type}]` }
      }
  }
}




export async function oneBotMessageToElements(message: string | OneBotMessage[], ctx: any): Promise<h[]> {
  if (typeof message === 'string') {
    return [h.text(message)]
  }


  const hasForwardNodes = message.some(seg => seg.type === 'node')

  if (hasForwardNodes) {

    const messageElements: h[] = []

    for (const segment of message) {
      if (segment.type === 'node') {
        const nodeElements = await processForwardNode(segment, ctx)
        messageElements.push(...nodeElements)
      } else {

        const element = await segmentToElement(segment, ctx)
        if (element) {
          messageElements.push(element)
        }
      }
    }


    return [h('figure', messageElements)]
  }


  const elements: h[] = []
  for (const segment of message) {
    const element = await segmentToElement(segment, ctx)
    if (element) {
      elements.push(element)
    }
  }

  return elements
}








async function processForwardNode(segment: OneBotMessage, ctx: any): Promise<h[]> {
  const nodeData = segment.data

  if (!nodeData) {
    return []
  }


  if (nodeData.content) {

    const contentElements = await oneBotMessageToElements(nodeData.content, ctx)


    const attrs: Record<string, any> = {}


    if (nodeData.uin || nodeData.user_id) {
      const userId = nodeData.uin || nodeData.user_id

      const decodedUserId = await decodeStringId(userId, ctx)
      attrs.userId = decodedUserId || userId
    }


    if (nodeData.name || nodeData.nickname) {
      attrs.nickname = nodeData.name || nodeData.nickname
    }


    return [h('message', attrs, contentElements)]
  }

  else if (nodeData.id) {
    logInfo('Forward node with message id is not fully supported: %s', nodeData.id)
    return [h.text(`[ ID: ${nodeData.id}]`)]
  }

  return []
}




function convertBase64Url(url: string, mimeType: string): string {
  if (url && url.startsWith('base64://')) {
    const base64Data = url.slice(9)
    return `data:${mimeType};base64,${base64Data}`
  }
  return url
}




export async function encodeStringId(stringId: string, ctx: any): Promise<number> {
  try {

    const bindings = await ctx.database.get('binding', {
      pid: stringId,
    })

    if (bindings.length > 0) {

      return bindings[0].aid
    } else {
      return null
    }
  } catch (error) {
    loggerError('Error in encodeStringId:', error)
    return null
  }
}




export async function decodeStringId(id: number | string, ctx: any): Promise<string> {
  let aid: number


  if (typeof id === 'string') {

    aid = parseInt(id, 10)

    if (isNaN(aid) || aid.toString() !== id) {
      return id
    }
  } else {
    aid = id

    if (isNaN(aid)) {
      return 'unknown'
    }
  }

  try {

    const bindings = await ctx.database.get('binding', {
      aid: aid
    })

    if (bindings.length > 0) {

      return bindings[0].pid
    } else {
      return null
    }
  } catch (error) {
    loggerError('Error in decodeStringId:', error)

    return aid.toString()
  }
}




export async function encodeChannelId(channelId: string, ctx: any): Promise<number> {
  try {

    const bindings = await ctx.database.get('bindingchannel', {
      channelId: channelId,
    })

    if (bindings.length > 0) {

      return bindings[0].aid
    } else {

      const existingChannels = await ctx.database.get('bindingchannel', {})
      const maxId = existingChannels.length > 0
        ? Math.max(...existingChannels.map(row => row.aid || 0))
        : 0
      const newaid = maxId + 1

      await ctx.database.create('bindingchannel', {
        channelId: channelId,
        aid: newaid,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      return newaid
    }
  } catch (error) {
    loggerError('Error in encodeChannelId:', error)
    return null
  }
}




export async function decodeChannelId(id: number | string, ctx: any): Promise<string> {
  let aid: number


  if (typeof id === 'string') {

    aid = parseInt(id, 10)

    if (isNaN(aid) || aid.toString() !== id) {
      return id
    }
  } else {
    aid = id

    if (isNaN(aid)) {
      return 'unknown'
    }
  }

  try {

    const bindings = await ctx.database.get('bindingchannel', {
      aid: aid
    })

    if (bindings.length > 0) {

      return bindings[0].channelId
    } else {
      return null
    }
  } catch (error) {
    loggerError('Error in decodeChannelId:', error)

    return aid.toString()
  }
}




async function segmentToElement(segment: OneBotMessage, ctx: any): Promise<h | null> {
  switch (segment.type) {
    case 'text':
      return h.text(segment.data.text || '')

    case 'at':
      if (segment.data.qq === 'all') {
        return h('at', { type: 'all' })
      } else {

        const originalUserId = await decodeStringId(segment.data.qq as number, ctx)
        return h.at(originalUserId || segment.data.qq, { name: segment.data.name })
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

      return h.text(`[${segment.type}]`)
  }
}




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


  const recentSessions = getRecentSessions()


  const matchingSessions = findAllMatchingSessions(recentSessions, targetChannelId, targetUserId, isPrivate)

  let matchingSession = null
  if (matchingSessions.length > 0) {

    const atSelfSessions = matchingSessions.filter(session => session.isAtSelf)
    if (atSelfSessions.length > 0) {

      atSelfSessions.sort((a, b) => b.timestamp - a.timestamp)
      matchingSession = atSelfSessions[0]
    } else {

      matchingSessions.sort((a, b) => b.timestamp - a.timestamp)
      matchingSession = matchingSessions[0]
    }
  }

  if (matchingSession) {
    try {

      const sessionAge = Date.now() - matchingSession.timestamp
      const maxAge = 2 * 60 * 1000

      if (sessionAge < maxAge) {

        const result = await matchingSession.session.send(elements)
        if (result && (Array.isArray(result) ? result.length > 0 : true)) {
          logInfo('Successfully sent message using session.send (passive message)')
          return result
        }
      } else {
        logInfo(`Session expired (age: ${sessionAge}ms, max: ${maxAge}ms), falling back to active message`)
      }
    } catch (error) {

      loggerError('Session.send failed, falling back to active message sending:', error.message)
    }


    selfId = matchingSession.selfId
    logInfo(`Using selfId from matching session: ${selfId}`)
  } else {
    logInfo('No matching session found, using active message sending')
  }


  return await sendActiveMessage(ctx, targetChannelId, targetUserId, elements, isPrivate, selfId)
}




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


  if (selfId) {
    targetBot = Object.values(ctx.bots).find((b: any) => b.selfId === selfId)
  }


  if (!targetBot && targetChannelId && ctx.database) {
    try {

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


      if (!targetBot) {
        const channelprivates = await ctx.database.get('channelprivate', {
          channelId: targetChannelId
        })

        if (channelprivates.length > 0) {
          const botSelfId = channelprivates[0].botSelfId
          targetBot = Object.values(ctx.bots).find((b: any) => b.selfId === botSelfId)
          if (targetBot) {
            logInfo(`Found bot by channelprivate: ${targetBot.selfId}(${targetBot.platform})`)
          }
        }
      }
    } catch (error) {
      loggerError(`Error querying database: ${error.message}`)
    }
  }

  if (!targetBot) {
    throw new Error(`No suitable bot found for sending message${selfId ? ` (requested selfId: ${selfId})` : ''}`)
  }

  logInfo(`Using bot: ${targetBot.selfId} (platform: ${targetBot.platform}) for ${isPrivate ? 'private' : 'group'} message`)

  if (isPrivate && targetUserId) {
    return await sendPrivateMessageWithPlatformAdaptation(targetBot, targetUserId, elements)
  } else {
    return await sendGroupMessageWithPlatformAdaptation(targetBot, targetChannelId, elements)
  }
}




async function sendPrivateMessageWithPlatformAdaptation(
  bot: any,
  userId: string,
  elements: any[]
): Promise<string | string[]> {

  if (bot.platform === 'qq') {
    try {

      if (bot.sendPrivateMessage) {
        return await bot.sendPrivateMessage(userId, elements)
      }
    } catch (error) {

      loggerError('QQ platform sendPrivateMessage failed:', error.message)

      throw new Error(`QQ platform private messaging failed (may require msg_id from recent session): ${error.message}`)
    }
  }


  const channelFormats = [
    `private:${userId}`,
    userId,

  ]

  for (const channelId of channelFormats) {
    try {
      const result = await bot.sendMessage(channelId, elements)
      if (result && (Array.isArray(result) ? result.length > 0 : true)) {
        return result
      }
    } catch (error) {

      continue
    }
  }

  throw new Error('Failed to send private message with all methods')
}




async function sendGroupMessageWithPlatformAdaptation(
  bot: any,
  channelId: string,
  elements: any[]
): Promise<string | string[]> {

  if (bot.platform === 'qq') {
    try {

      if (bot.sendMessage) {
        return await bot.sendMessage(channelId, elements)
      }
    } catch (error) {
      loggerError('QQ platform group message failed:', error.message)

      throw new Error(`QQ platform active messaging failed (may require msg_id from recent session): ${error.message}`)
    }
  }


  const channelFormats = [
    channelId,
    `public:${channelId}`,
    `group:${channelId}`,
    `channel:${channelId}`,

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




export function storeRecentSession(session: any) {
  const key = `${session.platform}-${session.selfId}-${session.channelId || session.userId}-${session.messageId || Date.now()}-${Math.random()}`
  const sessionData = {
    session,
    timestamp: Date.now(),
    channelId: session.channelId,
    userId: session.userId,
    isPrivate: session.isDirect || false,
    platform: session.platform,
    selfId: session.selfId,
    isAtSelf: session.stripped?.atSelf || false
  }

  recentSessionsMap.set(key, sessionData)


  const fiveMinutesAgo = Date.now() - (2 * 60 * 1000)
  for (const [k, v] of recentSessionsMap.entries()) {
    if (v.timestamp < fiveMinutesAgo) {
      recentSessionsMap.delete(k)
    }
  }
}




export function getRecentSessions() {
  const fiveMinutesAgo = Date.now() - (2 * 60 * 1000)
  const recentSessions = []

  for (const [key, sessionData] of recentSessionsMap.entries()) {
    if (sessionData.timestamp >= fiveMinutesAgo) {
      recentSessions.push(sessionData)
    }
  }

  return recentSessions
}




function findAllMatchingSessions(
  recentSessions: any[],
  targetChannelId: string,
  targetUserId: string | null,
  isPrivate: boolean
) {
  const matchingSessions = []

  for (const sessionData of recentSessions) {
    if (isPrivate) {

      if (sessionData.isPrivate && sessionData.userId === targetUserId) {
        matchingSessions.push(sessionData)
      }
    } else {

      if (!sessionData.isPrivate && sessionData.channelId === targetChannelId) {
        matchingSessions.push(sessionData)
      }
    }
  }

  return matchingSessions
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




export function parseCQCode(message: string): CQCode[] {
  const segments: CQCode[] = []
  const regex = /\[CQ:([^,\]]+)(?:,([^\]]*))?\]/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(message)) !== null) {

    if (match.index > lastIndex) {
      const text = message.slice(lastIndex, match.index)
      if (text) {
        segments.push({ type: 'text', data: { text } })
      }
    }


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


  if (lastIndex < message.length) {
    const text = message.slice(lastIndex)
    if (text) {
      segments.push({ type: 'text', data: { text } })
    }
  }

  return segments
}




export function cqCodeToOneBotMessage(cqCodes: CQCode[]): OneBotMessage[] {
  return cqCodes.map(cq => ({
    type: cq.type,
    data: cq.data
  }))
}
