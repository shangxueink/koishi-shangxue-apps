import type { Context } from 'koishi'
import type { PluginLogger } from './logger'

export interface BiliVideoStat {
  view: number
  danmaku: number
  favorite: number
  coin: number
  share: number
  like: number
}

export interface BiliVideoPage {
  page: number
  cid: number
  part: string
  duration: number
}

export interface BiliVideoView {
  bvid: string
  aid: number
  title: string
  desc: string
  pic: string
  duration: number
  owner: {
    name: string
    face: string
    mid: number
  }
  stat: BiliVideoStat
  pages: BiliVideoPage[]
}

interface BiliApiResponse<T> {
  code: number
  message: string
  data: T
}

export class BilibiliApi {
  constructor(
    private readonly ctx: Context,
    private readonly userAgent: string,
    private readonly logger: PluginLogger,
  ) {}

  private headers() {
    return {
      'User-Agent': this.userAgent,
      'Referer': 'https://www.bilibili.com/',
      'Accept': 'application/json, text/plain, */*',
    }
  }

  // 官方公开接口，按 BV 或 AV 获取视频信息
  async fetchVideoView(target: { bvid?: string; aid?: string | number }): Promise<BiliVideoView | null> {
    const params = target.bvid
      ? `bvid=${encodeURIComponent(target.bvid)}`
      : `aid=${encodeURIComponent(String(target.aid))}`
    const url = `https://api.bilibili.com/x/web-interface/view?${params}`
    const response = await this.ctx.http.get<BiliApiResponse<BiliVideoView>>(url, {
      headers: this.headers(),
    })
    if (response.code !== 0 || !response.data) {
      return null
    }
    return response.data
  }

  // 短链重定向使用原生 fetch 手动读取 Location，避免额外依赖
  async resolveShortLink(host: string, code: string): Promise<string | null> {
    const controller = new AbortController()
    const clearTimer = this.ctx.setTimeout(() => controller.abort(), 10000)
    try {
      const response = await fetch(`https://${host}/${code}`, {
        redirect: 'manual',
        headers: {
          'User-Agent': this.userAgent,
          'Referer': 'https://www.bilibili.com/',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      })
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        return location ? new URL(location, response.url).toString() : null
      }
      const text = await response.text()
      const match = text.match(/https?:\/\/[^"'<\s]+/i)
      return match ? match[0] : null
    } catch (error) {
      this.logger.debug('短链解析失败', error)
      return null
    } finally {
      clearTimer()
    }
  }
}
