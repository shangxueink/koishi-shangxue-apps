// Satori 连接适配层：向现有 UI 暴露兼容的 Connector 接口。

import { reactive } from 'vue'
import { dispatch, msgPreprocess } from './msg'
import {
  connect as connectSatori,
  getActiveBot,
  getBootstrap,
  getLogins,
  request,
  requestConsole,
  setActiveBot,
  type SatoriEvent,
} from './satori'
import {
  mapAction,
  satoriEventToOneBot,
  satoriResponseToOneBot,
} from './satori-model'
import { buildForwardMessage } from './sender'
import { Logger, LogType } from './base'
import { isDebugMode } from './debug'
import { useAuthStore } from '../state/auth'
import { useChatStore } from '../state/chat'
import { useContactStore } from '../state/contact'
import { useSettingsStore } from '../state/settings'
import { getMsgRawTxt, hasAtMe, updateBaseOnMsgList } from './utils/msgUtil'
import { normalizeSessionId, setSessionContact } from './utils/sessionUtil'
import { buildQqGroupAvatar } from './utils/avatarUtil'
import type { ConnectionHistoryItem, LoginCacheElem } from './elements/system'
import type { UserFriendElem, UserGroupElem } from './elements/information'

const HISTORY_KEY = 'chat-patch:connection-history'
const logger = new Logger()
const unsupportedMethods = new Set<string>()

function encodeKeyPart(value: string): string {
  return encodeURIComponent(value)
}

function getChannelKind(value: unknown): 'group' | 'direct' | 'unknown' {
  if (typeof value === 'number') {
    if (value === 0) return 'group'
    if (value === 1) return 'direct'
    return 'unknown'
  }
  if (typeof value === 'string' && value !== '') {
    const num = Number(value)
    if (Number.isFinite(num)) {
      if (num === 0) return 'group'
      if (num === 1) return 'direct'
      return 'unknown'
    }
    const lower = value.toLowerCase()
    if (['text', 'group', 'room', 'chat', 'channel'].includes(lower)) return 'group'
    if (lower === 'direct' || lower === 'private') return 'direct'
  }
  return 'unknown'
}

function isGroupMessage(msg: Record<string, unknown>): boolean {
  const kind = getChannelKind(msg.channel_type)
  if (kind !== 'unknown') return kind === 'group'
  const messageType = getString(msg.message_type)
  if (messageType) return messageType === 'group'
  return Boolean(msg.group_id)
}

function isPrivateMessage(msg: Record<string, unknown>): boolean {
  const kind = getChannelKind(msg.channel_type)
  if (kind !== 'unknown') return kind === 'direct'
  const messageType = getString(msg.message_type)
  if (messageType) return messageType === 'private'
  return !Boolean(msg.group_id)
}

function identityDebug(...args: unknown[]) {
  if (isDebugMode()) {
    console.log('[chat-patch-identity]', ...args)
  }
}

interface CachedIdentityInfo {
  name: string
  avatar: string
  raw: Record<string, unknown>
}

const identityInfoCache = new Map<string, CachedIdentityInfo>()
const identityInflight = new Set<string>()

function identityCacheKey(prefix: string, platform: string, selfId: string, id: string) {
  return [prefix, platform, selfId, id].map(encodeKeyPart).join(':')
}

function markIdentityLookup(key: string, _hasAvatar: boolean, info?: CachedIdentityInfo) {
  // 缺失也记录一次，避免同一会话内反复回源
  identityInfoCache.set(key, info ?? { name: '', avatar: '', raw: {} })
}

function hasIdentityData(info: CachedIdentityInfo | undefined): boolean {
  // 未查询过时允许回源；只有明确空结果才跳过
  return !info || Boolean(info.name || info.avatar)
}

export function getCachedUserAvatar(platform: string, selfId: string, userId: string): string {
  if (userId === selfId) {
    const login = getLogins().find((item) => {
      return item.platform === platform && item.selfId === selfId
    })
    if (hasUsableAvatar(login?.avatar)) return getString(login.avatar)
  }
  const info = identityInfoCache.get(identityCacheKey('user', platform, selfId, userId))
  return hasUsableAvatar(info?.avatar) ? getString(info.avatar) : ''
}

export function requestUserAvatar(
  platform: string,
  selfId: string,
  userId: string,
  msg: Record<string, unknown>,
) {
  if (!userId || userId === '0') return
  void fetchUserIdentity(platform, selfId, userId, null, msg)
}

export let websocket: WebSocket | undefined = undefined
let disposeConnection: (() => void) | null = null
const pendingBotEvents = new Map<string, SatoriEvent[]>()

function botEventKey(platform: string, selfId: string) {
  return [platform, selfId].map(encodeKeyPart).join(':')
}

function isActiveBot(bot: { platform: string; selfId: string }) {
  const active = getActiveBot()
  return Boolean(active && active.platform === bot.platform && active.selfId === bot.selfId)
}

function isCurrentBotEvent(event: SatoriEvent) {
  const active = getActiveBot()
  return Boolean(
    active &&
    event.platform === active.platform &&
    event.selfId === active.selfId,
  )
}

function readHistory(): ConnectionHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const parsed = raw ? JSON.parse(raw) as unknown : []
    return Array.isArray(parsed) ? parsed as ConnectionHistoryItem[] : []
  } catch {
    return []
  }
}

