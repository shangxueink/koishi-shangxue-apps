import { Context } from 'koishi'

import type { Config } from './config'
import type { BackupRunner } from './commands'

export function registerBackupScheduler(
  ctx: Context,
  config: Config,
  runner: BackupRunner,
): () => void {
  let disposed = false
  const disposers = new Set<() => void>()

  const disposeAll = () => {
    if (disposed) return
    disposed = true
    for (const dispose of disposers) dispose()
    disposers.clear()
  }

  if (!config.auto_cron) return disposeAll

  ctx.inject(['cron'], (childCtx) => {
    if (disposed) return

    const cron = childCtx.cron
    if (!cron) return

    const dispose = cron(config.cronvalue, () => {
      void runner()
    })
    disposers.add(dispose)
    childCtx.on('dispose', () => {
      disposers.delete(dispose)
    })
  })

  return disposeAll
}
