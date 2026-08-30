import { Schema } from 'koishi'

export interface BlockedPlatform {
  platformName: string
  exactMatch: boolean
}

export interface Config {
  loggerinfo: boolean
  basePath: string
  maxMessagesPerChannel: number
  historyPageSize: number
  maxMediaFiles: number
  blockedPlatforms: BlockedPlatform[]
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    basePath: Schema.string().default('/chat-patch').description('Web 聊天室挂载路径'),
    maxMessagesPerChannel: Schema.number().default(500).min(50).max(5000).step(1).description('每个频道最多保存的历史消息数'),
    historyPageSize: Schema.number().default(50).min(10).max(500).step(1).description('历史消息分页大小'),
    maxMediaFiles: Schema.number().default(200).min(20).max(2000).step(1).description('媒体缓存文件上限'),
  }).description('基础设置'),
  Schema.object({
    blockedPlatforms: Schema.array(Schema.object({
      platformName: Schema.string(),
      exactMatch: Schema.boolean().default(true),
    })).role('table').description('屏蔽消息接收的平台').default([
      { platformName: 'qq', exactMatch: true },
      { platformName: 'qqguild', exactMatch: true },
      { platformName: 'sandbox', exactMatch: false },
    ]),
    loggerinfo: Schema.boolean().default(false).description('调试日志开关').hidden().experimental(),
  }).description('高级设置'),
])
