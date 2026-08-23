import { Schema, Time } from 'koishi'

export interface Config {
  restartDelay: number
  cooldown: number
  checkInterval: number
  loggerinfo: boolean
  testCommand: boolean
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    restartDelay: Schema.natural().role('ms').default(1000)
      .description('检测到错误后延迟重启 OneBot 适配器的时间'),
    cooldown: Schema.natural().role('ms').default(Time.minute)
      .description('同一机器人两次自动重启的最小间隔'),
    checkInterval: Schema.natural().role('ms').default(Time.minute)
      .description('定期检查 OneBot 请求函数是否失效'),
  }).description('修复设置'),
  Schema.object({
    loggerinfo: Schema.boolean().default(false)
      .description('输出调试日志').experimental(),
  }).description('调试模式'),
  Schema.object({
    testCommand: Schema.boolean().default(false)
      .description('注册测试指令，用于模拟 `_request is not a function` 错误'),
  }).description('测试'),
])
