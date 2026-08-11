import { Bot, Context, Universal } from 'koishi'

import type { Config, ScheduleTask } from './config'
import type { PluginLogger } from './logger'
import { createScheduledSession } from './session'

type TimerDispose = () => void

function findBot(ctx: Context, task: ScheduleTask): Bot<Context> | undefined {
  return Object.values(ctx.bots).find((bot) => {
    return bot.selfId === task.botId || bot.user?.id === task.botId
  })
}

function isTaskForBot(task: ScheduleTask, bot: Bot<Context>): boolean {
  return task.botId === bot.selfId || task.botId === bot.user?.id
}

function getNextTime(task: ScheduleTask, now: Date): Date {
  const normalizedTime = task.scheduletime.replace(/\//g, '-')
  const [, timePart = '00:00:00'] = normalizedTime.split(' ')
  const [hours = 0, minutes = 0, seconds = 0] = timePart.split(':').map(Number)

  let baseTime = new Date(normalizedTime)
  if (Number.isNaN(baseTime.getTime())) {
    baseTime = new Date(now)
    baseTime.setHours(hours, minutes, seconds, 0)
  }

  if (task.every === 'once') {
    return baseTime
  }

  const cycleTime = task.cycletime || 1
  let nextTime = new Date(baseTime)

  const advanceOneDay = () => {
    nextTime.setDate(nextTime.getDate() + 1)
    nextTime.setHours(hours, minutes, seconds, 0)
  }

  const isAllowedDay = () => {
    const day = nextTime.getDay()
    if (task.every === 'weekday') return day >= 1 && day <= 5
    if (task.every === 'saturday') return day >= 1 && day <= 6
    return true
  }

  while (nextTime.getTime() <= now.getTime()) {
    switch (task.every) {
      case 'sec':
        nextTime = new Date(nextTime.getTime() + cycleTime * 1000)
        break
      case 'min':
        nextTime = new Date(nextTime.getTime() + cycleTime * 60000)
        break
      case 'hour':
        nextTime = new Date(nextTime.getTime() + cycleTime * 3600000)
        break
      case 'day':
        nextTime.setDate(nextTime.getDate() + cycleTime)
        nextTime.setHours(hours, minutes, seconds, 0)
        break
      case 'weekday':
      case 'saturday':
        for (let i = 0; i < cycleTime; i++) {
          advanceOneDay()
          while (!isAllowedDay()) {
            advanceOneDay()
          }
        }
        break
      case 'week':
        nextTime.setDate(nextTime.getDate() + cycleTime * 7)
        break
      case 'month': {
        const current = nextTime.getMonth() + cycleTime
        nextTime.setFullYear(nextTime.getFullYear() + Math.floor(current / 12))
        nextTime.setMonth(current % 12)
        break
      }
      case 'year':
        nextTime.setFullYear(nextTime.getFullYear() + cycleTime)
        break
    }
  }

  return nextTime
}

async function executeTask(ctx: Context, bot: Bot<Context>, task: ScheduleTask, index: number, logger: PluginLogger) {
  try {
    const session = createScheduledSession(bot, task)
    ctx.emit('message-created', session)

    if (task.iscommand) {
      await session.execute(task.executecommand)
      logger.debug(`[任务 ${index}] 已执行指令: ${task.executecommand}`)
    } else {
      await session.send(task.executecommand)
      logger.debug(`[任务 ${index}] 已发送内容: ${task.executecommand}`)
    }
  } catch (error) {
    logger.error(`[任务 ${index}] 定时任务执行失败`, error)
  }
}

export function registerScheduler(ctx: Context, config: Config, logger: PluginLogger): () => void {
  let disposed = false
  const timers = new Map<string, TimerDispose>()
  const running = new Set<string>()
  const completed = new Set<string>()
  const pendingLogin = new Set<string>()

  const disposeAll = () => {
    if (disposed) return
    disposed = true
    for (const dispose of timers.values()) dispose()
    timers.clear()
    running.clear()
    completed.clear()
    pendingLogin.clear()
  }

  if (!config.enablescheduletable || !config.scheduletable?.length) {
    return disposeAll
  }

  const getTaskKey = (task: ScheduleTask, index: number): string => {
    return `${task.botId}:${task.channelId}:${task.every}:${task.executecommand}:${index}`
  }

  const scheduleTask = (task: ScheduleTask, index: number) => {
    if (disposed) return

    const key = getTaskKey(task, index)
    if (timers.has(key) || running.has(key) || completed.has(key)) return

    const bot = findBot(ctx, task)
    if (!bot || bot.status !== Universal.Status.ONLINE) {
      logger.warn(`[任务 ${index}] 机器人离线或未找到: ${task.botId}`)
      return
    }

    const now = new Date()
    const nextTime = getNextTime(task, now)
    if (Number.isNaN(nextTime.getTime())) {
      logger.error(`[任务 ${index}] 时间解析失败: ${task.scheduletime}`)
      return
    }

    if (task.every === 'once' && nextTime.getTime() <= now.getTime()) {
      completed.add(key)
      logger.warn(`[任务 ${index}] 一次性任务时间已过，跳过: ${task.scheduletime}`)
      return
    }

    const delay = Math.max(nextTime.getTime() - now.getTime(), 0)
    logger.debug(`[任务 ${index}] 已安排执行时间: ${nextTime.toLocaleString()}`)

    const disposeTimer = ctx.setTimeout(() => {
      timers.delete(key)
      if (disposed) return

      running.add(key)
      void executeTask(ctx, bot, task, index, logger).finally(() => {
        running.delete(key)
        if (disposed) return

        if (task.every === 'once') {
          completed.add(key)
          return
        }

        const next = getNextTime(task, new Date())
        logger.debug(`[任务 ${index}] 已安排下一次执行时间: ${next.toLocaleString()}`)
        scheduleTask(task, index)
      })
    }, delay)

    timers.set(key, disposeTimer)
  }

  ctx.on('ready', () => {
    logger.info('定时任务插件已启动')
    const table = config.scheduletable
    if (!table) return
    for (const [index, task] of table.entries()) {
      scheduleTask(task, index)
    }
  })

  ctx.on('login-added', (session) => {
    if (disposed || !config.scheduletable) return

    const bot = session.bot
    const tasks = config.scheduletable
      .map((task, index) => ({ task, index }))
      .filter(({ task }) => isTaskForBot(task, bot))

    if (tasks.length === 0) return

    const loginKey = bot.sid
    if (pendingLogin.has(loginKey)) return
    pendingLogin.add(loginKey)

    // 登录事件先于 start 完成，延迟后再创建定时器
    const dispose = ctx.setTimeout(() => {
      timers.delete(`login:${loginKey}`)
      pendingLogin.delete(loginKey)
      if (disposed) return
      for (const { task, index } of tasks) {
        scheduleTask(task, index)
      }
    }, 5000)
    timers.set(`login:${loginKey}`, dispose)
  })

  return disposeAll
}
