import { Schema } from 'koishi'

export interface Config {
  /** 需要备份的文件或目录，相对 ctx.baseDir */
  BackupList: string[]
  /** 备份存储目录，可填绝对路径或相对 ctx.baseDir 的路径 */
  areapath: string
  /** 固定备份目录名，放在 areapath 下 */
  ParentFolderName: string
  /** 遇到不存在的源路径时是否跳过 */
  Skip_nonexistent_films: boolean
  /** 是否使用 cron 自动备份 */
  auto_cron: boolean
  /** cron 表达式 */
  cronvalue: string
  /** 调试日志开关 */
  loggerinfo: boolean
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
    BackupList: Schema.array(backupItem)
      .role('table')
      .default(['data/koishi.db'])
      .description('需要备份的文件或目录（相对 koishi 根目录）<br>支持数据库文件、普通文件和目录'),
  }).description('备份内容'),

  Schema.object({
    areapath: Schema.path({ filters: ['directory'], allowCreate: true })
      .default('data/backup')
      .description('本地备份存储目录，可填绝对路径或相对 koishi 根目录的路径'),
    ParentFolderName: Schema.string()
      .default('instance_backup')
      .description('固定备份目录名称，会创建在 areapath 下'),
  }).description('本地备份'),

  Schema.object({
    Skip_nonexistent_films: Schema.boolean()
      .default(false)
      .description('自动跳过不存在的文件或目录；关闭时遇到缺失路径会视为备份失败'),
  }).description('进阶设置'),

  Schema.object({
    auto_cron: Schema.boolean()
      .default(false)
      .description('启用后使用 cron 服务定时备份，需要已安装并启用 cron 插件'),
    cronvalue: Schema.string()
      .default('0 0 * * *')
      .description('cron 表达式，默认每天 0 点执行'),
  }).description('定时备份'),

  Schema.object({
    loggerinfo: Schema.boolean()
      .default(false)
      .description('输出详细备份调试日志'),
  }).description('调试设置'),
]) as Schema<Config>
