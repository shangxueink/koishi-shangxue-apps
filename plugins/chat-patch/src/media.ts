import { Context } from 'koishi'
import {} from '@koishijs/plugin-server'
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream, promises as fs } from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import FileType from 'file-type'

import { Config } from './config'
import { ChatDatabase } from './database'
import { PluginLogger } from './logger'

function toExtension(value: string): string {
  const ext = value.startsWith('.') ? value : `.${value}`
  return ext.toLowerCase()
}

function toLocalFilePath(value: string): string | null {
  if (value.startsWith('file://')) {
    try {
      return fileURLToPath(value)
    } catch {
      return null
    }
  }
  if (/^[a-z]:[\\/]/i.test(value) || value.startsWith('\\\\')) return value
  return null
}

const MEDIA_TYPES = new Set([
  'img',
  'image',
  'face',
  'mface',
  'audio',
  'record',
  'video',
  'file',
])

function isCacheableMediaUrl(value: unknown): string {
  const url = String(value ?? '').trim()
  if (!url
    || url.startsWith('data:')
    || url.startsWith('blob:')
    || url.startsWith('base64://')) return ''
  return url
}

function isUrlLike(value: string): boolean {
  return /^(?:https?:\/\/|file:\/\/|[a-z]:[\\/]|\\\\)/i.test(value)
}

function decodeMarkupValue(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function collectMarkupMediaUrls(markup: string, result: Set<string>) {
  const pattern = /<(?:img|image|face|mface|audio|record|video|file)\b[^>]*?\b(?:src|url|file|href)\s*=\s*(["'])([\s\S]*?)\1/gi
  let match: RegExpExecArray | null
  while ((match = pattern.exec(markup)) !== null) {
    const url = isCacheableMediaUrl(decodeMarkupValue(match[2]))
    if (url) result.add(url)
  }
}

function collectMediaUrls(source: unknown, result: Set<string>) {
  if (typeof source === 'string') {
    const direct = isCacheableMediaUrl(source)
    if (direct && isUrlLike(direct)) result.add(direct)
    collectMarkupMediaUrls(source, result)
    try {
      collectMediaUrls(JSON.parse(source) as unknown, result)
    } catch {
      // 普通文本或非 JSON markup 不需要二次解析
    }
    return
  }
  if (Array.isArray(source)) {
    for (const item of source) collectMediaUrls(item, result)
    return
  }
  if (typeof source !== 'object' || source === null) return

  const record = source as Record<string, unknown>
  const attrs = typeof record.attrs === 'object' && record.attrs !== null
    ? record.attrs as Record<string, unknown>
    : {}
  if (MEDIA_TYPES.has(String(record.type ?? ''))) {
    for (const key of ['src', 'url', 'file', 'href', 'path']) {
      const url = isCacheableMediaUrl(attrs[key])
      if (url) result.add(url)
    }
  }

  for (const key of ['elements', 'children', 'content', 'data', 'html', 'message'] as const) {
    collectMediaUrls(attrs[key] ?? record[key], result)
  }
}

// 限制同时下载的媒体数量，避免一条含大量图片/视频的消息一次性吃满内存和连接
async function forEachConcurrent<T>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<unknown>,
) {
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const current = cursor
      cursor += 1
      await task(items[current]).catch(() => undefined)
    }
  })
  await Promise.all(workers)
}

export class MediaManager {
  private mediaDir: string
  private uploadDir: string
  private cleanupTimer?: () => void

  constructor(
    private ctx: Context,
    private config: Config,
    private database: ChatDatabase,
    private logger: PluginLogger,
  ) {
    this.mediaDir = path.resolve(ctx.baseDir, 'data', 'chat-patch', 'media')
    this.uploadDir = path.resolve(ctx.baseDir, 'data', 'chat-patch', 'upload-media')
  }

