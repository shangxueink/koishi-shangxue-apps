import { Context, Schema } from 'koishi'
import { Console } from '@koishijs/console'
import { } from '@koishijs/plugin-console'
import { resolve } from 'node:path'
import { pluginName } from './constants'
import { registerConsoleEvents } from './events'
import { initLogger, logWarn, setDebug } from './logger'
import { ScriptManager } from './runtime'
import { Store } from './store'

declare module 'koishi' {
  interface Context {
    console: Console
  }
}

export interface Config {}

export const name = pluginName

export const Config: Schema<Config> = Schema.object({})

export const inject = {
  required: ['console'],
}

export async function apply(ctx: Context) {
  initLogger(ctx)
  const store = new Store(ctx)
  const runtime = new ScriptManager(ctx, store)
  await store.ensure()
  const config = await store.getConfig()
  setDebug(config.debug)

  ctx.console.addEntry({
    dev: resolve(__dirname, '../client/index.ts'),
    prod: resolve(__dirname, '../dist'),
  })
  registerConsoleEvents(ctx, store, runtime)

  ctx.on('ready', async () => {
    const result = await runtime.reload()
    if (!result.ok && result.error) logWarn(result.error)
  })

  ctx.on('dispose', () => {
    runtime.dispose()
    setDebug(false)
  })
}
