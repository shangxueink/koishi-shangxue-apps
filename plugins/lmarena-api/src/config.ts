import { Schema } from "koishi"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

export type ApiMode = "auto" | "edits" | "generations"

export interface Command {
  name: string
  prompt: string
  enabled: boolean
}

export interface Config {
  basename: string
  parentCommandEnabled: boolean
  apiMode: ApiMode
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
  extraBodyCompat: boolean
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    basename: Schema.string().default("imagen").description("父级指令名称"),
    parentCommandEnabled: Schema.boolean().default(true).description("启用父级指令交互绘图：可交互输入图片和自定义提示词"),
    waitTimeout: Schema.number().default(60).max(200).min(10).step(1).description("等待用户输入图片的最大时间（秒）"),
  }).description("基础配置"),

  Schema.object({
    apiMode: Schema.union(["auto", "edits", "generations"] as const).default("auto").description("接口协议：auto 按 URL 自动识别，edits 使用 multipart，generations 使用 JSON body"),
    apiUrl: Schema.string().default("https://cn.happyapi.org/v1/images/edits").role("link").description("API 服务器地址<br>edits 示例：https://cn.happyapi.org/v1/images/edits<br>generations 示例：https://apihub.agnes-ai.com/v1/images/generations<br>参考文档：https://docs-model.skyengine.com.cn/api-reference/examples/images/openai-image"),
    apiKey: Schema.string().role("secret").required().description("API 密钥"),
    apiParams: Schema.dict(String).role('table').description("API请求参数<br>POST请求的body参数<br>generations 模式下 image 占位符会替换为 base64 字符串数组").default({
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
    extraBodyCompat: Schema.boolean().default(false).description("extra_body字段兼容模式<br>开启后 generations 请求会把 image / response_format 放到 extra_body 中"),
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
