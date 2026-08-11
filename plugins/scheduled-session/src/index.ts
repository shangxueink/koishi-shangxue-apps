import { Context } from 'koishi'

import { Config } from './config'
import type { Config as PluginConfig } from './config'
import { createLogger } from './logger'
import { registerScheduler } from './scheduler'

export const name = 'scheduled-session'
export const reusable = false
export const filter = false
export const usage = `
---
### 定时任务配置说明

- \`enablescheduletable\` 开启后，插件会在启动时创建定时任务。
- 每条任务由 \`scheduletable\` 中的一行配置表示。
- \`botId\`：执行任务使用的机器人 ID。
- \`channelId\`：发送目标频道 ID。
- \`executecommand\`：要执行的指令名称；当 \`iscommand=false\` 时，作为消息内容直接发送。
- \`scheduletime\`：首次执行时间。
- \`every\`：执行周期；
- \`cycletime\`：间隔倍数，例如 \`every=hour\`、\`cycletime=3\` 表示每 3 小时执行一次。
- 使用 \`every=once\` 时只执行一次，如果时间已过会自动跳过。

---
`
export { Config }
export type { Config as PluginConfig } from './config'

export function apply(ctx: Context, config: PluginConfig) {
  const logger = createLogger(ctx, name, config.loggerinfo)
  const disposeScheduler = registerScheduler(ctx, config, logger)

  ctx.on('dispose', () => {
    disposeScheduler()
  })
}