function writeHistory(history: ConnectionHistoryItem[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

export const login: LoginCacheElem = reactive({
  quickLogin: null,
  address: '',
  token: '',
  status: false,
  creating: false,
  connectionHistory: readHistory(),
})

export function appendAccessToken(url: string, token?: string): string {
  if (!token) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}access_token=${encodeURIComponent(token)}`
}

export function decodeStoredToken(token: string): string {
  return token
}

function setJsonMap() {
  const authStore = useAuthStore()
  authStore.jsonMap = {
    version_info: '$.data',
    login_info: {
      uin: '$.data.user_id',
      nickname: '$.data.nickname',
    },
    message_list: {
      name: 'get_group_msg_history',
      private_name: 'get_friend_msg_history',
      source: '$.data.messages[*]',
      type: '$.data',
      pagerType: 'full',
      message_value: {
        image: { url: '$.file' },
      },
      list: {
        message_id: '/message_id',
        message_type: '/message_type',
        time: '/time',
        group_id: '/group_id',
        sender: '/sender',
        message: '/message',
        raw_message: '/raw_message',
      },
    },
    message_info: {
      message_id: '$.message_id',
      private_id: '$.user_id',
      group_id: '$.group_id',
      target_id: '$.target_id',
      sender: '$.sender.user_id',
    },
  }
}

function pickAvatar(entity: Record<string, unknown>, root: Record<string, unknown>): string {
  return getString(entity.avatar)
    || getString(root.avatar)
    || getString(entity.avatar_url)
    || getString(root.avatar_url)
    || getString(entity.avatarUrl)
    || getString(root.avatarUrl)
    || getString(entity.icon)
    || getString(root.icon)
}

function hasUsableAvatar(value: unknown): boolean {
  const avatar = getString(value)
  if (!avatar || avatar === '/img/icons/icon.svg') return false
  if (avatar.includes('/proxy/chatfile') || avatar.includes('proxy/chatfile')) {
    try {
      const parsed = new URL(avatar, location.origin)
      return Boolean(parsed.searchParams.get('url'))
    } catch {
      return false
    }
  }
  return true
}

function applyUserIdentity(
  userId: string,
  session: Record<string, unknown> | null,
  msg: Record<string, unknown>,
  name: string,
  avatar: string,
  channelId = '',
) {
  if (name && session) {
    session.nickname = name
    session.remark = name
  }
  if (avatar && session) session.avatar = avatar
  if (channelId && session && !getString(session.channel_id)) {
    session.channel_id = channelId
  }
  if (msg.sender && typeof msg.sender === 'object') {
    const sender = getObject(msg.sender)
    if (avatar) sender.avatar = avatar
    if (name) sender.nickname = name
  }
  syncUserIdentity(userId, name, avatar, channelId)
  const chatStore = useChatStore()
  const applySenderAvatar = (item: Record<string, unknown>) => {
    const itemSender = getObject(item.sender)
    if (String(itemSender.user_id) !== userId) return
    if (avatar) itemSender.avatar = avatar
    if (name) itemSender.nickname = name
  }
  chatStore.messageList.forEach(applySenderAvatar)
  for (const messages of chatStore.sessionMessageCache.values()) {
    messages.forEach(applySenderAvatar)
  }
}

function syncUserIdentity(userId: string, name: string, avatar: string, channelId = '') {
  const contactStore = useContactStore()
  const applyUser = (target: Record<string, unknown>) => {
    if (name) {
      target.nickname = name
      target.remark = name
    }
    if (avatar) target.avatar = avatar
    else if (target.avatar && !hasUsableAvatar(target.avatar)) delete target.avatar
    if (channelId) {
      if (!getString(target.channel_id)) target.channel_id = channelId
      if (!getString(target.channelId)) target.channelId = channelId
    }
  }
  const globalSession = contactStore.baseOnMsgList.get(String(userId))
  if (globalSession) {
    applyUser(globalSession as unknown as Record<string, unknown>)
    contactStore.baseOnMsgList.set(String(userId), globalSession)
  }
  const globalItem = contactStore.onMsgList.find((item) => {
    return String(item.user_id) === userId
  })
  if (globalItem) {
    applyUser(globalItem as unknown as Record<string, unknown>)
    contactStore.onMsgList = [...contactStore.onMsgList]
  }
  const friendItem = contactStore.userList.find((item) => {
    return String(item.user_id) === userId
  })
  if (friendItem) {
    applyUser(friendItem as unknown as Record<string, unknown>)
    contactStore.userList = [...contactStore.userList]
  }
  updateBaseOnMsgList()
}

function syncGroupIdentity(
  sessionId: string,
  apply: (target: Record<string, unknown>) => void,
) {
  const contactStore = useContactStore()
  const globalSession = contactStore.baseOnMsgList.get(String(sessionId))
  if (globalSession) {
    apply(globalSession as unknown as Record<string, unknown>)
    contactStore.baseOnMsgList.set(String(sessionId), globalSession)
  }
  const globalItem = contactStore.onMsgList.find((item) => {
    return String(item.group_id) === sessionId
  })
  if (globalItem) {
    apply(globalItem as unknown as Record<string, unknown>)
    contactStore.onMsgList = [...contactStore.onMsgList]
  }
  const groupItem = contactStore.userList.find((item) => {
    return String(item.group_id) === sessionId
  })
  if (groupItem) {
    apply(groupItem as unknown as Record<string, unknown>)
    contactStore.userList = [...contactStore.userList]
  }
  updateBaseOnMsgList()
}

function updateBotStateGroup(
  platform: string,
  selfId: string,
  sessionId: string,
  apply: (target: Record<string, unknown>) => void,
) {
  const contactStore = useContactStore()
  const state = contactStore.botStates.get(selfId)
  const session = state?.onMsgList.find((item) => String(item.group_id) === sessionId)
  if (!state || !session) return
  apply(session as unknown as Record<string, unknown>)
  const key = normalizeSessionId(String(session.channel_id ?? session.channelId ?? sessionId))
  const baseList = [...state.baseList]
  const baseIndex = baseList.findIndex(([baseKey]) => normalizeSessionId(String(baseKey)) === key)
  const typedSession = session as unknown as UserFriendElem & UserGroupElem
  if (baseIndex >= 0) {
    baseList[baseIndex] = [key, typedSession]
  } else {
    baseList.push([key, typedSession])
  }
  contactStore.botStates.set(selfId, {
    userList: [...state.userList],
    baseList,
    onMsgList: [...state.onMsgList],
  })
}

async function resolveGroupIdentity(
  platform: string,
  selfId: string,
  sessionId: string,
  guildId: string,
  channelId: string,
  session: Record<string, unknown>,
  msg: Record<string, unknown>,
) {
  if (!sessionId || sessionId === '0') return
  const key = identityCacheKey('group', platform, selfId, sessionId)
  const cachedInfo = identityInfoCache.get(key)
  if (!hasIdentityData(cachedInfo)) {
    identityDebug('group identity: skipped', { platform, selfId, sessionId, key })
    return
  }

  const eventName = typeof msg.group_name === 'string' ? msg.group_name : ''
  const eventAvatar = hasUsableAvatar(
    typeof msg.group_avatar === 'string' ? msg.group_avatar : '',
  ) ? (typeof msg.group_avatar === 'string' ? msg.group_avatar : '') : ''
  const generatedAvatar = buildQqGroupAvatar(platform, sessionId)
  identityDebug('group identity: request cache', { platform, selfId, sessionId, guildId, channelId })
  const cacheResult = await requestIdentityCache({
    platform,
    selfId,
    type: 'group',
    id: sessionId,
    guildId,
    channelId,
    name: eventName,
    avatar: eventAvatar || generatedAvatar,
    channelType: msg.channel_type,
  }).catch(() => null)
  const cached = getObject(cacheResult)
  const cachedName = getString(cached.name)
  const cachedAvatar = hasUsableAvatar(cached.avatar)
    ? getString(cached.avatar)
    : generatedAvatar
  const cachedChannelId = getString(cached.channel_id) || getString(cached.channelId) || channelId
  const cachedGuildId = getString(cached.guild_id) || getString(cached.guildId) || guildId
  if (cachedName || cachedAvatar) {
    const cachedApply = (target: Record<string, unknown>) => {
      if (cachedName) target.group_name = cachedName
      if (cachedAvatar) target.avatar = cachedAvatar
      if (cachedChannelId) target.channel_id = cachedChannelId
      if (cachedGuildId) target.guild_id = cachedGuildId
    }
    cachedApply(session)
    syncGroupIdentity(sessionId, cachedApply)
    updateBotStateGroup(platform, selfId, sessionId, cachedApply)
    markIdentityLookup(key, true, { name: cachedName || sessionId, avatar: cachedAvatar, raw: cached })
    return
  }

  // 后端回源失败时只使用事件自带的字段，不再每次消息都请求 guild/channel
  const name = eventName
  const avatar = eventAvatar || generatedAvatar
  if (!name && !avatar) {
    markIdentityLookup(key, false)
    return
  }

  const applyGroup = (target: Record<string, unknown>) => {
    if (name) target.group_name = name
    if (avatar) target.avatar = avatar
    else if (target.avatar && !hasUsableAvatar(target.avatar)) delete target.avatar
    if (channelId) target.channel_id = channelId
    if (guildId) target.guild_id = guildId
  }
  applyGroup(session)
  syncGroupIdentity(sessionId, applyGroup)
  updateBotStateGroup(platform, selfId, sessionId, applyGroup)
  markIdentityLookup(key, true, { name, avatar, raw: { group_name: name, avatar } })
}

async function fetchUserIdentity(
  platform: string,
  selfId: string,
  userId: string,
  session: Record<string, unknown> | null,
  msg: Record<string, unknown>,
) {
  if (!userId || userId === '0') return
  const key = identityCacheKey('user', platform, selfId, userId)
  const inflightKey = `user:${key}`
  if (identityInflight.has(inflightKey)) return
  identityInflight.add(inflightKey)
  try {
    if (userId === selfId) {
      const login = getLogins().find((item) => {
        return item.platform === platform && item.selfId === selfId
      })
      if (login) {
        const loginName = login.name || userId
        const loginAvatar = login.avatar || ''
        applyUserIdentity(userId, session, msg, loginName, loginAvatar)
        markIdentityLookup(key, true, {
          name: loginName,
          avatar: loginAvatar,
          raw: {
            id: userId,
            user_id: userId,
            nickname: loginName,
            name: loginName,
            avatar: loginAvatar,
          },
        })
        return
      }
    }
    const cachedInfo = identityInfoCache.get(key)
    if (!hasIdentityData(cachedInfo)) {
      identityDebug('user identity: skipped', {
        platform,
        selfId,
        userId,
      })
      return
    }

    const guildId = getString(msg.guild_id) || getString(msg.group_id)
    const isPrivate = isPrivateMessage(msg)
    const channelId = isPrivate
      ? (getString(msg.channel_id) || `private:${userId}`)
      : ''
    const sender = getObject(msg.sender)
    const senderName = getString(sender.nickname) || getString(sender.card) || getString(sender.name)
    const senderAvatar = hasUsableAvatar(sender.avatar) ? getString(sender.avatar) : ''
    identityDebug('user identity: request cache', { platform, selfId, userId, guildId, channelId, senderName })
    const data = await requestIdentityCache({
      platform,
      selfId,
      type: 'user',
      id: userId,
      guildId,
      channelId: channelId || undefined,
      name: senderName,
      avatar: senderAvatar,
    }).catch(() => null)
    const root = getObject(data)
    const name = getString(root.name)
      || getString(root.nick)
      || getString(root.nickname)
      || getString(root.username)
    const avatar = hasUsableAvatar(root.avatar) ? getString(root.avatar) : ''
    identityDebug('user identity: cache result', { platform, selfId, userId, name, avatar })
    if (!name && !avatar) {
      markIdentityLookup(key, false)
      return
    }

    const cachedChannelId = getString(root.channel_id) || getString(root.channelId) || channelId
    applyUserIdentity(userId, session, msg, name, avatar, cachedChannelId)
    markIdentityLookup(key, true, { name, avatar, raw: root })
  } finally {
    identityInflight.delete(inflightKey)
  }
}

function recordBotMessage(platform: string, selfId: string, msg: Record<string, unknown>) {
  if (!msg.local_time) msg.local_time = Date.now()
  if (!msg.timestamp_ms) msg.timestamp_ms = Number(msg.time) * 1000 || Date.now()
  identityDebug('recordBotMessage: enter', {
    platform,
    selfId,
    post_type: msg.post_type,
    message_type: msg.message_type,
    group_id: msg.group_id,
    user_id: msg.user_id,
    channel_id: msg.channel_id,
    sender: msg.sender,
  })
  const isGroup = isGroupMessage(msg)
  const channelId = typeof msg.channel_id === 'string' ? msg.channel_id : ''
  const sessionId = String(
    msg.group_id
      || msg.user_id
      || (isGroup ? '' : channelId.replace(/^private:/, '')),
  )
  if (!sessionId || sessionId === '0') {
    identityDebug('recordBotMessage: skipped invalid session', { sessionId, msg })
    return
  }
  const sessionKey = String(channelId || sessionId)
  identityDebug('recordBotMessage: session', { sessionId })
  const sender = getObject(msg.sender)
  const hasSenderAvatar = hasUsableAvatar(sender.avatar)
  const senderId = String(
    sender.user_id
      || msg.user_id
      || (isGroup ? '' : channelId.replace(/^private:/, '')),
  )
  const raw = getMsgRawTxt(msg) || (typeof msg.raw_message === 'string' ? msg.raw_message : '')
  const senderName = String(sender.card || sender.nickname || (isGroup ? senderId : ''))
  const rawPreview = isGroup && senderName ? `${senderName}: ${raw}` : raw
  const cachedGroupInfo = isGroup
    ? identityInfoCache.get(identityCacheKey('group', platform, selfId, sessionId))
    : undefined
  const eventGroupName = typeof msg.group_name === 'string' ? msg.group_name : ''
  const eventGroupAvatar = hasUsableAvatar(msg.group_avatar) ? getString(msg.group_avatar) : ''
  const groupName = isGroup
    ? (eventGroupName || cachedGroupInfo?.name || sessionId)
    : undefined
  const groupAvatar = isGroup
    ? (eventGroupAvatar || cachedGroupInfo?.avatar || buildQqGroupAvatar(platform, sessionId) || undefined)
    : undefined
  const contactStore = useContactStore()
  const state = contactStore.botStates.get(selfId) ?? {
    userList: [],
    baseList: [],
    onMsgList: [],
  }
  const rawTime = Number(msg.time)
  const sessionTime = Number.isFinite(rawTime) && rawTime > 0 ? rawTime : Date.now() / 1000
  let session: Record<string, unknown> = {
    user_id: isGroup ? undefined : sessionId,
    group_id: isGroup ? sessionId : undefined,
    group_name: groupName,
    nickname: isGroup ? '' : String(sender.nickname ?? senderId ?? sessionId),
    remark: '',
    avatar: isGroup ? groupAvatar : (hasUsableAvatar(sender.avatar) ? getString(sender.avatar) : undefined),
    raw_msg: rawPreview,
    raw_msg_base: raw,
    highlight: hasAtMe(msg) ? '[有人@你]' : undefined,
    time: sessionTime,
    message_id: String(msg.message_id ?? ''),
    new_msg: true,
    channel_id: typeof msg.channel_id === 'string' ? msg.channel_id : undefined,
    guild_id: typeof msg.guild_id === 'string' ? msg.guild_id : undefined,
  }
  const existing = state.onMsgList.find((item) => {
    return isGroup
      ? String(item.group_id) === sessionId
      : String(item.user_id) === sessionId
  })
  if (existing) {
    const previousAvatar = existing.avatar
    const previousGroupName = existing.group_name
    const previousNickname = existing.nickname
    const previousRemark = existing.remark
    Object.assign(existing, session)
    if (!hasUsableAvatar(session.avatar) && hasUsableAvatar(previousAvatar)) {
      existing.avatar = previousAvatar
    }
    if (
      isGroup &&
      !msg.group_name &&
      previousGroupName &&
      String(previousGroupName) !== String(sessionId)
    ) {
      existing.group_name = previousGroupName
    }
    if (!isGroup && !sender.nickname && previousNickname) {
      existing.nickname = previousNickname
    }
    if (!isGroup && !existing.remark && previousRemark) {
      existing.remark = previousRemark
    }
    session = existing
  } else {
    state.onMsgList.unshift(session)
  }
  const baseKey = normalizeSessionId(sessionKey)
  const baseList = [...state.baseList]
  const baseIndex = baseList.findIndex(([key]) => normalizeSessionId(String(key)) === baseKey)
  const typedSession = session as unknown as UserFriendElem & UserGroupElem
  if (baseIndex >= 0) {
    baseList[baseIndex] = [baseKey, typedSession]
  } else {
    baseList.push([baseKey, typedSession])
  }
  contactStore.botStates.set(selfId, {
    userList: [...state.userList],
    baseList,
    onMsgList: [...state.onMsgList],
  })
  if (
    isActiveBot({ platform, selfId }) &&
    !contactStore.baseOnMsgList.has(normalizeSessionId(sessionKey))
  ) {
    setSessionContact(contactStore.baseOnMsgList, session as unknown as UserFriendElem & UserGroupElem)
    updateBaseOnMsgList()
  }

  const chatStore = useChatStore()
  const cacheKey = [platform, selfId, sessionId].map(encodeKeyPart).join(':')
  const messages = chatStore.sessionMessageCache.get(cacheKey) ?? []
  const messageId = String(msg.message_id ?? '')
  if (messageId && !messages.some((item) => String(item.message_id) === messageId)) {
    messages.push(msg)
    chatStore.sessionMessageCache.set(cacheKey, messages)
  }
  const currentShowId = String(chatStore.chatInfo.show.id ?? '')
  const currentShowType = String(chatStore.chatInfo.show.type ?? '')
  const msgChannelId = String(msg.channel_id ?? '')
  const showChannelId = String(chatStore.chatInfo.show.channel_id ?? '')
  const isCurrentChat = isActiveBot({ platform, selfId }) && (
    (isGroup && currentShowType === 'group' && String(sessionId) === currentShowId) ||
    (!isGroup && currentShowType === 'user' && String(sessionId) === currentShowId) ||
    (msgChannelId && showChannelId && msgChannelId === showChannelId)
  )
  if (
    isCurrentChat &&
    messageId &&
    !chatStore.messageList.some((item) => String(item.message_id) === messageId)
  ) {
    // 实时消息直接写入当前聊天窗口，避免依赖旧的消息解析链路
    chatStore.messageList.push(msg)
  }
  const knownSessionAvatar = contactStore.baseOnMsgList.get(normalizeSessionId(sessionKey))
    ?? contactStore.baseOnMsgList.get(normalizeSessionId(sessionId))
  const knownWithAvatar = hasUsableAvatar(session.avatar)
    || Boolean(
      knownSessionAvatar &&
      hasUsableAvatar(knownSessionAvatar.avatar) &&
      (isGroup
        ? knownSessionAvatar.group_id !== undefined
        : knownSessionAvatar.user_id !== undefined),
    )
  identityDebug('recordBotMessage', {
    platform,
    selfId,
    isGroup,
    sessionId,
    senderId,
    knownWithAvatar,
    sessionAvatar: session.avatar,
    baseAvatar: knownSessionAvatar?.avatar,
  })
  if (isGroup) {
    identityDebug('recordBotMessage: group identity branch', {
      sessionId,
      senderId,
      knownWithAvatar,
      hasSenderAvatar,
    })
    void resolveGroupIdentity(
      platform,
      selfId,
      sessionId,
      typeof msg.guild_id === 'string' ? msg.guild_id : '',
      channelId,
      session,
      msg,
    )
    if (senderId && senderId !== '0') {
      void fetchUserIdentity(platform, selfId, senderId, null, msg)
    }
  } else if (senderId && senderId !== '0') {
    identityDebug('recordBotMessage: private identity branch', {
      sessionId,
      senderId,
      knownWithAvatar,
      hasSenderAvatar,
    })
    void fetchUserIdentity(platform, selfId, senderId, session, msg)
  }
}

export function restoreBotStateFromMessageCache(platform: string, selfId: string) {
  const chatStore = useChatStore()
  const contactStore = useContactStore()
  const prefix = `${encodeKeyPart(platform)}:${encodeKeyPart(selfId)}:`
  const sessions: Array<UserFriendElem & UserGroupElem> = []
  for (const [key, messages] of chatStore.sessionMessageCache) {
    if (!key.startsWith(prefix)) continue
    const msg = messages[messages.length - 1]
    if (!msg) continue
    const isGroup = isGroupMessage(msg)
    const id = String(isGroup ? msg.group_id : msg.user_id)
    if (!id || id === '0') continue
    const sender = getObject(msg.sender)
    const senderId = getString(sender.user_id) || getString(msg.user_id) || ''
    const senderName = getString(sender.card) || getString(sender.nickname) || (isGroup ? senderId : '')
    const raw = getMsgRawTxt(msg) || (typeof msg.raw_message === 'string' ? msg.raw_message : '')
    const cachedGroupInfo = isGroup
      ? identityInfoCache.get(identityCacheKey('group', platform, selfId, id))
      : undefined
    const eventGroupAvatar = hasUsableAvatar(msg.group_avatar) ? getString(msg.group_avatar) : ''
    sessions.push({
      user_id: isGroup ? undefined : id,
      group_id: isGroup ? id : undefined,
      group_name: isGroup
        ? (getString(msg.group_name) || cachedGroupInfo?.name || id)
        : '',
      nickname: isGroup ? '' : getString(sender.nickname) || getString(sender.card) || id,
      remark: isGroup ? '' : getString(sender.nickname) || '',
      avatar: isGroup
        ? (eventGroupAvatar || cachedGroupInfo?.avatar || buildQqGroupAvatar(platform, id) || '')
        : hasUsableAvatar(sender.avatar) ? getString(sender.avatar) : '',
      raw_msg: isGroup && senderName ? `${senderName}: ${raw}` : raw,
      raw_msg_base: raw,
      highlight: hasAtMe(msg) ? '[有人@你]' : undefined,
      time: Number(msg.local_time ?? msg.timestamp_ms ?? (Number(msg.time) ? Number(msg.time) * 1000 : 0)),
      message_id: getString(msg.message_id),
      channel_id: getString(msg.channel_id),
      guild_id: getString(msg.guild_id),
    } as UserFriendElem & UserGroupElem)
  }
  if (!sessions.length) return

  const state = contactStore.botStates.get(selfId) ?? {
    userList: [],
    baseList: [],
    onMsgList: [],
  }
  const baseList = [...state.baseList]
  const baseKeys = new Set(baseList.map(([key]) => normalizeSessionId(key)))
  const existing = new Set(state.onMsgList.map((item) => {
    return String(item.channel_id ?? item.channelId ?? item.user_id ?? item.group_id ?? '')
  }))
  for (const session of sessions) {
    const id = String(session.channel_id ?? session.channelId ?? session.user_id ?? session.group_id ?? '')
    if (id && !existing.has(id)) {
      state.onMsgList.unshift(session)
      existing.add(id)
    }
    if (id && !baseKeys.has(normalizeSessionId(id))) {
      baseList.push([normalizeSessionId(id), session])
      baseKeys.add(normalizeSessionId(id))
    }
  }
  contactStore.botStates.set(selfId, {
    userList: [...state.userList],
    baseList,
    onMsgList: [...state.onMsgList],
  })
}

function onSatoriEvent(event: SatoriEvent) {
  const oneBot = satoriEventToOneBot(event.body, String(event.platform || ''))
  if (oneBot) {
    oneBot._rawSatori = {
      type: event.type,
      platform: event.platform,
      selfId: event.selfId,
      timestamp: event.timestamp,
      sn: event.sn,
      body: event.body,
    }
  }
  identityDebug('satori event', { event, oneBot })
  if (!oneBot) return
  if (!isCurrentBotEvent(event)) {
    const key = botEventKey(event.platform, event.selfId)
    const events = pendingBotEvents.get(key) ?? []
    events.push(event)
    if (events.length > 500) events.splice(0, events.length - 500)
    pendingBotEvents.set(key, events)
  }
  if (oneBot.post_type === 'message' || oneBot.post_type === 'message_sent') {
    void msgPreprocess(oneBot, {
      platform: String(event.platform || oneBot.platform || ''),
      selfId: String(event.selfId || oneBot.self_id || ''),
    }).then((processed) => {
      if (!processed) return
      recordBotMessage(event.platform, event.selfId, processed)
      // 只有当前机器人写入全局 UI；其他机器人仍在上方实时记录。
      if (isCurrentBotEvent(event)) {
        dispatch(processed)
      }
    }).catch(() => {
      recordBotMessage(event.platform, event.selfId, oneBot)
      if (isCurrentBotEvent(event)) {
        dispatch(oneBot)
      }
    })
  } else if (isCurrentBotEvent(event)) {
    dispatch(oneBot)
  }
}

export function flushPendingBotEvents(platform: string, selfId: string) {
  const key = botEventKey(platform, selfId)
  const events = pendingBotEvents.get(key)
  if (!events?.length) return
  pendingBotEvents.delete(key)
  for (const event of events) {
    const oneBot = satoriEventToOneBot(event.body, String(event.platform || ''))
    if (oneBot) {
      oneBot._rawSatori = {
        type: event.type,
        platform: event.platform,
        selfId: event.selfId,
        timestamp: event.timestamp,
        sn: event.sn,
        body: event.body,
      }
    }
    if (oneBot) {
      void msgPreprocess(oneBot, {
        platform: String(event.platform || oneBot.platform || ''),
        selfId: String(event.selfId || oneBot.self_id || ''),
      }).then((processed) => {
        if (processed) dispatch(processed)
      }).catch(() => {
        dispatch(oneBot)
      })
    }
  }
}

function onSatoriReady(logins: Array<{ platform: string; selfId: string; name: string; avatar?: string; features?: string[] }>) {
  login.creating = false
  login.status = true
  const authStore = useAuthStore()
  for (const item of logins) {
    if (!item.platform || !item.selfId) continue
    identityInfoCache.set(identityCacheKey('user', item.platform, item.selfId, item.selfId), {
      name: item.name || item.selfId,
      avatar: item.avatar || '',
      raw: {
        id: item.selfId,
        user_id: item.selfId,
        nickname: item.name || item.selfId,
        name: item.name || item.selfId,
        avatar: item.avatar || '',
      },
    })
  }
  const first = logins[0]
  if (!first) return

  setActiveBot(first.platform, first.selfId)
  setJsonMap()
  login.uin = first.selfId
  login.nickname = first.name
  login.platform = first.platform
  login.satoriLogins = logins
  login.selectedSatoriBot = first.selfId
  authStore.loginInfo = {
    uin: first.selfId,
    user_id: first.selfId,
    nickname: first.name,
    platform: first.platform,
    avatar: first.avatar,
    satoriLogins: logins,
    selectedSatoriBot: first.selfId,
  }
  authStore.botInfo = {
    app_name: 'Satori',
    app_version: '1.0',
    platform: first.platform,
  }
  saveConnectionToHistory(login.address, login.token, first.selfId, first.name)
  flushPendingBotEvents(first.platform, first.selfId)
  void loadContactsFromCache()
}

function contactId(item: unknown): string {
  const obj = getObject(item)
  const raw = String(obj.user_id ?? obj.group_id ?? obj.id ?? '')
  if (obj.user_id) return raw
  return normalizeGroupId(raw)
}

function normalizeGroupId(value: string): string {
  const raw = value.replace(/^(?:group|room|chat|channel|guild):/i, '').trim()
  const wrapped = raw.match(/^\[_?([\s\S]+?)_?\]$/)
  return wrapped ? wrapped[1] : raw || value
}

function contactName(item: unknown): string {
  const obj = getObject(item)
  return String(obj.nickname ?? obj.remark ?? obj.group_name ?? obj.name ?? '')
}

function contactCachePayload(item: unknown): Record<string, unknown> {
  const obj = getObject(item)
  return {
    id: contactId(obj),
    name: contactName(obj),
    channelId: getString(obj.channel_id) || getString(obj.channelId) || undefined,
    guildId: getString(obj.guild_id) || getString(obj.guildId) || undefined,
    raw: item,
  }
}

async function requestContactCache(params: {
  platform: string
  selfId: string
  type: string
  groupId?: string
  userId?: string
  contacts?: Record<string, unknown>[]
  append?: boolean
}) {
  if (!params.platform || !params.selfId || !params.type) {
    logger.add(
      LogType.ERR,
      `缓存请求缺少参数: ${params.platform}/${params.selfId}/${params.type}`,
    )
    return { contacts: [] }
  }
  const info = await getBootstrap()
  const basePath = info.basePath || '/chat-patch'
  const method = params.contacts ? 'POST' : 'GET'
  const query = new URLSearchParams()
  if (method === 'GET') {
    query.set('platform', params.platform)
    query.set('selfId', params.selfId)
    query.set('type', params.type)
    if (params.groupId) query.set('groupId', params.groupId)
    if (params.userId) query.set('userId', params.userId)
  }
  const url = `${location.origin}${basePath}/api/cache${method === 'GET' ? `?${query.toString()}` : ''}`
  const response = await fetch(url, {
    method,
    headers: params.contacts ? { 'Content-Type': 'application/json' } : undefined,
    body: params.contacts ? JSON.stringify(params) : undefined,
  })
  if (!response.ok) {
    throw new Error(`缓存 API 返回 ${response.status}`)
  }
  return response.json() as Promise<Record<string, unknown>>
}

// 收消息时查询单条身份缓存；后端未命中会自动回源并写库
async function requestIdentityCache(params: {
  platform: string
  selfId: string
  type: 'user' | 'group'
  id: string
  guildId?: string
  channelId?: string
  channelType?: unknown
  name?: string
  avatar?: string
}): Promise<Record<string, unknown> | null> {
  if (!params.platform || !params.selfId || !params.id) return null
  const info = await getBootstrap()
  const basePath = info.basePath || '/chat-patch'
  const query = new URLSearchParams({
    platform: params.platform,
    selfId: params.selfId,
    type: params.type,
    [params.type === 'user' ? 'userId' : 'groupId']: params.id,
  })
  if (params.guildId) query.set('guildId', params.guildId)
  if (params.channelId) query.set('channelId', params.channelId)
  if (params.channelType !== undefined && params.channelType !== null) {
    query.set('channelType', String(params.channelType))
  }
  if (params.name) query.set('name', params.name)
  if (params.avatar) query.set('avatar', params.avatar)

  const response = await fetch(`${location.origin}${basePath}/api/cache?${query.toString()}`)
  if (!response.ok) {
    throw new Error(`身份缓存 API 返回 ${response.status}`)
  }
  const text = await response.text()
  if (!text || text === 'null') return null
  try {
    const parsed = JSON.parse(text) as unknown
    return typeof parsed === 'object' && parsed !== null
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

async function requestAllBotsCache() {
  const info = await getBootstrap()
  const basePath = info.basePath || '/chat-patch'
  const response = await fetch(`${location.origin}${basePath}/api/cache/all`)
  if (!response.ok) {
    throw new Error(`全部缓存 API 返回 ${response.status}`)
  }
  return response.json() as Promise<{ bots: unknown[] }>
}

export async function fetchForwardMessage(
  platform: string,
  selfId: string,
  id: string,
  channelId?: string,
): Promise<unknown[] | null> {
  if (!platform || !selfId || !id) return null
  const info = await getBootstrap()
  const basePath = info.basePath || '/chat-patch'
  const query = new URLSearchParams({ platform, selfId, id })
  if (channelId) query.set('channelId', channelId)
  try {
    const response = await fetch(`${location.origin}${basePath}/api/forward?${query.toString()}`)
    if (!response.ok) return null
    const data = await response.json() as unknown
    if (Array.isArray(data)) return data as unknown[]
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.messages)) return obj.messages as unknown[]
    const nested = obj.data
    if (typeof nested === 'object' && nested !== null) {
      const nestedObj = nested as Record<string, unknown>
      if (Array.isArray(nestedObj.messages)) return nestedObj.messages as unknown[]
    }
    return null
  } catch {
    return null
  }
}

export interface SendForwardResult {
  ok: boolean
  native: boolean
  messageId?: string
}

function extractFirstMessageId(data: unknown): string | undefined {
  const root = getObject(data)
  const list = Array.isArray(data)
    ? data as unknown[]
    : Array.isArray(root.data)
      ? root.data as unknown[]
      : []
  const first = list.length > 0 ? getObject(list[0]) : root
  return getString(first.id) || getString(first.message_id) || undefined
}

export async function sendForwardMessage(
  platform: string,
  selfId: string,
  type: 'group' | 'user',
  id: string,
  messages: unknown[],
): Promise<SendForwardResult> {
  if (!platform || !selfId || !id || messages.length === 0) {
    return { ok: false, native: false }
  }
  // 优先走 Satori 原生合并转发，避免依赖 onebot 专属的 send-forward API
  if (platform) {
    const channelId = type === 'group'
      ? /^(?:group|room|chat|channel|guild):/i.test(id)
        ? id
        : platform === 'yunhu'
          ? `group:${id}`
          : id
      : /^(?:private|direct):/i.test(id)
        ? id
        : `private:${id}`
    const content = buildForwardMessage(messages)
    if (content) {
      try {
        const data = await request('message.create', { channel_id: channelId, content }, { platform, selfId })
        return {
          ok: true,
          native: true,
          messageId: extractFirstMessageId(data),
        }
      } catch {
        // 原生路径失败时回退到旧 API，方便兼容尚未热重载的 Koishi 后端
      }
    }
  }
  const info = await getBootstrap()
  const basePath = info.basePath || '/chat-patch'
  try {
    const response = await fetch(`${location.origin}${basePath}/api/send-forward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, selfId, type, id, messages }),
    })
    return { ok: response.ok, native: false }
  } catch {
    return { ok: false, native: false }
  }
}

