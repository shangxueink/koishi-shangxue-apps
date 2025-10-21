import { Logger } from 'koishi'
import { Config } from './index'

export let logger: Logger
export let config: Config

export function initializeLogger(newLogger: Logger, newConfig: Config) {
    logger = newLogger
    config = newConfig
}

export function logInfo(...args: any[]) {
    if (config?.loggerinfo) {
        (logger?.info as (...args: any[]) => void)?.(...args)
    }
}