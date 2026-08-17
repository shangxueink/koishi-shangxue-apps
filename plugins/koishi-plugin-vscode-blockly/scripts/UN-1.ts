import { Context } from 'koishi'

export function apply(ctx: Context) {
  ctx.setInterval(() => {
    ctx.logger('script').info('tick')
  }, 60000)
}
