import { Context, ForkScope, Plugin } from 'koishi'
import { createRequire } from 'node:module'
import { dirname, extname, join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { compileScript } from './compiler'
import { allowedExtensions, scriptsDirName } from './constants'
import { logDebug, logError, logInfo, logWarn } from './logger'
import { Store } from './store'
import { ReloadResult } from './types'

function toPlugin(value: unknown): Plugin<Context> | undefined {
  if (typeof value === 'function') return value as Plugin<Context>
  if (value && typeof value === 'object') {
    const candidate = value as { apply?: unknown }
    if (typeof candidate.apply === 'function') return value as Plugin<Context>
  }
  return undefined
}

function errorText(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}

export class ScriptManager {
  private loaded = new Map<string, ForkScope[]>()

  constructor(private ctx: Context, private store: Store) {}

  async reload(path?: string): Promise<ReloadResult> {
    try {
      if (path) {
        await this.stop(path)
        const state = await this.store.getState()
        if (state.enabled.includes(path)) {
          await this.start(path)
        }
      } else {
        this.dispose()
        await this.startAll()
      }
      return { ok: true }
    } catch (error) {
      const message = errorText(error)
      logError('重载脚本失败', error)
      return { ok: false, error: message }
    }
  }

  async startAll() {
    const state = await this.store.getState()
    for (const path of state.enabled) {
      if (!allowedExtensions.includes(extname(path))) continue
      await this.start(path)
    }
  }

  async start(path: string) {
    await this.stop(path)
    const filename = this.store.resolveScript(path)
    const source = await readFile(filename, 'utf8')
    const compiled = compileScript(source, path)
    const plugin = this.loadPlugin(compiled, filename)
    if (!plugin) {
      logWarn(`脚本 ${path} 没有导出 Koishi 插件`)
      this.loaded.set(path, [])
      return
    }
    const scopes: ForkScope[] = []
    this.loaded.set(path, scopes)
    try {
      const scope = this.ctx.plugin(plugin)
      scopes.push(scope)
      logInfo(`已加载脚本 ${path}`)
    } catch (error) {
      logError(`加载脚本 ${path} 失败`, error)
      throw error
    }
  }

  async stop(path: string) {
    const scopes = this.loaded.get(path)
    if (scopes) {
      for (const scope of scopes) {
        scope.dispose()
      }
      this.loaded.delete(path)
      logDebug(`已停止脚本 ${path}`)
    }
  }

  dispose() {
    for (const scopes of this.loaded.values()) {
      for (const scope of scopes) {
        scope.dispose()
      }
    }
    this.loaded.clear()
  }

  private loadPlugin(compiled: string, filename: string) {
    const baseRequire = createRequire(join(this.ctx.baseDir, 'package.json'))
    const localRequire = createRequire(filename)
    const scriptRequire = (id: string) => {
      if (id.startsWith('.') || id.startsWith('/') || id.startsWith('file:')) {
        return localRequire(id)
      }
      return baseRequire(id)
    }
    const moduleObject: { exports: Record<string, unknown> } = { exports: {} }
    const factory = new Function('module', 'exports', 'require', '__filename', '__dirname', compiled)
    factory(moduleObject, moduleObject.exports, scriptRequire, filename, dirname(filename))
    return toPlugin(moduleObject.exports.default) ?? toPlugin(moduleObject.exports)
  }
}
