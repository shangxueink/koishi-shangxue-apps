import { Context } from 'koishi'

import { isScheduleTrigger, type Config } from './config'
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

  if (!isScheduleTrigger(config.triggerMode)) return disposeAll

  ctx.inject(['cron'], (childCtx) => {
    if (disposed) return

    if (!childCtx.cron) return

    const dispose = childCtx.cron(config.cronvalue, () => {
      void runner()
    })
    disposers.add(dispose)
    childCtx.on('dispose', () => {
      disposers.delete(dispose)
    })
  })

  return disposeAll
}
