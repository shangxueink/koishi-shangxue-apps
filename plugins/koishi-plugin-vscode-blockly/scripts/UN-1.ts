// Koishi 插件脚本
import { Context } from 'koishi'

export function apply(ctx: Context) {
  ctx.on('ready', () => {
    ctx.logger('script').info('plugin loaded')
  })
}
