import { h, Session } from "koishi"
import type { Command, Config } from "./config"
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
    const [needImagesMessageId] = await session.send(
      h.text(session.text(`commands.${config.basename}.messages.needimages`)),
    )

    try {
      const reply = await session.prompt(config.waitTimeout * 1000)
      if (!reply) {
        await session.send(h.text(session.text(`commands.${config.basename}.messages.promptTimeout`)))
        return null
      }

      images.push(...extractImagesFromMessage(reply))
      if (!text) text = extractTextFromMessage(reply)

      if (images.length === 0) {
        await session.send(h.text(session.text(`commands.${config.basename}.messages.noImagesInPrompt`)))
        return null
      }

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

// 父级指令：图片和提示词可以按任意顺序、分多次输入，缺哪项就继续问哪项
export async function collectParentInput(
  session: Session,
  extraContent: string,
  config: Config,
  log: AppLogger,
): Promise<ParentInput | null> {
  const presets = config.customCommands.filter(command => command.enabled)
  const suppliedPrompt = extractTextFromMessage(extraContent)
  const initialImages = [
    ...extractImagesFromSession(session),
    ...extractImagesFromMessage(extraContent),
  ]
  const images = [...new Set(initialImages)]
  let prompt = suppliedPrompt
    ? resolvePromptInput(suppliedPrompt, presets)?.prompt ?? ""
    : ""
  let hintMessageId: string | undefined

  while (images.length === 0 || !prompt) {
    const needImages = images.length === 0
    const [sentMessageId] = await session.send(
      needImages
        ? h.text(session.text(`commands.${config.basename}.messages.needimages`))
        : buildPromptHint(session, config, presets),
    )
    hintMessageId = sentMessageId

    let reply: string | undefined
    try {
      reply = await session.prompt(config.waitTimeout * 1000)
    } catch (error) {
      if (isTimeoutError(error)) {
        await session.send(h.text(session.text(`commands.${config.basename}.messages.promptTimeout`)))
      } else {
        log.error("交互式输入失败:", error)
        await session.send(h.text(session.text(`commands.${config.basename}.messages.promptError`)))
      }
      return null
    }

    if (!reply) {
      await session.send(h.text(session.text(`commands.${config.basename}.messages.promptTimeout`)))
      return null
    }

    const replyImages = extractImagesFromMessage(reply)
    const replyText = extractTextFromMessage(reply)
    if (replyImages.length === 0 && !replyText) {
      await session.send(h.text(session.text(`commands.${config.basename}.messages.needInput`)))
      return null
    }

    images.push(...replyImages)
    if (!prompt) {
      const selection = resolvePromptInput(replyText, presets)
      if (selection) prompt = selection.prompt
    }

    await deleteHintMessage(session, hintMessageId, log, needImages ? "图片交互提示" : "提示词交互提示")
    hintMessageId = undefined
  }

  const uniqueImages = [...new Set(images)]
  log.info(`父级交互收集到 ${uniqueImages.length} 张图片和提示词:`, {
    prompt: prompt.substring(0, 100),
  })
  return { images: uniqueImages, prompt }
}

// 纯数字且落在预设范围内时按预设处理，否则按自定义提示词处理
function resolvePromptInput(input: string, presets: Command[]): { prompt: string } | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const index = Number(trimmed)
  if (
    presets.length > 0
    && Number.isInteger(index)
    && index >= 1
    && index <= presets.length
  ) {
    const preset = presets[index - 1]
    return { prompt: preset.prompt }
  }

  return { prompt: trimmed }
}

function buildPromptHint(session: Session, config: Config, presets: Command[]): h[] {
  const list = presets.map((command, index) => `${index + 1}. ${command.name}`).join("\n")
  if (!list) {
    return [h.text(session.text(`commands.${config.basename}.messages.needPrompt`))]
  }
  return [
    h.text(session.text(`commands.${config.basename}.messages.needPromptWithPresets`, [list])),
  ]
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
