import type { Context, Session } from 'koishi'
import type { Config, JrysData } from '../types'

/**
 * 发送 Markdown 消息
 */
export async function sendmarkdownMessage(
  ctx: Context,
  session: Session,
  message: any,
  logInfo: (...args: any[]) => void
): Promise<any> {
  logInfo(message)
  try {
    const { guild, user } = session.event
    const { qq, qqguild, channelId } = session as any
    if (guild?.id) {
      if (qq) {
        return await qq.sendMessage(channelId, message)
      }
      if (qqguild) {
        return await qqguild.sendMessage(channelId, message)
      }
    } else if (user?.id && qq) {
      return await qq.sendPrivateMessage(user.id, message)
    }
  } catch (error) {
    ctx.logger.error(`发送 markdown 消息时出错: ${error}`)
  }
  return undefined
}

/**
 * 构建 Markdown 消息
 */
export async function markdown(
  ctx: Context,
  session: Session,
  encodedMessageTime: string,
  imageUrl: string,
  imageToload: string,
  dJson: JrysData,
  config: Config,
  logInfo: (...args: any[]) => void
): Promise<any> {
  const markdownMessage: any = {
    msg_type: 2,
    markdown: {},
    keyboard: {},
  }

  markdownMessage.msg_id = session.messageId
  let originalWidth: number
  let originalHeight: number
  const sizeMatch = imageUrl.match(/\?px=(\d+)x(\d+)$/)
  if (sizeMatch) {
    originalWidth = parseInt(sizeMatch[1], 10)
    originalHeight = parseInt(sizeMatch[2], 10)
  } else {
    const canvasimage = await ctx.canvas.loadImage(imageToload || imageUrl)
    // @ts-ignore
    originalWidth = canvasimage.naturalWidth || canvasimage.width
    // @ts-ignore
    originalHeight = canvasimage.naturalHeight || canvasimage.height
  }

  if (config.markdown_button_mode === 'raw') {
    try {
      const rawMarkdownContent = config.nested.raw_markdown_button_content
      const rawMarkdownKeyboard = config.nested.raw_markdown_button_keyboard
      const qqbotatuser = session.isDirect ? '\n' : `<qqbot-at-user id="${session.userId}" />`
      const replacedMarkdownContent = replacePlaceholders(rawMarkdownContent, {
        session,
        qqbotatuser,
        config,
        img_pxpx: `img#${originalWidth}px #${originalHeight}px`,
        img_url: imageUrl,
        encodedMessageTime,
        dJson,
      }, true)
      const replacedMarkdownKeyboard = replacePlaceholders(rawMarkdownKeyboard, {
        session,
        qqbotatuser,
        config,
        encodedMessageTime,
        dJson,
      }, true)
        .replace(/^[\s\S]*?"keyboard":\s*/, '')
        .replace(/\\n/g, '')
        .replace(/\\"/g, '"')
        .trim()

      const keyboard = JSON.parse(replacedMarkdownKeyboard)

      markdownMessage.markdown = {
        content: replacedMarkdownContent,
      }
      markdownMessage.keyboard = {
        content: keyboard,
      }
    } catch (error) {
      ctx.logger.error(`解析原生 Markdown 出错: ${error}`)
      return null
    }
  }

  logInfo(`Markdown 模板参数: ${JSON.stringify(markdownMessage, null, 2)}`)
  return markdownMessage
}

/**
 * 替换占位符
 */
export function replacePlaceholders(content: any, context: any, isRawMode = false): any {
  if (typeof content === 'string') {
    if (!/\{\{\.([^}]+)\}\}|\$\{([^}]+)\}/.test(content)) {
      return isRawMode ? content : [content]
    }

    const value = content.replace(/\{\{\.([^}]+)\}\}|\$\{([^}]+)\}/g, (match, p1, p2) => {
      const key = p1 || p2
      const replacement = key.split('.').reduce((obj, k) => obj?.[k], context) || match
      return replacement
    })

    return isRawMode ? value : [value]
  }

  if (typeof content === 'object' && content !== null) {
    if (Array.isArray(content)) {
      return content.map(item => replacePlaceholders(item, context, isRawMode))
    }
    const result: Record<string, any> = {}
    for (const key in content) {
      result[key] = replacePlaceholders(content[key], context, isRawMode)
    }
    return result
  }

  return content
}
