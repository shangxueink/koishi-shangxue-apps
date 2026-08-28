import { Context } from 'koishi'
import {} from '@koishijs/plugin-server'
import { existsSync, promises as fs, statSync } from 'node:fs'
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
import { ContactCacheItem } from './types'

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
    if (fileName.toLowerCase().endsWith('.webm')) {
      koa.type = 'audio/webm'
    }
    await send(koa, fileName, { root: uploadDir })
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
      const key = `${entry.platform}:${entry.selfId}`
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
    let messages = await queryMessages(channelId)
    // 兼容不带 group:/private: 前缀的旧请求
    if (!messages.length && !channelId.includes(':')) {
      const groupMessages = await queryMessages(`group:${channelId}`)
      if (groupMessages.length) {
        messages = groupMessages
      } else {
        messages = await queryMessages(`private:${channelId}`)
      }
    }
    // 统一按本地收到时间排序，避免平台时间不准导致顺序颠倒
    messages.sort((a, b) => {
      const timeA = Number(a?.receivedAt ?? a?.timestampMs ?? a?.timestamp ?? 0)
      const timeB = Number(b?.receivedAt ?? b?.timestampMs ?? b?.timestamp ?? 0)
      return timeA - timeB
    })
    koa.body = { messages }
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
        const contact = await contactCache.getGroup(
          platform,
          selfId,
          id,
          guildId,
          channelId,
          String(koa.query.name ?? ''),
          String(koa.query.avatar ?? ''),
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
