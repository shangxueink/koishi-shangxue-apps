import { Context } from 'koishi'

import type { PluginLogger } from './logger'
import { TABLE_NAME } from './types'

export interface AliasEntry {
  rawCommand: string
  alias: string
}

export class AliasStore {
  private entries = new Map<string, Map<string, string[]>>()

  constructor(
    private readonly ctx: Context,
    private readonly logger: PluginLogger,
  ) {
    this.ctx.model.extend(TABLE_NAME, {
      id: 'unsigned',
      platform: 'string',
      groupId: 'string',
      rawCommand: 'string',
      alias: 'string',
    }, {
      primary: 'id',
      autoInc: true,
    })
  }

  private getKey(platform: string, groupId: string): string {
    return `${platform}:${groupId}`
  }

  list(platform: string, groupId: string): AliasEntry[] {
    const group = this.entries.get(this.getKey(platform, groupId))
    if (!group) return []
    const entries: AliasEntry[] = []
    for (const [alias, rawCommands] of group) {
      for (const rawCommand of rawCommands) {
        entries.push({ rawCommand, alias })
      }
    }
    return entries
  }

  resolveAll(platform: string, groupId: string, alias: string): string[] {
    return this.entries.get(this.getKey(platform, groupId))?.get(alias) ?? []
  }

  async load(): Promise<void> {
    try {
      const rows = await this.ctx.database.get(TABLE_NAME, {})
      const grouped = new Map<string, Map<string, string[]>>()

      for (const row of rows) {
        const key = this.getKey(row.platform, row.groupId)
        const group = grouped.get(key) ?? new Map<string, string[]>()
        const rawCommands = group.get(row.alias) ?? []
        if (!rawCommands.includes(row.rawCommand)) {
          rawCommands.push(row.rawCommand)
        }
        group.set(row.alias, rawCommands)
        grouped.set(key, group)
      }

      this.entries = grouped
    } catch (error) {
      this.logger.error('加载指令别名数据失败', error)
    }
  }

  async add(platform: string, groupId: string, rawCommand: string, alias: string): Promise<string> {
    const key = this.getKey(platform, groupId)
    const group = this.entries.get(key) ?? new Map<string, string[]>()

    const rawCommands = group.get(alias) ?? []
    if (rawCommands.includes(rawCommand)) {
      return `原指令「${rawCommand}」已绑定别名「${alias}」`
    }

    try {
      await this.ctx.database.create(TABLE_NAME, { platform, groupId, rawCommand, alias })
      rawCommands.push(rawCommand)
      group.set(alias, rawCommands)
      this.entries.set(key, group)
      return `已添加别名：${alias} -> ${rawCommand}`
    } catch (error) {
      this.logger.error('添加指令别名失败', error)
      return `添加失败：${error instanceof Error ? error.message : String(error)}`
    }
  }

  async remove(platform: string, groupId: string, rawCommand: string, alias: string): Promise<string> {
    const key = this.getKey(platform, groupId)
    const group = this.entries.get(key)
    const rawCommands = group?.get(alias)

    if (!group || !rawCommands?.includes(rawCommand)) {
      return `未找到别名：${alias} -> ${rawCommand}`
    }

    try {
      await this.ctx.database.remove(TABLE_NAME, { platform, groupId, alias, rawCommand })
      rawCommands.splice(rawCommands.indexOf(rawCommand), 1)
      if (rawCommands.length === 0) {
        group.delete(alias)
      } else {
        group.set(alias, rawCommands)
      }
      if (group.size === 0) {
        this.entries.delete(key)
      } else {
        this.entries.set(key, group)
      }
      return `已删除别名：${alias} -> ${rawCommand}`
    } catch (error) {
      this.logger.error('删除指令别名失败', error)
      return `删除失败：${error instanceof Error ? error.message : String(error)}`
    }
  }
}
