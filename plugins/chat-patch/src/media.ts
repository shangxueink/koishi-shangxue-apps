import { Context } from 'koishi'
import {} from '@koishijs/plugin-server'
import { createHash } from 'node:crypto'
import { createReadStream, promises as fs } from 'node:fs'
import path from 'node:path'
import FileType from 'file-type'

import { Config } from './config'
import { ChatDatabase } from './database'
import { PluginLogger } from './logger'

function toExtension(value: string): string {
  const ext = value.startsWith('.') ? value : `.${value}`
  return ext.toLowerCase()
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

  private async resolveAndDownload(url: string, channelId: string): Promise<string | null> {
    try {
      await fs.mkdir(this.mediaDir, { recursive: true })
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
        this.logger.warn('媒体下载失败:', url, response.status)
        return null
      }
      const buffer = Buffer.from(await response.arrayBuffer())
      const ext = await this.detectExtension(url, buffer)
      const filename = `${hash}${ext}`
      const filePath = path.join(this.mediaDir, filename)
      await fs.writeFile(filePath, buffer)
      this.logger.logInfo('媒体已缓存:', filename, buffer.length)
      return filePath
    } catch (error) {
      this.logger.warn('媒体缓存异常:', url, error)
      return null
    }
  }

  private async detectExtension(url: string, buffer: Buffer): Promise<string> {
    try {
      const detected = await FileType.fromBuffer(buffer)
      if (detected?.ext) return toExtension(detected.ext)
    } catch (error) {
      this.logger.logInfo('媒体类型识别失败，回退 URL 后缀:', url, error)
    }
    const ext = path.extname(new URL(url).pathname)
    return ext && ext !== '.bin' ? ext.toLowerCase() : '.bin'
  }

  private async migrateCachedMedia(url: string, filePath: string, channelId: string): Promise<string> {
    try {
      const buffer = await fs.readFile(filePath)
      const ext = await this.detectExtension(url, buffer)
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
