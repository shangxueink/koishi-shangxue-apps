import { Context } from 'koishi'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

import { Config } from './config'
import { ContactCacheItem, MessageRecord, PinnedState, SelfMessageRecord } from './types'
import { PluginLogger } from './logger'

function encodeKeyPart(value: string): string {
  return encodeURIComponent(value)
}

function normalizeTimestampMs(value: unknown): number {
  const num = Number(value ?? 0)
  if (!Number.isFinite(num) || num <= 0) return 0
  return num > 1e12 ? num : num * 1000
}

function decodeKeyPart(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function messagePrefix(platform: string, selfId: string, channelId: string): string {
  return `m:${encodeKeyPart(platform)}:${encodeKeyPart(selfId)}:${encodeKeyPart(channelId)}:`
}

function legacyMessagePrefix(platform: string, selfId: string, channelId: string): string {
  return `m:${platform}:${selfId}:${channelId}:`
}

function messageKey(record: MessageRecord): string {
  // 统一用毫秒排序，前端 beforeTime 也传毫秒，避免按秒存储时分页取到同一批消息
  const time = String(
    normalizeTimestampMs(record.timestampMs ?? record.timestamp ?? record.receivedAt),
  ).padStart(16, '0')
  return `${messagePrefix(record.platform, record.selfId, record.channelId || '')}${time}:${encodeKeyPart(record.id || 'unknown')}`
}

// 独立命名空间保存机器人自身消息，避免和收到的用户消息混用
function selfMessagePrefix(platform: string, selfId: string, channelId: string): string {
  return `sm:${encodeKeyPart(platform)}:${encodeKeyPart(selfId)}:${encodeKeyPart(channelId)}:`
}

function selfMessageKey(record: SelfMessageRecord): string {
  const time = String(
    normalizeTimestampMs(record.timestampMs ?? record.timestamp ?? record.sentAt),
  ).padStart(16, '0')
  return `${selfMessagePrefix(record.platform, record.selfId, record.channelId)}${time}:${encodeKeyPart(record.id || 'unknown')}`
}

function contactKey(platform: string, selfId: string, type: string): string {
  return `c:${encodeKeyPart(platform)}:${encodeKeyPart(selfId)}:${encodeKeyPart(type)}`
}

function legacyContactKey(platform: string, selfId: string, type: string): string {
  return `c:${platform}:${selfId}:${type}`
}

function groupMemberKey(platform: string, selfId: string, groupId: string): string {
  return `gm:${encodeKeyPart(platform)}:${encodeKeyPart(selfId)}:${encodeKeyPart(groupId)}`
}

function legacyGroupMemberKey(platform: string, selfId: string, groupId: string): string {
  return `gm:${platform}:${selfId}:${groupId}`
}

function isPrivateChannelType(value: unknown): boolean {
  const num = Number(value)
  if (Number.isFinite(num)) return num === 1
  const text = String(value ?? '').toLowerCase()
  return text === 'direct' || text === 'private'
}

function isUsableGroupContact(item: ContactCacheItem): boolean {
  if (typeof item.raw === 'object' && item.raw !== null) {
    const raw = item.raw as Record<string, unknown>
    if (isPrivateChannelType(raw.channel_type)) return false
  }
  return true
}

type KvWriteOperation =
  | { type: 'put'; key: string; value: string }
  | { type: 'del'; key: string }

interface KvIteratorOptions {
  gte?: string
  lte?: string
  lt?: string
  reverse?: boolean
  limit?: number
}

interface LevelIteratorOptions {
  gte?: string
  lte?: string
  lt?: string
  reverse?: boolean
  limit?: number
}

interface LevelDatabase {
  open(): Promise<void>
  close(): Promise<void>
  put(key: string, value: string): Promise<void>
  get(key: string): Promise<string>
  del(key: string): Promise<void>
  batch(operations: KvWriteOperation[]): Promise<void>
  clear(): Promise<void>
  iterator<K, V>(options?: LevelIteratorOptions): AsyncIterable<[K, V]>
  compactRange(start: string, end: string): Promise<void>
}

interface LevelConstructor {
  new (
    location: string,
    options?: { keyEncoding?: string; valueEncoding?: string },
  ): LevelDatabase
}

interface LevelModule {
  Level: LevelConstructor
}

interface WNodeService {
  import<T>(packageName: string, options?: {
    allowInstall?: boolean
    useRequire?: boolean
    version?: string
  }): Promise<T>
}

interface KvStore {
  readonly path: string
  readonly driver: 'level'
  readonly isOpen: boolean
  put(key: string, value: string): Promise<void>
  get(key: string): Promise<string>
  del(key: string): Promise<void>
  batch(operations: KvWriteOperation[]): Promise<void>
  clear(): Promise<void>
  vacuum(): Promise<void>
  iterator(options?: KvIteratorOptions): AsyncGenerator<[string, string]>
  close(): Promise<void> | void
}

// LevelDB 的读写性能适合这种消息缓存，恢复为之前的存储后端
class LevelKV implements KvStore {
  readonly driver = 'level' as const
  private opened = false

  constructor(
    readonly path: string,
    private readonly level: LevelDatabase,
  ) {}

  get isOpen(): boolean {
    return this.opened
  }

  async open() {
    await this.level.open()
    this.opened = true
  }

  async close() {
    if (!this.opened) return
    await this.level.close()
    this.opened = false
  }

  async put(key: string, value: string) {
    await this.level.put(key, value)
  }

  async get(key: string): Promise<string> {
    return await this.level.get(key)
  }

  async del(key: string) {
    await this.level.del(key)
  }

  async batch(operations: KvWriteOperation[]) {
    await this.level.batch(operations)
  }

  async clear() {
    await this.level.clear()
  }

  async vacuum() {
    await this.level.compactRange('', '\uffff')
  }

  async *iterator(options: KvIteratorOptions = {}): AsyncGenerator<[string, string]> {
    for await (const [key, value] of this.level.iterator<string, string>(options)) {
      yield [key, value]
    }
  }
}

interface SharedDatabase {
  path: string
  db: KvStore
  refs: number
  closing?: Promise<void>
}

const sharedDatabases = new Map<string, SharedDatabase>()

// 同文件复用同一个 LevelDB 连接，避免 HMR 卸载/重载期间互相持有旧句柄
async function acquireSharedDatabase(filePath: string, Level: LevelConstructor): Promise<SharedDatabase> {
  let shared = sharedDatabases.get(filePath)
  if (shared?.closing) {
    await shared.closing.catch(() => undefined)
    shared = sharedDatabases.get(filePath)
  }
  if (!shared) {
    mkdirSync(path.dirname(filePath), { recursive: true })
    const level = new Level(filePath, {
      keyEncoding: 'utf8',
      valueEncoding: 'utf8',
    })
    const db = new LevelKV(filePath, level)
    await db.open()
    shared = {
      path: filePath,
      db,
      refs: 0,
    }
    sharedDatabases.set(filePath, shared)
  }
  shared.refs += 1
  return shared
}

async function releaseSharedDatabase(shared: SharedDatabase): Promise<boolean> {
  shared.refs -= 1
  if (shared.refs > 0) return false
  if (shared.closing) {
    await shared.closing
    return true
  }
  const closing = Promise.resolve().then(() => {
    if (shared.db.isOpen) return shared.db.close()
  }).catch(() => undefined).finally(() => {
    if (sharedDatabases.get(shared.path) === shared) sharedDatabases.delete(shared.path)
  })
  shared.closing = closing
  await closing
  return true
}

export class ChatDatabase {
  private readonly dir: string
  private shared?: SharedDatabase

  constructor(
    private ctx: Context,
    private config: Config,
    private logger: PluginLogger,
  ) {
    this.dir = path.resolve(ctx.baseDir, 'data', 'chat-patch', 'db')
  }

  private get db(): KvStore {
    if (!this.shared) throw new Error('Store is not initialized')
    return this.shared.db
  }

  async initialize() {
    const levelModule = await this.loadLevelModule()
    this.shared = await acquireSharedDatabase(this.dir, levelModule.Level)
    this.logger.logInfo('LevelDB 已打开:', this.shared.db.driver, this.shared.path)
  }

  // 通过 w-node 服务动态安装并加载 level，原生 .node 不会进入插件依赖目录
  private async loadLevelModule(): Promise<LevelModule> {
    const nodeService = this.ctx.node
    if (!nodeService) {
      throw new Error('未检测到 w-node 服务，请先安装 koishi-plugin-w-node')
    }
    const levelModule = await nodeService.import<LevelModule>('level', {
      version: '^10.0.0',
      useRequire: true,
    })
    if (!levelModule?.Level) {
      throw new Error('w-node 动态加载 level 失败')
    }
    return levelModule
  }

  async dispose() {
    const closed = await this.releaseShared()
    if (closed) this.logger.logInfo('存储已关闭')
  }

  private async releaseShared(): Promise<boolean> {
    const shared = this.shared
    this.shared = undefined
    if (shared) return releaseSharedDatabase(shared)
    return false
  }

  async clearAll() {
    // 先清空记录，再强制压缩，让旧页也能被回收
    await this.db.clear()
    await this.db.vacuum()
    this.logger.logInfo('数据库缓存已全部清空并完成压缩')
  }

  async appendMessage(record: MessageRecord) {
    await this.db.put(messageKey(record), JSON.stringify(record))
    await this.trimChannel(record.platform, record.selfId, record.channelId || '')
  }

  async upsertSelfMessage(record: SelfMessageRecord) {
    if (record.messageId) {
      await this.removeSelfMessageByMessageId(
        record.platform,
        record.selfId,
        record.channelId,
        record.messageId,
        record.id,
      )
    }
    await this.db.put(selfMessageKey(record), JSON.stringify(record))
    await this.trimChannel(record.platform, record.selfId, record.channelId)
  }

  async listSelfMessages(
    platform: string,
    selfId: string,
    channelId: string,
    limit = this.config.historyPageSize,
  ): Promise<SelfMessageRecord[]> {
    const result: SelfMessageRecord[] = []
    const prefix = selfMessagePrefix(platform, selfId, channelId)
    for await (const [, value] of this.db.iterator({
      gte: prefix,
      lte: `${prefix}\uffff`,
      reverse: true,
      limit,
    })) {
      const parsed = this.parseSelfMessage(value)
      if (parsed) result.push(parsed)
    }
    return result
  }

  async listSelfMessagesBefore(
    platform: string,
    selfId: string,
    channelId: string,
    beforeTime: number,
    limit = this.config.historyPageSize,
  ): Promise<SelfMessageRecord[]> {
    const result: SelfMessageRecord[] = []
    const prefix = selfMessagePrefix(platform, selfId, channelId)
    const before = `${prefix}${String(beforeTime).padStart(16, '0')}`
    for await (const [, value] of this.db.iterator({
      gte: prefix,
      lt: before,
      reverse: true,
      limit,
    })) {
      const parsed = this.parseSelfMessage(value)
      if (parsed) result.push(parsed)
    }
    return result
  }

  async updateSelfMessageByMessageId(
    platform: string,
    selfId: string,
    _channelId: string,
    messageId: string,
    patch: Partial<SelfMessageRecord>,
  ): Promise<boolean> {
    const prefix = `sm:${encodeKeyPart(platform)}:${encodeKeyPart(selfId)}:`
    for await (const [key, value] of this.db.iterator({
      gte: prefix,
      lte: `${prefix}\uffff`,
    })) {
      const parsed = this.parseSelfMessage(value)
      if (!parsed || parsed.messageId !== messageId) continue
      const next: SelfMessageRecord = {
        ...parsed,
        ...patch,
        id: parsed.id,
        sentAt: parsed.sentAt,
      }
      await this.db.put(key, JSON.stringify(next))
      return true
    }
    return false
  }

  async updateMessageRevoked(
    platform: string,
    selfId: string,
    channelId: string,
    messageId: string,
    patch: { revoked: boolean; revokedAt: number },
  ): Promise<boolean> {
    const operations: Array<{ type: 'put'; key: string; value: string }> = []
    for (const prefix of [messagePrefix(platform, selfId, channelId), legacyMessagePrefix(platform, selfId, channelId)]) {
      for await (const [key, value] of this.db.iterator({
        gte: prefix,
        lte: `${prefix}\uffff`,
      })) {
        try {
          const parsed = JSON.parse(value) as unknown
          if (typeof parsed !== 'object' || parsed === null) continue
          const record = parsed as Partial<MessageRecord>
          const raw = typeof record.raw === 'object' && record.raw !== null
            ? record.raw as Record<string, unknown>
            : {}
          const rawMessage = typeof raw.message === 'object' && raw.message !== null
            ? raw.message as Record<string, unknown>
            : {}
          const id = String(record.id ?? rawMessage.id ?? '')
          if (!id || id !== messageId) continue
          operations.push({
            type: 'put',
            key,
            value: JSON.stringify({ ...parsed, ...patch }),
          })
        } catch {
          // 单条解析失败不影响其他消息
        }
      }
    }
    if (operations.length) await this.db.batch(operations)
    return operations.length > 0
  }

  async findSelfForwardContent(
    platform: string,
    selfId: string,
    channelId: string,
    id: string,
  ): Promise<unknown[] | null> {
    const prefixes = channelId
      ? [selfMessagePrefix(platform, selfId, channelId)]
      : [`sm:${encodeKeyPart(platform)}:${encodeKeyPart(selfId)}:`]
    for (const prefix of prefixes) {
      for await (const [, value] of this.db.iterator({
        gte: prefix,
        lte: `${prefix}\uffff`,
      })) {
        const parsed = this.parseSelfMessage(value)
        if (!parsed) continue
        if (parsed.forwardId === id || parsed.messageId === id) {
          if (Array.isArray(parsed.forwardContent) && parsed.forwardContent.length > 0) {
            return parsed.forwardContent
          }
        }
      }
    }
    return null
  }

  private async removeSelfMessageByMessageId(
    platform: string,
    selfId: string,
    _channelId: string,
    messageId: string,
    exceptId: string,
  ) {
    const prefix = `sm:${encodeKeyPart(platform)}:${encodeKeyPart(selfId)}:`
    const toDelete: string[] = []
    for await (const [key, value] of this.db.iterator({
      gte: prefix,
      lte: `${prefix}\uffff`,
    })) {
      const parsed = this.parseSelfMessage(value)
      if (parsed && parsed.messageId === messageId && parsed.id !== exceptId) {
        toDelete.push(key)
      }
    }
    if (toDelete.length) {
      await this.db.batch(toDelete.map((key) => ({ type: 'del', key })))
    }
  }

  private parseSelfMessage(value: string): SelfMessageRecord | null {
    try {
      const parsed = JSON.parse(value) as unknown
      if (typeof parsed === 'object' && parsed !== null) {
        const record = parsed as Partial<SelfMessageRecord>
        if (typeof record.id === 'string'
          && typeof record.platform === 'string'
          && typeof record.selfId === 'string'
          && typeof record.channelId === 'string'
          && typeof record.sentAt === 'number') {
          return record as SelfMessageRecord
        }
      }
    } catch {
      this.logger.warn('机器人消息解析失败:', value.slice(0, 120))
    }
    return null
  }

  async listMessages(
    platform: string,
    selfId: string,
    channelId: string,
    limit = this.config.historyPageSize,
  ): Promise<MessageRecord[]> {
    const result: MessageRecord[] = []
    for (const prefix of [messagePrefix(platform, selfId, channelId), legacyMessagePrefix(platform, selfId, channelId)]) {
      for await (const [, value] of this.db.iterator({
        gte: prefix,
        lte: `${prefix}\uffff`,
        reverse: true,
        limit: limit - result.length,
      })) {
        try {
          const parsed = JSON.parse(value) as unknown
          if (typeof parsed === 'object' && parsed !== null) {
            result.push(parsed as MessageRecord)
          }
        } catch {
          this.logger.warn('历史消息解析失败:', value.slice(0, 120))
        }
      }
      if (result.length >= limit) break
    }
    return result
  }

  async listMessagesBefore(
    platform: string,
    selfId: string,
    channelId: string,
    beforeTime: number,
    limit = this.config.historyPageSize,
  ): Promise<MessageRecord[]> {
    const result: MessageRecord[] = []
    for (const prefix of [messagePrefix(platform, selfId, channelId), legacyMessagePrefix(platform, selfId, channelId)]) {
      const before = `${prefix}${String(beforeTime).padStart(16, '0')}`
      for await (const [, value] of this.db.iterator({
        gte: prefix,
        lt: before,
        reverse: true,
        limit: limit - result.length,
      })) {
        try {
          const parsed = JSON.parse(value) as unknown
          if (typeof parsed === 'object' && parsed !== null) {
            result.push(parsed as MessageRecord)
          }
        } catch {
          this.logger.warn('历史消息解析失败:', value.slice(0, 120))
        }
      }
      if (result.length >= limit) break
    }
    return result
  }

  async clearChannel(platform: string, selfId: string, channelId: string) {
    const operations: Array<{ type: 'del'; key: string }> = []
    for (const prefix of [messagePrefix(platform, selfId, channelId), legacyMessagePrefix(platform, selfId, channelId)]) {
      for await (const [key] of this.db.iterator({
        gte: prefix,
        lte: `${prefix}\uffff`,
      })) {
        operations.push({ type: 'del', key })
      }
    }
    const selfPrefix = selfMessagePrefix(platform, selfId, channelId)
    for await (const [key] of this.db.iterator({
      gte: selfPrefix,
      lte: `${selfPrefix}\uffff`,
    })) {
      operations.push({ type: 'del', key })
    }
    if (operations.length) await this.db.batch(operations)
  }

  async getPinned(): Promise<PinnedState> {
    try {
      const value = await this.db.get('meta:pinned')
      const parsed = JSON.parse(value) as unknown
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as PinnedState
      }
    } catch {
      // 首次使用没有置顶数据
    }
    return { bots: [], channels: [] }
  }

  async setPinned(state: PinnedState) {
    await this.db.put('meta:pinned', JSON.stringify(state))
  }

  async getMeta(key: string): Promise<unknown> {
    try {
      return JSON.parse(await this.db.get(`meta:${key}`)) as unknown
    } catch {
      return undefined
    }
  }

  async setMeta(key: string, value: unknown) {
    await this.db.put(`meta:${key}`, JSON.stringify(value))
  }

  async recordMedia(url: string, filePath: string, channelId = '') {
    const key = `media:${createHash('md5').update(url).digest('hex')}`
    await this.db.put(key, JSON.stringify({ filePath, channelId }))
  }

  async getMediaPath(url: string): Promise<string | undefined> {
    try {
      const key = `media:${createHash('md5').update(url).digest('hex')}`
      const value = await this.db.get(key)
      try {
        const parsed = JSON.parse(value) as unknown
        if (typeof parsed === 'object' && parsed !== null) {
          const item = parsed as { filePath?: unknown }
          return typeof item.filePath === 'string' ? item.filePath : value
        }
      } catch {
        // 旧记录直接存的是文件路径
      }
      return value
    } catch {
      return undefined
    }
  }

  async getAllMedia(): Promise<Array<{ filePath: string; channelId: string }>> {
    const result: Array<{ filePath: string; channelId: string }> = []
    for await (const [, value] of this.db.iterator({
      gte: 'media:',
      lte: 'media:\uffff',
    })) {
      try {
        const parsed = JSON.parse(value) as unknown
        if (typeof parsed === 'object' && parsed !== null) {
          const item = parsed as { filePath?: unknown; channelId?: unknown }
          if (typeof item.filePath === 'string') {
            result.push({
              filePath: item.filePath,
              channelId: typeof item.channelId === 'string' ? item.channelId : '',
            })
          }
        } else if (typeof parsed === 'string') {
          result.push({ filePath: parsed, channelId: '' })
        }
      } catch {
        result.push({ filePath: value, channelId: '' })
      }
    }
    return result
  }

  async removeMediaByPath(filePath: string) {
    const normalized = path.normalize(filePath)
    const toDelete: string[] = []
    for await (const [key, value] of this.db.iterator({
      gte: 'media:',
      lte: 'media:\uffff',
    })) {
      let stored = value
      try {
        const parsed = JSON.parse(value) as unknown
        if (typeof parsed === 'object' && parsed !== null) {
          const item = parsed as { filePath?: unknown }
          stored = typeof item.filePath === 'string' ? item.filePath : value
        }
      } catch {
        // 旧格式直接存路径
      }
      if (path.normalize(stored) === normalized) toDelete.push(key)
    }
    if (toDelete.length) {
      await this.db.batch(toDelete.map((key) => ({ type: 'del', key })))
    }
  }

  async getContacts(platform: string, selfId: string, type: string): Promise<ContactCacheItem[]> {
    for (const key of [contactKey(platform, selfId, type), legacyContactKey(platform, selfId, type)]) {
      try {
        const value = await this.db.get(key)
        const parsed = JSON.parse(value) as unknown
        if (Array.isArray(parsed)) {
          const contacts = parsed as ContactCacheItem[]
          return type === 'group' ? contacts.filter(isUsableGroupContact) : contacts
        }
      } catch {
        // 旧 key 或首次使用可能不存在
      }
    }
    return []
  }

  async getContact(
    platform: string,
    selfId: string,
    type: string,
    id: string,
  ): Promise<ContactCacheItem | null> {
    const contacts = await this.getContacts(platform, selfId, type)
    return contacts.find((item) => item.id === id) ?? null
  }

  async setContacts(platform: string, selfId: string, type: string, contacts: ContactCacheItem[]) {
    const next = type === 'group' ? contacts.filter(isUsableGroupContact) : contacts
    await this.db.put(contactKey(platform, selfId, type), JSON.stringify(next))
  }

  async appendContact(platform: string, selfId: string, type: string, contact: ContactCacheItem) {
    if (type === 'group' && !isUsableGroupContact(contact)) return
    const contacts = await this.getContacts(platform, selfId, type)
    const next = contacts.filter((item) => item.id !== contact.id)
    next.push(contact)
    await this.setContacts(platform, selfId, type, next)
  }

  async getContactsLegacy(platform: string, selfId: string, type: string): Promise<ContactCacheItem[]> {
    try {
      const value = await this.db.get(legacyContactKey(platform, selfId, type))
      const parsed = JSON.parse(value) as unknown
      if (!Array.isArray(parsed)) return []
      const contacts = parsed as ContactCacheItem[]
      return type === 'group' ? contacts.filter(isUsableGroupContact) : contacts
    } catch {
      return []
    }
  }

  async getGroupMembers(
    platform: string,
    selfId: string,
    groupId: string,
  ): Promise<ContactCacheItem[]> {
    for (const key of [groupMemberKey(platform, selfId, groupId), legacyGroupMemberKey(platform, selfId, groupId)]) {
      try {
        const value = await this.db.get(key)
        const parsed = JSON.parse(value) as unknown
        return Array.isArray(parsed) ? parsed as ContactCacheItem[] : []
      } catch {
        // 新键或旧键可能不存在，继续尝试另一个
      }
    }
    return []
  }

  async setGroupMembers(
    platform: string,
    selfId: string,
    groupId: string,
    members: ContactCacheItem[],
  ) {
    await this.db.put(groupMemberKey(platform, selfId, groupId), JSON.stringify(members))
  }

  async getGroupMember(
    platform: string,
    selfId: string,
    groupId: string,
    userId: string,
  ): Promise<ContactCacheItem | null> {
    const members = await this.getGroupMembers(platform, selfId, groupId)
    return members.find((item) => item.id === userId) ?? null
  }

  async appendGroupMember(
    platform: string,
    selfId: string,
    groupId: string,
    member: ContactCacheItem,
  ) {
    const members = await this.getGroupMembers(platform, selfId, groupId)
    const next = members.filter((item) => item.id !== member.id)
    next.push(member)
    await this.setGroupMembers(platform, selfId, groupId, next)
  }

  async getAllContacts(): Promise<Array<{
    platform: string
    selfId: string
    type: string
    contacts: ContactCacheItem[]
  }>> {
    type ContactEntry = {
      platform: string
      selfId: string
      type: string
      contacts: ContactCacheItem[]
    }
    const result: Array<{
      platform: string
      selfId: string
      type: string
      contacts: ContactCacheItem[]
    }> = []
    const byTriple = new Map<string, {
      kind: 'new' | 'legacy'
      entry: ContactEntry
    }>()
    for await (const [key, value] of this.db.iterator({
      gte: 'c:',
      lte: 'c:\uffff',
    })) {
      if (!key.startsWith('c:')) continue
      let source: 'new' | 'legacy' = 'legacy'
      let platform = ''
      let selfId = ''
      let type = ''
      const parts = key.slice(2).split(':')
      if (parts.length === 3) {
        platform = decodeKeyPart(parts[0])
        selfId = decodeKeyPart(parts[1])
        type = decodeKeyPart(parts[2])
        source = 'new'
      } else {
        const typeIndex = key.lastIndexOf(':')
        if (typeIndex <= 2) continue
        type = key.slice(typeIndex + 1)
        const rest = key.slice(2, typeIndex)
        const sep = rest.lastIndexOf(':')
        if (sep <= 0) continue
        platform = rest.slice(0, sep)
        selfId = rest.slice(sep + 1)
      }
      if (!platform || !selfId || !type) continue
      try {
        const parsed = JSON.parse(value) as unknown
        const entry: ContactEntry = {
          platform,
          selfId,
          type,
          contacts: Array.isArray(parsed) ? parsed as ContactCacheItem[] : [],
        }
        if (entry.type === 'group') {
          entry.contacts = entry.contacts.filter(isUsableGroupContact)
        }
        const triple = JSON.stringify([platform, selfId, type])
        const existing = byTriple.get(triple)
        if (!existing || (existing.kind === 'legacy' && source === 'new')) {
          byTriple.set(triple, { kind: source, entry })
        }
      } catch {
        this.logger.warn('联系人缓存解析失败:', key)
      }
    }
    for (const { entry } of byTriple.values()) {
      result.push(entry)
    }
    return result
  }

  // 收到消息或机器人发送消息后统一裁剪，m 和 sm 合起来按时间保留上限
  private async trimChannel(platform: string, selfId: string, channelId: string) {
    const rows: Array<{ key: string; time: number }> = []
    const prefixes = [
      messagePrefix(platform, selfId, channelId),
      legacyMessagePrefix(platform, selfId, channelId),
      selfMessagePrefix(platform, selfId, channelId),
    ]
    for (const prefix of prefixes) {
      for await (const [key, value] of this.db.iterator({
        gte: prefix,
        lte: `${prefix}\uffff`,
      })) {
        rows.push({ key, time: this.extractRecordTime(value) })
      }
    }
    await this.trimRows(rows)
  }

  // 启动时清理历史遗留的超量消息，避免配置项只在写入时才生效
  async cleanupExcess() {
    const groups = new Map<string, {
      platform: string
      selfId: string
      channelId: string
      rows: Array<{ key: string; time: number }>
    }>()
    const collect = async (prefix: string) => {
      for await (const [key, value] of this.db.iterator({
        gte: prefix,
        lte: `${prefix}\uffff`,
      })) {
        let parsed: Record<string, unknown>
        try {
          parsed = JSON.parse(value) as Record<string, unknown>
        } catch {
          continue
        }
        const platform = typeof parsed.platform === 'string' ? parsed.platform : ''
        const selfId = typeof parsed.selfId === 'string' ? parsed.selfId : ''
        const channelId = typeof parsed.channelId === 'string' ? parsed.channelId : ''
        if (!platform || !selfId) continue
        const groupKey = JSON.stringify([platform, selfId, channelId])
        let group = groups.get(groupKey)
        if (!group) {
          group = { platform, selfId, channelId, rows: [] }
          groups.set(groupKey, group)
        }
        group.rows.push({ key, time: this.extractRecordTime(value) })
      }
    }
    await collect('m:')
    await collect('sm:')

    let removed = 0
    for (const group of groups.values()) {
      const excess = group.rows.length - this.config.maxMessagesPerChannel
      if (excess <= 0) continue
      group.rows.sort((a, b) => a.time - b.time || (a.key < b.key ? -1 : 1))
      const keys = group.rows.slice(0, excess).map((item) => item.key)
      await this.db.batch(keys.map((key) => ({ type: 'del', key })))
      removed += keys.length
    }
    if (removed) {
      this.logger.logInfo(`启动时已裁剪 ${removed} 条超出上限的历史消息`)
    }
  }

  private async trimRows(rows: Array<{ key: string; time: number }>) {
    const excess = rows.length - this.config.maxMessagesPerChannel
    if (excess <= 0) return
    rows.sort((a, b) => a.time - b.time || (a.key < b.key ? -1 : 1))
    const keys = rows.slice(0, excess).map((item) => item.key)
    await this.db.batch(keys.map((key) => ({ type: 'del', key })))
    this.logger.logInfo(`频道历史已裁剪 ${keys.length} 条`)
  }

  private extractRecordTime(value: string): number {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>
      return normalizeTimestampMs(parsed.timestampMs ?? parsed.timestamp ?? parsed.sentAt ?? parsed.receivedAt)
    } catch {
      return 0
    }
  }
}
