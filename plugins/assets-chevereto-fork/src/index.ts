import { Context, HTTP, Schema } from 'koishi'
import Assets from '@koishijs/assets'
import { } from '@koishijs/plugin-http'

export const name = 'assets-chevereto-fork'

class CheveretoForkAssets extends Assets<CheveretoForkAssets.Config> {
  types = ['image', 'img'] // 支持图片类型
  http: HTTP

  constructor(ctx: Context, config: CheveretoForkAssets.Config) {
    super(ctx, config)
    this.http = ctx.http.extend({
      endpoint: config.endpoint,
      headers: {
        accept: 'application/json',
        'X-API-Key': config.token,
      },
    })
    this.logInfo(`初始化完成 - API地址: ${config.endpoint}`)
  }

  private logInfo(...args: any[]) {
    if (this.config.loggerinfo) {
      const logger = this.ctx.logger('assets-chevereto-fork')
        ; (logger.info as (...args: any[]) => void)(...args)
    }
  }

  async upload(url: string, file: string) {
    const { buffer, filename, type } = await this.analyze(url, file)
    const logger = this.ctx.logger('assets-chevereto-fork')

    try {
      // 构造表单数据
      const payload = new FormData()
      const killTime = this.config.killTime

      // 添加文件数据
      payload.append('source', new Blob([new Uint8Array(buffer)], { type }), filename)

      // 添加必需的参数
      payload.append('key', this.config.token)

      // 如果设置了过期时间，添加过期参数
      if (killTime > 0) {
        payload.append('expiration', `PT${killTime}M`)
      }

      // 添加title参数
      payload.append('title', file)

      this.logInfo(`开始上传文件: ${filename}, 类型: ${type}`)
      this.logInfo(`上传参数: killTime=${killTime}, token=${this.config.token ? '***' : 'undefined'}`)

      // 发送请求
      const response = await this.http.post('/api/1/upload', payload, {
        headers: {
          'X-API-Key': this.config.token,
        }
      })

      this.logInfo(`API响应: ${JSON.stringify(response)}`)

      // 检查响应状态
      if (response.status_code !== 200) {
        logger.error(`上传失败 - 状态码: ${response.status_code}`, response)
        throw new Error(`Chevereto图床上传失败！状态码: ${response.status_code}`)
      }

      // 获取上传后的URL
      if (response.image && response.image.url) {
        const uploadedUrl = response.image.url
        this.logInfo(`上传成功: ${uploadedUrl}`)
        return uploadedUrl
      }

      // 如果响应格式不符合预期
      logger.error(`上传失败 - 响应格式异常: ${JSON.stringify(response)}`)
      throw new Error('上传失败：API响应格式异常')

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      logger.error(`上传失败: ${err.message}`)
      throw err
    }
  }

  async stats() {
    return {}
  }
}

namespace CheveretoForkAssets {
  export interface Config extends Assets.Config {
    endpoint: string
    token: string
    killTime: number
    loggerinfo: boolean
  }

  export const Config: Schema<Config> = Schema.intersect([
    Schema.object({
      endpoint: Schema.string()
        .role('link')
        .description('图床服务的API端点地址')
        .required(),
      token: Schema.string()
        .description('图床服务的API Key令牌')
        .role('secret')
        .required(),
      killTime: Schema.number()
        .description('可选的过期时间，单位为分钟。设置为0表示永不过期')
        .default(5)
        .min(0),
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

  本插件使用 Chevereto 图床服务，支持图片文件的上传和存储。

  **配置说明：**
  - endpoint: Chevereto 图床的 API 地址
  - token: 图床服务的 API Key
  - killTime: 图片过期时间（分钟），设置为0表示永不过期
  - loggerinfo: 是否开启详细日志输出

  ---

  本插件基于 Chevereto 图床 API 实现，支持多种 Chevereto 兼容的图床服务。

  ---  
  `
}

export interface Config extends CheveretoForkAssets.Config { }

export const Config = CheveretoForkAssets.Config

export function apply(ctx: Context, config: Config) {
  ctx.plugin(CheveretoForkAssets, config)
}

export default CheveretoForkAssets
