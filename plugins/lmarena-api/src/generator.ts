import { Context, h, Session } from "koishi"
import type { Config } from "./config"
import type { AppLogger } from "./logger"
import { API_URL_HTML_ERROR, callImageApi } from "./api"
import { getUserCurrency, updateUserCurrency } from "./currency"
import { getAgnesConfig } from "./agnes"
import { resolveApiModeForInput } from "./mode"

// 货币功能开启时先检查余额，余额不足时直接返回 false
export async function checkCurrency(
  ctx: Context,
  session: Session,
  config: Config,
  log: AppLogger,
): Promise<boolean> {
  if (!config.monetaryCommands || !ctx.monetary) return true

  const quote = h.quote(session.messageId)
  try {
    const userId = session.userId ?? ""
    const currentBalance = await getUserCurrency(ctx, userId, config.currency, log)
    const requiredAmount = Math.abs(config.monetaryCost)

    if (currentBalance < requiredAmount) {
      await session.send([
        quote,
        h.text(session.text(`commands.${config.basename}.messages.insufficientCurrency`, [
          currentBalance,
          config.currency,
          requiredAmount,
        ])),
      ])
      return false
    }

    return true
  } catch (error) {
    log.error(`检查用户 ${session.userId ?? ""} 货币余额时出错:`, error)
    await session.send([quote, h.text("检查货币余额时出错，请稍后重试。")])
    return false
  }
}

// 统一处理图片下载、API 调用、货币扣除与结果发送
export async function generateImage(
  ctx: Context,
  session: Session,
  images: string[],
  prompt: string,
  config: Config,
  log: AppLogger,
): Promise<boolean> {
  const quote = h.quote(session.messageId)

  try {
    const mode = resolveApiModeForInput(config, images.length > 0)
    const agnes = config.agnesMode ? getAgnesConfig(config.agnesAPIkey) : undefined
    const apiUrl = agnes?.apiUrl ?? config.apiUrl
    const apiKey = agnes?.apiKey ?? config.apiKey
    const apiParams = agnes?.apiParams ?? config.apiParams

    let processingMessageId: string | undefined
    if (!config.disableWaitingTips) {
      const [messageId] = await session.send([
        quote,
        h.text(session.text(`commands.${config.basename}.messages.processing`)),
      ])
      processingMessageId = messageId
    }

    const files = images.length > 0
      ? await Promise.all(
        images.map(src => ctx.http.file(src).catch(error => {
          log.error(`下载图片失败: ${src}`, error)
          return null
        })),
      ).then(results => results.filter((file): file is NonNullable<typeof file> => file !== null))
      : []

    if (files.length === 0 && images.length > 0) {
      await session.send(h.text(session.text(`commands.${config.basename}.messages.invalidimage`)))
      await deleteProcessingMessage(session, processingMessageId, log)
      return false
    }

    if (files.length === 0 && mode === "edits") {
      await session.send(h.text(session.text(`commands.${config.basename}.messages.editsNeedImage`)))
      await deleteProcessingMessage(session, processingMessageId, log)
      return false
    }

    if (files.length > 0 && mode === "generations" && !config.agnesMode) {
      await session.send(h.text(session.text(`commands.${config.basename}.messages.generationsNoImage`)))
      await deleteProcessingMessage(session, processingMessageId, log)
      return false
    }

    const result = await callImageApi(ctx, files, prompt, {
      apiUrl,
      apiKey,
      apiMode: mode,
      apiParams,
      agnesMode: config.agnesMode,
      log,
    })

    if (!result) {
      await session.send(h.text(session.text(`commands.${config.basename}.messages.failed`)))
      await deleteProcessingMessage(session, processingMessageId, log)
      return false
    }

    if (config.monetaryCommands && ctx.monetary) {
      try {
        const userId = session.userId ?? ""
        await updateUserCurrency(ctx, userId, config.monetaryCost, config.currency, log)
        const newBalance = await getUserCurrency(ctx, userId, config.currency, log)
        await session.send(h.text(session.text(`commands.${config.basename}.messages.currencyDeducted`, [
          Math.abs(config.monetaryCost),
          config.currency,
          newBalance,
        ])))
      } catch (error) {
        log.error(`扣除用户 ${session.userId ?? ""} 货币时出错:`, error)
        await session.send(h.text("货币扣除失败，但图片已生成。"))
      }
    }

    await deleteProcessingMessage(session, processingMessageId, log)

    if (Array.isArray(result)) {
      await session.send(result.map(url => h.image(url)))
    } else {
      await session.send(h.image(result))
    }
    return true
  } catch (error) {
    log.error("处理图片时发生错误:", error)
    const errorText = error instanceof Error ? error.message : String(error)
    if (errorText === API_URL_HTML_ERROR) {
      await session.send(h.text(session.text(`commands.${config.basename}.messages.invalidApiUrl`)))
    } else if (isNotFoundError(errorText)) {
      await session.send(h.text(session.text(`commands.${config.basename}.messages.apiModeHint`)))
    } else {
      await session.send(h.text(session.text(`commands.${config.basename}.messages.error`, [errorText])))
    }
    return false
  }
}

async function deleteProcessingMessage(
  session: Session,
  messageId: string | undefined,
  log: AppLogger,
): Promise<void> {
  if (!messageId) return
  try {
    await session.bot.deleteMessage(session.channelId, messageId)
  } catch (error) {
    log.warn("删除处理中提示消息失败:", error)
  }
}

function isNotFoundError(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes("not found") || /(^|\D)404(\D|$)/.test(message)
}
