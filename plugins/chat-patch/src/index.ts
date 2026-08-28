import { Context } from 'koishi'
import { Console } from '@koishijs/console'
import path from 'node:path'

import { Config } from './config'
import { createPluginLogger } from './logger'
import { ContactCacheService } from './cache'
import { ChatDatabase } from './database'
import { Recorder } from './recorder'
import { MediaManager } from './media'
import { registerBootstrap } from './bootstrap'
import { registerWeb } from './web'

export const name = 'chat-patch'
export const reusable = false
export const filter = false
export const inject = {
  required: ['console', 'server', 'satori.server'],
}

declare module 'koishi' {
  interface Context {
    console: Console
  }
}

export const usage = `
---

基于 Satori 协议的 Koishi 后台聊天室。
需要在 Koishi 中启用 server-satori，并在插件内构建 web 应用。

---
`

export { Config } from './config'

export async function apply(ctx: Context, config: Config) {
  const pluginLogger = createPluginLogger(ctx.logger('chat-patch'), config)

  const database = new ChatDatabase(ctx, config, pluginLogger)
  await database.initialize()
  const contactCache = new ContactCacheService(ctx, database, pluginLogger)

  const media = new MediaManager(ctx, config, database, pluginLogger)
  media.start()

  const recorder = new Recorder(ctx, config, database, media, contactCache, pluginLogger)
  recorder.start()

  registerBootstrap(ctx, config, database, pluginLogger)
  registerWeb(ctx, config, database, contactCache, pluginLogger)

  ctx.console.addEntry({
    dev: path.resolve(__dirname, '../client/index.ts'),
    prod: path.resolve(__dirname, '../dist'),
  })

  ctx.on('dispose', () => {
    media.dispose()
    void database.dispose()
    pluginLogger.logInfo('chat-patch 已卸载')
  })
}
