import { Context, Service, Schema, h } from 'koishi'
import { toDataURL } from 'qrcode'

export interface Config { }

export const name = 'QRCodeService'

export const Config: Schema<Config> = Schema.object({})

export class qrcode extends Service {
  constructor(ctx: Context) {
    super(ctx, 'qrcode')
  }

  async generateQRCode(text: string, options: any): Promise<string> {
    const { margin, scale, width, dark, light } = options
    const dataURL = await toDataURL(text, { margin, scale, width, color: { dark, light } })
    // 返回不包含前缀的 base64 图片数据
    return dataURL.slice(22)
  }
}

declare module 'koishi' {
  interface Context {
    qrcode: qrcode
  }
}

export function apply(ctx: Context) {
  ctx.i18n.define('zh', require('./locales/zh'))

  const qrcode_Service = new qrcode(ctx)

  ctx.command('qrcode <text:string>', '生成二维码')
    .option('margin', '-m <margin:number>', { fallback: 4 })
    .option('scale', '-s <scale:number>', { fallback: 4 })
    .option('width', '-w <width:number>')
    .option('dark', '-d <color:string>')
    .option('light', '-l <color:string>')
    .action(async ({ options, session }, text) => {
      if (!text) return session.text('.expect-text')
      if (text.includes('[CQ:')) return session.text('.invalid-segment')

      const base64 = await qrcode_Service.generateQRCode(text, options)

      return h.image('data:image/png;base64,' + base64)
    })
}
