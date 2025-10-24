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
  //     // ctx.logger.info(session.quote.user)
  //     ctx.logger.info(session.messageId)
  //     ctx.logger.info(session.content)
  //     ctx.logger.info(session.event.user)
  //     await session.send(h.at(session.userId) + ' ceshi!')
  //     // const aaa = await session.bot.getMessageList(session.channelId, session.messageId)
  //     // ctx.logger.info(aaa)
  //   }
  // })
  ctx
    .command('这是直接发的指令')
    .action(async ({ session }, jsoninput) => {
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
