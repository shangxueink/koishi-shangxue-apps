# koishi-plugin-assets-filebin-net

[![npm](https://img.shields.io/npm/v/koishi-plugin-assets-filebin-net?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-assets-filebin-net)

基于 [filebin.net](https://filebin.net/) 的资源转存服务。

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

- 支持所有文件类型（图片、音频、视频、文档等）上传到 filebin.net
- 自动文件分组管理（每5天一个存储周期）
- 安全的 seed 哈希处理，支持任意字符
- 完整的错误处理和日志记录
- 符合 Koishi Assets 服务标准

## 配置

- `endpoint`: filebin.net 服务地址（默认：https://filebin.net）
- `seed`: 用作保存文件夹名称的种子值，请设置独特的值避免与其他用户冲突（必填）
- `loggerinfo`: 是否开启调试日志（默认：false）

## 使用说明

要使用本插件提供的 assets 服务，你需要先关闭默认开启的 assets-local 插件，然后开启本插件。

### 重要配置说明

- **seed 值**：用于生成唯一的存储文件夹，请设置一个独特的值避免与其他用户冲突
- **文件分组**：文件会按照每5天一个周期自动分组存储
- **字符支持**：seed 值支持任意字符（包括邮箱地址等），插件会自动进行哈希处理确保安全性

### 工作原理

1. 插件会根据您的 seed 值生成 MD5 哈希（取前8位）
2. 结合时间戳生成唯一的 bin 名称
3. 上传文件到 filebin.net 并获取访问链接
4. 返回可直接访问的文件 URL

## 适用场景

本插件特别适用于需要第三方文件存储的场景，如：
- adapter-iirose 等不支持直接文件上传的适配器
- 需要减轻服务器存储压力的应用
- 需要临时文件分享的场景

## 注意事项

- filebin.net 是免费服务，请合理使用
- 上传的文件会有一定的存储期限
- 建议设置独特的 seed 值以避免与其他用户冲突
