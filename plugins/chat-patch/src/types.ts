import {} from '@koishijs/console'
import type { Awaitable } from 'koishi'

export interface SatoriBootstrap {
  endpoint: string
  token: string
  basePath: string
}

export interface MessageRecord {
  id?: string
  sequence?: number
  type: string
  platform: string
  selfId: string
  channelId?: string
  guildId?: string
  userId?: string
  timestamp: number
  timestampMs?: number
  receivedAt?: number
  content?: string
  elements?: unknown[]
  raw?: unknown
}

export interface HistoryQuery {
  platform: string
  selfId: string
  channelId: string
  limit?: number
}

export interface HistoryResult {
  messages: MessageRecord[]
}

export interface PinnedState {
  bots: string[]
  channels: string[]
}

export interface PluginConfigPayload {
  basePath: string
  maxMessagesPerChannel: number
  historyPageSize: number
  maxMediaFiles: number
  blockedPlatforms: Array<{ platformName: string; exactMatch: boolean }>
  loggerinfo: boolean
}

export interface ContactCacheItem {
  id: string
  name: string
  avatar?: string
  channelId?: string
  guildId?: string
  raw?: unknown
}

export interface ContactCacheQuery {
  platform: string
  selfId: string
  type: string
  contacts?: ContactCacheItem[]
  append?: boolean
}

export interface ContactCacheResult {
  contacts?: ContactCacheItem[]
}

declare module '@koishijs/console' {
  interface Events {
    'chat-patch/bootstrap'(): SatoriBootstrap
    'chat-patch/history'(query: HistoryQuery): Awaitable<HistoryResult>
    'chat-patch/config'(): PluginConfigPayload
    'chat-patch/contact-cache'(query: ContactCacheQuery): Awaitable<ContactCacheResult>
  }
}
