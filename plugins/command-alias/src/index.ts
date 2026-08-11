import { Context } from 'koishi'

import { registerAliasMiddleware } from './alias'
import { Config } from './config'
import type { Config as PluginConfig } from './config'
import { registerCommands } from './commands'
import { createLogger } from './logger'
import { AliasStore } from './store'
import './types'

export const name = 'command-alias'
export const inject = {
  required: ['database'],
}

export { Config }
export type { Config as PluginConfig } from './config'

export function apply(ctx: Context, config: PluginConfig) {
  if (!config.enabled) return

  const logger = createLogger(ctx, name, config.loggerinfo)
  const store = new AliasStore(ctx, logger)

  ctx.on('ready', async () => {
    await store.load()
    registerCommands(ctx, config, store, logger)
    registerAliasMiddleware(ctx, config, store, logger)
  })
}
