import { Context } from "koishi"
import { } from "koishi-plugin-puppeteer"

// 统一创建 puppeteer 页面，并应用 API 超时时间
export async function createPage(ctx: Context, timeoutSeconds: number) {
  const page = await ctx.puppeteer.page()
  const timeout = timeoutSeconds * 1000
  page.setDefaultTimeout(timeout)
  page.setDefaultNavigationTimeout(timeout)
  return page
}
