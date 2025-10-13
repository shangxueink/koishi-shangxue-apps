import { Context, Schema, h, Logger, Session } from "koishi"
import defaultCommands from './../data/command.json'

export const name = "image-edit"
export const inject = ["http", "logger", "i18n"]

export const usage = `
---

通过配置API，调用 {{URL}}/v1/images/edits 接口实现手办化插件的功能。

推荐站点：https://happyapi.org/ 或者 https://api.bltcy.ai/

推荐模型：doubao-seedream-4-0-250828

这个比较便宜捏（基本一毛钱一张

---

如果你也使用的是happyapi，那么使用默认配置，直接开启插件就可以使用啦。

如果你是其他API站点，请手动编辑配置项的请求参数，**尤其是模型！**
`;

const logger = new Logger(name)

interface Command {
  name: string
  prompt: string
  enabled: boolean
  apiParams: Record<string, string>
}

interface Config {
  basename: string
  apiUrl: string
  apiKey: string
  waitTimeout: number
  customCommands: Command[]
  loggerinfo: boolean
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    basename: Schema.string().default("imagen").description("父级指令名称"),
    apiUrl: Schema.string().default("https://cn.happyapi.org/v1/images/edits").role("link").description("API 服务器地址<br>注意是`{{URL}}/v1/images/edits`的接口"),
    apiKey: Schema.string().role("secret").required().description("API 密钥"),
    waitTimeout: Schema.number().default(60).max(200).min(10).step(1).description("等待输入图片的最大时间（秒）"),
  }).description("基础配置"),

  Schema.object({
    customCommands: Schema.array(
      Schema.object({
        name: Schema.string().required().description("<hr><hr><hr><hr><hr><br>指令名称"),
        enabled: Schema.boolean().default(true).description("是否启用该指令"),
        apiParams: Schema.dict(String).role('table').description("自定义API请求的body参数").default({
          "model": "",
          "prompt": "{{prompt}}",
          "size": "1024x1024",
          "n": "1",
          "type": "normal",
          "response_format": "url"
        }),
        prompt: Schema.string().role("textarea", { rows: [6, 4] }).description("该指令对应的提示词"),
      })).description("折叠起来的指令配置<br>超级长的配置项，慎点").default(defaultCommands),
  }).description("指令配置"),

  Schema.object({
    loggerinfo: Schema.boolean().default(false).description("日志调试模式"),
  }).description("调试设置"),
]) as Schema<Config>


