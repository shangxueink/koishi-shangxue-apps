import { Context, h, Schema, Universal } from 'koishi'

export const name = 'testplugin'

export interface Config { }

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  // write your plugin here
  ctx.command('测试测')
    .action(async ({ session }) => {
      await session.send(`啊宝宝啊`)
      return
    })
}
