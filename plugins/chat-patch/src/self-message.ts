import { Bot, Context, h, Session } from 'koishi'
import { createHash, randomUUID } from 'node:crypto'

import { Config } from './config'
import { ChatDatabase } from './database'
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

interface BotMethods {
  createMessage: BotCreateMethod
  sendMessage: BotSendMethod
  sendPrivateMessage: BotPrivateMethod
}

interface SatoriElement {
  type?: unknown
  attrs?: Record<string, unknown>
  children?: SatoriElement[]
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value : ''
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
  const attrs = typeof raw.attrs === 'object' && raw.attrs !== null
    ? raw.attrs as Record<string, unknown>
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

function isPrivateChannel(value: string): boolean {
  return /^(?:private|direct):/i.test(value)
}

function toSegments(elements: unknown[]): unknown[] {
  const result: unknown[] = []
  for (const raw of elements) {
    const element = toSatoriElement(raw)
    const attrs = element.attrs ?? {}
    const type = getString(element.type)
    if (type === 'text') {
      result.push({ type: 'text', text: getString(attrs.content) })
    } else if (type === 'at') {
      const id = getString(attrs.id)
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
        content: toForwardNodes(element.children ?? []) ?? [],
      })
    } else if (type === 'p' || type === 'br') {
      result.push({ type: 'text', text: '\n' })
    } else if (element.children?.length) {
      result.push(...toSegments(element.children))
    } else if (type && type !== 'author' && type !== 'button' && type !== 'keyboard') {
      result.push({ type: 'text', text: `[${type}]` })
    }
  }
  return result
}

// 将 Satori figure/message 转换为前端可直接渲染的合并转发节点
function toForwardNodes(elements: unknown[]): unknown[] | undefined {
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
        message: toSegments(content),
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
    private config: Config,
    private database: ChatDatabase,
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

  private isBlocked(platform: string): boolean {
    return (this.config.blockedPlatforms ?? []).some((item) => {
      return item.exactMatch
        ? platform === item.platformName
        : platform.includes(item.platformName)
    })
  }

  // 包装三个发送入口，覆盖 Satori message.create 和插件直接发送
  private wrapBot(bot: Bot) {
    if (this.wrapped.has(bot)) return
    const methods: BotMethods = {
      createMessage: bot.createMessage,
      sendMessage: bot.sendMessage,
      sendPrivateMessage: bot.sendPrivateMessage,
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
          ? messages.map((item) => getString(getObject(item).id)).filter(Boolean)
          : []
        await this.recordFromWrapper(bot, channelId, content, ids, options, 'create', localId)
        return messages
      } finally {
        delete sendOptions.chatPatchId
      }
    }

    bot.sendMessage = async (channelId, content, referrer, options) => {
      const sendOptions = this.prepareOptions(options)
      if (sendOptions.chatPatchId) {
        return methods.sendMessage.call(bot, channelId, content, referrer, sendOptions)
      }
      const localId = randomUUID()
      sendOptions.chatPatchId = localId
      try {
        const ids = await methods.sendMessage.call(bot, channelId, content, referrer, sendOptions)
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
        const ids = await methods.sendPrivateMessage.call(bot, userId, content, guildId, sendOptions)
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
    if (!channelId || this.isBlocked(bot.platform ?? '')) return
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
    this.logger.logInfo('机器人消息已记录:', record.kind, record.channelId, record.messageId || record.id)
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
    if (this.isBlocked(platform) || !platform || !selfId || !channelId) return

    const messageId = session.messageId || getString(eventMessage.id)
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
    const normalizedChannelId = mode === 'private' && !isPrivateChannel(channelId)
      ? `private:${channelId}`
      : channelId
    const channelType: SelfMessageChannelType = mode === 'private' || isPrivateChannel(normalizedChannelId)
      ? 'user'
      : 'group'
    const elements = this.normalizeElements(content)
    const contentText = typeof content === 'string'
      ? content
      : h.toElementArray(content).join('')
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
      message: toSegments(elements),
      forwardId: forwardId(elements),
      forwardContent: toForwardNodes(elements),
      sentAt: Date.now(),
      sequence: ++this.sequence,
      source,
      kind: detectKind(elements),
      fingerprint,
    }
  }

  private normalizeElements(content: MessageContent): unknown[] {
    try {
      const elements = typeof content === 'string'
        ? h.parse(content)
        : h.toElementArray(content)
      return JSON.parse(JSON.stringify(elements)) as unknown[]
    } catch {
      return []
    }
  }
}
