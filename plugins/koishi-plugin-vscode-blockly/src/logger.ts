import { Context, Logger } from 'koishi'

let logger: Logger
let debugEnabled = false

export function initLogger(ctx: Context) {
  logger = ctx.logger('vscode-blockly')
}

export function setDebug(enabled: boolean) {
  debugEnabled = enabled
}

export function logInfo(message: string) {
  logger.info(message)
}

export function logDebug(message: string) {
  if (debugEnabled) logger.debug(message)
}

export function logWarn(message: string) {
  logger.warn(message)
}

export function logError(message: string, error?: unknown) {
  if (error instanceof Error) {
    logger.error(`${message}: ${error.message}`)
  } else {
    logger.error(message)
  }
}
