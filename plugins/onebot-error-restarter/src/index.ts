import { Context } from 'koishi'

import { registerTestCommand } from './commands'
import { Config } from './config'
import { createDebugLogger } from './logger'
import { registerRestarter } from './restarter'

export const name = 'onebot-error-restarter'
export const reusable = false
export const filter = false

export { Config }

export function apply(ctx: Context, config: Config) {
  const log = createDebugLogger(ctx, config)
  registerRestarter(ctx, config, log)
  registerTestCommand(ctx, config)
}
