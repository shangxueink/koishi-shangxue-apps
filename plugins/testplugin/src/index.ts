import { Context, h, Schema, sleep, Universal } from 'koishi'

export const name = 'testplugin'

export interface Config { }

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  // write your plugin here
  // 如果收到“天王盖地虎”，就回应“宝塔镇河妖”
  ctx.on('interaction/button', async (session) => {
    ctx.logger.info(session)
  })
  // ctx.on('message', async (session) => {
  //   if (session.userId.includes("7756242") || session.userId.includes("1919892171")) {
  //     ctx.logger.info(session.quote?.elements)
  //     ctx.logger.info(session.author)
  //   }
  // })

  ctx
    .command('html测试')
    .action(async ({ session }) => {
      await session.send(h("yunhu:html", "<h1>你好</h1>"))
      await session.send(h("html", "<h1>你好</h1>"))
      return
    })

  ctx
    .command('h1测试')
    .action(async ({ session }) => {
      await session.send(h("h1", "你好这是h1"))
      return
    })

  ctx
    .command('md测试')
    .action(async ({ session }) => {
      await session.send(h("yunhu:markdown", "# 你好\n## 这是markdown！"))
      await session.send(h("markdown", "# 你好\n## 这是markdown！"))
      return
    })

  ctx
    .command('视频测试')
    .action(async ({ session }) => {
      await session.send(h.video("file:///E:/download/Windowsdownload/software_apps_downloads/TEMP/7610d9617b0a8343b649667a9114a505.mp4"))
      return
    })

  ctx
    .command('语音测试')
    .action(async ({ session }) => {
      await session.send(h.audio("https://api.injahow.cn/meting/?type=url&id=2748727454"))
      return
    })

  ctx
    .command('图片测试')
    .action(async ({ session }) => {
      await session.send(h.image("https://i1.hdslb.com/bfs/archive/ea9dc9d2d716280b673a3bd5eb21023b3a2ed2b3.jpg"))
      return
    })

  ctx
    .command('发送消息到 [id]')
    .action(async ({ session }, id) => {
      await session.bot.sendMessage("group:307149245", h.at("37090343") + " assign")
      return
    })

  ctx
    .command('assign切换 [id]')
    .action(async ({ session }, id) => {
      await session.send(h.at(id) + ` assign`)
      return
    })

  ctx
    .command('at测试 [...at]')
    .action(async ({ session }, ...at) => {
      ctx.logger.info(at)
      ctx.logger.info(h.parse(session.content))
      await session.send(h.at(session.userId) + "你好啊！我at你了")
      return
    })

  ctx
    .command('emoji测试')
    .action(async ({ session }) => {
      ctx.logger.info(session)
      await session.send("请发送emoji：")
      const aaa = await session.prompt(30 * 1000)
      await session.send(aaa)
      return
    })

  // yunhu platform
  ctx
    .command('这是直接发的指令')
    .action(async ({ session }) => {
      ctx.logger.info(session)
      return 'Hello from 直接指令!'
    })

  ctx
    .command('这是普通指令 [...args]')
    .action(async ({ session }, ...args) => {
      ctx.logger.info('用户输入的参数为：', args)
      return 'Hello from 普通指令!'
    })

  ctx
    .command('这是自定义输入指令 [jsoninput]')
    .action(async ({ session }, jsoninput) => {
      ctx.logger.info('用户输入的json表单内容为：', jsoninput)
      return 'Hello from 测试!'
    })
}
