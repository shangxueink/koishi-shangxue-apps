import { Context, Logger } from "koishi"

const logger = new Logger("lmarena-api")

export interface AppLogger {
  enabled: boolean
  info: (...args: Parameters<Logger["info"]>) => void
  warn: (...args: Parameters<Logger["warn"]>) => void
  error: (...args: Parameters<Logger["error"]>) => void
}

// 统一封装调试日志与错误日志，插件其余模块只依赖该接口
export function createAppLogger(ctx: Context, debugEnabled: boolean): AppLogger {
  return {
    enabled: debugEnabled,
    info(...args: Parameters<Logger["info"]>) {
      if (debugEnabled) logger.info(...args)
    },
    warn(...args: Parameters<Logger["warn"]>) {
      ctx.logger.warn(...args)
    },
    error(...args: Parameters<Logger["error"]>) {
      ctx.logger.error(...args)
    },
  }
}

export { logger }
