import { Context } from 'koishi'

import { Config, inject, name, usage } from './config'
import type { Config as PluginConfig } from './config'
import { createPluginLogger } from './logger'
import { registerBackupCommand } from './commands'
import { registerBackupScheduler } from './scheduler'
import { createBackupRunner } from './backup'

export { Config, inject, name, usage }
export type { Config as PluginConfig } from './config'

export function apply(ctx: Context, config: PluginConfig): void {
  const logger = createPluginLogger(ctx, config)
  const disposers: (() => void)[] = []
  const performBackup = createBackupRunner(ctx, config, logger)

  ctx.on('ready', () => {
    if (config.enableBackupCommand) {
      registerBackupCommand(ctx, performBackup)
    } else {
      logger.debug('备份指令已关闭，不再注册备份命令')
    }

    disposers.push(registerBackupScheduler(ctx, config, performBackup))

    if (config.auto_cron && !ctx.cron) {
      logger.warn('未检测到 cron 服务，自动备份不会执行；请安装并启用 cron 插件')
    }
  })

  ctx.on('dispose', () => {
    for (const dispose of disposers) dispose()
    disposers.length = 0
  })
}
