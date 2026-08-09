import { Schema } from 'koishi'

export interface Config {
  /** 本地文件转换方式 */
  mode: 'base64' | 'assets'
  /** 是否输出调试日志 */
  loggerinfo: boolean
}

export const Config: Schema<Config> = Schema.object({
  mode: Schema.union(['base64', 'assets']).default('base64')
    .description('base64：直接编码进消息体；<br>assets：转存为公网链接'),
  loggerinfo: Schema.boolean().default(false).description('输出调试日志').experimental(),
})
