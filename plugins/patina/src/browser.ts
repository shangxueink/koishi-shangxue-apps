import { Context } from 'koishi'
import { } from 'koishi-plugin-puppeteer'

// 统一创建浏览器页面，并应用配置里的超时时间（秒）
export async function createPage(ctx: Context, timeoutSeconds: number) {
  const page = await ctx.puppeteer.page()
  const timeout = timeoutSeconds * 1000
  page.setDefaultTimeout(timeout)
  page.setDefaultNavigationTimeout(timeout)
  return page
}
