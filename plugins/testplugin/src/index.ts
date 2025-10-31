import { Context, h, Schema, sleep, Universal } from 'koishi'
import { inspect } from 'node:util'

export const name = 'testplugin'

export interface Config { }

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  // write your plugin here
  const commandName = "消息"

  const command = ctx.command(commandName)

  ctx.on('interaction/button', async (session) => {
    ctx.logger.info(session)
  })

  // ctx.on('message', async (session) => {
  //   if (session.userId.includes("7756242") || session.userId.includes("1919892171") || session.userId.includes("679a51f1d4893")) {
  //     ctx.logger.info(session.content)
  //     ctx.logger.info(h.parse(session.content))
  //     // ctx.logger.info(session.quote?.elements)
  //   }
  // })


  ctx.on('iirose/broadcast' as any, async (session, data) => {
    ctx.logger.info(session, data)
  })

  // ctx.platform("iirose").on('guild-member-added', async (session) => {
  //   ctx.logger.info('added', session)
  // })

  // ctx.platform("iirose").on('guild-member-removed', async (session) => {
  //   ctx.logger.info('removed', session)
  // })

  // ctx.platform("iirose").on('guild-member-updated', async (session) => {
  //   ctx.logger.info('updated', session)
  // })

  command
    .subcommand('.编辑消息.md')
    .action(async ({ session }) => {
      const aaa = await session.send(h.text("你好，这是编辑之前的消息。"))
      await sleep(3 * 1000)
      await session.bot.editMessage(session.channelId, aaa[0], h("markdown", "# 你好\n## 你好啊"))
      await session.send(h.text("我已经编辑完毕"))
      return
    })

  command
    .subcommand('.编辑消息.图片')
    .action(async ({ session }) => {
      const aaa = await session.send(h.text("你好，这是编辑之前的消息。"))
      await sleep(3 * 1000)
      await session.bot.editMessage(session.channelId, aaa[0], h.image("https://i1.hdslb.com/bfs/archive/ea9dc9d2d716280b673a3bd5eb21023b3a2ed2b3.jpg"))
      await session.send(h.text("我已经编辑完毕"))
      return
    })

  command
    .subcommand('.编辑消息.文字')
    .action(async ({ session }) => {
      const aaa = await session.send(h.text("你好，这是编辑之前的消息。"))
      await sleep(3 * 1000)
      await session.bot.editMessage(session.channelId, aaa[0], "你好，这是编辑以后的消息。")
      await session.send(h.text("我已经编辑完毕"))
      return
    })

  command
    .subcommand('.html')
    .action(async ({ session }) => {
      await session.send(h("yunhu:html", "<h1>你好</h1>"))
      await session.send(h("html", "<h1>你好</h1>"))
      return
    })

  command
    .subcommand('.h1')
    .action(async ({ session }) => {
      await session.send(h("h1", "你好这是h1"))
      return
    })

  command
    .subcommand('.md')
    .action(async ({ session }) => {
      await session.send(h("yunhu:markdown", "# 你好\n## 这是markdown！"))
      await session.send(h("markdown", "# 你好\n## 这是markdown！"))
      return
    })

  command
    .subcommand('.按钮')
    .action(async ({ session }) => {
      await session.send([
        h.text("你好啊"),
        h("button", { id: 1, type: "action", text: "action按钮" }),
        h("button", { id: 2, type: "link", text: "link按钮", href: "bilibili.com" }),
        h("button", { id: 3, type: "input", text: "input按钮" }),
      ])
      return
    })

  command
    .subcommand('.quote')
    .action(async ({ session }) => {
      ctx.logger.info(session.quote)
      if (session.quote) {
        ctx.logger.info(session.quote.content)
        ctx.logger.info(session.quote.channel)
      }
      await session.send("已经打印！")
      return
    })

  command
    .subcommand('.元素 [text]')
    .action(async ({ session }, text) => {
      if (text) {
        ctx.logger.info("直接输入", h.parse(text))
        await session.send("已经打印！")
        return
      }
      if (session.quote) {
        ctx.logger.info("引用输入", session.quote.elements)
        await session.send("已经打印！")
        return
      }
      if (!text) {
        await session.send("请发送元素：")
        const aaa = await session.prompt(30 * 1000)
        ctx.logger.info("交互输入", h.parse(aaa))
        await session.send("已经打印！")
      }
      return
    })

  command
    .subcommand('.log [content:text]')
    .action(async ({ session }, content) => {
      // 权限检查
      if (!content || !(
        session.userId.includes("7756242") ||
        session.userId.includes("1919892171") ||
        session.userId.includes("679a51f1d4893") ||
        session.platform.includes("sandbox")
      )) {
        return "不符合要求"
      }
      try {
        const contextNames = ['ctx', 'h', 'session', 'inspect'];
        const contextValues = [ctx, h, session, inspect];
        const dynamicFunction = new Function(...contextNames, `return ${content}`);
        const result = dynamicFunction(...contextValues);
        const loggerstr = inspect(result, { depth: null, colors: true })
        ctx.logger.info(loggerstr);
        await session.send("已经打印！")
        return;
      } catch (e) {
        ctx.logger.warn(`执行代码时出错: ${e.stack}`);
        return `执行代码时出错：${e.message}`;
      }
    });


  command
    .subcommand('.引用')
    .action(async ({ session }) => {
      await session.send(h.quote(session.messageId) + "你好啊，我在回复你！你好啊，我在回复你！你好啊，我在回复你！")
      return
    })
  command
    .subcommand('.剧透')
    .action(async ({ session }) => {
      await session.send(h("spl", "你好啊"))
      return
    })
  command
    .subcommand('.粗体')
    .action(async ({ session }) => {
      await session.send(h("b", "这是粗体文本"))
      return
    })
  command
    .subcommand('.斜体')
    .action(async ({ session }) => {
      await session.send(h("i", "这是斜体文本"))
      return
    })
  command
    .subcommand('.下划线')
    .action(async ({ session }) => {
      await session.send(h("u", "这是下划线文本"))
      return
    })

  command
    .subcommand('.删除线')
    .action(async ({ session }) => {
      await session.send(h("s", "这是删除线文本"))
      return
    })
  command
    .subcommand('.代码')
    .action(async ({ session }) => {
      await session.send(h("code", "console.log('Hello World')"))
      return
    })
  command
    .subcommand('.上标')
    .action(async ({ session }) => {
      await session.send(h("sup", "2"))
      return
    })
  command
    .subcommand('.下标')
    .action(async ({ session }) => {
      await session.send(h("sub", "2"))
      return
    })
  command
    .subcommand('.换行')
    .action(async ({ session }) => {
      await session.send([
        "第一行<br>",
        "第二行<br>",
        "第三行",
      ])
      return
    })

  command
    .subcommand('.段落')
    .action(async ({ session }) => {
      await session.send([
        h("p", "这是第一段"),
        h("p", "这是第二段")
      ])
      return
    })

  command
    .subcommand('.视频')
    .action(async ({ session }) => {
      await session.send(h.video("file:///E:/download/Windowsdownload/software_apps_downloads/TEMP/7610d9617b0a8343b649667a9114a505.mp4"))
      return
    })

  command
    .subcommand('.语音')
    .action(async ({ session }) => {
      await session.send(h.audio("https://api.injahow.cn/meting/?type=url&id=2748727454"))
      return
    })

  command
    .subcommand('.图片')
    .action(async ({ session }) => {
      const aaa = h.image("file:///D:/Pictures/meme/fox/0242a0f2d7ca7bcbe9cc0c3af8096b63f624a83b.jpg")
      ctx.logger.info(aaa)
      await session.send(aaa)
      return
    })

  command
    .subcommand('.消息 [type]')
    .action(async ({ session }, type) => {
      if (type === "user") {
        await session.bot.sendPrivateMessage(session.userId, "怎么了嘛")
      } else {
        await session.bot.sendMessage(session.channelId, "怎么了嘛")
      }
      return
    })

  command
    .subcommand('.assign切换 [id]')
    .action(async ({ session }, id) => {
      await session.send(h.at(id) + ` assign`)
      return
    })

  command
    .subcommand('.at [...at]')
    .action(async ({ session }, ...at) => {
      const aaa = h.at(session.userId)
      ctx.logger.info(at)
      ctx.logger.info(h.parse(session.content))
      ctx.logger.info(`${aaa}`)
      await session.send(aaa + "你好啊！我at你了")
      return
    })

  command
    .subcommand('.emoji')
    .action(async ({ session }) => {
      ctx.logger.info(session)
      await session.send("请发送emoji：")
      const aaa = await session.prompt(30 * 1000)
      await session.send(aaa)
      return
    })

  // yunhu platform
  command
    .subcommand('这是直接发的指令')
    .action(async ({ session }) => {
      ctx.logger.info(session)
      return 'Hello from 直接指令!'
    })

  command
    .subcommand('这是普通指令 [...args]')
    .action(async ({ session }, ...args) => {
      ctx.logger.info('用户输入的参数为：', args)
      return 'Hello from 普通指令!'
    })

  command
    .subcommand('这是自定义输入指令 [jsoninput]')
    .action(async ({ session }, jsoninput) => {
      ctx.logger.info('用户输入的json表单内容为：', jsoninput)
      return 'Hello from !'
    })
}
