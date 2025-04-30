# koishi-plugin-qrcode

[![npm](https://img.shields.io/npm/v/koishi-plugin-qrcode-service-null?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-qrcode-service-null)


本插件提供了简单的二维码生成接口，可以根据输入文本生成二维码。

以方便一些平台对于链接等内容的发送



---



要在你的koishi中调用本插件的服务

下面是一个使用示例

```
import { Context, Schema, h } from 'koishi'
import { } from 'koishi-plugin-qrcode-service'

export interface Config {
  loggerinfo: boolean;
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    loggerinfo: Schema.boolean().default(false).description('日志调试模式'),
  }).description('高级设置'),
])

export const inject = {
  optional: ['qrcode']
}

export function apply(ctx: Context, config: Config) {
  ctx.command('二维码码 <keyword:string>', '生成二维码')
    .action(async ({ options, session }, keyword) => {
      const image = await ctx.qrcode.generateQRCode(keyword, 'Text')
      if (config.loggerinfo) {
        ctx.logger.info('生成二维码：\n' + keyword)
      }
      await session.send(image)
    })
}

```
