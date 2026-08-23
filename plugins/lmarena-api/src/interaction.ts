import { h, Session } from "koishi"
import type { Config } from "./config"
import type { AppLogger } from "./logger"
import {
  extractImagesFromMessage,
  extractImagesFromSession,
  extractTextFromMessage,
} from "./session"

export interface ImageCollection {
  images: string[]
  text: string
}

export interface ParentInput {
  images: string[]
  prompt: string
}

// 先收集当前消息或交互回复中的图片；text 用于子命令固定提示词场景
export async function collectImages(
  session: Session,
  extraContent: string,
  config: Config,
  log: AppLogger,
): Promise<ImageCollection | null> {
  const images = extractImagesFromSession(session)
  const textParts: string[] = []
  if (extraContent) {
    images.push(...extractImagesFromMessage(extraContent))
    textParts.push(extractTextFromMessage(extraContent))
  }
  let text = textParts.filter(Boolean).join(" ").trim()

  if (images.length === 0) {
    const useOptionalImage = config.apiMode === "generations"
    const [needImagesMessageId] = await session.send(
      h.text(session.text(`commands.${config.basename}.messages.${useOptionalImage ? "needimagesOptional" : "needimages"}`)),
    )

    try {
      const reply = await session.prompt(config.waitTimeout * 1000)
      if (!reply) {
        await session.send(h.text(session.text(`commands.${config.basename}.messages.promptTimeout`)))
        return null
      }

      const replyImages = extractImagesFromMessage(reply)
      const replyText = extractTextFromMessage(reply)

      if (replyImages.length === 0) {
        await deleteHintMessage(session, needImagesMessageId, log, "图片交互提示")
        if (useOptionalImage && replyText) {
          if (!text) text = replyText
          await session.send(h.text(session.text(`commands.${config.basename}.messages.textToImageHint`)))
          log.info("未检测到参考图片，将按文字提示词生成")
          return { images: [...new Set(images)], text }
        }
        if (useOptionalImage) {
          await session.send(h.text(session.text(`commands.${config.basename}.messages.noImagesInPrompt`)))
        } else {
          await session.send(h.text(session.text(`commands.${config.basename}.messages.editsNeedImage`)))
        }
        return null
      }

      images.push(...replyImages)
      if (!text) text = replyText
      await deleteHintMessage(session, needImagesMessageId, log, "图片交互提示")
      log.info(`通过交互模式收集到 ${images.length} 张图片:`, images)
    } catch (error) {
      if (isTimeoutError(error)) {
        await session.send(h.text(session.text(`commands.${config.basename}.messages.promptTimeout`)))
      } else {
        log.error("交互式图片输入失败:", error)
        await session.send(h.text(session.text(`commands.${config.basename}.messages.promptError`)))
      }
      return null
    }
  }

  const uniqueImages = [...new Set(images)]
  log.info(`收集到 ${uniqueImages.length} 张图片:`, uniqueImages)
  return { images: uniqueImages, text }
}

// 父级指令固定顺序：先收集提示词，再收集图片，避免用户误解流程
export async function collectParentInput(
  session: Session,
  extraContent: string,
  config: Config,
  log: AppLogger,
): Promise<ParentInput | null> {
  const initialImages = [
    ...extractImagesFromSession(session),
    ...extractImagesFromMessage(extraContent),
  ]
  const images = [...new Set(initialImages)]
  let prompt = extractTextFromMessage(extraContent).trim()

  if (!prompt) {
    const [needPromptMessageId] = await session.send(
      h.text(session.text(`commands.${config.basename}.messages.needPrompt`)),
    )
    const reply = await waitForInput(session, config, log)
    if (!reply) return null

    const replyText = extractTextFromMessage(reply)
    if (!replyText) {
      await deleteHintMessage(session, needPromptMessageId, log, "提示词交互提示")
      await session.send(h.text(session.text(`commands.${config.basename}.messages.noPrompt`)))
      return null
    }

    prompt = replyText
    images.push(...extractImagesFromMessage(reply))
    await deleteHintMessage(session, needPromptMessageId, log, "提示词交互提示")
  }

  if (images.length === 0) {
    const collection = await collectImages(session, "", config, log)
    if (!collection) return null
    images.push(...collection.images)
  }

  const uniqueImages = [...new Set(images)]
  log.info(`父级交互收集到 ${uniqueImages.length} 张图片和提示词:`, {
    prompt: prompt.substring(0, 100),
  })
  return { images: uniqueImages, prompt }
}

async function waitForInput(
  session: Session,
  config: Config,
  log: AppLogger,
): Promise<string | null> {
  try {
    const reply = await session.prompt(config.waitTimeout * 1000)
    if (!reply) {
      await session.send(h.text(session.text(`commands.${config.basename}.messages.promptTimeout`)))
      return null
    }
    return reply
  } catch (error) {
    if (isTimeoutError(error)) {
      await session.send(h.text(session.text(`commands.${config.basename}.messages.promptTimeout`)))
    } else {
      log.error("交互式输入失败:", error)
      await session.send(h.text(session.text(`commands.${config.basename}.messages.promptError`)))
    }
    return null
  }
}

async function deleteHintMessage(
  session: Session,
  messageId: string | undefined,
  log: AppLogger,
  label: string,
): Promise<void> {
  if (!messageId) return
  try {
    await session.bot.deleteMessage(session.channelId, messageId)
  } catch (error) {
    log.warn(`删除${label}失败:`, error)
  }
}

function isTimeoutError(error: unknown): boolean {
  return String(error).toLowerCase().includes("timeout")
}