export function apply(ctx: Context, config: Config) {
  ctx.on("ready", () => {

    ctx.i18n.define("zh-CN", {
      commands: {
        [config.basename]: {
          description: "使用 AI 编辑图片",
          messages: {
            invalidimage: "未检测到有效的图片，请重新发送带图片的消息。",
            processing: "正在处理图片，请稍候...",
            failed: "图片生成失败，请稍后重试。",
            error: "处理过程中发生错误: {0}",
            needimages: "未检测到图片。请重新交互，提供至少一张图片。"
          },
        },
      }
    });

    ctx.command(config.basename)

    for (const cmdConfig of config.customCommands) {
      if (!cmdConfig.enabled) continue;

      ctx.command(`${config.basename}.${cmdConfig.name} [...args]`, `${cmdConfig.name} 风格绘画`)
        .usage(`${cmdConfig.name} 处理图片`)
        .action(async ({ session }, ...args) => {
          if (!session) return
          const quote = h.quote(session.messageId)
          const promptText = cmdConfig.prompt
          let images: string[] = []

          // 从当前消息和引用消息中提取图片
          const extractedImages = extractImagesFromSession(session)
          images.push(...extractedImages)

          if (images.length === 0) {
            await session.send(h.text(session.text(`commands.${config.basename}.messages.needimages`)))
            return
          }

          logInfo(`收集到 ${images.length} 张图片:`, images)

          try {
            await session.send([quote, h.text(session.text(`commands.${config.basename}.messages.processing`))])

            // 下载图片
            const files = await Promise.all(
              images.map(src => ctx.http.file(src).catch(err => {
                ctx.logger.error(`下载图片失败: ${src}`, err)
                return null
              }))
            ).then(results => results.filter(Boolean) as { data: ArrayBuffer, mime: string, filename: string }[])

            if (files.length === 0) {
              await session.send(h.text(session.text(`commands.${config.basename}.messages.invalidimage`)))
              return
            }

            // 调用 API
            const result = await callImageEditApi(files, promptText, cmdConfig.apiParams)

            if (result) {
              // 处理单张图片或多张图片的情况
              if (Array.isArray(result)) {
                // 多张图片：发送所有图片
                return result.map(url => h.image(url))
              } else {
                // 单张图片：直接发送
                return h.image(result)
              }
            } else {
              await session.send(h.text(session.text(`commands.${config.basename}.messages.failed`)))
              return
            }
          } catch (error) {
            ctx.logger.error(`[${cmdConfig.name}] 处理图片时发生错误:`, error)
            await session.send(h.text(session.text(`commands.${config.basename}.messages.error`, [error.message || '未知错误'])))
            return
          }
        })
    }

    // 从会话中提取图片 URL
    function extractImagesFromSession(session: Session): string[] {
      const images = extractImagesFromMessage(session.stripped.content)
      if (session.quote) {
        images.push(...extractImagesFromMessage(session.quote.content))
      }
      return images
    }

    // 从消息内容中提取图片 URL
    function extractImagesFromMessage(content: string): string[] {
      return h.select(content, "img").map(img => img.attrs.src).filter(Boolean)
    }

    async function callImageEditApi(files: { data: ArrayBuffer, mime: string, filename: string }[], prompt: string, apiParams: Record<string, string>): Promise<string[] | string | null> {
      const formData = new FormData()
      const logParams = {}
      const imageKey = Object.keys(apiParams).find(key => apiParams[key] === '{{inputimage}}');

      // 添加图片文件
      if (imageKey) {
        for (const file of files) {
          const blob = new Blob([file.data], { type: file.mime });
          formData.append(imageKey, blob, file.filename || 'image.png');
        }
      }

      // 添加其他参数
      for (const key in apiParams) {
        const value = apiParams[key];

        if (value === '{{inputimage}}') continue;

        let finalValue = value;
        if (value === '{{prompt}}') {
          finalValue = prompt;
        }

        formData.append(key, finalValue);
        logParams[key] = finalValue;
      }

      logInfo("发送 API 请求:", {
        url: config.apiUrl,
        ...logParams,
        prompt: (logParams['prompt'] || '').substring(0, 100) + ((logParams['prompt'] || '').length > 100 ? '...' : ''),
      })

      try {
        const response = await fetch(config.apiUrl, {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${config.apiKey}`
          },
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          const message = errorData.error?.message || errorData.error?.type || errorData.error?.code || `HTTP error! status: ${response.status}`
          throw new Error(message)
        }

        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const result = await response.json()
          if (result.data && Array.isArray(result.data)) {
            // 提取所有有效的图片 URL
            const urls = result.data
              .filter(item => item && item.url)
              .map(item => item.url)

            if (urls.length > 0) {
              logInfo(`API 成功响应 (JSON): 返回 ${urls.length} 张图片`)
              // 如果只有一张图片，返回字符串；多张图片返回数组
              return urls.length === 1 ? urls[0] : urls
            }
          }
        } else if (contentType && contentType.startsWith("image/")) {
          const buffer = await response.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          logInfo(`API 成功响应 (Image Buffer): data:${contentType};base64,[${base64.length} chars]`)
          return `data:${contentType};base64,${base64}`
        }

        throw new Error("未知的 API 响应格式")
      } catch (error) {
        const errorMsg = error.message || '请求失败'
        ctx.logger.error(`API 请求失败: ${errorMsg}`, error)
        throw new Error(errorMsg)
      }
    }

    function logInfo(...args: any[]) {
      if (config.loggerinfo) {
        logger.info.apply(logger, args);
      }
    }
  })
}