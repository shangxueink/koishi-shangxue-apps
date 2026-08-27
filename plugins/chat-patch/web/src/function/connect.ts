// Satori 连接适配层：向现有 UI 暴露兼容的 Connector 接口。

import { reactive } from 'vue'
import { dispatch } from './msg'
import {
  connect as connectSatori,
  getActiveBot,
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
import { useContactStore } from '@renderer/state/contact'
import { useSettingsStore } from '@renderer/state/settings'
import type { ConnectionHistoryItem, LoginCacheElem } from './elements/system'

const HISTORY_KEY = 'chat-patch:connection-history'
const logger = new Logger()
const unsupportedMethods = new Set<string>()

export let websocket: WebSocket | undefined = undefined
let disposeConnection: (() => void) | null = null
const contactCacheLoads = new Map<string, Promise<void>>()
const pendingBotEvents = new Map<string, SatoriEvent[]>()

function botEventKey(platform: string, selfId: string) {
  return `${platform}:${selfId}`
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

function onSatoriEvent(event: SatoriEvent) {
  // 非当前机器人事件不能写入当前全局会话，避免 A 机器人列表混入 B 机器人的群组。
  if (!isCurrentBotEvent(event)) {
    const key = botEventKey(event.platform, event.selfId)
    const list = pendingBotEvents.get(key) ?? []
    if (list.length < 500) list.push(event)
    pendingBotEvents.set(key, list)
    return
  }
  const oneBot = satoriEventToOneBot(event.body)
  if (oneBot) dispatch(oneBot)
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

async function saveContactCache(action: string, data: unknown) {
  const active = getActiveBot()
  if (!active || !Array.isArray(data)) return
  const type = action === 'get_friend_list' ? 'friend' : 'group'
  const contacts = data.map(contactCachePayload)
  await requestConsole('contact-cache', {
    platform: active.platform,
    selfId: active.selfId,
    type,
    contacts,
  })
}

async function appendContactCache(type: string, item: unknown) {
  const active = getActiveBot()
  if (!active) return
  const contact = contactCachePayload(item)
  if (!contact.id) return
  await requestConsole('contact-cache', {
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
  const avatar = String(user.avatar ?? '')
  const item: Record<string, unknown> = { ...getObject(raw) }
  if (name) {
    item.nickname = name
    item.remark = name
  }
  if (avatar) item.avatar = avatar
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

async function requestFriendList(active: { platform: string; selfId: string }): Promise<unknown[]> {
  let next: string | undefined
  const users: unknown[] = []
  do {
    const data = await request('friend.list', next ? { next } : {}, active)
    const root = getObject(data)
    const page = asArray(root.data)
      ?? asArray(data)
      ?? asArray(getObject(root.data).data)
      ?? []
    users.push(...page)
    next = getString(root.next) || getString(getObject(root.data).next) || undefined
  } while (next)
  return users
}

async function fetchFriendProfiles(
  active: { platform: string; selfId: string },
  friends: unknown[],
) {
  const contactStore = useContactStore()
  const botKey = `${active.platform}:${active.selfId}`
  if (unsupportedMethods.has(`user.get:${botKey}`)) return
  for (const raw of friends) {
    const id = contactId(raw)
    if (!id) continue
    let data: unknown = {}
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
    const item = buildFriendItem(raw, data)
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
    }
    // 缓存写入不能阻塞身份请求循环，否则第一个好友后就会停住。
    void appendContactCache('friend', item).catch(() => {
      // 单个缓存写入失败不阻塞后续好友
    })
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}

async function handleFriendListResponse(
  active: { platform: string; selfId: string },
  friends: unknown[],
) {
  const contactStore = useContactStore()
  const cachePromise = requestConsole('contact-cache', {
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
  contactStore.userList = contactStore.userList.filter((item) => item.group_id)
  if (remoteCached.length > 0) {
    const cachedRaws = remoteCached.map((item) => {
      const cachedItem = cachedMap.get(contactId(item))
      return cachedFriendRaw(getObject(cachedItem), item)
    })
    for (const raw of cachedRaws) {
      dispatch({ retcode: 0, data: [raw] }, 'getFriendList')
      await new Promise((resolve) => setTimeout(resolve, 60))
    }
  }
  if (missing.length > 0 && !cachedNameIsId) {
    // 本地缓存不完整，只补缺失的好友。
    await fetchFriendProfiles(active, missing)
  } else {
    // 本地缓存完整，或旧缓存里还是 QQ 号时，全量刷新身份信息。
    await fetchFriendProfiles(active, friends)
  }
}

async function loadContactType(
  active: { platform: string; selfId: string },
  item: { type: string; action: string; echo: string },
) {
  // 页面加载只读 LevelDB 缓存；网络请求统一由刷新按钮触发。
  const result = await requestConsole('contact-cache', {
    platform: active.platform,
    selfId: active.selfId,
    type: item.type,
  })
  const contacts = Array.isArray(getObject(result).contacts) ? getObject(result).contacts as unknown[] : []
  if (contacts.length) {
    dispatch({
      retcode: 0,
      data: contacts.map((contact) => getObject(contact).raw ?? contact),
    }, item.echo)
  }
}

export async function loadContactsFromCache() {
  const active = getActiveBot()
  if (!active) return
  for (const item of [
    { type: 'friend', action: 'get_friend_list', echo: 'getFriendList' },
    { type: 'group', action: 'get_group_list', echo: 'getGroupList' },
  ]) {
    const key = `${active.platform}:${active.selfId}:${item.type}`
    const running = contactCacheLoads.get(key)
    if (running) {
      await running
      continue
    }
    const task = loadContactType(active, item).finally(() => {
      contactCacheLoads.delete(key)
    })
    contactCacheLoads.set(key, task)
    await task
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
    if (action === 'get_friend_list' && active) {
      void requestFriendList(active)
        .then((data) => {
          const response = satoriResponseToOneBot('get_friend_list', data)
          const friends = asArray(response.data) ?? []
          void handleFriendListResponse(active, friends)
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error)
          logger.error(
            new Error(message),
            '当前机器人不支持 friend.list，无法刷新好友列表',
          )
          dispatch({ retcode: -1, data: null, error: message }, echo)
        })
      return
    }
    void request(mapped.method, mapped.params, active)
      .then((data) => {
        const response = satoriResponseToOneBot(action, data)
        dispatch(response, echo)
        if (action === 'get_group_list' && Array.isArray(response.data)) {
          void saveContactCache(action, response.data)
        }
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
