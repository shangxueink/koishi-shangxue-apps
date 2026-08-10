import { Context } from 'koishi'

import type { Config } from './config'

export interface PluginLogger {
  debug: (message: unknown, ...args: unknown[]) => void
  info: (message: unknown, ...args: unknown[]) => void
  warn: (message: unknown, ...args: unknown[]) => void
  error: (message: unknown, ...args: unknown[]) => void
}

export function createPluginLogger(ctx: Context, config: Config): PluginLogger {
  const logger = ctx.logger('instance-backup')

  return {
    debug(message, ...args) {
      if (!config.loggerinfo) return
      logger.info(message, ...args)
    },
    info(message, ...args) {
      logger.info(message, ...args)
    },
    warn(message, ...args) {
      logger.warn(message, ...args)
    },
    error(message, ...args) {
      logger.error(message, ...args)
    },
  }
}