  start() {
    const route = `${this.config.basePath}/web/media`
    this.ctx.server.get(route, async (koa) => {
      const url = String(koa.query.url ?? '')
      if (!url) {
        koa.status = 400
        koa.body = 'missing url'
        return
      }
      const filePath = await this.cacheUrl(url)
      if (!filePath) {
        koa.status = 502
        koa.body = 'download failed'
        return
      }
      const size = (await fs.stat(filePath)).size
      koa.type = path.extname(filePath) || 'application/octet-stream'
      koa.set('Accept-Ranges', 'bytes')

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

    this.cleanupTimer = this.ctx.setInterval(() => {
      void this.cleanup()
    }, 10 * 60 * 1000)

    // 每次插件启动时先按全局文件数清理一次
    void this.cleanup()
  }

  dispose() {
    this.cleanupTimer?.()
  }

  async clearAll() {
    const root = path.resolve(this.ctx.baseDir, 'data', 'chat-patch')
    for (const dir of [this.mediaDir, this.uploadDir]) {
      const resolved = path.resolve(dir)
      if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) continue
      await fs.rm(resolved, { recursive: true, force: true })
    }
    this.logger.logInfo('媒体缓存目录已全部清空')
  }

  async cacheUrl(url: string, channelId = ''): Promise<string | null> {
    try {
      const filePath = await this.resolveAndDownload(url, channelId)
      if (filePath) {
        await this.database.recordMedia(url, filePath, channelId)
      }
      return filePath
    } catch (error) {
      this.logger.warn('媒体缓存失败:', url, error)
      return null
    }
  }

  // 收到或发送消息时立即预缓存富媒体，避免等前端渲染时原 URL 已过期
  async cacheMessageMedia(source: unknown, channelId = ''): Promise<string[]> {
    const urls = new Set<string>()
    collectMediaUrls(source, urls)
    await forEachConcurrent([...urls], 4, (url) => this.cacheUrl(url, channelId))
    if (urls.size) {
      this.logger.logInfo('消息媒体已预缓存:', urls.size, '个 URL')
    }
    return [...urls]
  }

  private async resolveAndDownload(url: string, channelId: string): Promise<string | null> {
    try {
      await fs.mkdir(this.mediaDir, { recursive: true })
      const localSource = toLocalFilePath(url)
      if (localSource && await this.exists(localSource)) {
        const hash = createHash('md5').update(url).digest('hex')
        const ext = path.extname(localSource).toLowerCase() || '.bin'
        const filePath = path.join(this.mediaDir, `${hash}${ext}`)
        if (path.normalize(filePath) !== path.normalize(localSource)) {
          if (!(await this.exists(filePath))) {
            await fs.copyFile(localSource, filePath)
          }
        }
        await this.database.recordMedia(url, filePath, channelId)
        this.logger.logInfo('本地媒体已缓存:', filePath)
        return filePath
      }
      const cached = await this.database.getMediaPath(url)
      if (cached && await this.exists(cached)) {
        return this.migrateCachedMedia(url, cached, channelId)
      }

      const hash = createHash('md5').update(url).digest('hex')
      const urlExt = path.extname(new URL(url).pathname)
      const fallbackPath = path.join(this.mediaDir, `${hash}${urlExt || '.bin'}`)
      if (await this.exists(fallbackPath)) {
        return this.migrateCachedMedia(url, fallbackPath, channelId)
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 KoishiChatPatch/1.0',
        },
      })
      if (!response.ok) {
        return null
      }
      if (!response.body) return null
      const detected = await FileType.stream(Readable.fromWeb(response.body))
      const ext = detected.fileType?.ext
        ? toExtension(detected.fileType.ext)
        : (urlExt || '.bin')
      const filename = `${hash}${ext}`
      const filePath = path.join(this.mediaDir, filename)
      if (await this.exists(filePath)) {
        return this.migrateCachedMedia(url, filePath, channelId)
      }
      const tempPath = path.join(this.mediaDir, `${hash}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`)
      try {
        await pipeline(detected, createWriteStream(tempPath))
        await fs.rename(tempPath, filePath)
      } catch (error) {
        await fs.unlink(tempPath).catch(() => undefined)
        throw error
      }
      this.logger.logInfo('媒体已缓存:', filename)
      return filePath
    } catch (error) {
      return null
    }
  }

  private async detectExtensionFromFile(filePath: string): Promise<string> {
    try {
      const detected = await FileType.fromStream(createReadStream(filePath))
      if (detected?.ext) return toExtension(detected.ext)
    } catch (error) {
      this.logger.logInfo('媒体类型识别失败，回退文件后缀:', filePath, error)
    }
    const ext = path.extname(filePath).toLowerCase()
    return ext && ext !== '.bin' ? ext.toLowerCase() : '.bin'
  }

  private async migrateCachedMedia(url: string, filePath: string, channelId: string): Promise<string> {
    try {
      const ext = await this.detectExtensionFromFile(filePath)
      const currentExt = path.extname(filePath).toLowerCase()
      if (ext === '.bin' || ext === currentExt) return filePath

      const newPath = path.join(
        path.dirname(filePath),
        `${path.basename(filePath, path.extname(filePath))}${ext}`,
      )
      if (newPath === filePath) return filePath
      if (await this.exists(newPath)) {
        await fs.unlink(filePath)
      } else {
        await fs.rename(filePath, newPath)
      }
      await this.database.recordMedia(url, newPath, channelId)
      return newPath
    } catch (error) {
      this.logger.warn('旧媒体缓存重命名失败:', url, error)
      return filePath
    }
  }

  private async cleanup() {
    try {
      const allFiles: Array<{ filePath: string; mtimeMs: number; channelId: string }> = []
      for (const dir of [this.mediaDir, this.uploadDir]) {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true })
          for (const entry of entries) {
            if (!entry.isFile()) continue
            const filePath = path.join(dir, entry.name)
            try {
              const stat = await fs.stat(filePath)
              allFiles.push({ filePath, mtimeMs: stat.mtimeMs, channelId: '' })
            } catch {
              // 单个文件读取失败不影响其他文件清理
            }
          }
        } catch {
          // 目录不存在时跳过
        }
      }
      if (!allFiles.length) return

      const metadata = await this.database.getAllMedia()
      const channelByPath = new Map(metadata.map((item) => [path.normalize(item.filePath), item.channelId]))
      const uploadRoot = path.normalize(this.uploadDir)
      for (const file of allFiles) {
        const normalized = path.normalize(file.filePath)
        file.channelId = channelByPath.get(normalized) ?? ''
        if (!file.channelId && normalized.startsWith(uploadRoot)) {
          file.channelId = 'upload'
        }
        if (!file.channelId) file.channelId = 'unknown'
      }

      if (allFiles.length <= this.config.maxMediaFiles) return

      const groups = new Map<string, typeof allFiles>()
      for (const file of allFiles) {
        const list = groups.get(file.channelId) ?? []
        list.push(file)
        groups.set(file.channelId, list)
      }
      for (const list of groups.values()) {
        list.sort((a, b) => b.mtimeMs - a.mtimeMs)
      }

      // 按频道/目录公平分配，避免一个群独占全部名额
      const keep = new Set<string>()
      const groupList = [...groups.values()]
      let cursor = 0
      for (let count = 0; count < this.config.maxMediaFiles && count < allFiles.length; count++) {
        let picked = false
        for (let offset = 0; offset < groupList.length; offset++) {
          const group = groupList[(cursor + offset) % groupList.length]
          const file = group.shift()
          if (file) {
            keep.add(file.filePath)
            cursor = (cursor + offset + 1) % groupList.length
            picked = true
            break
          }
        }
        if (!picked) break
      }

      let removed = 0
      for (const file of allFiles) {
        if (keep.has(file.filePath)) continue
        try {
          await fs.unlink(file.filePath)
          removed += 1
        } catch {
          // 文件可能已被外部删除
        }
        await this.database.removeMediaByPath(file.filePath).catch(() => undefined)
      }
      if (removed > 0) {
        this.logger.logInfo('媒体缓存已清理', removed, '个文件')
      }
    } catch {
      // 清理失败时不阻塞插件启动
    }
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }
}
