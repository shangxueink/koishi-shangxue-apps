import { Context, Service, Schema, h } from 'koishi'
import { toDataURL } from 'qrcode'

export interface Config {
  enablecommand: any;
}

export const name = 'qrcode-service-null'

export const Config: Schema<Config> = Schema.object({
  enablecommand: Schema.boolean().default(false).description("是否注册qrcode指令"),
})
export const usage = `
为koishi通过二维码生成服务

[使用方法请见readme](https://www.npmjs.com/package/koishi-plugin-qrcode-service-null)

`;
declare module 'koishi' {
  interface Context {
    qrcode: qrcode
  }
}

export class qrcode extends Service {
  constructor(ctx: Context) {
    super(ctx, 'qrcode')
  }

  async generateQRCode(text: string, options: any): Promise<string> {
    const { margin, scale, width, dark, light } = options
    const dataURL = await toDataURL(text, { margin, scale, width, color: { dark, light } })
    return h.image(dataURL).toString()
  }
}

export function apply(ctx: Context, config: Config) {
  ctx.plugin(qrcode)

  if (config.enablecommand) {
    ctx.i18n.define('zh', require('./locales/zh'))
    ctx.command('qrcode <text:string>', '生成二维码')
      .option('margin', '-m <margin:number>', { fallback: 4 })
      .option('scale', '-s <scale:number>', { fallback: 4 })
      .option('width', '-w <width:number>')
      .option('dark', '-d <color:string>')
      .option('light', '-l <color:string>')
      .action(async ({ options, session }, text) => {
        if (!text) return session.text('.expect-text')
        if (text.includes('[CQ:')) return session.text('.invalid-segment')
        const image = await ctx.qrcode.generateQRCode(text, options)
        return image
      })
  }
}
