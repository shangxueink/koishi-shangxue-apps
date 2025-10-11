import { Context, Schema, h, Logger, Session } from "koishi"
import defaultCommands from './command.json'

export const name = "image-edit"
export const inject = ["http", "logger", "i18n"]

export const usage = `
---

通过配置API，调用 {{URL}}/v1/images/edits 接口实现手办化插件的功能。

推荐站点：https://happyapi.org/

这个比较便宜捏（

---

如果你也使用的是happyapi，那么使用默认配置，直接开启插件就可以使用啦。

如果你是其他API站点，请手动编辑配置项的请求参数，**尤其是模型！**
`;

const logger = new Logger(name)

interface Command {
  name: string
  prompt: string
  enabled: boolean
  custom: boolean
  maxImages: number
  waitTimeout: number
  defaultImageUrls: string[]
  apiParams: Record<string, string>
}

interface Config {
  basename: string
  apiUrl: string
  apiKey: string
  nested: {
    commands: Command[]
  }
  loggerinfo: boolean
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    basename: Schema.string().default("imagen").description("父级指令名称"),
    apiUrl: Schema.string().default("https://cn.happyapi.org/v1/images/edits").role("link").description("API 服务器地址"),
    apiKey: Schema.string().role("secret").required().description("API 密钥"),
    nested: Schema.object({
      commands: Schema.array(
        Schema.object({
          name: Schema.string().required().description("<hr><hr><hr><hr><hr><br>指令名称"),
          enabled: Schema.boolean().default(true).description("是否启用该指令"),
          maxImages: Schema.number().default(1).min(0).max(5).description("需要用户提供的图片数量（不包括默认图片）"),
          defaultImageUrls: Schema.array(Schema.string().role("link")).description("默认图片URL列表（即默认输入一张图，此图不计入用户图片数量）").default([]),
          waitTimeout: Schema.number().default(50).max(200).min(10).step(1).description("等待输入图片的最大时间（秒）"),
          custom: Schema.boolean().default(false).description("是否为【用户自定义指令】（需要用户输入提示词）"),
          prompt: Schema.string().role("textarea", { rows: [4, 4] }).description("该指令对应的提示词（【用户自定义指令】可留空此项）"),
          apiParams: Schema.dict(String).role('table').description("自定义API请求的body参数").default({
            "model": "",
            "prompt": "{{prompt}}",
            "size": "1024x1024",
            "n": "1",
            "type": "normal",
            "response_format": "url"
          }),
          // @ts-ignore
        })).description("指令配置").default(defaultCommands),
    }).collapse().description("指令配置"),
  }).description("基础配置"),

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
            waitpromptmultiple: "请在{0}秒内发送{1}张图片...",
            customprompt: "请在{0}秒内输入自定义提示词...",
            invalidimage: "未检测到有效的图片，请重新发送带图片的消息",
            processing: "正在处理图片，请稍候...",
            failed: "图片生成失败，请稍后重试",
            error: "处理过程中发生错误: {0}",
            needprompt: "请提供自定义提示词",
            needimages: "请提供至少一张图片"
          },
        },
      }
    });

    ctx.command(config.basename)

    for (const cmdConfig of config.nested.commands) {
      if (!cmdConfig.enabled) continue;

      ctx.command(`${config.basename}.${cmdConfig.name} [message:text]`)
        .usage(`${cmdConfig.name} 处理图片`)
        .action(async ({ session }, message) => {
          if (!session) return
          const quote = h.quote(session.messageId)
          const { custom, maxImages, waitTimeout, defaultImageUrls } = cmdConfig
          let promptText = cmdConfig.prompt
          let images: string[] = []

          if (defaultImageUrls.length > 0) {
            images.push(...defaultImageUrls)
            logInfo(`添加 ${defaultImageUrls.length} 张默认图片`)
          }

          if (custom) {
            let textContent: string | undefined
            if (message) {
              const textElements = h.select(session.stripped.content, "text")
              if (textElements.length > 0) {
                textContent = textElements.map(el => el.attrs.content || "").join(" ").trim()
              }
            }

            if (textContent) {
              promptText = promptText ? `${promptText}\n\n${textContent}` : textContent
            }

            if (!promptText) {
              await session.send(h.text(session.text(`commands.${config.basename}.messages.customprompt`, [waitTimeout])))
              const userPrompt = await session.prompt(waitTimeout * 1000)
              if (userPrompt) {
                promptText = cmdConfig.prompt ? `${cmdConfig.prompt}\n\n${userPrompt}` : userPrompt
              } else {
                await session.send(h.text(session.text(`commands.${config.basename}.messages.needprompt`)))
                return
              }
            }
          }

          const extractedImages = extractImagesFromSession(session)
          images.push(...extractedImages)

          const remainingImages = Math.max(0, maxImages - extractedImages.length)
          if (remainingImages > 0) {
            await session.send(h.text(session.text(`commands.${config.basename}.messages.waitpromptmultiple`, [waitTimeout, remainingImages])))
            for (let i = 0; i < remainingImages; i++) {
              const promptContent = await session.prompt(waitTimeout * 1000)
              if (promptContent) {
                images.push(...extractImagesFromMessage(promptContent))
              } else {
                break
              }
            }
          }

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
              return h.image(result)
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

    async function callImageEditApi(files: { data: ArrayBuffer, mime: string, filename: string }[], prompt: string, apiParams: Record<string, string>): Promise<string | null> {
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

      logInfo("使用 fetch 发送 API 请求:", {
        url: config.apiUrl,
        ...logParams,
        prompt: (logParams['prompt'] || '').substring(0, 100) + ((logParams['prompt'] || '').length > 100 ? '...' : ''),
        imageCount: files.length
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
          if (result.data && Array.isArray(result.data) && result.data[0].url) {
            logInfo("API 成功响应 (JSON):", result.data[0].url)
            return result.data[0].url
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