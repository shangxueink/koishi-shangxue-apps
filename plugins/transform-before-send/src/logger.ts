import { type Context } from 'koishi'

import type { Config } from './config'

export interface PluginLogger {
  debug: (message: unknown, ...args: unknown[]) => void
  error: (message: unknown, ...args: unknown[]) => void
}

export function createPluginLogger(ctx: Context, config: Config): PluginLogger {
  const logger = ctx.logger('transform-before-send')

  return {
    debug(message, ...args) {
      if (!config.loggerinfo) return
      logger.info(message, ...args)
    },
    error(message, ...args) {
      logger.error(message, ...args)
    },
  }
}
