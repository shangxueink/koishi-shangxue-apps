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
  let activeRun: Promise<BackupRunResult> | null = null

  const performBackup = async (): Promise<BackupRunResult> => {
    // 启动插件时即开始检测 Git 环境，首次备份时等待检测结果
    if (gitAvailable === null) {
      gitAvailable = await gitDetection
    }

    try {
      const backupDir = resolveBackupDirectory(ctx.baseDir, config)
      const gitReady = gitAvailable ? await ensureGitRepository(backupDir, logger) : false
      const snapshotTime = new Date().toISOString()

      // 覆盖前先提交当前快照，覆盖后再提交新快照
      const preResult = gitReady
        ? await commitBackupSnapshot(backupDir, `备份前快照 ${snapshotTime}`, logger)
        : null

      const localResult = await createLocalBackup(ctx, config, logger)
      logger.debug(`本地备份目录：${localResult.backupDir}`)

      const postResult = gitReady
        ? await commitBackupSnapshot(backupDir, `备份后快照 ${snapshotTime}`, logger)
        : null
      const committed = Boolean(preResult?.committed || postResult?.committed)
      const changed = Boolean(preResult?.changed || postResult?.changed)

      if (localResult.skipped.length > 0) {
        logger.debug(`已跳过 ${localResult.skipped.length} 个备份路径`)
      }

      const gitMessage = gitReady
        ? committed ? '，Git 版本历史已记录'
          : changed ? '，Git 记录未生成'
            : '，未发现更改内容。'
        : gitAvailable ? '，Git 仓库不可用' : '，未使用 Git 版本控制'
      const message = `备份完成${gitMessage}`
      logger.info(message)
      return { ok: true, message }
    } catch (error) {
      logger.error('备份失败：', error)
      return { ok: false, message: '备份失败，请查看日志' }
    }
  }

  return async (): Promise<BackupRunResult> => {
    // 短时间内重复触发时复用正在执行的备份，避免 Git 索引锁冲突
    if (activeRun) {
      logger.debug('已有备份任务正在执行，本次指令将复用当前备份结果')
      return activeRun
    }

    activeRun = performBackup().finally(() => {
      activeRun = null
    })
    return activeRun
  }
}
