import { Context } from 'koishi'
import { Console } from '@koishijs/console'
import path from 'node:path'

import { Config } from './config'
import { createPluginLogger } from './logger'
import { ContactCacheService } from './cache'
import { ChatDatabase } from './database'
import { Recorder } from './recorder'
import { SatoriGateway } from './gateway'
import { MediaManager } from './media'
import { SelfMessageRecorder } from './self-message'
import { registerBootstrap } from './bootstrap'
import { registerWeb } from './web'

export const name = 'chat-patch'
export const reusable = false
export const filter = false
export const inject = {
  required: ['console', 'server', 'http', 'satori.server'],
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
  await database.cleanupExcess()
  const contactCache = new ContactCacheService(ctx, database, pluginLogger)

  const media = new MediaManager(ctx, config, database, pluginLogger)
  media.start()

  const recorder = new Recorder(database, media, contactCache, pluginLogger)
  const gateway = new SatoriGateway(ctx, database, recorder, pluginLogger, (payload) => {
    void ctx.console.broadcast('chat-patch/event', payload).catch((error) => {
      pluginLogger.warn('推送前端事件失败:', error)
    })
  })

  const selfMessages = new SelfMessageRecorder(ctx, database, media, pluginLogger)
  selfMessages.start()

  void gateway.start().catch((error) => {
    pluginLogger.warn('Satori 网关启动失败:', error)
  })

  registerBootstrap(ctx, config, database, pluginLogger, () => gateway.getLogins())
  registerWeb(ctx, config, database, contactCache, media, pluginLogger)

  ctx.console.addEntry({
    dev: path.resolve(__dirname, '../client/index.ts'),
    prod: path.resolve(__dirname, '../dist'),
  })

  ctx.on('dispose', async () => {
    gateway.dispose()
    selfMessages.dispose()
    media.dispose()
    await database.dispose()
    pluginLogger.logInfo('chat-patch 已卸载')
  })
}
