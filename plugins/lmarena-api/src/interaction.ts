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

export interface PromptSelection {
  prompt: string
  presetName: string | null
}

// 先收集当前消息或交互回复中的图片；text 用于父级指令直接复用为提示词
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

// 父级指令继续收集自定义提示词，支持直接输入或回复编号选择预设
export async function collectPrompt(
  session: Session,
  suppliedPrompt: string,
  config: Config,
  log: AppLogger,
): Promise<PromptSelection | null> {
  const presets = config.customCommands.filter(command => command.enabled)
  const input = suppliedPrompt.trim()

  if (input) {
    const selection = resolvePromptInput(input, presets)
    if (selection) {
      log.info(`父级交互使用提示词来源: ${selection.presetName ?? "自定义"}`)
      return selection
    }
  }

  const [needPromptMessageId] = await session.send(buildPromptHint(session, config, presets))

  try {
    const reply = await session.prompt(config.waitTimeout * 1000)
    if (!reply) {
      await session.send(h.text(session.text(`commands.${config.basename}.messages.promptTimeout`)))
      return null
    }

    const selection = resolvePromptInput(reply, presets)
    if (!selection) {
      await session.send(h.text(session.text(`commands.${config.basename}.messages.noPrompt`)))
      return null
    }

    await deleteHintMessage(session, needPromptMessageId, log, "提示词交互提示")
    log.info(`父级交互选择提示词来源: ${selection.presetName ?? "自定义"}`)
    return selection
  } catch (error) {
    if (isTimeoutError(error)) {
      await session.send(h.text(session.text(`commands.${config.basename}.messages.promptTimeout`)))
    } else {
      log.error("交互式提示词输入失败:", error)
      await session.send(h.text(session.text(`commands.${config.basename}.messages.promptError`)))
    }
    return null
  }
}

// 纯数字且落在预设范围内时按预设处理，否则按自定义提示词处理
function resolvePromptInput(input: string, presets: Command[]): PromptSelection | null {
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
    return { prompt: preset.prompt, presetName: preset.name }
  }

  return { prompt: trimmed, presetName: null }
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
