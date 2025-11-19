import { Context, Schema } from 'koishi'
import { DownloadsURL } from './service'

export const name = 'downloadsurl'

export { DownloadsURL }

export interface Config {
  retryCount: number
}

export const Config: Schema<Config> = Schema.object({
  retryCount: Schema.number().default(3).min(0).description('文件下载失败时的自动重试次数。'),
})

declare module 'koishi' {
  interface Context {
    downloadsurl: DownloadsURL
  }
}

export function apply(ctx: Context, config: Config) {
  ctx.on("ready", async () => {
    ctx.plugin(DownloadsURL, config)
  })
}
