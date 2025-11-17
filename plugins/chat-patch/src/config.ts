import { Schema } from 'koishi'

export interface Config {
  loggerinfo: boolean
  clearIndexedDBOnStart: boolean
  maxMessagesPerChannel: number
  keepMessagesOnClear: number
  keepTempImages: number
  blockedPlatforms: Array<{
    platformName: string
    exactMatch: boolean
  }>
  chatContainerHeight: number
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    maxMessagesPerChannel: Schema.number().default(500).description('每个群组最大保存消息数量').min(50).max(1500),
    keepMessagesOnClear: Schema.number().default(50).description('手动清理历史记录时保留的消息数量').min(0).max(1000),
    keepTempImages: Schema.number().default(50).description('发送消息保留的临时图片数量（最新的N张）').min(10).max(200),
    blockedPlatforms: Schema.array(Schema.object({
      platformName: Schema.string().description('平台名称或关键词'),
      exactMatch: Schema.boolean().default(false).description('完全匹配？如果关闭，包含关键词即屏蔽').default(true)
    })).role('table').description('屏蔽的平台列表').default(
      [
        {
          "platformName": "qq",
          "exactMatch": true
        },
        {
          "platformName": "qqguild",
          "exactMatch": true
        },
        {
          "platformName": "sandbox",
          "exactMatch": false
        }
      ]
    ),
  }).description('基础设置'),

  Schema.object({
    chatContainerHeight: Schema.number().default(80).description('手机端使用的视口高度（防止文本输入框被挡住）').min(50).max(100),
  }).description('进阶设置'),

  Schema.object({
    clearIndexedDBOnStart: Schema.boolean().default(true).description('启动时强制清空IndexedDB缓存（适用于紧急情况，防止浏览器卡死）'),
    loggerinfo: Schema.boolean().default(false).description('日志调试模式').experimental(),
  }).description('开发者选项'),
])