import {} from '@koishijs/console'
import type { Awaitable } from 'koishi'

export interface SatoriBootstrap {
  endpoint: string
  token: string
  basePath: string
  logins: SatoriLoginInfo[]
  blockedPlatforms: Array<{
    platformName: string
    exactMatch: boolean
  }>
}

export interface SatoriLoginInfo {
  platform: string
  selfId: string
  name: string
  avatar?: string
  status: number
  features?: string[]
}

export interface SatoriEventPayload {
  type: string
  platform: string
  selfId: string
  timestamp: number
  sn: number
  body: Record<string, unknown>
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
  revoked?: boolean
  revokedAt?: number
}

export type SelfMessageChannelType = 'group' | 'user'
export type SelfMessageSource = 'webui' | 'bot' | 'plugin'

export interface SelfMessageRecord {
  id: string
  platform: string
  selfId: string
  channelId: string
  guildId?: string
  channelType?: SelfMessageChannelType
  messageId?: string
  content?: string
  elements?: unknown[]
  message?: unknown[]
  forwardId?: string
  forwardContent?: unknown[]
  sentAt: number
  sequence: number
  source: SelfMessageSource
  kind: string
  fingerprint?: string
  revoked?: boolean
  revokedAt?: number
}

export interface SelfMessagePayload {
  id?: string
  platform: string
  selfId: string
  channelId: string
  guildId?: string
  channelType?: SelfMessageChannelType
  messageId?: string
  content?: string
  elements?: unknown[]
  message?: unknown[]
  forwardId?: string
  forwardContent?: unknown[]
  sentAt?: number
  sequence?: number
  source?: SelfMessageSource
  kind?: string
  revoked?: boolean
  revokedAt?: number
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
