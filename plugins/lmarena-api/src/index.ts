import { Context } from "koishi"
import { Config, type Config as ConfigType } from "./config"
import { createAppLogger } from "./logger"
import { registerCommands } from "./commands"

export const name = "lmarena-api"

export const inject = {
  required: ["http", "logger", "i18n"],
  optional: ["database", "monetary"],
}

export const usage = `
---

通过配置API，调用 {{URL}}/v1/images/edits 接口实现手办化插件的功能。

推荐模型：\`gpt-image-2\`

配置项里的默认站点为： https://moyuu.cc/ ，欢迎注册使用喵~~

---

部分站点需要手动编辑配置项的请求参数，**尤其是接口、模型！**

---

可选服务：monetary

---
`

export { Config }

export function apply(ctx: Context, config: ConfigType) {
  // 统一创建日志对象，调试开关只在这里读取
  const log = createAppLogger(ctx, config.loggerinfo)
  registerCommands(ctx, config, log)
}
