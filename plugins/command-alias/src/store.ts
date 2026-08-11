import { Context } from 'koishi'

import type { PluginLogger } from './logger'
import { TABLE_NAME } from './types'

export interface AliasEntry {
  rawCommand: string
  alias: string
}

export class AliasStore {
  private entries = new Map<string, AliasEntry[]>()

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
    return this.entries.get(this.getKey(platform, groupId)) ?? []
  }

  async load(): Promise<void> {
    try {
      const rows = await this.ctx.database.get(TABLE_NAME, {})
      const grouped = new Map<string, AliasEntry[]>()

      for (const row of rows) {
        const key = this.getKey(row.platform, row.groupId)
        const list = grouped.get(key) ?? []
        list.push({ rawCommand: row.rawCommand, alias: row.alias })
        grouped.set(key, list)
      }

      this.entries = grouped
    } catch (error) {
      this.logger.error('加载指令别名数据失败', error)
    }
  }

  async add(platform: string, groupId: string, rawCommand: string, alias: string): Promise<string> {
    const key = this.getKey(platform, groupId)
    const current = this.list(platform, groupId)

    if (current.some((entry) => entry.alias === alias)) {
      return `别名「${alias}」已在当前群组存在`
    }

    try {
      await this.ctx.database.create(TABLE_NAME, { platform, groupId, rawCommand, alias })
      this.entries.set(key, [...current, { rawCommand, alias }])
      return `已添加别名：${alias} -> ${rawCommand}`
    } catch (error) {
      this.logger.error('添加指令别名失败', error)
      return `添加失败：${error instanceof Error ? error.message : String(error)}`
    }
  }

  async remove(platform: string, groupId: string, rawCommand: string, alias: string): Promise<string> {
    const key = this.getKey(platform, groupId)
    const current = this.list(platform, groupId)
    const target = current.find((entry) => {
      return entry.alias === alias && entry.rawCommand === rawCommand
    })

    if (!target) {
      return `未找到别名：${alias} -> ${rawCommand}`
    }

    try {
      await this.ctx.database.remove(TABLE_NAME, { platform, groupId, alias })
      this.entries.set(key, current.filter((entry) => entry !== target))
      return `已删除别名：${alias} -> ${rawCommand}`
    } catch (error) {
      this.logger.error('删除指令别名失败', error)
      return `删除失败：${error instanceof Error ? error.message : String(error)}`
    }
  }
}
