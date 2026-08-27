import { Level } from 'level'
import { Context } from 'koishi'
import path from 'node:path'
import { createHash } from 'node:crypto'

import { Config } from './config'
import { ContactCacheItem, MessageRecord, PinnedState } from './types'
import { PluginLogger } from './logger'

function messagePrefix(platform: string, selfId: string, channelId: string): string {
  return `m:${platform}:${selfId}:${channelId}:`
}

function messageKey(record: MessageRecord): string {
  const time = String(record.timestamp).padStart(16, '0')
  return `${messagePrefix(record.platform, record.selfId, record.channelId || '')}${time}:${record.id || 'unknown'}`
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
    this.logger.logInfo('LevelDB 已关闭')
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
    const prefix = messagePrefix(platform, selfId, channelId)
    const result: MessageRecord[] = []
    for await (const [, value] of this.db.iterator<string, string>({
      gte: prefix,
      lte: `${prefix}\uffff`,
      reverse: true,
      limit,
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
    return result
  }

  async clearChannel(platform: string, selfId: string, channelId: string) {
    const prefix = messagePrefix(platform, selfId, channelId)
    const operations: Array<{ type: 'del'; key: string }> = []
    for await (const [key] of this.db.iterator<string, string>({
      gte: prefix,
      lte: `${prefix}\uffff`,
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

  async recordMedia(url: string, filePath: string) {
    const key = `media:${createHash('md5').update(url).digest('hex')}`
    await this.db.put(key, filePath)
  }

  async getMediaPath(url: string): Promise<string | undefined> {
    try {
      const key = `media:${createHash('md5').update(url).digest('hex')}`
      return await this.db.get(key)
    } catch {
      return undefined
    }
  }

  async getContacts(platform: string, selfId: string, type: string): Promise<ContactCacheItem[]> {
    try {
      const value = await this.db.get(`c:${platform}:${selfId}:${type}`)
      const parsed = JSON.parse(value) as unknown
      return Array.isArray(parsed) ? parsed as ContactCacheItem[] : []
    } catch {
      return []
    }
  }

  async setContacts(platform: string, selfId: string, type: string, contacts: ContactCacheItem[]) {
    await this.db.put(`c:${platform}:${selfId}:${type}`, JSON.stringify(contacts))
  }

  private async trimMessages(platform: string, selfId: string, channelId: string) {
    const prefix = messagePrefix(platform, selfId, channelId)
    let count = 0
    const toDelete: string[] = []
    for await (const [key] of this.db.iterator<string, string>({
      gte: prefix,
      lte: `${prefix}\uffff`,
    })) {
      count += 1
      if (count > this.config.maxMessagesPerChannel) toDelete.push(key)
    }
    if (!toDelete.length) return
    await this.db.batch(toDelete.map((key) => ({ type: 'del', key })))
    this.logger.logInfo(`频道历史已裁剪 ${toDelete.length} 条:`, prefix)
  }
}
