# koishi-plugin-assets-xinyewapi

[![npm](https://img.shields.io/npm/v/koishi-plugin-assets-xinyewapi?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-assets-xinyewapi)


基于图床 [api.xinyew.cn](https://api.xinyew.cn/) 的资源转存服务。

## 文档

<https://assets.koishi.chat/zh-CN/api.html>

## 示例用法
```ts
import { Context, Schema } from 'koishi'
import { } from '@koishijs/assets'

export const name = 'assets-test'
export const inject = ["assets"]
export interface Config { }

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  // write your plugin here
  ctx
    .command('测试图床')
    .action(async ({ session }) => {
      const aaa = await ctx.assets.transform(session.content)
      ctx.logger.info(aaa)
      return aaa
    })
}

```
