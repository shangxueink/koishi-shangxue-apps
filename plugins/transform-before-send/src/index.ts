import { type Context } from 'koishi'

import { Config } from './config'
import { createPluginLogger } from './logger'
import { transformBeforeSend } from './transform'

export const name = 'transform-before-send'
export const reusable = false
export const filter = false
export const inject = {
  optional: ['assets'],
}
export const usage = `
---

在消息发送前 把本地文件引用 转换为跨实例可访问的内容，适用于消息平台与 Koishi 插件运行实例不在同一台机器的情况。

推荐使用 assets-local 处理本地文件，若不使用 assets 服务，则会将本地文件转换为 base64 编码。

---`;

export { Config }

export function apply(ctx: Context, config: Config) {
  const logger = createPluginLogger(ctx, config)

  // ctx.on 会在插件卸载时自动注销，无需额外维护 dispose
  ctx.on('before-send', (session) => transformBeforeSend(ctx, session, config, logger))
}
