import { Context } from 'koishi'

export interface PluginLogger {
  debug(...args: unknown[]): void
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
}

export function createLogger(ctx: Context, scope: string, enabled: boolean): PluginLogger {
  const logger = ctx.logger(scope)

  return {
    debug(...args) {
      if (enabled) {
        Reflect.apply(logger.info, logger, ['[debug]', ...args])
      }
    },
    info(...args) {
      Reflect.apply(logger.info, logger, args)
    },
    warn(...args) {
      Reflect.apply(logger.warn, logger, args)
    },
    error(...args) {
      Reflect.apply(logger.error, logger, args)
    },
  }
}
