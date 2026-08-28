import { Context } from 'koishi'
import {} from '@koishijs/plugin-server'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import send from 'koa-send'
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
  private cleanupTimer?: () => void

  constructor(
    private ctx: Context,
    private config: Config,
    private database: ChatDatabase,
    private logger: PluginLogger,
  ) {
    this.mediaDir = path.resolve(ctx.baseDir, 'data', 'chat-patch', 'media')
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
      await send(koa, path.basename(filePath), { root: this.mediaDir })
    })

    this.cleanupTimer = this.ctx.setInterval(() => {
      void this.cleanup()
    }, 10 * 60 * 1000)
  }

  dispose() {
    this.cleanupTimer?.()
  }

  async cacheUrl(url: string): Promise<string | null> {
    try {
      const filePath = await this.resolveAndDownload(url)
      if (filePath) {
        await this.database.recordMedia(url, filePath)
      }
      return filePath
    } catch (error) {
      this.logger.warn('媒体缓存失败:', url, error)
      return null
    }
  }

  private async resolveAndDownload(url: string): Promise<string | null> {
    try {
      await fs.mkdir(this.mediaDir, { recursive: true })
      const cached = await this.database.getMediaPath(url)
      if (cached && await this.exists(cached)) {
        return this.migrateCachedMedia(url, cached)
      }

      const hash = createHash('md5').update(url).digest('hex')
      const urlExt = path.extname(new URL(url).pathname)
      const fallbackPath = path.join(this.mediaDir, `${hash}${urlExt || '.bin'}`)
      if (await this.exists(fallbackPath)) {
        return this.migrateCachedMedia(url, fallbackPath)
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

  private async migrateCachedMedia(url: string, filePath: string): Promise<string> {
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
      await this.database.recordMedia(url, newPath)
      return newPath
    } catch (error) {
      this.logger.warn('旧媒体缓存重命名失败:', url, error)
      return filePath
    }
  }

  private async cleanup() {
    try {
      const files = await fs.readdir(this.mediaDir)
      const stats = await Promise.all(files.map(async (name) => {
        const filePath = path.join(this.mediaDir, name)
        const stat = await fs.stat(filePath)
        return { filePath, mtime: stat.mtimeMs }
      }))
      stats.sort((a, b) => b.mtime - a.mtime)
      for (const item of stats.slice(this.config.maxMediaFiles)) {
        await fs.unlink(item.filePath)
      }
    } catch {
      // 媒体目录不存在时无需清理
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
