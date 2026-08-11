export const TABLE_NAME = 'command_alias_table'

export interface CommandAliasRow {
  id: number
  platform: string
  groupId: string
  rawCommand: string
  alias: string
}

declare module 'koishi' {
  interface Tables {
    command_alias_table: CommandAliasRow
  }
}
