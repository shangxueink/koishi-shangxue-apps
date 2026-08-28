import { Context } from 'koishi'
import {} from '@koishijs/plugin-server'
import { createReadStream, existsSync, promises as fs, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import send from 'koa-send'
import type { DefaultContext, DefaultState, ParameterizedContext } from 'koa'
import FileType from 'file-type'

import { Config } from './config'
import { ContactCacheService } from './cache'
import { ChatDatabase } from './database'
import { PluginLogger } from './logger'
import { ContactCacheItem, SelfMessagePayload, SelfMessageRecord } from './types'

export function registerWeb(
  ctx: Context,
  config: Config,
  database: ChatDatabase,
  contactCache: ContactCacheService,
  logger: PluginLogger,
) {
  const webRoot = path.resolve(__dirname, '..', 'client', 'web', 'dist')
  const uploadDir = path.resolve(ctx.baseDir, 'data', 'chat-patch', 'upload-media')

  type WebContext = ParameterizedContext<DefaultState, DefaultContext>
  const cacheType = (type: string) => type === 'user' ? 'friend' : type

  const toExtension = (value: string): string => {
    const ext = value.startsWith('.') ? value : `.${value}`
    return ext.toLowerCase()
  }

  const normalizeGroupId = (value: string): string => {
    const raw = value.replace(/^(?:group|room|chat|channel|guild):/i, '').trim()
    const wrapped = raw.match(/^\[_?([\s\S]+?)_?\]$/)
    return wrapped ? wrapped[1] : raw || value
  }

  const historyChannelCandidates = (channelId: string): string[] => {
    const raw = normalizeGroupId(channelId)
    const candidates = [channelId]
    if (raw && raw !== channelId) candidates.push(raw)
    const id = raw || channelId
    if (!/^(?:group|room|chat|channel|guild|private):/i.test(channelId)) {
      candidates.push(`group:${id}`, `private:${id}`)
    }
    if (id) {
      candidates.push(` [_${id}_] `, `_${id}_`, `[${id}]`, `group:${id}`)
    }
    return [...new Set(candidates)]
  }

  const mimeToExt: Record<string, string> = {
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/mp4': '.m4a',
    'audio/x-m4a': '.m4a',
    'audio/wav': '.wav',
    'audio/x-wav': '.wav',
    'audio/webm': '.webm',
    'audio/ogg': '.ogg',
    'audio/aac': '.aac',
    'audio/flac': '.flac',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'video/x-msvideo': '.avi',
    'video/x-matroska': '.mkv',
    'video/x-flv': '.flv',
    'video/3gpp': '.3gp',
    'video/ogg': '.ogv',
    'video/mp2t': '.ts',
  }
  const MAX_UPLOAD_BYTES = 500 * 1024 * 1024

  ctx.server.post(`${config.basePath}/api/upload-media`, async (koa) => {
    const requestBody = (koa.request as unknown as { body?: unknown }).body
    const body = (requestBody ?? {}) as Record<string, unknown>
    let source = String(body.dataUrl ?? body.data ?? '')
    let name = String(body.name ?? '')
    let mime = ''
    let buffer: Buffer | null = null
    if (source) {
      if (source.startsWith('base64://')) source = source.slice(9)
      const comma = source.indexOf('base64,')
      const base64 = comma >= 0 ? source.slice(comma + 7) : source
      const normalizedBase64 = base64.replace(/-/g, '+').replace(/_/g, '/')
      try {
        buffer = Buffer.from(normalizedBase64, 'base64')
      } catch {
        koa.status = 400
        koa.body = { error: 'invalid media data' }
        return
      }
      mime = source.startsWith('data:')
        ? source.slice(5, source.indexOf(';')).toLowerCase()
        : ''
    } else {
      const chunks: Buffer[] = []
      for await (const chunk of koa.req as AsyncIterable<Buffer | string>) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      }
      buffer = Buffer.concat(chunks)
      name = String(koa.query.name ?? koa.get('x-file-name') ?? '')
      try {
        name = decodeURIComponent(name)
      } catch {
        // 保持原始名称即可
      }
      mime = String(koa.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    }
    if (!buffer || !buffer.length) {
      koa.status = 400
      koa.body = { error: 'missing media data' }
      return
    }
    if (buffer.length > MAX_UPLOAD_BYTES) {
      koa.status = 413
      koa.body = { error: 'media file too large' }
      return
    }
    if (!buffer.length) {
      koa.status = 400
      koa.body = { error: 'invalid media data' }
      return
    }

    await fs.mkdir(uploadDir, { recursive: true })
    let detected: { ext?: string } | undefined
    try {
      const result = await FileType.fromBuffer(buffer)
      detected = result ?? undefined
    } catch {
      // 部分音频/文件无法识别时继续用 MIME 或文件名兜底
      detected = undefined
    }
    const mimeExt = mimeToExt[mime] || ''
    const nameExt = path.extname(name).toLowerCase()
    const ext = detected?.ext
      ? toExtension(detected.ext)
      : mimeExt || nameExt || '.bin'
    const filename = `${createHash('md5').update(buffer).digest('hex')}${ext}`
    const filePath = path.join(uploadDir, filename)
    if (!existsSync(filePath)) {
      await fs.writeFile(filePath, buffer)
    }
    koa.body = {
      path: pathToFileURL(filePath).href,
      localPath: filePath,
    }
  })

  ctx.server.get(`${config.basePath}/api/media`, async (koa) => {
    const fileName = path.basename(String(koa.query.file ?? koa.query.name ?? ''))
    if (!fileName || fileName === '.' || fileName === '..') {
      koa.status = 400
      koa.body = { error: 'missing media file' }
      return
    }
    const filePath = path.resolve(uploadDir, fileName)
    const root = path.resolve(uploadDir)
    if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
      koa.status = 400
      koa.body = { error: 'invalid media file' }
      return
    }
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      koa.status = 404
      koa.body = { error: 'media file not found' }
      return
    }
    const size = statSync(filePath).size
    koa.set('Accept-Ranges', 'bytes')
    if (fileName.toLowerCase().endsWith('.webm')) {
      koa.type = 'audio/webm'
    } else {
      koa.type = fileName
    }
    const range = koa.headers.range
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(String(range))
      if (!match) {
        koa.status = 416
        koa.set('Content-Range', `bytes */${size}`)
        koa.body = ''
        return
      }
      let start = 0
      let end = size - 1
      if (match[1] === '' && match[2]) {
        start = Math.max(0, size - Number(match[2]))
      } else if (match[1]) {
        start = Number(match[1])
        end = match[2] ? Number(match[2]) : end
      }
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= size) {
        koa.status = 416
        koa.set('Content-Range', `bytes */${size}`)
        koa.body = ''
        return
      }
      if (end >= size) end = size - 1
      if (end < start) end = start
      koa.status = 206
      koa.set('Content-Range', `bytes ${start}-${end}/${size}`)
      koa.set('Content-Length', String(end - start + 1))
      koa.body = createReadStream(filePath, { start, end })
      return
    }
    koa.set('Content-Length', String(size))
    koa.body = createReadStream(filePath)
  })

  ctx.server.get(`${config.basePath}/api/cache/all`, async (koa) => {
    const entries = await database.getAllContacts()
    const botMap = new Map<string, {
      platform: string
      selfId: string
      groups: ContactCacheItem[]
      friends: ContactCacheItem[]
    }>()
    for (const entry of entries) {
      const key = JSON.stringify([entry.platform, entry.selfId])
      const bot = botMap.get(key) ?? {
        platform: entry.platform,
        selfId: entry.selfId,
        groups: [],
        friends: [],
      }
      if (entry.type === 'group') bot.groups = entry.contacts
      if (entry.type === 'friend') bot.friends = entry.contacts
      botMap.set(key, bot)
    }
    koa.body = { bots: [...botMap.values()] }
  })

  ctx.server.get(`${config.basePath}/api/history`, async (koa) => {
    const platform = String(koa.query.platform ?? '')
    const selfId = String(koa.query.selfId ?? '')
    const channelId = String(koa.query.channelId ?? '')
    if (!platform || !selfId || !channelId) {
      koa.status = 400
      koa.body = { error: 'missing history params' }
      return
    }
    const parsedLimit = Number(koa.query.limit ?? config.maxMessagesPerChannel)
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : config.maxMessagesPerChannel
    const beforeTime = Number(koa.query.beforeTime ?? 0)
    const queryMessages = async (cid: string) => {
      return Number.isFinite(beforeTime) && beforeTime > 0
        ? database.listMessagesBefore(platform, selfId, cid, beforeTime, limit)
        : database.listMessages(platform, selfId, cid, limit)
    }
    let messages: Awaited<ReturnType<typeof queryMessages>> = []
    for (const candidate of historyChannelCandidates(channelId)) {
      messages = await queryMessages(candidate)
      if (messages.length) break
    }
    let selfMessages: SelfMessageRecord[] = []
    const querySelfMessages = async (cid: string): Promise<SelfMessageRecord[]> => {
      return Number.isFinite(beforeTime) && beforeTime > 0
        ? database.listSelfMessagesBefore(platform, selfId, cid, beforeTime, limit)
        : database.listSelfMessages(platform, selfId, cid, limit)
    }
    for (const candidate of historyChannelCandidates(channelId)) {
      selfMessages = await querySelfMessages(candidate)
      if (selfMessages.length) break
    }
    // 统一按本地收到时间排序，避免平台时间不准导致顺序颠倒
    messages.sort((a, b) => {
      const timeA = Number(a?.receivedAt ?? a?.timestampMs ?? a?.timestamp ?? 0)
      const timeB = Number(b?.receivedAt ?? b?.timestampMs ?? b?.timestamp ?? 0)
      return timeA - timeB
    })
    selfMessages.sort((a, b) => a.sentAt - b.sentAt)
    koa.body = { messages, selfMessages }
  })

  ctx.server.get(`${config.basePath}/api/self-messages`, async (koa) => {
    const platform = String(koa.query.platform ?? '')
    const selfId = String(koa.query.selfId ?? '')
    const channelId = String(koa.query.channelId ?? '')
    if (!platform || !selfId || !channelId) {
      koa.status = 400
      koa.body = { error: 'missing self-message params' }
      return
    }
    const parsedLimit = Number(koa.query.limit ?? config.historyPageSize)
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : config.historyPageSize
    const beforeTime = Number(koa.query.beforeTime ?? 0)
    let messages: SelfMessageRecord[] = []
    for (const candidate of historyChannelCandidates(channelId)) {
      messages = Number.isFinite(beforeTime) && beforeTime > 0
        ? await database.listSelfMessagesBefore(platform, selfId, candidate, beforeTime, limit)
        : await database.listSelfMessages(platform, selfId, candidate, limit)
      if (messages.length) break
    }
    messages.sort((a, b) => a.sentAt - b.sentAt)
    koa.body = { messages }
  })

  ctx.server.post(`${config.basePath}/api/self-messages`, async (koa) => {
    const requestBody = (koa.request as unknown as { body?: unknown }).body
    const body = (requestBody ?? {}) as Record<string, unknown>
    const payload: SelfMessagePayload = {
      id: typeof body.id === 'string' ? body.id : undefined,
      platform: String(body.platform ?? ''),
      selfId: String(body.selfId ?? ''),
      channelId: String(body.channelId ?? ''),
      guildId: typeof body.guildId === 'string' ? body.guildId : undefined,
      channelType: body.channelType === 'user' ? 'user' : 'group',
      messageId: typeof body.messageId === 'string' ? body.messageId : undefined,
      content: typeof body.content === 'string' ? body.content : undefined,
      elements: Array.isArray(body.elements) ? body.elements as unknown[] : undefined,
      message: Array.isArray(body.message) ? body.message as unknown[] : undefined,
      forwardId: typeof body.forwardId === 'string' ? body.forwardId : undefined,
      forwardContent: Array.isArray(body.forwardContent) ? body.forwardContent as unknown[] : undefined,
      sentAt: typeof body.sentAt === 'number' && Number.isFinite(body.sentAt)
        ? body.sentAt
        : Date.now(),
      sequence: typeof body.sequence === 'number' && Number.isFinite(body.sequence)
        ? body.sequence
        : 0,
      source: body.source === 'plugin' ? 'plugin' : 'webui',
      kind: typeof body.kind === 'string' ? body.kind : 'text',
    }
    if (!payload.platform || !payload.selfId || !payload.channelId) {
      koa.status = 400
      koa.body = { error: 'missing self-message params' }
      return
    }
    const record: SelfMessageRecord = {
      id: payload.id || `web-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      platform: payload.platform,
      selfId: payload.selfId,
      channelId: payload.channelId,
      guildId: payload.guildId,
      channelType: payload.channelType,
      messageId: payload.messageId,
      content: payload.content,
      elements: payload.elements,
      message: payload.message,
      forwardId: payload.forwardId,
      forwardContent: payload.forwardContent,
      sentAt: payload.sentAt ?? Date.now(),
      sequence: payload.sequence ?? 0,
      source: payload.source ?? 'webui',
      kind: payload.kind ?? 'text',
    }
    await database.upsertSelfMessage(record)
    koa.body = { ok: true, message: record }
  })

  ctx.server.get(`${config.basePath}/api/forward`, async (koa) => {
    const platform = String(koa.query.platform ?? '')
    const selfId = String(koa.query.selfId ?? '')
    const channelId = String(koa.query.channelId ?? '')
    const id = String(koa.query.id ?? '')
    if (!platform || !selfId || !id) {
      koa.status = 400
      koa.body = { error: 'missing forward params' }
      return
    }
    if (channelId) {
      const cached = await database.findSelfForwardContent(platform, selfId, channelId, id)
      if (cached) {
        koa.body = cached
        return
      }
    }
    if (platform !== 'onebot') {
      koa.status = 501
      koa.body = { error: 'forward api not supported' }
      return
    }
    const bot = ctx.bots.find((item) => {
      return item.platform === platform && item.selfId === selfId
    })
    if (!bot) {
      koa.status = 404
      koa.body = { error: 'bot not found' }
      return
    }
    const internal = (bot as unknown as {
      internal?: { getForwardMsg?: (messageId: string) => Promise<unknown> }
    }).internal
    if (!internal?.getForwardMsg) {
      koa.status = 501
      koa.body = { error: 'forward api not supported' }
      return
    }
    try {
      koa.body = await internal.getForwardMsg(id)
    } catch (error) {
      koa.status = 502
      koa.body = { error: 'forward api failed' }
    }
  })

  ctx.server.post(`${config.basePath}/api/send-forward`, async (koa) => {
    const requestBody = (koa.request as unknown as { body?: unknown }).body
    const body = (requestBody ?? {}) as Record<string, unknown>
    const platform = String(body.platform ?? '')
    const selfId = String(body.selfId ?? '')
    const type = String(body.type ?? '')
    const id = String(body.id ?? '')
    if (!platform || !selfId || !type || !id) {
      koa.status = 400
      koa.body = { error: 'missing send-forward params' }
      return
    }
    if (platform !== 'onebot') {
      koa.status = 501
      koa.body = { error: 'forward api not supported' }
      return
    }
    const bot = ctx.bots.find((item) => {
      return item.platform === platform && item.selfId === selfId
    })
    if (!bot) {
      koa.status = 404
      koa.body = { error: 'bot not found' }
      return
    }
    const internal = (bot as unknown as {
      internal?: {
        sendGroupForwardMsg?: (groupId: string, messages: unknown[]) => Promise<unknown>
        sendPrivateForwardMsg?: (userId: string, messages: unknown[]) => Promise<unknown>
      }
    }).internal
    if (type === 'group' && !internal?.sendGroupForwardMsg) {
      koa.status = 501
      koa.body = { error: 'forward api not supported' }
      return
    }
    if (type !== 'group' && !internal?.sendPrivateForwardMsg) {
      koa.status = 501
      koa.body = { error: 'forward api not supported' }
      return
    }
    const messages = Array.isArray(body.messages) ? body.messages as unknown[] : []
    const nodes = messages.map((raw) => {
      const item = typeof raw === 'object' && raw !== null
        ? raw as Record<string, unknown>
        : {}
      const nodeData = typeof item.data === 'object' && item.data !== null
        ? item.data as Record<string, unknown>
        : item
      const content = Array.isArray(item.content)
        ? item.content as unknown[]
        : Array.isArray(nodeData.content)
          ? nodeData.content as unknown[]
          : []
      const userId = String(item.user_id ?? nodeData.user_id ?? nodeData.uin ?? '')
      const nickname = String(item.nickname ?? nodeData.nickname ?? nodeData.name ?? '')
      return {
        type: 'node',
        data: {
          user_id: userId,
          nickname,
          // koishi 的 OneBot adapter 发送自定义转发节点时使用 uin/name
          uin: userId,
          name: nickname,
          time: String(item.time ?? nodeData.time ?? Math.floor(Date.now() / 1000)),
          content: content.map((segmentRaw) => {
            const segment = typeof segmentRaw === 'object' && segmentRaw !== null
              ? segmentRaw as Record<string, unknown>
              : {}
            const copy = { ...segment }
            const segmentType = String(copy.type ?? 'text')
            delete copy.type
            return { type: segmentType, data: copy }
          }),
        },
      }
    })
    try {
      // 必须从 internal 上直接调用，避免方法被取出后丢失 this
      koa.body = type === 'group'
        ? await internal?.sendGroupForwardMsg?.(id, nodes)
        : await internal?.sendPrivateForwardMsg?.(id, nodes)
    } catch (error) {
      koa.status = 502
      koa.body = { error: 'send forward failed' }
    }
  })

  ctx.server.get(`${config.basePath}/api/cache`, async (koa) => {
    const platform = String(koa.query.platform ?? '')
    let selfId = String(koa.query.selfId ?? '')
    if (!selfId) {
      selfId = ctx.bots.find((bot) => bot.platform === platform)?.selfId ?? ''
    }
    const type = String(koa.query.type ?? '')
    if (!platform || !selfId || !type) {
      koa.status = 400
      koa.body = { error: 'missing cache params' }
      return
    }

    // 单条身份缓存：前端收消息时优先走这里，命中后不再请求 Satori API
    const id = String(koa.query.userId ?? koa.query.groupId ?? koa.query.id ?? '')
    if (id) {
      if (type === 'user' || type === 'friend') {
        const channelId = String(koa.query.channelId ?? '')
        const contact = await contactCache.getUser(
          platform,
          selfId,
          id,
          String(koa.query.guildId ?? ''),
          channelId,
          String(koa.query.name ?? ''),
          String(koa.query.avatar ?? ''),
        )
        koa.body = contact ?? null
        return
      }
      if (type === 'group') {
        const guildId = String(koa.query.guildId ?? '')
        const channelId = String(koa.query.channelId ?? '')
        const channelType = koa.query.channelType
        const contact = await contactCache.getGroup(
          platform,
          selfId,
          id,
          guildId,
          channelId,
          String(koa.query.name ?? ''),
          String(koa.query.avatar ?? ''),
          channelType,
        )
        koa.body = contact ?? null
        return
      }
      if (type === 'member') {
        const groupId = String(koa.query.groupId ?? koa.query.id ?? '')
        if (!groupId) {
          koa.status = 400
          koa.body = { error: 'missing groupId' }
          return
        }
        const memberId = String(koa.query.userId ?? '')
        if (memberId) {
          koa.body = await database.getGroupMember(platform, selfId, groupId, memberId) ?? null
          return
        }
        koa.body = {
          members: await database.getGroupMembers(platform, selfId, groupId),
        }
        return
      }
      koa.status = 400
      koa.body = { error: 'unsupported cache type' }
      return
    }

    koa.body = {
      contacts: await database.getContacts(platform, selfId, cacheType(type)),
    }
  })

  ctx.server.post(`${config.basePath}/api/cache`, async (koa) => {
    const requestBody = (koa.request as unknown as { body?: unknown }).body
    const body = (requestBody ?? {}) as Record<string, unknown>
    const platform = String(body.platform ?? '')
    let selfId = String(body.selfId ?? '')
    if (!selfId) {
      selfId = ctx.bots.find((bot) => bot.platform === platform)?.selfId ?? ''
    }
    const type = String(body.type ?? '')
    if (!platform || !selfId || !type) {
      koa.status = 400
      koa.body = { error: 'missing cache params' }
      return
    }
    const normalizedType = cacheType(type)
    if (type === 'member' && body.groupId) {
      const groupId = String(body.groupId)
      const contacts = Array.isArray(body.contacts) ? body.contacts as ContactCacheItem[] : []
      if (body.append === true) {
        for (const contact of contacts) {
          await database.appendGroupMember(platform, selfId, groupId, contact)
        }
      } else {
        await database.setGroupMembers(platform, selfId, groupId, contacts)
      }
      koa.body = {
        members: await database.getGroupMembers(platform, selfId, groupId),
      }
      return
    }
    if (Array.isArray(body.contacts)) {
      const contacts = body.contacts as ContactCacheItem[]
      if (body.append === true) {
        for (const contact of contacts) {
          await database.appendContact(platform, selfId, normalizedType, contact)
        }
      } else {
        await database.setContacts(platform, selfId, normalizedType, contacts)
      }
    }
    koa.body = {
      contacts: await database.getContacts(platform, selfId, normalizedType),
    }
  })

  if (!existsSync(webRoot)) {
    logger.warn('未找到 client/web/dist，请先执行 client/web 目录下的 npm run build')
    return
  }

  const serveFile = async (koa: WebContext, fileName: string) => {
    const fullPath = path.join(webRoot, fileName)
    if (existsSync(fullPath) && statSync(fullPath).isFile()) {
      await send(koa, path.relative(webRoot, fullPath), { root: webRoot })
      return
    }
    koa.status = 200
    koa.body = ''
    await send(koa, 'index.html', { root: webRoot })
  }

  ctx.server.get(`${config.basePath}/web(/.*)?`, async (koa) => {
    const fileName = koa.params?.[0]?.replace(/^\/+/, '') || 'index.html'
    await serveFile(koa, fileName)
  })
}
