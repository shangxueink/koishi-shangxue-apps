import { Bot, Context, Universal } from 'koishi'

import { ChatDatabase } from './database'
import { ContactCacheItem } from './types'
import { PluginLogger } from './logger'

function getString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function isUsableName(value: string, id: string): boolean {
  return Boolean(value) && value !== id && !/unknown user|unknown guild|unknown channel/i.test(value)
}

function normalizeGroupId(value: string): string {
  const raw = value.replace(/^(?:group|room|chat|channel|guild|private):/i, '').trim()
  const wrapped = raw.match(/^\[_?([\s\S]+?)_?\]$/)
  return wrapped ? wrapped[1] : raw || value
}

function normalizeCacheType(type: string): 'group' | 'friend' {
  if (type === 'user' || type === 'friend') return 'friend'
  return 'group'
}

function encodeKeyPart(value: string): string {
  return encodeURIComponent(value)
}

type FetchContact = (bot: Bot<Context>) => Promise<ContactCacheItem | null>

export class ContactCacheService {
  private inflight = new Map<string, Promise<ContactCacheItem | null>>()

  constructor(
    private ctx: Context,
    private database: ChatDatabase,
    private logger: PluginLogger,
  ) {}

  // 查询单用户缓存；未命中时由后端调用 bot.getUser，并写入数据库
  async getUser(
    platform: string,
    selfId: string,
    userId: string,
    guildId?: string,
    channelId?: string,
    fallbackName?: string,
    fallbackAvatar?: string,
  ): Promise<ContactCacheItem | null> {
    if (!userId || userId === '0') return null
    const guild = guildId && guildId !== '0' ? guildId : undefined
    const channel = channelId && channelId !== '0' ? channelId : undefined
    const item = await this.resolve(platform, selfId, 'user', userId, async (bot) => {
      let user: Universal.User | null = null
      let member: Universal.GuildMember | null = null
      try {
        user = await bot.getUser(userId, guild)
      } catch (error) {
        this.logger.logInfo('用户身份回源失败:', userId, error)
      }

      let name = getString(user?.name)
        || getString(user?.nick)
        || getString(user?.username)
        || getString(user?.nickname)
      let avatar = getString(user?.avatar)

      if (guild && (!name || !avatar)) {
        try {
          member = await bot.getGuildMember(guild, userId)
        } catch (error) {
          this.logger.logInfo('群成员身份回源失败:', userId, error)
        }
        name = name
          || getString(member?.name)
          || getString(member?.nick)
          || getString(member?.user?.name)
          || getString(member?.user?.nick)
        avatar = avatar
          || getString(member?.avatar)
          || getString(member?.user?.avatar)
      }

      const eventName = getString(fallbackName)
      const eventAvatar = getString(fallbackAvatar)
      if (!isUsableName(name, userId) && isUsableName(eventName, userId)) {
        name = eventName
      }
      if (!avatar && eventAvatar) avatar = eventAvatar

      if (!name && !avatar) return null
      this.logger.logInfo('用户身份已回源并写入缓存:', userId, name)
      return {
        id: userId,
        name: name || userId,
        avatar: avatar || undefined,
        raw: {
          id: userId,
          user_id: userId,
          name,
          nickname: name,
          avatar: avatar || undefined,
          channel_id: channel || undefined,
          guild_id: guild || undefined,
        },
      }
    }, {
      name: fallbackName,
      avatar: fallbackAvatar,
    })
    if (!item) return null
    const needChannel = Boolean(channel && item.channelId !== channel)
    const needGuild = Boolean(guild && item.guildId !== guild)
    if (channel) item.channelId = channel
    if (guild) item.guildId = guild
    if (needChannel || needGuild) {
      if (item.raw && typeof item.raw === 'object') {
        const raw = item.raw as Record<string, unknown>
        if (channel) raw.channel_id = channel
        if (guild) raw.guild_id = guild
      }
      await this.database.appendContact(platform, selfId, 'friend', item)
    }
    return item
  }

