import { Level } from 'level'
import { Context } from 'koishi'
import path from 'node:path'
import { createHash } from 'node:crypto'

import { Config } from './config'
import { ContactCacheItem, MessageRecord, PinnedState } from './types'
import { PluginLogger } from './logger'

function encodeKeyPart(value: string): string {
  return encodeURIComponent(value)
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
  const time = String(record.timestamp).padStart(16, '0')
  return `${messagePrefix(record.platform, record.selfId, record.channelId || '')}${time}:${encodeKeyPart(record.id || 'unknown')}`
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

export class ChatDatabase {
  private db: Level<string, string>
  private opened = false

  constructor(
    private ctx: Context,
    private config: Config,
    private logger: PluginLogger,
  ) {
    const dir = path.resolve(ctx.baseDir, 'data', 'chat-patch', 'db')
    this.db = new Level<string, string>(dir, { keyEncoding: 'utf8', valueEncoding: 'utf8' })
  }

  async initialize() {
    await this.db.open()
    this.opened = true
    this.logger.logInfo('LevelDB 已打开:', this.db.location)
  }

  async dispose() {
    if (!this.opened) return
    await this.db.close()
    this.opened = false
    this.logger.logInfo('LevelDB closed')
  }

  async appendMessage(record: MessageRecord) {
    await this.db.put(messageKey(record), JSON.stringify(record))
    await this.trimMessages(record.platform, record.selfId, record.channelId || '')
  }

  async listMessages(
    platform: string,
    selfId: string,
    channelId: string,
    limit = this.config.historyPageSize,
  ): Promise<MessageRecord[]> {
    const result: MessageRecord[] = []
    for (const prefix of [messagePrefix(platform, selfId, channelId), legacyMessagePrefix(platform, selfId, channelId)]) {
      for await (const [, value] of this.db.iterator<string, string>({
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
      for await (const [, value] of this.db.iterator<string, string>({
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
      for await (const [key] of this.db.iterator<string, string>({
        gte: prefix,
        lte: `${prefix}\uffff`,
      })) {
        operations.push({ type: 'del', key })
      }
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
    for await (const [, value] of this.db.iterator<string, string>({
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
    for await (const [key, value] of this.db.iterator<string, string>({
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
        if (Array.isArray(parsed)) return parsed as ContactCacheItem[]
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
    await this.db.put(contactKey(platform, selfId, type), JSON.stringify(contacts))
  }

  async appendContact(platform: string, selfId: string, type: string, contact: ContactCacheItem) {
    const contacts = await this.getContacts(platform, selfId, type)
    const next = contacts.filter((item) => item.id !== contact.id)
    next.push(contact)
    await this.setContacts(platform, selfId, type, next)
  }

  async getContactsLegacy(platform: string, selfId: string, type: string): Promise<ContactCacheItem[]> {
    try {
      const value = await this.db.get(legacyContactKey(platform, selfId, type))
      const parsed = JSON.parse(value) as unknown
      return Array.isArray(parsed) ? parsed as ContactCacheItem[] : []
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
    for await (const [key, value] of this.db.iterator<string, string>({
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

  private async trimMessages(platform: string, selfId: string, channelId: string) {
    let count = 0
    const toDelete: string[] = []
    for (const prefix of [messagePrefix(platform, selfId, channelId), legacyMessagePrefix(platform, selfId, channelId)]) {
      for await (const [key] of this.db.iterator<string, string>({
        gte: prefix,
        lte: `${prefix}\uffff`,
      })) {
        count += 1
        if (count > this.config.maxMessagesPerChannel) toDelete.push(key)
      }
    }
    if (!toDelete.length) return
    await this.db.batch(toDelete.map((key) => ({ type: 'del', key })))
    this.logger.logInfo(`频道历史已裁剪 ${toDelete.length} 条`)
  }
}
