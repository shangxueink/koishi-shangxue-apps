import { Schema } from 'koishi'

export type AssigneeMode = 'none' | 'self' | 'other'

export interface Config {
  assigneeMode: AssigneeMode
  loggerinfo: boolean
}

export const Config: Schema<Config> = Schema.object({
  assigneeMode: Schema.union([
    Schema.const('none').description('不修改（相当于不开启插件）'),
    Schema.const('self').description('修改为自身（始终响应无前缀消息）'),
    Schema.const('other').description('修改为不是自身（始终不响应无前缀消息）'),
  ]).role('radio').default('self').description('频道 assignee 的修改模式'),
  loggerinfo: Schema.boolean().default(false).description('输出调试日志').experimental(),
}).description('调试设置')
