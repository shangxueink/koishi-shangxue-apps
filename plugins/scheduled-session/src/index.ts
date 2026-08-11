import { Context } from 'koishi'

import { Config } from './config'
import type { Config as PluginConfig } from './config'
import { createLogger } from './logger'
import { registerScheduler } from './scheduler'

export const name = 'scheduled-session'

export { Config }
export type { Config as PluginConfig } from './config'

export function apply(ctx: Context, config: PluginConfig) {
  const logger = createLogger(ctx, name, config.loggerinfo)
  const disposeScheduler = registerScheduler(ctx, config, logger)

  ctx.on('dispose', () => {
    disposeScheduler()
  })
}
