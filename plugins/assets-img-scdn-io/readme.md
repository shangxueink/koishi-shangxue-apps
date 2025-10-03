# koishi-plugin-assets-img-scdn-io

[![npm](https://img.shields.io/npm/v/koishi-plugin-assets-img-scdn-io?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-assets-img-scdn-io)


基于图床 [img.scdn.io](https://img.scdn.io/) 的资源转存服务。

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

## 特性

- 支持图片文件上传到 img.scdn.io 图床
- 自动处理文件格式转换
- 完整的错误处理和日志记录
- 符合 Koishi Assets 服务标准

## 配置

- `endpoint`: API 服务器地址（默认：https://img.scdn.io/api）
- `loggerinfo`: 是否开启调试日志（默认：false）

## 使用说明

要使用本插件提供的 assets 服务，你需要先关闭默认开启的 assets-local 插件，然后开启本插件。

本插件使用 img.scdn.io 图床服务，支持图片文件的上传和存储。
