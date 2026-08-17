import { Context } from 'koishi'
import { copyFile, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, isAbsolute } from 'node:path'
import { configFileName, dataDirName, packageName, scriptsDirName, stateFileName, defaultConfig } from './constants'
import { RuntimeConfig, RuntimeState } from './types'

export class Store {
  readonly root: string
  readonly scriptsRoot: string
  private readonly configPath: string
  private readonly statePath: string
  private readonly packageRoot: string

  constructor(private ctx: Context) {
    this.packageRoot = findPackageRoot(__dirname)
    this.scriptsRoot = join(this.packageRoot, 'scripts')
    this.root = resolve(ctx.baseDir, 'data', dataDirName)
    this.configPath = join(this.root, configFileName)
    this.statePath = join(this.root, stateFileName)
  }

  async ensure() {
    await mkdir(this.scriptsRoot, { recursive: true })
    await this.ensureConfigDir()
    await this.migrateLegacyScripts()
  }

  resolveScript(path: string) {
    const filename = resolve(this.scriptsRoot, path)
    const rel = relative(this.scriptsRoot, filename)
    if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
      throw new Error('非法脚本路径')
    }
    return filename
  }

  async getConfig(): Promise<RuntimeConfig> {
    try {
      const raw = await readFile(this.configPath, 'utf8')
      const data: unknown = JSON.parse(raw)
      return this.normalizeConfig(data)
    } catch {
      return { ...defaultConfig }
    }
  }

  async setConfig(config: RuntimeConfig) {
    await this.ensureConfigDir()
    const value: RuntimeConfig = this.normalizeConfig(config)
    await writeFile(this.configPath, JSON.stringify(value, null, 2), 'utf8')
  }

  async getState(): Promise<RuntimeState> {
    try {
      const raw = await readFile(this.statePath, 'utf8')
      const data: unknown = JSON.parse(raw)
      return this.normalizeState(data)
    } catch {
      return { enabled: [] }
    }
  }

  async setEnabled(path: string, enabled: boolean) {
    const state = await this.getState()
    const list = state.enabled.filter(item => item !== path)
    if (enabled) list.push(path)
    await this.writeState({ enabled: list })
  }

  async renameEnabled(oldPath: string, newPath: string) {
    const state = await this.getState()
    const enabled = state.enabled.map(item => item === oldPath ? newPath : item)
    await this.writeState({ enabled })
  }

  async removeEnabled(path: string) {
    const state = await this.getState()
    await this.writeState({ enabled: state.enabled.filter(item => item !== path) })
  }

  async renameScript(oldPath: string, newPath: string) {
    const oldFile = this.resolveScript(oldPath)
    const newFile = this.resolveScript(newPath)
    await mkdir(dirname(newFile), { recursive: true })
    await rename(oldFile, newFile)
    await this.renameEnabled(oldPath, newPath)
  }

  private async ensureConfigDir() {
    await mkdir(this.root, { recursive: true })
  }

  private async migrateLegacyScripts() {
    const legacyRoot = resolve(this.ctx.baseDir, 'data', dataDirName, scriptsDirName)
    if (!existsSync(legacyRoot)) return
    const currentFiles = new Set(await readdir(this.scriptsRoot))
    const entries = await readdir(legacyRoot, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile()) continue
      if (!currentFiles.has(entry.name)) {
        await copyFile(join(legacyRoot, entry.name), join(this.scriptsRoot, entry.name))
      }
    }
    await rm(legacyRoot, { recursive: true, force: true })
  }

  private async writeState(state: RuntimeState) {
    await this.ensureConfigDir()
    await writeFile(this.statePath, JSON.stringify(state, null, 2), 'utf8')
  }

  private normalizeConfig(data: unknown): RuntimeConfig {
    if (!data || typeof data !== 'object') return { ...defaultConfig }
    const record = data as Record<string, unknown>
    return {
      apiBase: typeof record.apiBase === 'string' ? record.apiBase : defaultConfig.apiBase,
      apiKey: typeof record.apiKey === 'string' ? record.apiKey : defaultConfig.apiKey,
      model: typeof record.model === 'string' ? record.model : defaultConfig.model,
      temperature: typeof record.temperature === 'number' ? record.temperature : defaultConfig.temperature,
      debug: typeof record.debug === 'boolean' ? record.debug : defaultConfig.debug,
    }
  }

  private normalizeState(data: unknown): RuntimeState {
    if (!data || typeof data !== 'object') return { enabled: [] }
    const record = data as Record<string, unknown>
    const enabled = Array.isArray(record.enabled) && record.enabled.every(item => typeof item === 'string')
      ? record.enabled as string[]
      : []
    return { enabled: [...new Set(enabled)] }
  }
}

function findPackageRoot(start: string) {
  let current = start
  while (true) {
    const packageFile = join(current, 'package.json')
    if (existsSync(packageFile)) {
      try {
        const data = JSON.parse(readFileSync(packageFile, 'utf8')) as { name?: unknown }
        if (data.name === packageName) return current
      } catch {
        // 继续向上查找
      }
    }
    const parent = dirname(current)
    if (parent === current) return start
    current = parent
  }
}
