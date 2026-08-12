import { promises as fs } from 'node:fs'
import path from 'node:path'

import { Context } from 'koishi'

import type { Config } from './config'
import type { PluginLogger } from './logger'

export interface LocalBackupResult {
  backupDir: string
  files: string[]
  skipped: string[]
}

// 选择目录备份时，默认跳过常见的冗余目录和文件
const IGNORED_DIRECTORY_NAMES = new Set([
  'node_modules',
  'bower_components',
  '.git',
  '.svn',
  '.hg',
  '.cache',
  '.next',
  '.nuxt',
  '.output',
  '.turbo',
  '.vite',
  '.vercel',
  'dist',
  'build',
  'coverage',
  '__pycache__',
  '.mypy_cache',
  '.pytest_cache',
  '.ruff_cache',
  '.venv',
  'venv',
  '.tox',
  '.eggs',
  'logs',
  'log',
  'tmp',
  'temp',
  '.tmp',
  '.idea',
  '.vscode',
])

const IGNORED_FILE_NAMES = new Set([
  '.DS_Store',
  'Thumbs.db',
  'desktop.ini',
  'npm-debug.log',
  'yarn-error.log',
])

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

interface CopyOptions {
  backupDir: string
  storageRoot: string
}

function shouldSkipDirectory(sourcePath: string, options: CopyOptions): boolean {
  const name = path.basename(sourcePath)
  if (isPathInside(options.backupDir, sourcePath)) return true
  if (path.resolve(sourcePath) === path.resolve(options.storageRoot)) return true
  if (IGNORED_DIRECTORY_NAMES.has(name)) return true
  return false
}

async function copyEntry(
  sourcePath: string,
  targetPath: string,
  options: CopyOptions,
): Promise<void> {
  const stat = await fs.lstat(sourcePath)

  if (stat.isDirectory()) {
    if (shouldSkipDirectory(sourcePath, options)) return

    await fs.mkdir(targetPath, { recursive: true })
    const entries = await fs.readdir(sourcePath, { withFileTypes: true })
    for (const entry of entries) {
      await copyEntry(
        path.join(sourcePath, entry.name),
        path.join(targetPath, entry.name),
        options,
      )
    }
    return
  }

  if (IGNORED_FILE_NAMES.has(path.basename(sourcePath))) return

  await fs.mkdir(path.dirname(targetPath), { recursive: true })
  await fs.copyFile(sourcePath, targetPath)
}

export async function createLocalBackup(
  ctx: Context,
  config: Config,
  logger: PluginLogger,
): Promise<LocalBackupResult> {
  // 使用固定备份目录，不再生成时间戳快照目录
  const storageRoot = resolveStoragePath(ctx.baseDir, config.areapath)
  const backupDir = resolveBackupDirectory(ctx.baseDir, config)
  const files: string[] = []
  const skipped: string[] = []

  await fs.mkdir(backupDir, { recursive: true })

  for (const item of config.backupList) {
    let sourcePath: string
    try {
      sourcePath = resolveSourcePath(ctx.baseDir, item)
    } catch (error) {
      if (!config.skip_nonexistent_films) throw error
      logger.warn(error instanceof Error ? error.message : String(error))
      skipped.push(item)
      continue
    }

    try {
      await fs.stat(sourcePath)
    } catch (error) {
      if (config.skip_nonexistent_films) {
        logger.debug(`跳过不存在的备份路径：${item}`)
        skipped.push(item)
        continue
      }
      throw error
    }

    // 跳过备份目录自身和备份存储根目录，避免重复复制或无限递归
    const sourceInsideBackup = isPathInside(backupDir, sourcePath)
    const sourceIsStorageRoot = path.resolve(sourcePath) === path.resolve(storageRoot)

    if (sourceInsideBackup || sourceIsStorageRoot) {
      logger.warn(`备份源包含本地备份目录，已跳过：${item}`)
      skipped.push(item)
      continue
    }

    const relative = path.relative(ctx.baseDir, sourcePath)
    const targetPath = path.join(backupDir, relative)
    await copyEntry(sourcePath, targetPath, { backupDir, storageRoot })
    files.push(relative)
    logger.debug(`已复制 ${sourcePath} 到 ${targetPath}`)
  }

  return {
    backupDir,
    files,
    skipped,
  }
}
