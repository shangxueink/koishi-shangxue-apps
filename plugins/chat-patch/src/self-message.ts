import { Bot, Context, h, Session } from 'koishi'
import { createHash, randomUUID } from 'node:crypto'

import { ChatDatabase } from './database'
import { MediaManager } from './media'
import { PluginLogger } from './logger'
import { SelfMessageChannelType, SelfMessageRecord, SelfMessageSource } from './types'

type MessageContent = Parameters<Bot['sendMessage']>[1]
type SendOptions = NonNullable<Parameters<Bot['sendMessage']>[3]>
type SendOptionsWithMeta = SendOptions & {
  chatPatchId?: string
}
type BotSendMethod = Bot['sendMessage']
type BotCreateMethod = Bot['createMessage']
type BotPrivateMethod = Bot['sendPrivateMessage']
type BotDeleteMethod = Bot['deleteMessage']

interface BotMethods {
  createMessage: BotCreateMethod
  sendMessage: BotSendMethod
  sendPrivateMessage: BotPrivateMethod
  deleteMessage: BotDeleteMethod
}

interface SatoriElement {
  type?: unknown
  attrs?: Record<string, unknown>
  children?: SatoriElement[]
}

const KOISHI_STATUS_I18N_FALLBACK: Record<string, string> = {
  'commands.status.messages.status.0': '离线',
  'commands.status.messages.status.1': '运行中',
  'commands.status.messages.status.2': '连接中',
  'commands.status.messages.status.3': '异常',
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function getMessageId(value: unknown): string {
  const raw = getObject(value).id ?? getObject(value).message_id
  return raw == null ? '' : String(raw)
}

function getNumber(value: unknown): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function getObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : {}
}

function toSatoriElement(value: unknown): SatoriElement {
  const raw = getObject(value)
  const rawAttrs = raw.attrs ?? raw.data
  const attrs = typeof rawAttrs === 'object' && rawAttrs !== null
    ? rawAttrs as Record<string, unknown>
    : {}
  const children = Array.isArray(raw.children)
    ? raw.children.map(toSatoriElement)
    : []
  return {
    type: raw.type,
    attrs,
    children,
  }
}

function isForwardContainer(element: SatoriElement): boolean {
  return element.type === 'figure'
    || element.type === 'forward'
    || (element.type === 'message'
      && ('forward' in (element.attrs ?? {}) || element.attrs?.forward === true))
}

function toSegments(
  elements: unknown[],
  resolveI18n?: (attrs: Record<string, unknown>) => string,
): unknown[] {
  const result: unknown[] = []
  for (const raw of elements) {
    const element = toSatoriElement(raw)
    const attrs = element.attrs ?? {}
    const type = getString(element.type)
    if (type === 'text') {
      result.push({ type: 'text', text: getString(attrs.content) || getString(attrs.text) })
    } else if (type === 'at') {
      const id = getString(attrs.id) || getString(attrs.qq)
      const name = getString(attrs.name) || (attrs.type === 'all' ? '所有人' : id)
      result.push({ type: 'at', qq: id, text: name.startsWith('@') ? name : `@${name}` })
    } else if (type === 'img' || type === 'image') {
      const src = getString(attrs.src) || getString(attrs.url) || getString(attrs.file)
      result.push({ type: 'image', file: src, url: src, summary: getString(attrs.title) })
    } else if (type === 'audio' || type === 'record') {
      const src = getString(attrs.src) || getString(attrs.url) || getString(attrs.file)
      result.push({ type: 'record', file: src, url: src })
    } else if (type === 'video') {
      const src = getString(attrs.src) || getString(attrs.url) || getString(attrs.file)
      result.push({ type: 'video', file: src, url: src })
    } else if (type === 'file') {
      const src = getString(attrs.src) || getString(attrs.url) || getString(attrs.file)
      result.push({ type: 'file', file: src, url: src, name: getString(attrs.name) })
    } else if (type === 'quote') {
      result.push({ type: 'reply', id: getString(attrs.id) })
    } else if (type === 'json') {
      result.push({ type: 'json', data: getString(attrs.data) || getString(attrs.content) })
    } else if (type === 'xml') {
      result.push({ type: 'xml', data: getString(attrs.data) || getString(attrs.content) })
    } else if (type === 'markdown') {
      result.push({ type: 'markdown', content: getString(attrs.content) })
    } else if (isForwardContainer(element)) {
      result.push({
        type: 'forward',
        id: getString(attrs.id),
        content: toForwardNodes(element.children ?? [], resolveI18n) ?? [],
      })
    } else if (type === 'p') {
      result.push(...toSegments(element.children ?? [], resolveI18n))
      result.push({ type: 'text', text: '\n' })
    } else if (type === 'br') {
      result.push({ type: 'text', text: '\n' })
    } else if (type === 'i18n') {
      const path = getString(attrs.path)
      const resolved = resolveI18n ? resolveI18n(attrs) : ''
      result.push({ type: 'text', text: resolved || `[${path || 'i18n'}]` })
    } else if (element.children?.length) {
      result.push(...toSegments(element.children, resolveI18n))
    } else if (type && type !== 'author' && type !== 'button' && type !== 'keyboard') {
      result.push({ type: 'text', text: `[${type}]` })
    }
  }
  return result
}

