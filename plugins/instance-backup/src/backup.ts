import type { Context } from 'koishi'

import type { BackupRunResult, BackupRunner } from './commands'
import type { Config } from './config'
import { commitBackupSnapshot, ensureGitRepository, isGitAvailable } from './git'
import type { PluginLogger } from './logger'
import { createLocalBackup, resolveBackupDirectory } from './local'

export function createBackupRunner(
  ctx: Context,
  config: Config,
  logger: PluginLogger,
): BackupRunner {
  let gitAvailable: boolean | null = null
  const gitDetection = isGitAvailable(logger)

  return async (): Promise<BackupRunResult> => {
    // 启动插件时即开始检测 Git 环境，首次备份时等待检测结果
    if (gitAvailable === null) {
      gitAvailable = await gitDetection
    }

    try {
      const backupDir = resolveBackupDirectory(ctx.baseDir, config)
      const gitReady = gitAvailable ? await ensureGitRepository(backupDir, logger) : false

      // 覆盖前先提交当前快照，覆盖后再提交新快照
      if (gitReady) {
        await commitBackupSnapshot(backupDir, '备份前快照', logger)
      }

      const localResult = await createLocalBackup(ctx, config, logger)
      logger.debug(`本地备份目录：${localResult.backupDir}`)

      const committed = gitReady
        ? await commitBackupSnapshot(backupDir, `备份后快照 ${new Date().toISOString()}`, logger)
        : false

      if (localResult.skipped.length > 0) {
        logger.debug(`已跳过 ${localResult.skipped.length} 个备份路径`)
      }

      const gitMessage = gitReady
        ? committed ? '，Git 版本历史已记录' : '，Git 记录未生成'
        : gitAvailable ? '，Git 仓库不可用' : '，未使用 Git 版本控制'
      const message = `备份完成${gitMessage}`
      logger.info(message)
      return { ok: true, message }
    } catch (error) {
      logger.error('备份失败：', error)
      return { ok: false, message: '备份失败，请查看日志' }
    }
  }
}
