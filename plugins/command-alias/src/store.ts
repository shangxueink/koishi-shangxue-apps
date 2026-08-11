import { Context } from 'koishi'

import type { PluginLogger } from './logger'
import { TABLE_NAME } from './types'

export interface AliasEntry {
  rawCommand: string
  alias: string
}

export class AliasStore {
  private entries = new Map<string, Map<string, string>>()

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
    return [...group].map(([alias, rawCommand]) => ({ rawCommand, alias }))
  }

  resolve(platform: string, groupId: string, alias: string): string | undefined {
    return this.entries.get(this.getKey(platform, groupId))?.get(alias)
  }

  async load(): Promise<void> {
    try {
      const rows = await this.ctx.database.get(TABLE_NAME, {})
      const grouped = new Map<string, Map<string, string>>()

      for (const row of rows) {
        const key = this.getKey(row.platform, row.groupId)
        const group = grouped.get(key) ?? new Map<string, string>()
        group.set(row.alias, row.rawCommand)
        grouped.set(key, group)
      }

      this.entries = grouped
    } catch (error) {
      this.logger.error('加载指令别名数据失败', error)
    }
  }

  async add(platform: string, groupId: string, rawCommand: string, alias: string): Promise<string> {
    const key = this.getKey(platform, groupId)
    const group = this.entries.get(key) ?? new Map<string, string>()

    if (group.has(alias)) {
      return `别名「${alias}」已在当前群组存在`
    }

    try {
      await this.ctx.database.create(TABLE_NAME, { platform, groupId, rawCommand, alias })
      group.set(alias, rawCommand)
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
    const currentRawCommand = group?.get(alias)

    if (!group || currentRawCommand !== rawCommand) {
      return `未找到别名：${alias} -> ${rawCommand}`
    }

    try {
      await this.ctx.database.remove(TABLE_NAME, { platform, groupId, alias })
      group.delete(alias)
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
