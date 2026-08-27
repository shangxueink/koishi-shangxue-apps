import { Context } from 'koishi'
import {} from '@koishijs/plugin-server'
import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import send from 'koa-send'
import type { DefaultContext, DefaultState, ParameterizedContext } from 'koa'

import { Config } from './config'
import { PluginLogger } from './logger'

export function registerWeb(ctx: Context, config: Config, logger: PluginLogger) {
  const webRoot = path.resolve(__dirname, '..', 'web', 'dist')
  if (!existsSync(webRoot)) {
    logger.warn('未找到 web/dist，请先执行 web 目录下的 npm run build')
    return
  }

  type WebContext = ParameterizedContext<DefaultState, DefaultContext>

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
