import { Schema } from "koishi"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

export interface Command {
  name: string
  prompt: string
  enabled: boolean
}

export interface Config {
  basename: string
  parentCommandEnabled: boolean
  apiUrl: string
  apiKey: string
  waitTimeout: number
  apiParams: Record<string, string>
  customCommands: Command[]
  loggerinfo: boolean
  monetaryCommands: boolean
  currency: string
  monetaryCost: number
  commandAuthority: number
  agnesMode: boolean
  agnesAPIkey: string | null
  disableWaitingTips: boolean
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    basename: Schema.string().default("imagen").description("父级指令名称"),
    parentCommandEnabled: Schema.boolean().default(true).description("启用父级指令交互绘图：可交互输入图片和自定义提示词"),
    waitTimeout: Schema.number().default(60).max(200).min(10).step(1).description("等待用户输入图片的最大时间（秒）"),
  }).description("基础配置"),

  Schema.object({
    apiUrl: Schema.string().default("https://moyuu.cc/v1").role("link").description("API 服务器地址<br>填入地址：`https://域名/v1`，需要兼容openai协议。"),
    apiKey: Schema.string().role("secret").default("").description("API 密钥"),
    apiParams: Schema.dict(String).role('table').description("API请求参数<br>POST请求的body参数").default({
      "model": "gpt-image-2",
      "image": "{{inputimage}}",
      "prompt": "{{prompt}}",
      "size": "1024x1024",
      "n": "1",
      "type": "normal",
      "response_format": "b64_json"
    }),
  }).description("API配置"),

  Schema.object({
    commandAuthority: Schema.number().default(1).max(5).min(0).description("指令所需权限"),
    disableWaitingTips: Schema.boolean().default(false).description("关闭等待提示语<br>开启后不再发送“正在处理图片，请稍候...”等等待提示，报错提示仍然保留"),
    monetaryCommands: Schema.boolean().default(false).description("调用指令时，消耗货币（需要monetary服务）"),
  }).description("进阶指令功能配置"),
  Schema.union([
    Schema.object({
      monetaryCommands: Schema.const(true).required(),
      currency: Schema.string().default('default').description('monetary 数据库的 currency 字段名称（货币种类）<br>一般保持默认即可'),
      monetaryCost: Schema.number().default(-1000).max(0).description("每次调用指令的货币变化数量==**（负数）**（-1000代表消耗1000个货币）"),
    }),
    Schema.object({
      monetaryCommands: Schema.const(false),
    }),
  ]),

  Schema.object({
    customCommands: Schema.array(
      Schema.object({
        enabled: Schema.boolean().default(true).description("<hr><hr><hr><hr><hr><br>是否启用该指令"),
        name: Schema.string().required().description("指令名称"),
        prompt: Schema.string().role("textarea", { rows: [6, 4] }).description("该指令对应的提示词"),
      })).collapse().description("快捷画图 指令配置<br>**超级长的配置项，慎点！**").default(loadDefaultCommands()),
  }).description("完整指令配置"),

  Schema.object({
    agnesMode: Schema.boolean().default(false).description("是否一键开启 apihub.agnes-ai.com 站点模式<br>开启后忽略上方 API 地址、密钥、模型和请求参数，固定使用 agnes 接口"),
    agnesAPIkey: Schema.string().role("secret").default(null).description("agnes 专用 API Key（留空使用内置 Key）"),
    loggerinfo: Schema.boolean().default(false).description("日志调试模式"),
  }).description("调试设置"),
]) as Schema<Config>

function loadDefaultCommands(): Command[] {
  try {
    const configPath = resolve(__dirname, '../data/command.json')
    const configData = readFileSync(configPath, 'utf-8')
    return JSON.parse(configData)
  } catch {
    return []
  }
}