  // 查询群/频道缓存；未命中时由后端调用 guild.get/channel.get，并写入数据库
  async getGroup(
    platform: string,
    selfId: string,
    id: string,
    guildId?: string,
    channelId?: string,
    fallbackName?: string,
    fallbackAvatar?: string,
  ): Promise<ContactCacheItem | null> {
    const guild = guildId && guildId !== '0' ? guildId : undefined
    const channel = channelId && channelId !== '0' ? channelId : undefined
    const rawId = id && id !== '0' ? normalizeGroupId(id) : ''
    const cacheId = rawId || guild || normalizeGroupId(channel || '') || ''
    if (!cacheId) return null
    const item = await this.resolve(platform, selfId, 'group', cacheId, async (bot) => {
      const [guildData, channelData] = await Promise.all([
        guild
          ? this.safeGet(() => bot.getGuild(guild))
          : cacheId
            ? this.safeGet(() => bot.getGuild(cacheId))
            : Promise.resolve(null),
        channel
          ? this.safeGet(() => bot.getChannel(channel, guild))
          : Promise.resolve(null),
      ])

      let name = getString(guildData?.name) || getString(channelData?.name)
      let avatar = getString(guildData?.avatar) || getString(channelData?.avatar)
      const eventName = getString(fallbackName)
      const eventAvatar = getString(fallbackAvatar)
      if (!isUsableName(name, cacheId) && isUsableName(eventName, cacheId)) {
        name = eventName
      }
      if (!avatar && eventAvatar) avatar = eventAvatar
      if (!name && !avatar) return null
      this.logger.logInfo('群组身份已回源并写入缓存:', cacheId, name)
      return {
        id: cacheId,
        name: name || cacheId,
        avatar: avatar || undefined,
        raw: {
          id: cacheId,
          group_id: cacheId,
          name,
          group_name: name,
          avatar: avatar || undefined,
          channel_id: channel || undefined,
          guild_id: guild || undefined,
        },
      }
    }, {
      name: fallbackName,
      avatar: fallbackAvatar,
    })
    if (!item) return null
    const needChannel = Boolean(channel && item.channelId !== channel)
    const needGuild = Boolean(guild && item.guildId !== guild)
    if (channel) item.channelId = channel
    if (guild) item.guildId = guild
    if (needChannel || needGuild) {
      if (item.raw && typeof item.raw === 'object') {
        const raw = item.raw as Record<string, unknown>
        if (channel) raw.channel_id = channel
        if (guild) raw.guild_id = guild
      }
      await this.database.appendContact(platform, selfId, 'group', item)
    }
    return item
  }

  // 收到群消息时更新该群对应的群友表
  async recordGroupMember(
    platform: string,
    selfId: string,
    groupId: string,
    member: ContactCacheItem,
  ) {
    if (!platform || !selfId || !groupId || !member.id) return
    await this.database.appendGroupMember(platform, selfId, groupId, member)
  }

  // 同一身份的并发请求合并，避免首条消息同时触发多个回源
  private resolve(
    platform: string,
    selfId: string,
    type: string,
    id: string,
    fetcher: FetchContact,
    fallback?: { name?: string; avatar?: string },
  ): Promise<ContactCacheItem | null> {
    const canonical = normalizeCacheType(type)
    const key = [platform, selfId, canonical, id].map(encodeKeyPart).join(':')
    const existing = this.inflight.get(key)
    if (existing) return existing

    const task = this.resolveUncached(platform, selfId, canonical, id, fetcher, fallback)
      .finally(() => this.inflight.delete(key))
    this.inflight.set(key, task)
    return task
  }

  private async resolveUncached(
    platform: string,
    selfId: string,
    type: 'group' | 'friend',
    id: string,
    fetcher: FetchContact,
    fallback?: { name?: string; avatar?: string },
  ): Promise<ContactCacheItem | null> {
    const cached = await this.database.getContact(platform, selfId, type, id)
    if (cached && !this.shouldRefreshWithFallback(cached, id, fallback)) {
      return this.publicContact(cached)
    }

    const bot = this.ctx.bots.find((item) => {
      return item.platform === platform && item.selfId === selfId
    })
    if (!bot) {
      const fallbackItem = this.toFallbackContact(id, fallback)
      if (fallbackItem) {
        await this.database.appendContact(platform, selfId, type, fallbackItem)
        return this.publicContact(fallbackItem)
      }
      return null
    }

    const item = await fetcher(bot)
    if (!item) return null
    await this.database.appendContact(platform, selfId, type, item)
    return this.publicContact(item)
  }

  private shouldRefreshWithFallback(
    cached: ContactCacheItem,
    id: string,
    fallback?: { name?: string; avatar?: string },
  ): boolean {
    if (!fallback) return false
    const cachedNameUsable = isUsableName(cached.name, id)
    const fallbackNameUsable = isUsableName(getString(fallback.name), id)
    const hasCachedAvatar = Boolean(cached.avatar)
    const hasFallbackAvatar = Boolean(getString(fallback.avatar))
    return (!cachedNameUsable && fallbackNameUsable) || (!hasCachedAvatar && hasFallbackAvatar)
  }

  private toFallbackContact(
    id: string,
    fallback?: { name?: string; avatar?: string },
  ): ContactCacheItem | null {
    const name = isUsableName(getString(fallback?.name), id) ? getString(fallback.name) : ''
    const avatar = getString(fallback?.avatar)
    if (!name && !avatar) return null
    return {
      id,
      name: name || id,
      avatar: avatar || undefined,
    }
  }

  private async safeGet<T>(getter: () => Promise<T>): Promise<T | null> {
    try {
      return await getter()
    } catch (error) {
      this.logger.logInfo('群组身份回源失败:', error)
      return null
    }
  }

  private publicContact(item: ContactCacheItem): ContactCacheItem {
    return {
      id: item.id,
      name: item.name,
      avatar: item.avatar || undefined,
      channelId: item.channelId || undefined,
      guildId: item.guildId || undefined,
      raw: item.raw ?? undefined,
    }
  }
}
