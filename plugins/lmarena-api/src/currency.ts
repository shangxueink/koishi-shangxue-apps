import { Context } from "koishi"
import {} from 'koishi-plugin-monetary'
import type { AppLogger } from "./logger"

// 查询用户货币余额，异常时返回 0
export async function getUserCurrency(ctx: Context, uid: string, currency: string, log: AppLogger): Promise<number> {
  try {
    const numericUserId = Number(uid)
    const [data] = await ctx.database.get('monetary', {
      uid: numericUserId,
      currency,
    }, ['value'])

    return data ? data.value : 0
  } catch (error) {
    log.error(`获取用户 ${uid} 的货币时出错:`, error)
    return 0
  }
}

// 增减用户货币，正数为增加、负数为扣除
export async function updateUserCurrency(ctx: Context, uid: string, amount: number, currency: string, log: AppLogger): Promise<string> {
  try {
    const numericUserId = Number(uid)
    if (amount > 0) {
      await ctx.monetary.gain(numericUserId, amount, currency)
      log.info(`为用户 ${uid} 增加了 ${amount} ${currency}`)
    } else if (amount < 0) {
      await ctx.monetary.cost(numericUserId, -amount, currency)
      log.info(`为用户 ${uid} 减少了 ${-amount} ${currency}`)
    }

    return `用户 ${uid} 成功更新了 ${Math.abs(amount)} ${currency}`
  } catch (error) {
    log.error(`更新用户 ${uid} 的货币时出错:`, error)
    return `更新用户 ${uid} 的货币时出现问题。`
  }
}
