import { type Context } from 'koishi'

import { Config } from './config'
import { createPluginLogger } from './logger'
import { transformBeforeSend } from './transform'

export const name = 'transform-before-send'

export const inject = {
  optional: ['assets'],
}

export { Config }

export function apply(ctx: Context, config: Config) {
  const logger = createPluginLogger(ctx, config)

  // ctx.on 会在插件卸载时自动注销，无需额外维护 dispose
  ctx.on('before-send', (session) => transformBeforeSend(ctx, session, config, logger))
}
