import { Schema } from 'koishi'

export interface DurationTip {
  tipcontent: string
  tipanalysis: boolean
}

export type DurationTipConfig = 'return' | DurationTip | null

export interface Config {
  demand: boolean
  timeout?: number
  point?: [number, number]
  enable?: boolean
  enablebilianalysis: boolean
  waitTip_Switch: string | null
  videoParseMode: ('link' | 'card')[]
  videoParseComponents: ('text' | 'link' | 'log' | 'video')[]
  BVnumberParsing: boolean
  MinimumTimeInterval: number
  Minimumduration: number
  Minimumduration_tip: DurationTipConfig
  Maximumduration: number
  Maximumduration_tip: DurationTipConfig
  MaximumFileSizeMB: number
  bVideo_area: string
  bVideoShowLink: boolean
  bVideoShowIntroductionTofixed: number
  isfigure: boolean
  filebuffer: boolean
  bufferDelay: number
  middleware: boolean
  preventSingleUserListAttack: boolean
  userAgent: string
  pageclose: boolean
  loggerinfo: boolean
  loggerinfofulljson: boolean
  parseLimit: number
  useNumeral: boolean
  showError: boolean
  bVideoIDPreference: 'bv' | 'av'
}

const durationTip = () => Schema.union([
  Schema.const(null).description('不返回文字提示'),
  Schema.const('return').description('直接结束解析'),
  Schema.object({
    tipcontent: Schema.string().description('文字提示内容'),
    tipanalysis: Schema.boolean().default(true).description('是否附带图文解析'),
  }),
]).description('时长不合规时的处理方式')

export const Config = Schema.object({
  demand: Schema.boolean().default(true).description('开启 B 站点播指令'),
  timeout: Schema.number().default(60).description('点播等待用户输入的超时时间（秒）'),
  point: Schema.tuple([Number, Number]).default([50, 50]).description('搜索结果序号位置'),
  enable: Schema.boolean().default(true).description('点播选择后是否自动解析'),

  enablebilianalysis: Schema.boolean().default(true).description('开启 B 站链接解析'),
  waitTip_Switch: Schema.union([
    Schema.const(null).description('不发送等待提示'),
    Schema.string().description('发送等待提示'),
  ]).default(null).description('解析前是否先发送等待文字'),
  videoParseMode: Schema.array(Schema.union([
    Schema.const('link').description('解析文本链接'),
    Schema.const('card').description('解析 QQ 分享卡片'),
  ])).default(['link', 'card']).role('checkbox').description('允许触发的来源'),
  videoParseComponents: Schema.array(Schema.union([
    Schema.const('log').description('记录调试日志'),
    Schema.const('text').description('返回图文信息'),
    Schema.const('link').description('返回网页播放器链接'),
    Schema.const('video').description('兼容旧配置，按 link 处理'),
  ])).default(['text', 'link']).role('checkbox')
    .description('返回内容，按数组顺序合并为一条消息'),
  BVnumberParsing: Schema.boolean().default(true).description('允许解析独立的 BV / AV 号'),

  MinimumTimeInterval: Schema.number().default(180).min(1).description('同一链接最小处理间隔（秒）'),
  Minimumduration: Schema.number().default(0).min(0).description('允许的最小视频时长（分钟）'),
  Minimumduration_tip: durationTip().default(null),
  Maximumduration: Schema.number().default(25).min(1).description('允许的最大视频时长（分钟）'),
  Maximumduration_tip: durationTip().default(null),
  MaximumFileSizeMB: Schema.number().default(50).min(0).max(200).description('旧版文件大小限制，新版本不再下载视频'),

  bVideo_area: Schema.string().role('textarea', { rows: [8, 16] })
    .default('${标题} ${tab} ${UP主}\n${简介}\n点赞：${点赞} ${tab} 投币：${投币}\n收藏：${收藏} ${tab} 转发：${转发}\n观看：${观看} ${tab} 弹幕：${弹幕}\n${~~~}\n${封面}')
    .description('图文解析模板，${~~~} 现在只表示换行，不再拆成多条消息'),
  bVideoShowLink: Schema.boolean().default(false).description('在图文末尾附加视频网页链接'),
  bVideoShowIntroductionTofixed: Schema.number().default(50).description('简介最大字符长度'),
  bVideoIDPreference: Schema.union([
    Schema.const('bv').description('BV 号'),
    Schema.const('av').description('AV 号'),
  ]).default('bv').hidden(),

  isfigure: Schema.boolean().default(false).description('旧版合并转发开关，新版本不再使用'),
  filebuffer: Schema.boolean().default(true).description('旧版视频缓冲开关，新版本不再使用'),
  bufferDelay: Schema.number().default(5).min(0).max(30).description('旧版缓冲延迟，新版本不再使用'),
  middleware: Schema.boolean().default(false).description('是否作为前置中间件注册'),
  preventSingleUserListAttack: Schema.boolean().default(true).description('单用户解析频率限制'),
  userAgent: Schema.string().default('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
    .description('请求 B 站 API 时使用的 User-Agent'),

  parseLimit: Schema.number().default(3).hidden().description('单条消息最多解析链接数'),
  useNumeral: Schema.boolean().default(true).hidden().description('大数字是否缩写'),
  showError: Schema.boolean().default(false).hidden().description('解析失败时是否提示'),
  pageclose: Schema.boolean().default(true).experimental().description('点播截图后自动关闭页面'),
  loggerinfo: Schema.boolean().default(false).description('开启调试日志'),
  loggerinfofulljson: Schema.boolean().default(false).description('输出完整消息结构日志'),
})

