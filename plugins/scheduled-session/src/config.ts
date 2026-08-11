import { Schema } from 'koishi'

export type ScheduleEvery =
  | 'once'
  | 'sec'
  | 'min'
  | 'hour'
  | 'day'
  | 'weekday'
  | 'saturday'
  | 'week'
  | 'month'
  | 'year'

export interface ScheduleTask {
  botId: string
  channelId: string
  iscommand: boolean
  executecommand: string
  scheduletime: string
  every: ScheduleEvery
  cycletime: number
}

export interface Config {
  enablescheduletable: boolean
  scheduletable?: ScheduleTask[]
  loggerinfo: boolean
}

const everySchema = Schema.union([
  Schema.const('once').description('仅一次'),
  Schema.const('sec').description('每秒'),
  Schema.const('min').description('每分钟'),
  Schema.const('hour').description('每小时'),
  Schema.const('day').description('每天'),
  Schema.const('weekday').description('每周一到周五'),
  Schema.const('saturday').description('每周一到周六'),
  Schema.const('week').description('每周'),
  Schema.const('month').description('每月'),
  Schema.const('year').description('每年'),
]).role('radio').default('once')

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    enablescheduletable: Schema.boolean().default(false).description('是否启用定时任务'),
  }).description('定时设置'),
  Schema.object({
    scheduletable: Schema.array(Schema.object({
      botId: Schema.string().description('机器人ID'),
      channelId: Schema.string().description('频道ID'),
      iscommand: Schema.boolean().default(true).description('指令'),
      executecommand: Schema.string().description('内容'),
      scheduletime: Schema.string().role('datetime').description('开始时间'),
      every: everySchema.description('执行周期'),
      cycletime: Schema.number().min(1).default(1).description('间隔倍数'),
    })).role('table').description('定时任务表').default([]),
  }),
  Schema.object({
    loggerinfo: Schema.boolean().default(false).description('调试日志开关').experimental(),
  }).description('调试设置'),
])
