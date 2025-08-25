import { Context, Schema, h, Logger } from 'koishi'

export const name = 'ainanobanana'

export interface Config {
  commandName: string
  waitTimeout: number
  prompt: string
  maxRetries: number
  retryInterval: number
  loggerinfo: boolean
}

export const Config: Schema<Config> = Schema.object({
  commandName: Schema.string().default('手办化').description('指令名称'),
  waitTimeout: Schema.number().default(50).max(120).min(10).step(1).description("等待输入图片的最大时间（秒）"),
  prompt: Schema.string().role('textarea', { rows: [6, 4] }).default('Please turn this photo into a figure. Behind it, there should be a partially transparent plastic paper box with the character from this photo printed on it. In front of the box, on a round plastic base, place the figure version of the photo I gave you. I\'d like the PVC material to be clearly represented. It would be even better if the background is indoors.').description('AI 绘制提示词'),
  maxRetries: Schema.number().default(30).description('最大轮询次数'),
  retryInterval: Schema.number().default(3000).description('轮询间隔(毫秒)'),
  loggerinfo: Schema.boolean().default(false).description("日志调试模式"),
})
export const usage = `
---

灵感来自：

- https://ainanobanana.ai/dashboard
- https://www.bilibili.com/video/BV1aHY4zfEKu/

---

> 看到其他bot有这个功能，就模仿了一个啦！


更多功能请前往 https://ainanobanana.ai/dashboard  体验吧！


---
`;


interface GenerateResponse {
  taskId: string
  remainingCredits: number
  isGuest: boolean
}

interface StatusResponse {
  taskId: string
  status: number
  outputImage?: string
  error?: string
}

const logger = new Logger('DEV:ainanobanana')

export function apply(ctx: Context, config: Config) {

  ctx.command(`${config.commandName} [...args]`, '将图片转换为手办风格')
    .action(async ({ session, args }) => {
      if (!session) return '会话信息不可用'

      // 智能查找图片参数
      let src: string | undefined;

      // 检查参数中是否有图片链接
      for (const arg of args) {
        if (arg && typeof arg === 'string') {
          const imgSrc = h.select(arg, 'img').map(item => item.attrs.src)[0] ||
            h.select(arg, 'mface').map(item => item.attrs.url)[0];
          if (imgSrc) {
            src = imgSrc;
            break;
          }
        }
      }

      // 检查消息内容中是否有图片
      if (!src) {
        src = h.select(session.content, 'img').map(item => item.attrs.src)[0] ||
          h.select(session.content, 'mface').map(item => item.attrs.url)[0];
      }

      // 检查引用消息中是否有图片
      if (!src && session.quote) {
        src = h.select(session.quote.content, 'img').map(item => item.attrs.src)[0] ||
          h.select(session.quote.content, 'mface').map(item => item.attrs.url)[0];
      }

      if (!src) {
        logInfo("暂未输入图片，即将交互获取图片输入");
      } else {
        logInfo(src.slice(0, 200));
      }

      if (!src) {
        const [msgId] = await session.send(session.text(".waitprompt", [config.waitTimeout]))
        const promptcontent = await session.prompt(config.waitTimeout * 1000)
        if (promptcontent !== undefined) {
          src = h.select(promptcontent, 'img')[0]?.attrs.src || h.select(promptcontent, 'mface')[0]?.attrs.url
        }
        try {
          await session.bot.deleteMessage(session.channelId, msgId)
        } catch {
          ctx.logger.warn(`在频道 ${session.channelId} 尝试撤回消息ID ${msgId} 失败。`)
        }
      }

      const quote = h.quote(session.messageId)

      if (!src) {
        await session.send(`${quote}${session.text(".invalidimage")}`);
        return
      }

      if (!src) {
        return '图片链接无效'
      }

      try {
        await session.send(quote + '正在处理图片，请稍候...')
        const file = await ctx.http.file(src)
        logInfo(file)
        // 生成图片
        const result = await generateFigureImage(file.data)

        if (result) {
          return h.image(result)
        } else {
          return '图片生成失败，请稍后重试'
        }
      } catch (error) {
        ctx.logger.error('处理图片时发生错误:', error)
        return '处理过程中发生错误，请稍后重试'
      }
    })

  /**
   * 生成手办化图片
   */
  async function generateFigureImage(imageBuffer: ArrayBuffer): Promise<string | null> {
    try {
      // 创建 FormData
      const formData = new FormData()
      formData.append('prompt', config.prompt)
      formData.append('image', new Blob([imageBuffer], { type: 'image/jpeg' }), 'image.jpg')

      // 发送生成请求
      const generateResponse = await ctx.http.post<GenerateResponse>(
        'https://ainanobanana.ai/api/image/generate',
        formData,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
          }
        }
      )

      ctx.logger.info('生成任务已提交，任务ID:', generateResponse.taskId)

      // 轮询检查状态
      const imageUrl = await pollTaskStatus(ctx, config, generateResponse.taskId)

      return imageUrl
    } catch (error) {
      ctx.logger.error('生成图片失败:', error)
      return null
    }
  }

  /**
   * 轮询任务状态
   */
  async function pollTaskStatus(ctx: Context, config: Config, taskId: string): Promise<string | null> {
    let retries = 0

    while (retries < config.maxRetries) {
      try {
        const statusResponse = await ctx.http.get<StatusResponse>(
          `https://ainanobanana.ai/api/image/status/${taskId}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
            }
          }
        )

        logInfo(`任务状态检查 ${retries + 1}/${config.maxRetries}:`, statusResponse.status)

        if (statusResponse.status === 1 && statusResponse.outputImage) {
          // 任务完成，返回图片URL
          ctx.logger.info('图片生成完成:', statusResponse.outputImage)
          return statusResponse.outputImage
        } else if (statusResponse.error) {
          // 任务失败
          ctx.logger.error('任务失败:', statusResponse.error)
          return null
        }

        // 任务还在进行中，等待后继续轮询
        await sleep(config.retryInterval)
        retries++
      } catch (error) {
        ctx.logger.error('检查任务状态失败:', error)
        retries++
        await sleep(config.retryInterval)
      }
    }

    ctx.logger.warn('轮询超时，任务可能仍在处理中')
    return null
  }

  /**
   * 延时函数
   */
  function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  function logInfo(...args: any[]) {
    if (config.loggerinfo) {
      (logger.info as (...args: any[]) => void)(...args);
    }
  }
}