// 将 Satori figure/message 转换为前端可直接渲染的合并转发节点
function toForwardNodes(
  elements: unknown[],
  resolveI18n?: (attrs: Record<string, unknown>) => string,
): unknown[] | undefined {
  const nodes: unknown[] = []
  const collect = (list: SatoriElement[]) => {
    for (const element of list) {
      if (element.type === 'figure' || element.type === 'forward') {
        collect(element.children ?? [])
        continue
      }
      if (element.type !== 'message') continue
      if (isForwardContainer(element)) {
        collect(element.children ?? [])
        continue
      }
      const children = element.children ?? []
      const author = children.find((item) => item.type === 'author')
      const attrs = element.attrs ?? {}
      const authorAttrs = author?.attrs ?? {}
      const content = children.filter((item) => item.type !== 'author')
      nodes.push({
        message_id: getString(attrs.id),
        time: getNumber(authorAttrs.time) || getNumber(attrs.time),
        sender: {
          user_id: getString(authorAttrs.id),
          nickname: getString(authorAttrs.name),
          avatar: getString(authorAttrs.avatar),
        },
        message: toSegments(content, resolveI18n),
      })
    }
  }
  collect(elements.map(toSatoriElement))
  return nodes.length > 0 ? nodes : undefined
}

function detectKind(elements: unknown[]): string {
  const stack = [...elements.map(toSatoriElement)]
  while (stack.length) {
    const element = stack.pop()
    if (!element) continue
    const type = getString(element.type)
    if (isForwardContainer(element)) return 'forward'
    if (type === 'img' || type === 'image' || type === 'mface') return 'image'
    if (type === 'audio' || type === 'record') return 'voice'
    if (type === 'video') return 'video'
    if (type === 'file') return 'file'
    stack.push(...(element.children ?? []))
  }
  return 'text'
}

function forwardId(elements: unknown[]): string | undefined {
  const stack = [...elements.map(toSatoriElement)]
  while (stack.length) {
    const element = stack.pop()
    if (!element) continue
    if (isForwardContainer(element)) {
      const id = getString(element.attrs?.id)
      if (id) return id
    }
    stack.push(...(element.children ?? []))
  }
  return undefined
}

export class SelfMessageRecorder {
  private wrapped = new Map<Bot, BotMethods>()
  private sequence = 0

  constructor(
    private ctx: Context,
    private database: ChatDatabase,
    private media: MediaManager,
    private logger: PluginLogger,
  ) {}

  start() {
    for (const bot of this.ctx.bots) this.wrapBot(bot)
    this.ctx.on('bot-added', (bot) => this.wrapBot(bot))
    this.ctx.on('bot-removed', (bot) => this.unwrapBot(bot))
    this.ctx.on('send', (session) => {
      void this.recordSendEvent(session).catch((error) => {
        this.logger.warn('记录 send 事件失败:', error)
      })
    })
  }

  dispose() {
    for (const bot of [...this.wrapped.keys()]) {
      this.unwrapBot(bot)
    }
  }

