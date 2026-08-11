import { Schema } from 'koishi'

export type PermissionMode = 'authority' | 'role' | 'mixed'

export interface Config {
  enabled: boolean
  baseCommand: string
  addCommand: string
  removeCommand: string
  listCommand: string
  availableCommand: string
  permissionMode: PermissionMode
  authorityThreshold: number
  loggerinfo: boolean
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    enabled: Schema.boolean().default(true).description('是否启用指令别名功能'),
    baseCommand: Schema.string().default('指令别名').description('别名管理指令的根指令'),
    addCommand: Schema.string().default('添加').description('添加别名的子指令'),
    removeCommand: Schema.string().default('删除').description('删除别名的子指令'),
    listCommand: Schema.string().default('列表').description('查看当前群组别名的子指令'),
    availableCommand: Schema.string().default('可用指令').description('查看可设置别名的原始指令'),
  }).description('指令设置'),
  Schema.object({
    permissionMode: Schema.union([
      Schema.const('authority').description('仅使用 authority 权限判断'),
      Schema.const('role').description('仅允许群主或管理员'),
      Schema.const('mixed').description('满足 authority 或群身份任一即可'),
    ]).role('radio').default('authority').description('管理别名使用的权限模式'),
    authorityThreshold: Schema.number().min(0).max(5).step(1).default(2)
      .description('authority 大于该数值的人可以管理别名'),
  }).description('权限设置'),
  Schema.object({
    loggerinfo: Schema.boolean().default(false).description('调试日志开关').experimental(),
  }).description('调试设置'),
])
