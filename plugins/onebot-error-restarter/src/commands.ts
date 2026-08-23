import { Context } from 'koishi'

import type { Config } from './config'

export function registerTestCommand(ctx: Context, config: Config) {
  if (!config.testCommand) return

  // 手动模拟 onebot 适配器失效时的 session error
  ctx.command('onebot-error.test', '模拟 OneBot `_request is not a function` 错误')
    .action(async ({ session }) => {
      if (session.bot.platform !== 'onebot') return '该指令仅适用于 OneBot 会话'
      if (!session.bot.internal) return '当前 Bot 没有 internal 实例'

      const originalRequest = session.bot.internal._request
      delete session.bot.internal._request
      try {
        await session.send('onebot-error.test')
      } finally {
        if (originalRequest) {
          session.bot.internal._request = originalRequest
        } else {
          delete session.bot.internal._request
        }
      }
      return '已模拟 OneBot 请求错误'
    })
}
