import { Context, HTTP, Schema } from 'koishi'
import Assets from '@koishijs/assets'
import { } from '@koishijs/plugin-http'

import { createHash } from 'node:crypto'

export const name = 'assets-filebin-net'

class FilebinAssets extends Assets<FilebinAssets.Config> {
  types = ['image', 'img', 'audio', 'video', 'file'] // 支持所有类型
  http: HTTP

  constructor(ctx: Context, config: FilebinAssets.Config) {
    super(ctx, config)
    this.http = ctx.http.extend({
      headers: { accept: 'application/json' },
    })
    this.logInfo(`初始化完成 - 基础地址: ${config.endpoint}, seed: ${config.seed}`)
  }

  private logInfo(...args: any[]) {
    if (this.config.loggerinfo) {
      const logger = this.ctx.logger('assets-filebin-net')
        ; (logger.info as (...args: any[]) => void)(...args)
    }
  }

  async upload(url: string, file: string) {
    const { buffer, filename, type } = await this.analyze(url, file)
    const logger = this.ctx.logger('assets-filebin-net')

    try {
      // 融合日期、时间戳、用户seed和文件URL，生成唯一值
      const uniqueSeed = `${new Date().toISOString()}${Date.now()}${this.config.seed}${url}`
      // 使用 MD5 哈希处理，确保每次上传的 bin 都不同，避免空间不足
      const bin = createHash('md5').update(uniqueSeed).digest('hex')

      // 生成随机文件名
      const randomName = Math.random().toString(36).slice(-8)
      const uploadUrl = `${this.config.endpoint}/${bin}/${randomName}`

      this.logInfo(`开始上传文件: ${filename}, 类型: ${type}, 目标URL: ${uploadUrl}`)

      // 上传文件
      await this.http.post(uploadUrl, buffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      })

      this.logInfo(`文件上传完成，获取访问链接...`)

      // 获取重定向地址
      const response = await this.http(uploadUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          cookie: 'verified=2024-05-24',
        },
      })

      const location = response.headers.get('location')
      if (!location) {
        throw new Error('无法获取文件访问链接')
      }

      const finalUrl = `${location}#${filename}`
      this.logInfo(`上传成功: ${finalUrl}`)
      return finalUrl
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      // 捕获并处理“存储空间不足”的错误
      if (err.message.includes('Insufficient Storage')) {
        const friendlyError = new Error('filebin.net 存储空间不足。插件已自动尝试使用新的存储空间，请重试。如果问题依然存在，请考虑更换 seed 配置或等待一段时间。')
        logger.error(`上传失败: ${friendlyError.message}`)
        throw friendlyError
      }
      logger.error(`上传失败: ${err.message}`)
      throw err
    }
  }

  async stats() {
    // filebin.net 没有提供统计信息接口，返回空对象
    return {}
  }
}

namespace FilebinAssets {
  export interface Config extends Assets.Config {
    endpoint: string
    seed: string
    loggerinfo: boolean
  }

  export const Config: Schema<Config> = Schema.intersect([
    Schema.object({
      endpoint: Schema.string()
        .role('link')
        .description('filebin.net 服务地址')
        .default('https://filebin.net')
        .disabled(),
      seed: Schema.string()
        .description('用作保存文件夹名称的seed值。请避免该值与其他人的重复！<br>支持任意字符，会自动进行哈希处理。')
        .required(),
      loggerinfo: Schema.boolean()
        .default(false)
        .description('日志调试：一般输出<br>提issue时，请开启此功能 并且提供BUG复现日志')
        .experimental(),
    }),
    Assets.Config,
  ])

  export const usage = `
  ---
  
  要使用本插件提供的 assets 服务，你需要先关闭默认开启的 assets-local 插件，然后开启本插件。

  ---

  本插件使用 filebin.net 实现服务，支持图片、音频、视频和其他文件的上传和存储。

  **重要配置说明：**
  - seed 值用于生成唯一的存储文件夹，请设置一个独特的值避免与其他用户冲突
  - 文件会按照每5天一个周期自动分组存储

  ---

  本插件后端服务来自: <a href="https://filebin.net" target="_blank">https://filebin.net</a>

  ---  
  `
}

export interface Config extends FilebinAssets.Config { }

export const Config = FilebinAssets.Config

export function apply(ctx: Context, config: Config) {
  ctx.plugin(FilebinAssets, config)
}

export default FilebinAssets