export interface SaveSelfMessagePayload {
  id?: string
  platform: string
  selfId: string
  channelId: string
  guildId?: string
  channelType: 'group' | 'user'
  messageId?: string
  content?: string
  elements?: unknown[]
  message?: unknown[]
  forwardId?: string
  forwardContent?: unknown[]
  sentAt?: number
  source?: 'webui' | 'bot' | 'plugin'
  kind?: string
}

export async function saveSentSelfMessage(payload: SaveSelfMessagePayload): Promise<boolean> {
  if (!payload.platform || !payload.selfId || !payload.channelId) return false
  try {
    const info = await getBootstrap()
    const basePath = info.basePath || '/chat-patch'
    const response = await fetch(`${location.origin}${basePath}/api/self-messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return response.ok
  } catch {
    return false
  }
}

// 把后端自消息缓存转换为前端 message_sent 结构
function selfMessageToOneBot(record: unknown): Record<string, unknown> | null {
  const obj = getObject(record)
  const platform = getString(obj.platform)
  const selfId = getString(obj.selfId)
  const channelId = getString(obj.channelId)
  const sentAt = Number(obj.sentAt ?? Date.now())
  const messageId = getString(obj.messageId)
  const localId = getString(obj.id) || `self-${sentAt}`
  const channelType = getString(obj.channelType) === 'user'
    || /^(?:private|direct):/i.test(channelId)
    ? 'user'
    : 'group'
  if (!platform || !selfId || !channelId) return null

  const login = getLogins().find((item) => {
    return item.platform === platform && item.selfId === selfId
  })
  const forwardContent = Array.isArray(obj.forwardContent)
    ? obj.forwardContent as unknown[]
    : []
  let message = Array.isArray(obj.message)
    ? obj.message as unknown[]
    : []
  if (forwardContent.length > 0) {
    const forwardIndex = message.findIndex((segment) => getObject(segment).type === 'forward')
    if (forwardIndex >= 0) {
      const existing = getObject(message[forwardIndex])
      const existingContent = Array.isArray(existing.content) ? existing.content as unknown[] : []
      if (existingContent.length === 0) {
        message[forwardIndex] = { ...existing, content: forwardContent }
      }
    } else if (message.length === 0) {
      message = [{
        type: 'forward',
        id: messageId || localId,
        content: forwardContent,
      }]
    }
  }
  if (message.length === 0) {
    const synthetic = satoriEventToOneBot({
      type: 'send',
      platform,
      selfId,
      timestamp: sentAt,
      message: {
        content: getString(obj.content),
        elements: Array.isArray(obj.elements) ? obj.elements : undefined,
      },
      channel: {
        id: channelId,
        type: channelType === 'user' ? 1 : 0,
      },
      guild: getString(obj.guildId) ? { id: getString(obj.guildId) } : undefined,
    }, platform)
    if (Array.isArray(synthetic?.message)) {
      message = synthetic.message as unknown[]
    }
  }
  if (message.length === 0) return null

  const groupId = channelType === 'group' ? normalizeGroupId(channelId) : ''
  const userId = channelType === 'user' ? channelId.replace(/^(?:private|direct):/i, '') : ''
  const guildId = getString(obj.guildId)
  const fallbackId = messageId || `self-${localId}`
  const rawMessage = getString(obj.content) || getMsgRawTxt({ message })
  const msg: Record<string, unknown> = {
    post_type: 'message_sent',
    message_type: channelType === 'group' ? 'group' : 'private',
    channel_type: channelType === 'group' ? 0 : 1,
    message_id: fallbackId,
    fake_message_id: localId,
    user_id: groupId ? '' : userId,
    group_id: groupId || undefined,
    channel_id: channelId,
    guild_id: guildId || undefined,
    target_id: selfId,
    time: Math.floor(sentAt / 1000) || Math.floor(Date.now() / 1000),
    local_time: sentAt,
    timestamp_ms: sentAt,
    time_ms: sentAt,
    sender: {
      user_id: selfId,
      nickname: getString(login?.name) || selfId,
      avatar: getString(login?.avatar) || undefined,
    },
    message,
    raw_message: rawMessage,
    infoList: {
      message_id: fallbackId,
      private_id: groupId ? '' : userId,
      group_id: groupId || undefined,
      channel_id: channelId,
      guild_id: guildId || undefined,
      target_id: selfId,
      sender: selfId,
    },
    _from_self_cache: true,
  }
  return msg
}

export async function loadChatHistoryFromCache(params: {
  platform: string
  selfId: string
  channelId: string
  limit?: number
  beforeTimeMs?: number
}): Promise<Record<string, unknown>[]> {
  const info = await getBootstrap()
  const basePath = info.basePath || '/chat-patch'
  const query = new URLSearchParams({
    platform: params.platform,
    selfId: params.selfId,
    channelId: params.channelId,
    limit: String(params.limit ?? 20),
  })
  if (params.beforeTimeMs) query.set('beforeTime', String(params.beforeTimeMs))
  const response = await fetch(`${location.origin}${basePath}/api/history?${query.toString()}`)
  if (!response.ok) {
    throw new Error(`历史缓存 API 返回 ${response.status}`)
  }
  const result = getObject(await response.json() as unknown)
  const records = Array.isArray(result.messages) ? result.messages as unknown[] : []
  const messages: Record<string, unknown>[] = []
  for (const record of records) {
    const recordObj = getObject(record)
    const raw = getObject(recordObj.raw)
    const msg = satoriEventToOneBot(raw, params.platform)
    if (!msg || !msg.message_id) continue
    const localTime = Number(recordObj.receivedAt ?? recordObj.timestampMs ?? recordObj.timestamp ?? 0)
    if (localTime) {
      msg.local_time = localTime
      msg.timestamp_ms = localTime
      msg.time_ms = localTime
    }
    const userId = getString(msg.user_id)
    const groupId = getString(msg.group_id)
    msg.infoList = {
      message_id: getString(msg.message_id),
      private_id: groupId ? '' : userId,
      group_id: groupId || undefined,
      channel_id: getString(msg.channel_id),
      guild_id: getString(msg.guild_id),
      target_id: getString(msg.target_id),
      sender: userId,
    }
    messages.push(msg)
  }
  const existingIds = new Set(messages.map((item) => getString(item.message_id)))
  const selfRecords = Array.isArray(result.selfMessages) ? result.selfMessages as unknown[] : []
  for (const record of selfRecords) {
    const msg = selfMessageToOneBot(record)
    if (!msg) continue
    const messageId = getString(msg.message_id)
    const fakeId = getString(msg.fake_message_id)
    if (existingIds.has(messageId) || (fakeId && existingIds.has(fakeId))) continue
    existingIds.add(messageId)
    messages.push(msg)
  }
  messages.sort((a, b) => {
    const timeA = Number(a.local_time ?? a.timestamp_ms ?? a.time_ms ?? 0)
    const timeB = Number(b.local_time ?? b.timestamp_ms ?? b.time_ms ?? 0)
    return timeA - timeB
  })
  return messages
}

async function loadAllBotsCache() {
  const contactStore = useContactStore()
  const result = await requestAllBotsCache()
  const bots = Array.isArray(getObject(result).bots) ? getObject(result).bots as unknown[] : []
  for (const rawBot of bots) {
    const bot = getObject(rawBot)
    const platform = getString(bot.platform)
    const selfId = getString(bot.selfId)
    if (!platform || !selfId) continue

    const groups = Array.isArray(bot.groups) ? bot.groups as unknown[] : []
    const friends = Array.isArray(bot.friends) ? bot.friends as unknown[] : []
    const groupRaws = groups.map((contact) => {
      const cached = getObject(contact)
      const raw = getObject(cached.raw) || cached
      if (raw.avatar && !hasUsableAvatar(raw.avatar)) delete raw.avatar
      return raw
    })
    const friendRaws = friends.map((contact) => cachedFriendRaw(getObject(contact), contact))
    for (const raw of groupRaws) {
      const id = normalizeGroupId(getString(raw.group_id) || getString(raw.id))
      if (!id) continue
      raw.group_id = id
      const name = getString(raw.group_name) || getString(raw.name)
      const avatar = hasUsableAvatar(raw.avatar)
        ? getString(raw.avatar)
        : buildQqGroupAvatar(platform, id)
      if (avatar) raw.avatar = avatar
      if (!name && !avatar) continue
      identityInfoCache.set(identityCacheKey('group', platform, selfId, id), {
        name,
        avatar,
        raw,
      })
    }
    for (const raw of friendRaws) {
      const id = getString(raw.user_id) || getString(raw.id)
      if (!id) continue
      const name = getString(raw.nickname) || getString(raw.remark) || getString(raw.name)
      const avatar = hasUsableAvatar(raw.avatar) ? getString(raw.avatar) : ''
      if (!name && !avatar) continue
      identityInfoCache.set(identityCacheKey('user', platform, selfId, id), {
        name,
        avatar,
        raw,
      })
    }
    const userList = [...groupRaws, ...friendRaws] as unknown as (UserFriendElem & UserGroupElem)[]

    const state = contactStore.botStates.get(selfId)
    if (!state || state.userList.length === 0) {
      contactStore.botStates.set(selfId, {
        userList,
        baseList: state?.baseList ?? [],
        onMsgList: state?.onMsgList ?? [],
      })
    }

    if (isActiveBot({ platform, selfId })) {
      if (groupRaws.length > 0) {
        dispatch({ retcode: 0, data: groupRaws }, 'getGroupList')
      }
      if (friendRaws.length > 0) {
        dispatch({ retcode: 0, data: friendRaws }, 'getFriendList')
      }
    }
  }
}

async function saveContactCache(
  action: string,
  data: unknown,
  bot?: { platform: string; selfId: string } | null,
) {
  const active = bot ?? getActiveBot()
  if (!active || !Array.isArray(data)) return
  const type = action === 'get_friend_list' ? 'friend' : 'group'
  const contacts = data.map(contactCachePayload)
  await requestContactCache({
    platform: active.platform,
    selfId: active.selfId,
    type,
    contacts,
  })
}

async function appendContactCache(
  type: string,
  item: unknown,
  bot?: { platform: string; selfId: string } | null,
) {
  const active = bot ?? getActiveBot()
  if (!active) return
  const contact = contactCachePayload(item)
  if (!contact.id) return
  await requestContactCache({
    platform: active.platform,
    selfId: active.selfId,
    type,
    contacts: [contact],
    append: true,
  })
}

function buildFriendItem(raw: unknown, data: unknown): Record<string, unknown> {
  const root = getObject(data)
  const user = getObject(root.user) || getObject(root)
  const name = String(user.name ?? user.nick ?? user.username ?? '')
  const avatar = hasUsableAvatar(user.avatar) ? getString(user.avatar) : ''
  const item: Record<string, unknown> = { ...getObject(raw) }
  if (!item.channel_id && item.channelId) item.channel_id = item.channelId
  if (!item.guild_id && item.guildId) item.guild_id = item.guildId
  if (name) {
    item.nickname = name
    item.remark = name
  }
  if (avatar) item.avatar = avatar
  else if (item.avatar && !hasUsableAvatar(item.avatar)) delete item.avatar
  if (item.class_id === undefined) item.class_id = 0
  if (!item.class_name) item.class_name = '我的好友'
  return item
}

function cachedFriendRaw(
  cachedItem: Record<string, unknown>,
  fallback: unknown,
): Record<string, unknown> {
  return buildFriendItem(getObject(cachedItem).raw ?? fallback, {})
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}

function buildGroupItem(
  raw: unknown,
  data: unknown,
  platform = '',
): Record<string, unknown> {
  const root = getObject(data)
  const guild = getObject(root.guild) || getObject(root)
  const channel = getObject(root.channel)
  const item = { ...getObject(raw) }
  const id = normalizeGroupId(getString(item.group_id) || getString(item.id) || getString(item.guild_id) || '')
  item.group_id = id
  const name = getString(guild.name)
    || getString(channel.name)
    || getString(item.group_name)
    || getString(item.name)
  const avatar = hasUsableAvatar(guild.avatar)
    ? getString(guild.avatar)
    : hasUsableAvatar(channel.avatar)
      ? getString(channel.avatar)
      : hasUsableAvatar(item.avatar)
        ? getString(item.avatar)
        : buildQqGroupAvatar(platform, id)
  if (name) item.group_name = name
  if (avatar) item.avatar = avatar
  else if (item.avatar && !hasUsableAvatar(item.avatar)) delete item.avatar
  const guildId = getString(guild.id)
    || getString(item.guild_id)
    || getString(item.guildId)
    || id
  const channelId = getString(channel.id)
    || getString(item.channel_id)
    || getString(item.channelId)
  if (guildId) item.guild_id = guildId
  if (channelId) item.channel_id = channelId
  return item
}

// 刷新群组时逐个请求 guild.get / channel.get，并把结果写回缓存和界面
async function fetchGroupProfiles(
  active: { platform: string; selfId: string },
  groups: unknown[],
  updateUi = true,
): Promise<Record<string, unknown>[]> {
  const contactStore = updateUi ? useContactStore() : null
  const processedItems: Record<string, unknown>[] = []

  const processGroup = async (raw: unknown) => {
    const id = contactId(raw)
    if (!id) return
    const rawObj = getObject(raw)
    const guildId = getString(rawObj.guild_id) || getString(rawObj.guildId) || id
    const channelId = getString(rawObj.channel_id) || getString(rawObj.channelId) || id
    const [guildData, channelData] = await Promise.all([
      withTimeout(
        request('guild.get', { guild_id: guildId }, active).catch(() => null),
        5000,
      ),
      withTimeout(
        request('channel.get', { channel_id: channelId, guild_id: guildId }, active).catch(() => null),
        5000,
      ),
    ])
    const item = buildGroupItem(raw, { guild: guildData, channel: channelData }, active.platform)
    processedItems.push(item)

    if (updateUi && contactStore) {
      const existing = contactStore.userList.find((contact) => {
        return String(contact.group_id) === id
      })
      if (existing) {
        if (item.group_name) existing.group_name = String(item.group_name)
        if (item.avatar) existing.avatar = String(item.avatar)
        else if (existing.avatar && !hasUsableAvatar(existing.avatar)) delete existing.avatar
        contactStore.userList = [...contactStore.userList]
      } else {
        dispatch({ retcode: 0, data: [item] }, 'getGroupList')
      }
    }

    if (updateUi) {
      void withTimeout(appendContactCache('group', item, active), 3000).catch(() => {
        // 单个群组缓存写入失败不阻塞后续请求
      })
    } else {
      await withTimeout(appendContactCache('group', item, active), 3000).catch(() => {
        // 后台缓存写入失败不中断整个机器人
      })
    }
  }

  const batchSize = 30
  for (let start = 0; start < groups.length; start += batchSize) {
    const batchStart = Date.now()
    const batch = groups.slice(start, start + batchSize)
    await Promise.all(batch.map((raw) => processGroup(raw).catch((error: unknown) => {
      logger.add(LogType.ERR, `处理群组身份信息失败: ${String(error)}`)
    })))
    const elapsed = Date.now() - batchStart
    const wait = Math.max(0, 1000 - elapsed)
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait))
    }
  }
  return processedItems
}

async function cacheBotContacts(_bot: { platform: string; selfId: string }) {
  // 联系人缓存已改为收到消息时写入，不再请求 guild.list / friend.list
}

export async function refreshAllBots() {
  useContactStore().botStates.clear()
  await loadContactsFromCache()
}

async function fetchFriendProfiles(
  active: { platform: string; selfId: string },
  friends: unknown[],
  updateUi = true,
): Promise<Record<string, unknown>[]> {
  const contactStore = updateUi ? useContactStore() : null
  const botKey = [active.platform, active.selfId].map(encodeKeyPart).join(':')
  const userGetBlocked = unsupportedMethods.has(`user.get:${botKey}`)
  const processedItems: Record<string, unknown>[] = []

  const processFriend = async (raw: unknown) => {
    const id = contactId(raw)
    if (!id) return
    let data: unknown = {}
    if (!userGetBlocked) {
      try {
        data = await Promise.race([
          request('user.get', { user_id: id }, active),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
        ]) ?? {}
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        if (/is not a function|Satori API 返回 500/i.test(message)) {
          if (!unsupportedMethods.has(`user.get:${botKey}`)) {
            unsupportedMethods.add(`user.get:${botKey}`)
            logger.error(
              new Error(message),
              '当前机器人不支持 user.get，已跳过好友身份补充',
            )
          }
        } else {
          logger.add(
            LogType.ERR,
            `获取好友身份信息失败 user.get ${id}: ${message}`,
          )
        }
      }
    }
    const item = buildFriendItem(raw, data)
    processedItems.push(item)
    if (updateUi && contactStore) {
      const existing = contactStore.userList.find((contact) => {
        return String(contact.user_id) === id
      })
      if (existing) {
        if (item.nickname) existing.nickname = String(item.nickname)
        if (item.remark) existing.remark = String(item.remark)
        if (item.avatar) existing.avatar = String(item.avatar)
        if (item.class_id !== undefined) existing.class_id = Number(item.class_id)
        if (item.class_name) existing.class_name = String(item.class_name)
        contactStore.userList = [...contactStore.userList]
      } else {
        dispatch({ retcode: 0, data: [item] }, 'getFriendList')
        contactStore.friendLoadedCount += 1
      }
    }
    // 缓存写入不能阻塞身份请求循环，否则第一个好友后就会停住。
    if (updateUi) {
      void withTimeout(appendContactCache('friend', item, active), 3000).catch(() => {
        // 单个缓存写入失败不阻塞后续好友
      })
    } else {
      await withTimeout(appendContactCache('friend', item, active), 3000).catch(() => {
        // 后台缓存写入失败不中断整个机器人
      })
    }
  }

  const batchSize = 30
  for (let start = 0; start < friends.length; start += batchSize) {
    const batchStart = Date.now()
    const batch = friends.slice(start, start + batchSize)
    await Promise.all(batch.map((raw) => processFriend(raw).catch((error: unknown) => {
      logger.add(LogType.ERR, `处理好友身份信息失败: ${String(error)}`)
    })))
    const elapsed = Date.now() - batchStart
    const wait = Math.max(0, 1000 - elapsed)
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait))
    }
  }
  return processedItems
}

async function handleFriendListResponse(
  active: { platform: string; selfId: string },
  friends: unknown[],
) {
  const contactStore = useContactStore()
  const cachePromise = requestContactCache({
    platform: active.platform,
    selfId: active.selfId,
    type: 'friend',
  }).catch(() => ({}))
  const cacheResult = await Promise.race([
    cachePromise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
  ]) ?? {}
  const cached = Array.isArray(getObject(cacheResult).contacts)
    ? getObject(cacheResult).contacts as unknown[]
    : []
  const cachedMap = new Map<string, Record<string, unknown>>()
  for (const contact of cached) {
    const item = getObject(contact)
    const id = getString(item.id)
    if (id) cachedMap.set(id, item)
  }
  if (!Array.isArray(friends) || friends.length === 0) {
    contactStore.friendLoading = false
    if (cachedMap.size > 0) {
      dispatch({
        retcode: 0,
        data: [...cachedMap.values()].map((contact) => cachedFriendRaw(contact, contact)),
      }, 'getFriendList')
    }
    return
  }
  const remoteCached = friends.filter((item) => cachedMap.has(contactId(item)))
  const missing = friends.filter((item) => !cachedMap.has(contactId(item)))
  const cachedNameIsId = remoteCached.some((item) => {
    const cachedItem = cachedMap.get(contactId(item))
    const raw = cachedFriendRaw(getObject(cachedItem), item)
    const id = String(raw.user_id ?? raw.id ?? '')
    return !raw.nickname || String(raw.nickname) === id
  })

  // 从空列表开始重建，先把已缓存好友放回来。
  contactStore.friendLoading = true
  contactStore.friendLoadedCount = 0
  contactStore.friendTotalCount = friends.length
  contactStore.userList = contactStore.userList.filter((item) => item.group_id)
  if (remoteCached.length > 0) {
    const cachedRaws = remoteCached.map((item) => {
      const cachedItem = cachedMap.get(contactId(item))
      return cachedFriendRaw(getObject(cachedItem), item)
    })
    for (const raw of cachedRaws) {
      dispatch({ retcode: 0, data: [raw] }, 'getFriendList')
      contactStore.friendLoadedCount += 1
      await new Promise((resolve) => setTimeout(resolve, 60))
    }
  }
  try {
    if (missing.length > 0 && !cachedNameIsId) {
      // 本地缓存不完整，只补缺失的好友。
      await fetchFriendProfiles(active, missing)
    } else {
      // 本地缓存完整，或旧缓存里还是 QQ 号时，全量刷新身份信息。
      await fetchFriendProfiles(active, friends)
    }
  } finally {
    contactStore.friendLoading = false
  }
}

async function loadContactType(
  active: { platform: string; selfId: string },
  item: { type: string; action: string; echo: string },
) {
  // 页面加载只读 LevelDB 缓存；网络请求统一由刷新按钮触发。
  const result = await requestContactCache({
    platform: active.platform,
    selfId: active.selfId,
    type: item.type,
  })
  const contacts = Array.isArray(getObject(result).contacts) ? getObject(result).contacts as unknown[] : []
  if (contacts.length) {
    const isFriend = item.type === 'friend'
    dispatch({
      retcode: 0,
      data: contacts.map((contact) => {
        const cached = getObject(contact)
        return isFriend ? cachedFriendRaw(cached, contact) : cached.raw ?? contact
      }),
    }, item.echo)
  }
}

export async function loadGroupMembersFromCache(groupId: string) {
  const active = getActiveBot()
  if (!active || !groupId || groupId === '0') return
  const authStore = useAuthStore()
  try {
    await loadAllBotsCache()
    const result = await requestContactCache({
      platform: active.platform,
      selfId: active.selfId,
      type: 'member',
      groupId,
    })
    const members = Array.isArray(getObject(result).members)
      ? getObject(result).members as unknown[]
      : []
    const mapped = members.map((contact) => {
      const cached = getObject(contact)
      const raw = getObject(cached.raw) || cached
      const id = getString(raw.user_id) || getString(raw.id)
      const cachedName = getString(cached.name) || getString(cached.nickname)
      const cachedUserAvatar = id
        ? getCachedUserAvatar(active.platform, active.selfId, id)
        : ''
      const avatar = hasUsableAvatar(raw.avatar)
        ? getString(raw.avatar)
        : hasUsableAvatar(cached.avatar)
          ? getString(cached.avatar)
          : cachedUserAvatar
      return {
        user_id: id,
        nickname: getString(raw.nickname) || getString(raw.name) || cachedName || id,
        card: getString(raw.card) || '',
        role: getString(raw.role) || getString(raw.title) || '',
        avatar,
      }
    })
    const selfId = String(active.selfId)
    const hasSelfMember = mapped.some((member) => String(member.user_id) === selfId)
    if (!hasSelfMember) {
      const selfName = String(authStore.loginInfo.nickname ?? authStore.loginInfo.name ?? '')
        || selfId
      const selfAvatar = String(authStore.loginInfo.avatar ?? '')
      mapped.unshift({
        user_id: selfId,
        nickname: selfName,
        card: '',
        role: '',
        avatar: selfAvatar,
      })
      await requestContactCache({
        platform: active.platform,
        selfId,
        type: 'member',
        groupId,
        contacts: [{
          id: selfId,
          name: selfName,
          avatar: selfAvatar || undefined,
          raw: {
            user_id: selfId,
            nickname: selfName,
            card: '',
            avatar: selfAvatar,
          },
        }],
        append: true,
      }).catch(() => undefined)
    }
    const needsIdentity = (member: typeof mapped[number]) => {
      const usableName = (value: string) => Boolean(value)
        && value !== member.user_id
        && !/unknown user|unknown guild|unknown channel/i.test(value)
      const hasName = usableName(member.nickname) || usableName(member.card)
      return !hasName || !hasUsableAvatar(member.avatar)
    }
    await Promise.all(mapped
      .filter((member) => member.user_id && member.user_id !== '0' && needsIdentity(member))
      .map(async (member) => {
        const info = await requestIdentityCache({
          platform: active.platform,
          selfId: active.selfId,
          type: 'user',
          id: member.user_id,
          guildId: groupId,
        }).catch(() => null)
        const root = getObject(info)
        const name = getString(root.name) || getString(root.nickname) || getString(root.nick) || getString(root.username)
        const avatar = hasUsableAvatar(root.avatar) ? getString(root.avatar) : ''
        if (name && name !== member.user_id) {
          const unusableName = (value: string) => !value
            || value === member.user_id
            || /unknown user|unknown guild|unknown channel/i.test(value)
          if (unusableName(member.nickname)) member.nickname = name
          if (unusableName(member.card)) member.card = name
        }
        if (avatar) member.avatar = avatar
        if (name || avatar) {
          await requestContactCache({
            platform: active.platform,
            selfId: active.selfId,
            type: 'member',
            groupId,
            contacts: [{
              id: member.user_id,
              name: name || member.nickname || member.user_id,
              avatar: avatar || undefined,
              raw: root,
            }],
            append: true,
          }).catch(() => undefined)
        }
      }))
    dispatch({ retcode: 0, data: mapped }, 'getGroupMemberList')
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.add(LogType.ERR, `加载群成员缓存失败: ${message}`)
  }
}

export async function loadContactsFromCache() {
  const current = getActiveBot()
  const active = current ?? (login.platform && login.uin
    ? { platform: login.platform, selfId: String(login.uin) }
    : null)
  if (!active) return
  try {
    await loadAllBotsCache()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.add(LogType.ERR, `加载全部机器人缓存失败: ${message}`)
  }
}

function startSatori() {
  disposeConnection?.()
  login.creating = true
  disposeConnection = connectSatori(onSatoriEvent, onSatoriReady, (online) => {
    login.status = online
    login.creating = !online
  })
}

export class Connector {
  static create(address: string, token: string, _wss?: boolean) {
    login.address = address || 'Satori'
    login.token = token || ''
    startSatori()
  }

  static onopen(_address: string, _token?: string) {
    login.creating = false
    login.status = true
  }

  static onmessage(message: string) {
    try {
      dispatch(JSON.parse(message) as Record<string, unknown>)
    } catch {
      // 忽略无效消息
    }
  }

  static onclose(_code: number, _message?: string, _address?: string, _token?: string) {
    login.status = false
  }

  static close() {
    disposeConnection?.()
    disposeConnection = null
    login.status = false
  }

  static forceDisconnect(_reason?: string) {
    Connector.close()
    setTimeout(() => {
      if (!login.creating) startSatori()
    }, 1000)
  }

  static async callApi(api: string, args: Record<string, unknown>): Promise<unknown | undefined> {
    const mapped = mapAction(api, args)
    if (!mapped) return undefined
    const active = getActiveBot()
    const data = await request(mapped.method, mapped.params, active)
    return satoriResponseToOneBot(api, data, active.platform).data
  }

  static send(action: string, value: Record<string, unknown> = {}, echo?: string) {
    const mapped = mapAction(action, value)
    if (!mapped) {
      dispatch({ retcode: 404, data: null }, echo)
      return
    }
    const active = getActiveBot()
    if (active && (action === 'get_friend_list' || action === 'get_group_list')) {
      const type = action === 'get_friend_list' ? 'friend' : 'group'
      void loadContactType(active, { type, action, echo })
      return
    }
    void request(mapped.method, mapped.params, active)
      .then((data) => {
        const response = satoriResponseToOneBot(action, data, active.platform)
        dispatch(response, echo)
      })
      .catch((error: unknown) => {
        dispatch({ retcode: -1, data: null, error: String(error) }, echo)
      })
  }

  static sendSeeMod(_name: string, _value: Record<string, unknown>, echo?: string) {
    dispatch({ retcode: 404, data: null }, echo)
  }

  static sendRaw(_name: string, _value: Record<string, unknown>, echo?: string) {
    dispatch({ retcode: 404, data: null }, echo)
  }

  static sendRawJson(str: string) {
    try {
      const parsed = JSON.parse(str) as Record<string, unknown>
      Connector.send(String(parsed.action ?? ''), getObject(parsed.params))
    } catch {
      // 忽略无效的原始消息
    }
  }
}

function getObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
}

export function loadConnectionHistory(): ConnectionHistoryItem[] {
  return login.connectionHistory
}

export function saveConnectionToHistory(address: string, token: string, uin?: string, nickname?: string) {
  const settingsStore = useSettingsStore()
  const history = login.connectionHistory
  const existing = history.findIndex((item) => item.address === address)
  const item: ConnectionHistoryItem = {
    address,
    token: settingsStore.sysConfig.save_password ? token : '',
    uin,
    nickname,
    lastConnected: Date.now(),
  }
  if (existing >= 0) {
    history[existing] = item
  } else {
    history.unshift(item)
    if (history.length > 10) history.pop()
  }
  writeHistory(history)
}

export function loadConnectionFromHistory(item: ConnectionHistoryItem) {
  login.address = item.address
  login.token = item.token
}

export function deleteConnectionHistory(index: number) {
  if (index >= 0 && index < login.connectionHistory.length) {
    login.connectionHistory.splice(index, 1)
    writeHistory(login.connectionHistory)
  }
}
