import { promises as fs, Stats } from 'node:fs'
import path from 'node:path'

import { Context } from 'koishi'

import type { Config } from './config'
import type { PluginLogger } from './logger'

export interface LocalBackupResult {
  backupDir: string
  files: string[]
  skipped: string[]
}

function isPathInside(parentPath: string, childPath: string): boolean {
  const relative = path.relative(parentPath, childPath)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

export function resolveStoragePath(baseDir: string, input: string): string {
  if (path.isAbsolute(input)) return input
  return path.resolve(baseDir, input)
}

export function resolveSourcePath(baseDir: string, relativePath: string): string {
  const root = path.resolve(baseDir)
  const target = path.resolve(root, relativePath)
  const relative = path.relative(root, target)

  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`备份路径必须位于 koishi 根目录内：${relativePath}`)
  }

  return target
}

export function resolveBackupDirectory(baseDir: string, config: Config): string {
  const storageRoot = resolveStoragePath(baseDir, config.areapath)
  return path.resolve(storageRoot, config.ParentFolderName)
}

export async function createLocalBackup(
  ctx: Context,
  config: Config,
  logger: PluginLogger,
): Promise<LocalBackupResult> {
  // 使用固定备份目录，不再生成时间戳快照目录
  const backupDir = resolveBackupDirectory(ctx.baseDir, config)
  const files: string[] = []
  const skipped: string[] = []

  await fs.mkdir(backupDir, { recursive: true })

  for (const item of config.BackupList) {
    let sourcePath: string
    try {
      sourcePath = resolveSourcePath(ctx.baseDir, item)
    } catch (error) {
      if (!config.Skip_nonexistent_films) throw error
      logger.warn(error instanceof Error ? error.message : String(error))
      skipped.push(item)
      continue
    }

    let sourceStat: Stats
    try {
      sourceStat = await fs.stat(sourcePath)
    } catch (error) {
      if (config.Skip_nonexistent_films) {
        logger.debug(`跳过不存在的备份路径：${item}`)
        skipped.push(item)
        continue
      }
      throw error
    }

    // 防止把备份目录本身或包含备份目录的源目录反复复制
    const sourceInsideBackup = isPathInside(backupDir, sourcePath)
    const backupInsideSource = sourceStat.isDirectory() && isPathInside(sourcePath, backupDir)

    if (sourceInsideBackup || backupInsideSource) {
      logger.warn(`备份源包含本地备份目录，已跳过：${item}`)
      skipped.push(item)
      continue
    }

    const relative = path.relative(ctx.baseDir, sourcePath)
    const targetPath = path.join(backupDir, relative)
    await fs.mkdir(path.dirname(targetPath), { recursive: true })
    await fs.cp(sourcePath, targetPath, {
      recursive: true,
      force: true,
      errorOnExist: false,
    })
    files.push(relative)
    logger.debug(`已复制 ${sourcePath} 到 ${targetPath}`)
  }

  return {
    backupDir,
    files,
    skipped,
  }
}
