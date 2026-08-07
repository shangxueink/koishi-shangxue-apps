import { Context, Schema } from 'koishi'
import { Installer } from '@koishijs/plugin-market'

export const name = 'auto-config-on-install'
export const reusable = false
export const filter = false
export const inject = {
  required: ['loader'],
  optional: ['installer'],
}

export interface Config {
  includeWorkspaces?: boolean
  enable?: boolean
}

export const Config: Schema<Config> = Schema.object({
  includeWorkspaces: Schema.boolean().default(true).description('是否为 workspace 插件创建配置'),
  enable: Schema.boolean().default(false).description('安装后是否立即启用插件'),
})

function getPluginName(name: string) {
  if (name.startsWith('@koishijs/plugin-')) return name.slice('@koishijs/plugin-'.length)
  if (name.includes('koishi-plugin-')) return name.replace('koishi-plugin-', '')
}

function hasConfig(plugins: any, name: string): boolean {
  for (const key in plugins || {}) {
    if (key.startsWith('$')) continue
    const [pluginName] = key.replace(/^~/, '').split(':', 1)
    if (pluginName === name) return true
    if (pluginName === 'group' && hasConfig(plugins[key], name)) return true
  }
  return false
}

function installConfig(ctx: Context, config: Config, installer: Installer) {
  const loader = ctx.loader
  const target = installer as Installer & {
    __autoConfigOnInstall?: boolean
  }
  if (target.__autoConfigOnInstall) return

  const originalInstall = installer.install
  const wrappedInstall = async (deps: Record<string, string>, forced?: boolean) => {
    const names = Object.keys(deps)
    const existing = await installer.getDeps()
    const code = await originalInstall.call(installer, deps, forced)
    if (code !== 0) return code

    for (const name of names) {
      if (!deps[name]) continue
      if (existing[name]) continue

      const pluginName = getPluginName(name)
      if (!pluginName) continue
      if (!config.includeWorkspaces && (await installer.getDeps())[name]?.workspace) continue
      if (hasConfig(loader.config.plugins, pluginName)) continue

      loader.config.plugins ||= {}
      const prefix = config.enable ? '' : '~'
      const key = `${prefix}${pluginName}:${Math.random().toString(36).slice(2, 8)}`
      loader.config.plugins[key] = {}
      if (config.enable) await loader.reload(loader.entry, key, {})
      await loader.writeConfig()
    }

    return code
  }

  target.__autoConfigOnInstall = true
  installer.install = wrappedInstall

  ctx.on('dispose', () => {
    if (installer.install === wrappedInstall) {
      installer.install = originalInstall
      delete target.__autoConfigOnInstall
    }
  })
}

export function apply(ctx: Context, config: Config) {
  ctx.inject(['installer'], (ctx) => installConfig(ctx, config, ctx.installer))
}




