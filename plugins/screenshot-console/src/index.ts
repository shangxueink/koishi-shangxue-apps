import { Context, Schema, h } from 'koishi'
import { } from 'koishi-plugin-puppeteer'
import { } from '@koishijs/plugin-server'

declare module 'koishi' {
  interface Tables {
    screenshot_console_bind: {
      id: string
      email: string
    }
  }
}

export const name = 'screenshot-console'
export const inject = ['puppeteer', 'database', 'server']

export const usage = `
<p>指令「插件市场搜索」支持多关键词搜索。例如，输入的指令：</p>
<p><code>插件市场搜索 按下载量 email:1919892171@qq.com</code></p>
`

export interface Config {
  accessPort: number
  searchMappings: {
    key: string
    value: string
  }[]
  enableViewLog: boolean
  autoLogin: boolean
  loginUsername: string
  loginPassword: string
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    accessPort: Schema.union([
      Schema.const(0).description('自动检测'),
      Schema.natural().description('自定义').default(5140)
    ]).description('访问的控制台端口').default(0),
    searchMappings: Schema
      .array(Schema.object({
        key: Schema.string().description('需转换'),
        value: Schema.string().description('转换后'),
      }))
      .role('table')
      .description('「插件市场搜索」关键词映射')
      .default([
        { key: '综合', value: 'sort:default' },
        { key: '按评分', value: 'sort:rating' },
        { key: '按下载量', value: 'sort:download' },
        { key: '按创建时间', value: 'sort:created' },
        { key: '按更新时间', value: 'sort:updated' },
        { key: '近期新增', value: 'created:>{seven_days_ago}' },
      ]),
    enableViewLog: Schema.boolean().description('是否启用「查看最近日志」指令').default(false),
    autoLogin: Schema.boolean().description('是否在 auth 开启时自动登录').default(false),
  }),
  Schema.union([
    Schema.object({
      autoLogin: Schema.const(true).required(),
      loginUsername: Schema.string().description('登录用户名').default('admin'),
      loginPassword: Schema.string().role('secret').description('登录密码').default(''),
    }),
    Schema.object({}) as any
  ])
])

export function apply(ctx: Context, cfg: Config) {
  ctx.model.extend('screenshot_console_bind', {
    id: 'string',
    email: 'string'
  })

  ctx.command('market-search <keyword:text>', '插件市场截图')
    .alias('插件市场搜索')
    .action(async ({ session }, keyword) => {
      const elements = h.select(keyword || '', 'text, at')
      if (elements.length === 0) return '请输入搜索关键词。'

      const keywords: string[] = []
      for (const v of elements) {
        if (v.type === 'at') {
          const match = await ctx.database.get('screenshot_console_bind', {
            id: `${session.platform}:${session.guildId}:${v.attrs.id}`
          })
          if (match.length === 0) continue
          keywords.push('email:' + match[0].email)
          continue
        }
        keywords.push(...v.attrs.content.split(' '))
      }

      const searchParams: string[] = []
      for (const item of keywords) {
        if (!item) continue
        const mapped = cfg.searchMappings.find(m => m.key === item)?.value
        if (mapped?.includes?.('{seven_days_ago}')) {
          const date = new Date()
          date.setDate(date.getDate() - 7)
          const item = mapped.replaceAll('{seven_days_ago}', date.toISOString())
          searchParams.push(encodeURIComponent(item))
        } else {
          searchParams.push(encodeURIComponent(mapped ?? item))
        }
      }

      const port = cfg.accessPort || ctx.server.port
      if (!port) return '搜索失败。'

      const page = await ctx.puppeteer.page()
      const url = `http://127.0.0.1:${port}/market?keyword=${searchParams.join('+')}`
      await page.goto(url, {
        waitUntil: 'networkidle2'
      })
      if (cfg.autoLogin && page.url() === `http://127.0.0.1:${port}/login`) {
        const [usernameInput, passwordInput] = await page.$$('div.login-form input')
        await usernameInput.type(cfg.loginUsername)
        await passwordInput.type(cfg.loginPassword)
        await Promise.all([
          page.waitForNavigation({ timeout: 1500 }),
          page.click('div.login-form button:nth-child(2)'),
        ])
        await page.goto(url, {
          waitUntil: 'networkidle2'
        })
      }
      await page.addStyleTag({
        content: `
          .layout-status {
            display: none;
          }
          div.package-list {
            padding: 7px;
            max-width: 736px;
          }
          a.market-package button {
            display: none;
          }
          div.package-list a:nth-child(n + 7) {
            display: none;
          }
          div.search-box {
            display: none !important;
          }
        `
      })

      const list = await page.$('div.package-list')
      let msg: h | string
      if (list) {
        const packages = await page.$$('a.market-package')
        if (packages.length === 1) {
          const imgBuf = await packages[0].screenshot({})
          msg = h.image(imgBuf, 'image/png')
        } else {
          const imgBuf = await list.screenshot({
            captureBeyondViewport: false
          })
          msg = h.image(imgBuf, 'image/png')
        }
      } else if (await page.$('div.k-empty')) {
        msg = '没有搜索到相关插件。'
      } else if (await page.$('div.market-error')) {
        msg = '无法连接到插件市场。'
      } else {
        msg = '搜索失败。'
      }
      page.close()
      return msg
    })

  ctx.command('market-search.bind <target:user> <email:string>', '将用户与邮箱绑定')
    .alias('插件市场绑定邮箱')
    .action(async ({ session }, target, email) => {
      if (!target) {
        return '未指定用户。'
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return '邮箱格式不正确，请确保邮箱地址包含@符号。'
      }

      const userId = target.replace(session.platform + ':', '')

      await ctx.database.upsert('screenshot_console_bind', [{
        id: `${session.platform}:${session.guildId}:${userId}`,
        email
      }], 'id')

      return '邮箱绑定成功！'
    })

  if (cfg.enableViewLog) {
    ctx.command('view-log', '查看最近日志')
      .alias('查看最近日志')
      .action(async () => {
        const port = cfg.accessPort || ctx.server.port
        if (!port) return '日志获取失败。'

        const page = await ctx.puppeteer.page()
        await page.setViewport({
          width: 1125,
          height: 768
        })
        const url = `http://127.0.0.1:${port}/logs`
        await page.goto(url, {
          waitUntil: 'networkidle2'
        })
        if (cfg.autoLogin && page.url() === `http://127.0.0.1:${port}/login`) {
          const [usernameInput, passwordInput] = await page.$$('div.login-form input')
          await usernameInput.type(cfg.loginUsername)
          await passwordInput.type(cfg.loginPassword)
          await Promise.all([
            page.waitForNavigation({ timeout: 2000 }),
            page.click('div.login-form button:nth-child(2)'),
          ])
          await page.goto(url, {
            waitUntil: 'networkidle2'
          })
        }

        const shooter = await page.$('div.log-list')
        let msg: h | string
        if (shooter) {
          const imgBuf = await shooter.screenshot({
            captureBeyondViewport: false
          })
          msg = h.image(imgBuf, 'image/png')
        } else {
          msg = '日志获取失败。'
        }
        page.close()
        return msg
      })
  }
}
