// UN-1 demo 指令交互插件
// 顶部常量可自行调整，无需改动下方逻辑

// 指令前缀（在 Koishi 中可通过配置修改，此处仅作参考）
const COMMAND_NAME = 'demo'
// 是否输出调试日志
const DEBUG = true
// 打招呼的默认称呼
const DEFAULT_NAME = '旅行者'
// 彩蛋消息触发词（忽略大小写）
const EGG_WORD = '彩蛋'
// 定时器间隔（毫秒），用于演示定时任务
const TIMER_INTERVAL = 60000

export function apply(ctx: Context) {
  // ---------- 基础指令：打招呼 ----------
  ctx.command(`greet [name:string]`, '打个招呼')
    .alias('hi')
    .action(({ session }, name) => {
      const target = name || DEFAULT_NAME
      const reply = `你好呀，${target}！欢迎来到 Koishi 的 demo 世界 🌍`
      if (DEBUG) ctx.logger('demo').info(`greet 被调用，参数: ${target}`)
      return reply
    })

  // ---------- 复读机：参数校验与错误提示 ----------
  ctx.command(`echo <text:text>`, '复读机')
    .option('times', '-t <times:number>  重复次数', { fallback: 1 })
    .action(({ session, options }, text) => {
      const times = Math.max(1, Math.min(options.times, 5))
      if (DEBUG) ctx.logger('demo').info(`echo 被调用，文本: ${text}, 次数: ${times}`)
      return Array.from({ length: times }, () => text).join('\n')
    })

  // ---------- 计数器：演示会话状态 ----------
  const counter = new Map<string, number>()
  ctx.command('count', '计数器（每个会话独立计数）')
    .action(({ session }) => {
      const key = session.userId
      const current = (counter.get(key) ?? 0) + 1
      counter.set(key, current)
      if (DEBUG) ctx.logger('demo').info(`count 被调用，用户 ${key} 已计数 ${current} 次`)
      return `这是你第 ${current} 次使用 count 指令啦！`
    })

  // ---------- 子指令演示：随机骰子 ----------
  ctx.command('dice', '掷骰子')
    .subcommand('roll', '掷一枚六面骰')
    .subcommand('multi <n:number>', '一次掷多枚骰子')
    .action(({ session }) => {
      return `掷出了 ${Math.floor(Math.random() * 6) + 1} 点 🎲`
    })

  ctx.command('dice.roll', '掷一枚六面骰')
    .action(() => `掷出了 ${Math.floor(Math.random() * 6) + 1} 点 🎲`)

  ctx.command('dice.multi <n:number>', '一次掷多枚骰子')
    .action(({ session }, n) => {
      const times = Math.max(1, Math.min(Math.floor(n), 10))
      const results = Array.from({ length: times }, () => Math.floor(Math.random() * 6) + 1)
      const total = results.reduce((sum, v) => sum + v, 0)
      return `掷出 ${results.join('、')}，合计 ${total} 点 🎲`
    })

  // ---------- 彩蛋：指令外的兜底回复 ----------
  ctx.middleware(async (session, next) => {
    const text = session.content.trim()
    if (text.toLowerCase().includes(EGG_WORD.toLowerCase())) {
      if (DEBUG) ctx.logger('demo').info(`触发彩蛋: ${text}`)
      return '🎉 恭喜你发现了隐藏彩蛋！'
    }
    return next()
  }, true)

  // ---------- 定时任务演示 ----------
  const timer = ctx.setInterval(() => {
    if (DEBUG) ctx.logger('demo').info(`定时任务触发（每 ${TIMER_INTERVAL / 1000} 秒一次）`)
  }, TIMER_INTERVAL)

  // ---------- 生命周期：释放资源 ----------
  ctx.on('dispose', () => {
    ctx.clearInterval(timer)
    if (DEBUG) ctx.logger('demo').info('UN-1 demo 插件已卸载')
  })
}