  // 包装三个发送入口，覆盖 Satori message.create 和插件直接发送
  private wrapBot(bot: Bot) {
    if (this.wrapped.has(bot)) return
    const methods: BotMethods = {
      createMessage: bot.createMessage,
      sendMessage: bot.sendMessage,
      sendPrivateMessage: bot.sendPrivateMessage,
      deleteMessage: bot.deleteMessage,
    }
    this.wrapped.set(bot, methods)

    bot.createMessage = async (channelId, content, referrer, options) => {
      const sendOptions = this.prepareOptions(options)
      if (sendOptions.chatPatchId) {
        return methods.createMessage.call(bot, channelId, content, referrer, sendOptions)
      }
      const localId = randomUUID()
      sendOptions.chatPatchId = localId
      try {
        const messages = await methods.createMessage.call(bot, channelId, content, referrer, sendOptions)
        const ids = Array.isArray(messages)
          ? messages.map((item) => getMessageId(item)).filter((id) => id !== '')
          : []
        await this.recordFromWrapper(bot, channelId, content, ids, options, 'create', localId)
        return messages
      } finally {
        delete sendOptions.chatPatchId
      }
    }

    bot.deleteMessage = async (channelId, messageId) => {
      await methods.deleteMessage.call(bot, channelId, messageId)
      await this.markSelfMessageRevoked(bot, channelId, messageId)
    }

    bot.sendMessage = async (channelId, content, referrer, options) => {
      const sendOptions = this.prepareOptions(options)
      if (sendOptions.chatPatchId) {
        return methods.sendMessage.call(bot, channelId, content, referrer, sendOptions)
      }
      const localId = randomUUID()
      sendOptions.chatPatchId = localId
      try {
        const ids = (await methods.sendMessage.call(bot, channelId, content, referrer, sendOptions))
          .filter((id) => id !== '')
        await this.recordFromWrapper(bot, channelId, content, ids, options, 'send', localId)
        return ids
      } finally {
        delete sendOptions.chatPatchId
      }
    }

    bot.sendPrivateMessage = async (userId, content, guildId, options) => {
      const sendOptions = this.prepareOptions(options)
      if (sendOptions.chatPatchId) {
        return methods.sendPrivateMessage.call(bot, userId, content, guildId, sendOptions)
      }
      const localId = randomUUID()
      sendOptions.chatPatchId = localId
      try {
        const ids = (await methods.sendPrivateMessage.call(bot, userId, content, guildId, sendOptions))
          .filter((id) => id !== '')
        await this.recordFromWrapper(bot, userId, content, ids, options, 'private', localId)
        return ids
      } finally {
        delete sendOptions.chatPatchId
      }
    }
  }

  private unwrapBot(bot: Bot) {
    const methods = this.wrapped.get(bot)
    if (!methods) return
    bot.createMessage = methods.createMessage
    bot.sendMessage = methods.sendMessage
    bot.sendPrivateMessage = methods.sendPrivateMessage
    bot.deleteMessage = methods.deleteMessage
    this.wrapped.delete(bot)
  }

  private prepareOptions(options?: SendOptions): SendOptionsWithMeta {
    return options ?? {} as SendOptionsWithMeta
  }

  private async recordFromWrapper(
    bot: Bot,
    channelId: string,
    content: MessageContent,
    ids: string[],
    options: SendOptions | undefined,
    mode: 'create' | 'send' | 'private',
    localId: string,
  ) {
    if (!channelId) return
    if (!ids.length) {
      this.logger.warn('发送未返回消息 ID，判定为发送失败:', bot.platform, channelId)
      return
    }
    const source: SelfMessageSource = options?.session ? 'plugin' : 'bot'
    const record = this.buildRecord(
      bot.platform ?? '',
      bot.selfId,
      channelId,
      options?.session?.guildId,
      content,
      ids[0],
      source,
      mode,
      localId,
    )
    await this.database.upsertSelfMessage(record)
    void this.media.cacheMessageMedia(content, channelId).catch((error) => {
      this.logger.warn('缓存机器人消息媒体失败:', error)
    })
    this.logger.logInfo('机器人消息已记录:', record.kind, record.channelId, record.messageId || record.id)
  }

