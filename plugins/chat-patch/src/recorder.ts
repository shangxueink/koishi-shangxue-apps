import { ContactCacheService } from './cache'
import { ChatDatabase } from './database'
import { MediaManager } from './media'
import { MessageRecord } from './types'
import { PluginLogger } from './logger'

const MESSAGE_TYPES = new Set(['message', 'message-created'])

function getObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : {}
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function getNumber(value: unknown): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function normalizeGroupId(value: string): string {
  return String(value)
}

function isPrivateChannelType(value: unknown): boolean {
  const num = Number(value)
  if (Number.isFinite(num)) return num === 1
  const text = String(value ?? '').toLowerCase()
  return text === 'direct' || text === 'private'
}

export class Recorder {
  constructor(
    private database: ChatDatabase,
    private media: MediaManager,
    private contactCache: ContactCacheService,
    private logger: PluginLogger,
  ) {}

  // 后端直连 Satori 后，由 SatoriGateway 逐条送入原始事件
  async handleEvent(body: Record<string, unknown>): Promise<boolean> {
    const type = getString(body.type)
    const login = getObject(body.login)
    const platform = getString(body.platform) || getString(login.platform)
    if (type === 'message-deleted') {
      await this.handleMessageDeleted(body)
      return true
    }
    if (!MESSAGE_TYPES.has(type)) return false
    await this.handleMessageCreated(body)
    return true
  }

  private async handleMessageCreated(body: Record<string, unknown>) {
    const login = getObject(body.login)
    const loginUser = getObject(login.user)
    const platform = getString(body.platform) || getString(login.platform)
    const selfId = getString(body.self_id) || getString(body.selfId) || getString(loginUser.id)
    const message = getObject(body.message)
    const channel = getObject(body.channel)
    const guild = getObject(body.guild)
    const user = getObject(body.user)
    const sn = getNumber(body.sn)
    const timestamp = getNumber(body.timestamp) || Date.now()
    const timestampMs = timestamp > 1e12 ? timestamp : timestamp * 1000
    const record: MessageRecord = {
      id: getString(message.id) || `satori-${sn}`,
      sequence: sn,
      type: getString(body.type),
      platform,
      selfId,
      channelId: getString(channel.id) || undefined,
      guildId: getString(guild.id) || undefined,
      userId: getString(user.id) || undefined,
      timestamp,
      timestampMs,
      receivedAt: Date.now(),
      content: getString(message.content) || getString(message.raw_message) || undefined,
      elements: Array.isArray(message.elements) ? message.elements as unknown[] : undefined,
      raw: body,
    }

    try {
      await this.database.appendMessage(record)
    } catch (error) {
      this.logger.warn('写入历史消息失败:', error)
    }
    void this.cacheMessageContacts(body).catch((error) => {
      this.logger.warn('缓存消息联系人失败:', error)
    })
    void this.cacheMessageMedia(message, getString(channel.id)).catch((error) => {
      this.logger.warn('异步缓存消息媒体失败:', error)
    })
  }

  private async handleMessageDeleted(body: Record<string, unknown>) {
    const login = getObject(body.login)
    const loginUser = getObject(login.user)
    const platform = getString(body.platform) || getString(login.platform)
    const selfId = getString(body.self_id) || getString(body.selfId) || getString(loginUser.id)
    const message = getObject(body.message)
    const channel = getObject(body.channel)
    const guild = getObject(body.guild)
    const messageId = getString(message.id)
    const channelId = getString(channel.id) || getString(guild.id)
    if (!messageId || !channelId) return
    const patch = { revoked: true, revokedAt: Date.now() }
    await this.database.updateMessageRevoked(platform, selfId, channelId, messageId, patch)
    await this.database.updateSelfMessageByMessageId(platform, selfId, channelId, messageId, patch)
  }

  private async cacheMessageContacts(body: Record<string, unknown>) {
    const login = getObject(body.login)
    const loginUser = getObject(login.user)
    const platform = getString(body.platform) || getString(login.platform)
    const selfId = getString(body.self_id) || getString(body.selfId) || getString(loginUser.id)
    const user = getObject(body.user)
    const guild = getObject(body.guild)
    const channel = getObject(body.channel)
    const member = getObject(body.member)
    const userId = getString(user.id)
    const guildId = getString(guild.id)
    const channelId = getString(channel.id)
    const isPrivateChannel = isPrivateChannelType(channel.type)
    const groupId = guildId || (isPrivateChannel ? '' : normalizeGroupId(channelId)) || ''
    const userName = getString(user.name)
      || getString(user.nick)
      || getString(member.nick)
      || getString(member.name)
    const userAvatar = getString(user.avatar) || getString(member.avatar)
    const groupName = getString(guild.name) || getString(channel.name)
    const groupAvatar = getString(guild.avatar)

    if (groupId) {
      const groupItem = await this.contactCache.getGroup(
        platform,
        selfId,
        groupId,
        guildId || groupId,
        channelId || groupId,
        groupName,
        groupAvatar,
        channel.type,
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
              card: member.nick || member.name || '',
              avatar: userItem?.avatar || userAvatar || undefined,
              role: member.title || '',
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

  private async cacheMessageMedia(message: Record<string, unknown>, channelId: string) {
    await this.media.cacheMessageMedia(message, channelId)
  }
}
