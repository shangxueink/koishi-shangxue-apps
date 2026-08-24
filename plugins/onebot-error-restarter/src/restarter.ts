import {} from '@koishijs/loader'
import { Bot, Context, Universal } from 'koishi'

import type { Config } from './config'
import type { DebugLogger } from './logger'

const TARGET_PATTERN = /_request is not a function/

function isTargetError(error: unknown) {
  return error instanceof Error && TARGET_PATTERN.test(error.message)
}

function isOneBot(bot: Bot) {
  return bot.platform === 'onebot'
}

export function registerRestarter(ctx: Context, config: Config, log: DebugLogger) {
  const pending = new Map<string, () => void>()
  const lastRestart = new Map<string, number>()

  const scheduleRestart = (bot: Bot) => {
    if (!isOneBot(bot) || pending.has(bot.sid)) return

    const now = Date.now()
    if (now - (lastRestart.get(bot.sid) || 0) < config.cooldown) return

    log('detected broken OneBot request state, scheduling restart', bot.sid)
    const dispose = ctx.setTimeout(() => {
      pending.delete(bot.sid)
      lastRestart.set(bot.sid, Date.now())

      log('restarting Koishi', bot.sid)
      try {
        ctx.loader.fullReload()
      } catch (error) {
        log('failed to restart Koishi', error)
      }
    }, config.restartDelay)
    pending.set(bot.sid, dispose)
  }

  const originalSendMessage = Bot.prototype.sendMessage
  const wrappedSendMessage = async function (this: Bot, ...args: Parameters<Bot['sendMessage']>) {
    try {
      return await originalSendMessage.apply(this, args)
    } catch (error) {
      if (isTargetError(error)) scheduleRestart(this)
      throw error
    }
  }
  Bot.prototype.sendMessage = wrappedSendMessage

  const check = () => {
    for (const bot of ctx.bots) {
      if (!isOneBot(bot) || bot.status !== Universal.Status.ONLINE) continue
      if (typeof bot.internal?._request !== 'function') scheduleRestart(bot)
    }
  }
  ctx.setInterval(check, config.checkInterval)
  check()

  ctx.on('dispose', () => {
    if (Bot.prototype.sendMessage === wrappedSendMessage) {
      Bot.prototype.sendMessage = originalSendMessage
    }
    pending.clear()
    lastRestart.clear()
  })
}