  private async markSelfMessageRevoked(bot: Bot, channelId: string, messageId: string) {
    if (!messageId || !channelId) return
    const updated = await this.database.updateSelfMessageByMessageId(
      bot.platform ?? '',
      bot.selfId,
      channelId,
      messageId,
      { revoked: true, revokedAt: Date.now() },
    )
    if (!updated) {
      this.logger.warn('撤回消息未找到本地自消息记录:', bot.platform, channelId, messageId)
    }
  }

  // 收到 send 事件时只补消息 id，避免重复记录
  private async recordSendEvent(session: Session) {
    if (session.type !== 'send') return
    const platform = session.platform || ''
    const selfId = session.selfId || ''
    const event = getObject(session.event)
    const eventChannel = getObject(event.channel)
    const eventMessage = getObject(event.message)
    const channelId = session.channelId || getString(eventChannel.id)
    if (!platform || !selfId || !channelId) return

    const messageId = session.messageId || getMessageId(eventMessage)
    if (messageId) {
      const updated = await this.database.updateSelfMessageByMessageId(
        platform,
        selfId,
        channelId,
        messageId,
        { messageId },
      )
      if (updated) return
    } else {
      return
    }

    const record = this.buildRecord(
      platform,
      selfId,
      channelId,
      session.guildId,
      session.content ?? '',
      messageId,
      'bot',
      'send',
      randomUUID(),
    )
    await this.database.upsertSelfMessage(record)
    void this.media.cacheMessageMedia(session.content ?? '', channelId).catch((error) => {
      this.logger.warn('缓存 send 事件媒体失败:', error)
    })
  }

  private resolveI18nElement(attrs: Record<string, unknown>): string {
    const path = getString(attrs.path)
    if (!path || !this.ctx.i18n) return `[${path || 'i18n'}]`
    try {
      const locales = this.ctx.i18n.fallback([])
      const text = this.ctx.i18n.render(locales, [path], attrs || {})
      if (text && typeof text === 'string') return text
    } catch {
      // 使用 path 原文兜底，避免 i18n 解析失败时整段丢失
    }
    const knownFallback = KOISHI_STATUS_I18N_FALLBACK[path]
    if (knownFallback) return knownFallback
    return `[${path}]`
  }

  private buildRecord(
    platform: string,
    selfId: string,
    channelId: string,
    guildId: string | undefined,
    content: MessageContent,
    messageId: string | undefined,
    source: SelfMessageSource,
    mode: 'create' | 'send' | 'private',
    localId: string,
  ): SelfMessageRecord {
    const normalizedChannelId = channelId
    // 只按调用入口判断私聊，不根据频道 ID 前缀推断
    const channelType: SelfMessageChannelType = mode === 'private'
      ? 'user'
      : 'group'
    const elements = this.normalizeElements(content)
    const contentText = typeof content === 'string'
      ? content
      : h.toElementArray(content).join('')
    const sentAt = Date.now()
    const fingerprint = createHash('sha256')
      .update([
        platform,
        selfId,
        normalizedChannelId,
        JSON.stringify(elements),
      ].join('\u0000'))
      .digest('hex')
    return {
      id: `self-${localId}`,
      platform,
      selfId,
      channelId: normalizedChannelId,
      guildId,
      channelType,
      messageId,
      content: contentText,
      elements: JSON.parse(JSON.stringify(elements)) as unknown[],
      message: toSegments(elements, (attrs) => this.resolveI18nElement(attrs)),
      forwardId: forwardId(elements),
      forwardContent: toForwardNodes(elements, (attrs) => this.resolveI18nElement(attrs)),
      sentAt,
      timestamp: Math.floor(sentAt / 1000),
      timestampMs: sentAt,
      sequence: ++this.sequence,
      source,
      kind: detectKind(elements),
      fingerprint,
    }
  }

  private normalizeElements(content: MessageContent): unknown[] {
    try {
      const normalized = typeof content === 'string'
        ? content
        : Array.isArray(content)
          ? content.map((raw) => {
            const item = getObject(raw)
            if (typeof item.data === 'object' && item.data !== null && item.attrs === undefined) {
              return h(getString(item.type), item.data as Record<string, unknown>)
            }
            return raw
          })
          : content
      const elements = typeof normalized === 'string'
        ? h.parse(normalized)
        : h.toElementArray(normalized)
      return JSON.parse(JSON.stringify(elements)) as unknown[]
    } catch {
      return []
    }
  }
}
