import { Schema } from 'koishi'

export type TriggerMode = 'command' | 'schedule' | 'both'

export interface Config {
  /** 备份触发方式 */
  triggerMode: TriggerMode
  /** 需要备份的文件或目录，相对 ctx.baseDir */
  backupList: string[]
  /** 备份存储目录，可填绝对路径或相对 ctx.baseDir 的路径 */
  areapath: string
  /** 固定备份目录名，放在 areapath 下 */
  ParentFolderName: string
  /** 遇到不存在的源路径时是否跳过 */
  skip_nonexistent_films: boolean
  /** cron 表达式 */
  cronvalue: string
  /** 调试日志开关 */
  loggerinfo: boolean
}

export function isCommandTrigger(mode: TriggerMode): boolean {
  return mode === 'command' || mode === 'both'
}

export function isScheduleTrigger(mode: TriggerMode): boolean {
  return mode === 'schedule' || mode === 'both'
}

export const name = 'instance-backup'

export const inject = {
  optional: ['cron'],
}

export const usage = `
<p>自动备份 Koishi 实例中的指定文件或目录，并使用本地 Git 仓库记录版本历史。</p>
<p>检测到 Git 时会在固定备份目录中初始化本地仓库；未检测到 Git 时直接覆盖备份文件。</p>
`

const backupItem = Schema.path({
  filters: ['file', 'directory'],
})

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    triggerMode: Schema.union([
      Schema.const('command').description('指令触发'),
      Schema.const('schedule').description('定时触发'),
      Schema.const('both').description('指令加定时触发'),
    ])
      .role('radio')
      .default('command')
      .description('选择备份的触发方式'),
    cronvalue: Schema.string()
      .default('0 5 * * *')
      .description('cron 表达式，默认每天凌晨 5 点执行；`定时触发`或`指令加定时触发`时生效<br>需要cron服务支持，未检测到cron服务时会输出警告'),
  }).description('触发方式'),

  Schema.object({
    backupList: Schema.array(backupItem)
      .role('table')
      .default(['koishi.yml', 'package.json', 'data/koishi.db', 'data/database'])
      .description('需要备份的文件或目录（相对 koishi 根目录）<br>不存在的路径会自动跳过<br>选择文件夹时会跳过 node_modules、.git、dist、build 等常见冗余目录'),
  }).description('备份对象'),

  Schema.object({
    areapath: Schema.path({ filters: ['directory'], allowCreate: true })
      .default('data/backup')
      .description('本地备份存储目录，可填绝对路径或相对 koishi 根目录的路径'),
    ParentFolderName: Schema.string()
      .default('instance_backup')
      .description('固定备份目录名称，会创建在 areapath 下'),
  }).description('备份到本地'),

  Schema.object({
    skip_nonexistent_films: Schema.boolean()
      .default(true)
      .description('自动跳过不存在的文件或目录；关闭时遇到缺失路径会视为备份失败'),
  }).description('进阶设置'),

  Schema.object({
    loggerinfo: Schema.boolean()
      .default(false)
      .description('输出详细备份调试日志'),
  }).description('调试设置'),
]) as Schema<Config>
