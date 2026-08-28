// Satori 连接适配层：向现有 UI 暴露兼容的 Connector 接口。

import { reactive } from 'vue'
import { dispatch } from './msg'
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
import { Logger, LogType } from './base'
import { useAuthStore } from '@renderer/state/auth'
import { useChatStore } from '@renderer/state/chat'
import { useContactStore } from '@renderer/state/contact'
import { useSettingsStore } from '@renderer/state/settings'
import { updateBaseOnMsgList } from './utils/msgUtil'
import type { ConnectionHistoryItem, LoginCacheElem } from './elements/system'
import type { UserFriendElem, UserGroupElem } from './elements/information'

const HISTORY_KEY = 'chat-patch:connection-history'
const logger = new Logger()
const unsupportedMethods = new Set<string>()

function identityDebug(...args: unknown[]) {
  if (import.meta.env.DEV) {
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
  return `${prefix}:${platform}:${selfId}:${id}`
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
  return `${platform}:${selfId}`
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
) {
  if (name && session) {
    session.nickname = name
    session.remark = name
  }
  if (avatar && session) session.avatar = avatar
  if (msg.sender && typeof msg.sender === 'object') {
    const sender = getObject(msg.sender)
    if (avatar) sender.avatar = avatar
    if (name) sender.nickname = name
  }
  syncUserIdentity(userId, name, avatar)
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

function syncUserIdentity(userId: string, name: string, avatar: string) {
  const contactStore = useContactStore()
  const applyUser = (target: Record<string, unknown>) => {
    if (name) {
      target.nickname = name
      target.remark = name
    }
    if (avatar) target.avatar = avatar
    else if (target.avatar && !hasUsableAvatar(target.avatar)) delete target.avatar
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
  identityDebug('group identity: request cache', { platform, selfId, sessionId, guildId, channelId })
  const cacheResult = await requestIdentityCache({
    platform,
    selfId,
    type: 'group',
    id: sessionId,
    guildId,
    channelId,
    name: eventName,
    avatar: eventAvatar,
  }).catch(() => null)
  const cached = getObject(cacheResult)
  const cachedName = getString(cached.name)
  const cachedAvatar = hasUsableAvatar(cached.avatar) ? getString(cached.avatar) : ''
  if (cachedName || cachedAvatar) {
    const cachedApply = (target: Record<string, unknown>) => {
      if (cachedName) target.group_name = cachedName
      if (cachedAvatar) target.avatar = cachedAvatar
    }
    cachedApply(session)
    syncGroupIdentity(sessionId, cachedApply)
    markIdentityLookup(key, true, { name: cachedName || sessionId, avatar: cachedAvatar, raw: cached })
    return
  }

  // 后端回源失败时只使用事件自带的字段，不再每次消息都请求 guild/channel
  const name = eventName
  const avatar = eventAvatar
  if (!name && !avatar) {
    markIdentityLookup(key, false)
    return
  }

  const applyGroup = (target: Record<string, unknown>) => {
    if (name) target.group_name = name
    if (avatar) target.avatar = avatar
    else if (target.avatar && !hasUsableAvatar(target.avatar)) delete target.avatar
  }
  applyGroup(session)
  syncGroupIdentity(sessionId, applyGroup)
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
    const sender = getObject(msg.sender)
    const senderName = getString(sender.nickname) || getString(sender.card) || getString(sender.name)
    const senderAvatar = hasUsableAvatar(sender.avatar) ? getString(sender.avatar) : ''
    identityDebug('user identity: request cache', { platform, selfId, userId, guildId, senderName })
    const data = await requestIdentityCache({
      platform,
      selfId,
      type: 'user',
      id: userId,
      guildId,
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

    applyUserIdentity(userId, session, msg, name, avatar)
    markIdentityLookup(key, true, { name, avatar, raw: root })
  } finally {
    identityInflight.delete(inflightKey)
  }
}

function recordBotMessage(platform: string, selfId: string, msg: Record<string, unknown>) {
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
  const isGroup = Boolean(msg.group_id) || msg.message_type === 'group'
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
  identityDebug('recordBotMessage: session', { sessionId })
  const sender = getObject(msg.sender)
  const hasSenderAvatar = hasUsableAvatar(sender.avatar)
  const senderId = String(
    sender.user_id
      || msg.user_id
      || (isGroup ? '' : channelId.replace(/^private:/, '')),
  )
  const raw = typeof msg.raw_message === 'string' ? msg.raw_message : ''
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
    group_name: isGroup
      ? (typeof msg.group_name === 'string' ? msg.group_name : sessionId)
      : undefined,
    nickname: isGroup ? '' : String(sender.nickname ?? senderId ?? sessionId),
    remark: '',
    avatar: isGroup
      ? (hasUsableAvatar(msg.group_avatar) ? getString(msg.group_avatar) : undefined)
      : (hasUsableAvatar(sender.avatar) ? getString(sender.avatar) : undefined),
    raw_msg: raw,
    raw_msg_base: raw,
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
  contactStore.botStates.set(selfId, {
    userList: [...state.userList],
    baseList: [...state.baseList],
    onMsgList: [...state.onMsgList],
  })
  if (
    isActiveBot({ platform, selfId }) &&
    !contactStore.baseOnMsgList.has(String(sessionId))
  ) {
    contactStore.baseOnMsgList.set(
      String(sessionId),
      session as unknown as UserFriendElem & UserGroupElem,
    )
    updateBaseOnMsgList()
  }

  const chatStore = useChatStore()
  const cacheKey = `${platform}:${selfId}:${sessionId}`
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
  const knownSessionAvatar = contactStore.baseOnMsgList.get(String(sessionId))
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

function onSatoriEvent(event: SatoriEvent) {
  const oneBot = satoriEventToOneBot(event.body)
  identityDebug('satori event', { event, oneBot })
  if (!oneBot) return
  if (oneBot.post_type === 'message' || oneBot.post_type === 'message_sent') {
    recordBotMessage(event.platform, event.selfId, oneBot)
  }
  // 只有当前机器人写入全局 UI；其他机器人仍在上方实时记录。
  if (isCurrentBotEvent(event)) {
    dispatch(oneBot)
  }
}

export function flushPendingBotEvents(platform: string, selfId: string) {
  const key = botEventKey(platform, selfId)
  const events = pendingBotEvents.get(key)
  if (!events?.length) return
  pendingBotEvents.delete(key)
  for (const event of events) {
    const oneBot = satoriEventToOneBot(event.body)
    if (oneBot) dispatch(oneBot)
  }
}

function onSatoriReady(logins: Array<{ platform: string; selfId: string; name: string; avatar?: string; features?: string[] }>) {
  login.creating = false
  login.status = true
  const authStore = useAuthStore()
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
  return String(obj.user_id ?? obj.group_id ?? obj.id ?? '')
}

function contactName(item: unknown): string {
  const obj = getObject(item)
  return String(obj.nickname ?? obj.remark ?? obj.group_name ?? obj.name ?? '')
}

function contactCachePayload(item: unknown): Record<string, unknown> {
  return {
    id: contactId(item),
    name: contactName(item),
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
    const raw = getObject(getObject(record).raw)
    const msg = satoriEventToOneBot(raw)
    if (!msg || !msg.message_id) continue
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
      const id = getString(raw.group_id) || getString(raw.id)
      if (!id) continue
      const name = getString(raw.group_name) || getString(raw.name)
      const avatar = hasUsableAvatar(raw.avatar) ? getString(raw.avatar) : ''
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

function buildGroupItem(raw: unknown, data: unknown): Record<string, unknown> {
  const root = getObject(data)
  const guild = getObject(root.guild) || getObject(root)
  const channel = getObject(root.channel)
  const item = { ...getObject(raw) }
  const id = getString(item.group_id) || getString(item.id) || getString(item.guild_id) || ''
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
        : ''
  if (name) item.group_name = name
  if (avatar) item.avatar = avatar
  else if (item.avatar && !hasUsableAvatar(item.avatar)) delete item.avatar
  if (!item.guild_id) item.guild_id = id
  if (!item.channel_id) item.channel_id = id
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
    const guildId = getString(rawObj.guild_id) || id
    const channelId = getString(rawObj.channel_id) || id
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
    const item = buildGroupItem(raw, { guild: guildData, channel: channelData })
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
  const botKey = `${active.platform}:${active.selfId}`
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
  try {
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
      const avatar = hasUsableAvatar(raw.avatar)
        ? getString(raw.avatar)
        : hasUsableAvatar(cached.avatar)
          ? getString(cached.avatar)
          : ''
      return {
        user_id: id,
        nickname: getString(raw.nickname) || getString(raw.name) || id,
        card: getString(raw.card) || '',
        role: getString(raw.role) || getString(raw.title) || '',
        avatar,
      }
    })
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
    return satoriResponseToOneBot(api, data).data
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
        const response = satoriResponseToOneBot(action, data)
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
