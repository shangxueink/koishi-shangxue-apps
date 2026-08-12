import { execFile } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import type { PluginLogger } from './logger'

function runGit(args: string[], cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        const detail = new Error(stderr ? `${error.message}\n${stderr.trim()}` : error.message)
        reject(detail)
        return
      }
      resolve(stdout)
    })
  })
}

export async function isGitAvailable(logger: PluginLogger): Promise<boolean> {
  try {
    const version = await runGit(['--version'])
    logger.debug(`检测到 Git：${version.trim()}`)
    return true
  } catch (error) {
    logger.warn('未检测到 Git，将直接覆盖备份文件；建议安装 Git 以获得版本历史')
    logger.debug(error)
    return false
  }
}

export async function ensureGitRepository(backupDir: string, logger: PluginLogger): Promise<boolean> {
  try {
    await fs.mkdir(backupDir, { recursive: true })

    const gitDir = path.join(backupDir, '.git')
    try {
      await fs.access(gitDir)
    } catch {
      await runGit(['init'], backupDir)
      logger.debug(`已初始化本地 Git 仓库：${backupDir}`)
    }

    return true
  } catch (error) {
    logger.warn('初始化本地 Git 仓库失败，本次将直接覆盖备份文件：', error)
    return false
  }
}

export async function commitBackupSnapshot(
  backupDir: string,
  message: string,
  logger: PluginLogger,
): Promise<boolean> {
  try {
    await runGit(['add', '-A'], backupDir)

    // 没有变更时不生成空提交
    const status = await runGit(['status', '--porcelain'], backupDir)
    if (!status.trim()) return false

    await runGit([
      '-c', 'user.name=Koishi Backup',
      '-c', 'user.email=koishi-backup@local',
      '-c', 'commit.gpgsign=false',
      'commit',
      '-m', message,
    ], backupDir)
    logger.debug(`Git 提交完成：${message}`)
    return true
  } catch (error) {
    logger.warn(`Git 提交失败：${message}`, error)
    return false
  }
}
