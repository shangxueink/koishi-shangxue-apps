import { Context, Session } from 'koishi'

import { Config } from './config'
import { ContactCacheService } from './cache'
import { ChatDatabase } from './database'
import { MediaManager } from './media'
import { MessageRecord } from './types'
import { PluginLogger } from './logger'

const MESSAGE_TYPES = new Set(['message', 'message-created', 'send'])

function normalizeGroupId(value: string): string {
  return value.replace(/^(?:group|room|chat|channel|guild|private):/i, '') || value
}

export class Recorder {
  constructor(
    private ctx: Context,
    private config: Config,
    private database: ChatDatabase,
    private media: MediaManager,
    private contactCache: ContactCacheService,
    private logger: PluginLogger,
  ) {}

  start() {
    this.ctx.on('internal/session', (session: Session) => {
      void this.handleSession(session)
    })
  }

  private isBlocked(platform: string): boolean {
    return (this.config.blockedPlatforms ?? []).some((item) => {
      return item.exactMatch
        ? platform === item.platformName
        : platform.includes(item.platformName)
    })
  }

  private async handleSession(session: Session) {
    const platform = session.platform || 'unknown'
    if (this.isBlocked(platform)) return
    if (!MESSAGE_TYPES.has(session.type)) return

    const event = session.toJSON()
    const message = event.message
    const record: MessageRecord = {
      id: message?.id || `local-${event.sn}`,
      sequence: event.sn,
      type: session.type,
      platform,
      selfId: session.selfId,
      channelId: session.channelId,
      guildId: session.guildId,
      userId: session.userId,
      timestamp: session.timestamp,
      timestampMs: session.timestamp,
      receivedAt: Date.now(),
      content: session.content || message?.content,
      elements: message?.elements as unknown[] | undefined,
      raw: event,
    }

    try {
      await this.database.appendMessage(record)
      void this.cacheMessageContacts(event).catch((error) => {
        this.logger.warn('缓存消息联系人失败:', error)
      })
      void this.cacheMessageMedia(event).catch((error) => {
        this.logger.warn('异步缓存消息媒体失败:', error)
      })
    } catch (error) {
      this.logger.warn('写入历史消息失败:', error)
    }
  }

  private async cacheMessageContacts(event: ReturnType<Session['toJSON']>) {
    const platform = event.platform || ''
    const selfId = event.selfId || ''
    const user = event.user
    const guild = event.guild
    const channel = event.channel
    const member = event.member
    const userId = user?.id || ''
    const guildId = guild?.id || ''
    const channelId = channel?.id || ''
    const groupId = guildId || normalizeGroupId(channelId) || ''
    const userName = user?.name || user?.nick || member?.nick || member?.name || ''
    const userAvatar = user?.avatar || member?.avatar || ''
    const groupName = guild?.name || channel?.name || ''
    const groupAvatar = guild?.avatar || ''

    if (groupId) {
      const groupItem = await this.contactCache.getGroup(
        platform,
        selfId,
        groupId,
        guildId || groupId,
        channelId || groupId,
        groupName,
        groupAvatar,
      )
      if (userId) {
        const userItem = await this.contactCache.getUser(
          platform,
          selfId,
          userId,
          guildId || groupId,
          undefined,
          userName,
          userAvatar,
        )
        await this.contactCache.recordGroupMember(
          platform,
          selfId,
          groupId,
          {
            id: userId,
            name: userItem?.name || userName || userId,
            avatar: userItem?.avatar || userAvatar || undefined,
            raw: {
              id: userId,
              user_id: userId,
              nickname: userName || userItem?.name,
              card: member?.nick || member?.name || '',
              avatar: userItem?.avatar || userAvatar || undefined,
              role: member?.title || '',
            },
          },
        )
      }
      if (!groupItem) this.logger.logInfo('群组缓存未回源到可用身份:', groupId)
    } else if (userId) {
      await this.contactCache.getUser(
        platform,
        selfId,
        userId,
        undefined,
        channelId,
        userName,
        userAvatar,
      )
    }
  }

  private async cacheMessageMedia(event: ReturnType<Session['toJSON']>) {
    const elements = Array.isArray(event.message?.elements) ? event.message.elements : []
    const urls: string[] = []
    const collect = (list: unknown[]) => {
      for (const raw of list) {
        const element = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {}
        const attrs = typeof element.attrs === 'object' && element.attrs !== null ? element.attrs as Record<string, unknown> : {}
        if (['img', 'image', 'mface', 'audio', 'video', 'file'].includes(String(element.type))) {
          const url = String(attrs.src ?? attrs.url ?? attrs.file ?? '')
          if (url) urls.push(url)
        }
        if (Array.isArray(element.children)) collect(element.children)
      }
    }
    collect(elements)
    await Promise.allSettled(urls.map((url) => this.media.cacheUrl(url)))
  }
}
