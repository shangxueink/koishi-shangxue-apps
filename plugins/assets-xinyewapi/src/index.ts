import { Context, HTTP, Schema } from 'koishi'
import Assets from '@koishijs/assets'
import { } from '@koishijs/plugin-http'

type ApiName = '360tc' | 'jdtc' | 'yanxuantc' | 'psbctc'

class XinyewAssets extends Assets<XinyewAssets.Config> {
  types = ['image', 'img'] // , 'audio', 'video', 'file' // 暂不支持其他类型
  http: HTTP

  constructor(ctx: Context, config: XinyewAssets.Config) {
    super(ctx, config)
    this.http = ctx.http.extend({
      endpoint: config.baseEndpoint,
      headers: { accept: 'application/json' },
    })
    this.logInfo(`初始化完成 - 基础地址: ${config.baseEndpoint}, 默认API: ${config.defaultApi}`)
  }

  private logInfo(...args: any[]) {
    if (this.config.loggerinfo) {
      const logger = this.ctx.logger('assets-xinyewapi')
        ; (logger.info as (...args: any[]) => void)(...args);
    }
  }

  private async postForm(path: string, payload: FormData) {
    const data = await this.http.post(`/${path}`, payload)
    // 如果返回的是字符串，需要解析为JSON
    if (typeof data === 'string') {
      try {
        return JSON.parse(data)
      } catch (e) {
        return data
      }
    }
    return data
  }

  private async getByUrl(path: string, fileUrl: string) {
    const data = await this.http.get(`/${path}?url=${encodeURIComponent(fileUrl)}`)
    // 如果返回的是字符串，需要解析为JSON
    if (typeof data === 'string') {
      try {
        return JSON.parse(data)
      } catch (e) {
        return data
      }
    }
    return data
  }

  private parseUrlFromResponse(api: ApiName, data: unknown): string | null {
    // 如果返回是字符串，尝试直接抽取 URL
    if (typeof data === 'string') {
      const m = data.match(/https?:\/\/\S+/)
      return m ? m[0] : null
    }
    if (!data || typeof data !== 'object') {
      this.logInfo(`${api} 数据不是对象: ${typeof data}`)
      return null
    }
    const obj = data as Record<string, unknown>

    // 检查是否为成功响应
    const errno = obj.errno
    const code = obj.code

    this.logInfo(`${api} 解析开始 - errno: ${errno} (${typeof errno}), code: ${code} (${typeof code})`)

    //  errno === 0 表示成功
    const isSuccess = (typeof errno === 'number' && errno === 0) ||
      (typeof code === 'number' && code === 0)

    this.logInfo(`${api} 成功判断: ${isSuccess}`)

    if (isSuccess) {
      const d = obj.data
      this.logInfo(`${api} data字段: ${JSON.stringify(d)} (${typeof d})`)

      if (d && typeof d === 'object') {
        const detail = d as Record<string, unknown>
        const url = detail.url
        this.logInfo(`${api} 提取URL: "${url}" (${typeof url})`)

        if (typeof url === 'string' && url.length > 0) {
          this.logInfo(`${api} 成功提取URL: ${url}`)
          return url
        }
      } else if (typeof d === 'string' && d.length > 0) {
        // data 为字符串时直接返回
        if (/^https?:\/\//.test(d)) return d
      }

      // 某些接口可能直接返回顶层 url
      const topUrl = obj.url
      if (typeof topUrl === 'string' && topUrl.length > 0) {
        return topUrl
      }
    }

    this.logInfo(`${api} 解析失败 - 无法提取URL`)
    return null
  }

  async upload(url: string, file: string) {
    const { buffer, filename, type } = await this.analyze(url, file)
    const logger = this.ctx.logger('assets-xinyewapi')

    const order: ApiName[] = this.getFallbackOrder()
    let lastError: Error | null = null

    for (const api of order) {
      try {
        // 构造表单数据
        const payload = new FormData()
        payload.append('file', new Blob([new Uint8Array(buffer)], { type }), filename)

        // 尝试 POST 文件上传
        const resp = await this.postForm(api, payload)
        this.logInfo(JSON.stringify(resp))
        const link = this.parseUrlFromResponse(api, resp)
        if (link) {
          this.logInfo(`上传成功 - API: ${api}, URL: ${link}`)
          return link
        }

        // 如果没有获取到链接，记录详细信息
        this.logInfo(`API ${api} POST响应解析失败: ${JSON.stringify(resp)}`)
        try {
          const resp2 = await this.getByUrl(api, url)
          const link2 = this.parseUrlFromResponse(api, resp2)
          if (link2) {
            this.logInfo(`上传成功 (GET模式) - API: ${api}, URL: ${link2}`)
            return link2
          } else {
            this.logInfo(`API ${api} GET响应: ${JSON.stringify(resp2)}`)
          }
        } catch (e2) {
          const err2 = e2 instanceof Error ? e2 : new Error(String(e2))
          logger.error(`API ${api} GET模式错误: ${err2.message}`)
        }

        // 记录这个API失败，但继续尝试下一个
        const objResp = resp as Record<string, unknown>
        const message = typeof objResp.message === 'string' ? objResp.message :
          typeof objResp.error === 'string' ? objResp.error : '未知错误'
        lastError = new Error(`${api} 失败: ${message}`)
        logger.warn(`API ${api} 失败，尝试下一个API`)

      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e))
        lastError = err
        logger.error(`API ${api} 请求错误: ${err.message}`)
      }
    }

    throw (lastError ?? new Error('所有API都失败了'))
  }

  private getFallbackOrder(): ApiName[] {
    const all: ApiName[] = ['360tc', 'jdtc', 'yanxuantc', 'psbctc']
    const { defaultApi } = this.config
    return [defaultApi, ...all.filter(a => a !== defaultApi)]
  }

  async stats() {
    return {}
  }
}

namespace XinyewAssets {
  export interface Config extends Assets.Config {
    baseEndpoint: string
    defaultApi: ApiName
    loggerinfo: boolean
  }

  const apiRadio = Schema.union([
    Schema.const<'360tc'>('360tc').description('360 图床（最优）'),
    Schema.const<'jdtc'>('jdtc').description('京东图床（5MB 限制）（较优）'),
    Schema.const<'yanxuantc'>('yanxuantc').description('网易严选直链（每5秒3次）（较慢）'),
    Schema.const<'psbctc'>('psbctc').description('中国邮政图床（2MB 限制）（可能失效）'),
  ]).role('radio')

  export const Config: Schema<Config> = Schema.intersect([
    Schema.object({
      baseEndpoint: Schema.string().role('link').description('API 服务器地址。').default('https://api.xinyew.cn/api').disabled(),
      defaultApi: apiRadio.description('默认使用的图床 API。').default('360tc'),
      loggerinfo: Schema.boolean().default(false).description('日志调试：一般输出<br>提issue时，请开启此功能 并且提供BUG复现日志').experimental(),
    }),
    Assets.Config,
  ])
  export const usage = `
  ---
  
  要使用本插件提供的 assets 服务，你需要先关闭默认开启的 assets-local 插件， 然后开启本插件。

  不建议修改配置项的默认值。请尽量保持默认值。

  ---

  本插件图床服务 来自此API站点： <li><a href="https://api.xinyew.cn" target="_blank">https://api.xinyew.cn</a></li>

  ---  
  `;

}

export default XinyewAssets
