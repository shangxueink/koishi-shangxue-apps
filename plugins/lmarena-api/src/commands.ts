import { Context, h } from "koishi"
import type { Config } from "./config"
import type { AppLogger } from "./logger"
import { callImageApi } from "./api"
import { extractImagesFromMessage, extractImagesFromSession } from "./session"
import { getUserCurrency, updateUserCurrency } from "./currency"

// 注册命令、i18n 与完整调用流程；所有生命周期都挂在当前 ctx 上由 Koishi 自动清理
export function registerCommands(ctx: Context, config: Config, log: AppLogger): void {
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
            needimages: "请发送图片：",
            insufficientCurrency: "余额不足！当前余额: {0} {1}，需要: {2} {1}",
            currencyDeducted: "成功扣除 {0} {1}，当前余额: {2} {1}",
            noImagesInPrompt: "未检测到图片，请稍后重新交互。",
            promptTimeout: "等待输入超时，请稍后重试。",
            promptError: "交互式输入发生错误，请稍后重试。"
          },
        },
      }
    })

    ctx.command(config.basename)

    for (const cmdConfig of config.customCommands) {
      if (!cmdConfig.enabled) continue

      ctx.command(`${config.basename}.${cmdConfig.name} [...args]`, `${cmdConfig.name} 风格绘画`, { authority: config.commandAuthority })
        .usage(`${cmdConfig.name} 处理图片`)
        .userFields(["id"])
        .action(async ({ session }) => {
          if (!session) return

          const quote = h.quote(session.messageId)
          const promptText = cmdConfig.prompt
          let images: string[] = []

          // 如果启用了货币服务，先检查用户余额
          if (config.monetaryCommands && ctx.monetary) {
            try {
              const currentBalance = await getUserCurrency(ctx, String(session.user.id), config.currency, log)
              const requiredAmount = Math.abs(config.monetaryCost)

              if (currentBalance < requiredAmount) {
                await session.send([
                  quote,
                  h.text(session.text(`commands.${config.basename}.messages.insufficientCurrency`, [
                    currentBalance,
                    config.currency,
                    requiredAmount
                  ]))
                ])
                return
              }
            } catch (error) {
              log.error(`检查用户 ${session.user.id} 货币余额时出错:`, error)
              await session.send([quote, h.text("检查货币余额时出错，请稍后重试。")])
              return
            }
          }

          // 从当前消息和引用消息中提取图片
          images.push(...extractImagesFromSession(session))

          // 如果没有图片，进入交互式输入模式
          if (images.length === 0) {
            const [needimagesMessageId] = await session.send(h.text(session.text(`commands.${config.basename}.messages.needimages`)))

            try {
              const promptContent = await session.prompt(config.waitTimeout * 1000)
              if (promptContent) {
                const interactiveImages = extractImagesFromMessage(promptContent)
                images.push(...interactiveImages)

                if (images.length === 0) {
                  await session.send(h.text(session.text(`commands.${config.basename}.messages.noImagesInPrompt`)))
                  return
                }

                try {
                  await session.bot.deleteMessage(session.channelId, needimagesMessageId)
                } catch (deleteError) {
                  log.warn(`删除交互提示消息失败:`, deleteError)
                }
                log.info(`通过交互模式收集到 ${interactiveImages.length} 张图片:`, interactiveImages)
              } else {
                await session.send(h.text(session.text(`commands.${config.basename}.messages.promptTimeout`)))
                return
              }
            } catch (error) {
              if (error.message.includes("timeout")) {
                await session.send(h.text(session.text(`commands.${config.basename}.messages.promptTimeout`)))
              } else {
                log.error(`交互式图片输入失败:`, error)
                await session.send(h.text(session.text(`commands.${config.basename}.messages.promptError`)))
              }
              return
            }
          }

          log.info(`收集到 ${images.length} 张图片:`, images)

          try {
            const [processingMessageId] = await session.send([quote, h.text(session.text(`commands.${config.basename}.messages.processing`))])

            // 下载输入图片，任一失败时跳过
            const files = await Promise.all(
              images.map(src => ctx.http.file(src).catch(err => {
                log.error(`下载图片失败: ${src}`, err)
                return null
              }))
            ).then(results => results.filter((file): file is NonNullable<typeof file> => file !== null))

            if (files.length === 0) {
              await session.send(h.text(session.text(`commands.${config.basename}.messages.invalidimage`)))
              return
            }

            // 调用 API，edits/generations 协议在 api.ts 中统一处理
            const result = await callImageApi(ctx, files, promptText, {
              apiUrl: config.apiUrl,
              apiKey: config.apiKey,
              apiMode: config.apiMode,
              apiParams: config.apiParams,
              extraBodyCompat: config.extraBodyCompat,
              log,
            })

            if (result) {
              // 成功获取图片后，如果启用了货币服务，则扣除相应费用
              if (config.monetaryCommands && ctx.monetary) {
                try {
                  await updateUserCurrency(ctx, String(session.user.id), config.monetaryCost, config.currency, log)
                  const newBalance = await getUserCurrency(ctx, String(session.user.id), config.currency, log)
                  await session.send(h.text(session.text(`commands.${config.basename}.messages.currencyDeducted`, [
                    Math.abs(config.monetaryCost),
                    config.currency,
                    newBalance
                  ])))
                } catch (error) {
                  log.error(`扣除用户 ${session.user.id} 货币时出错:`, error)
                  await session.send(h.text("货币扣除失败，但图片已生成。"))
                }
              }

              try {
                await session.bot.deleteMessage(session.channelId, processingMessageId)
              } catch (deleteError) {
                log.warn(`删除处理中提示消息失败:`, deleteError)
              }

              if (Array.isArray(result)) {
                await session.send(result.map(url => h.image(url)))
              } else {
                await session.send(h.image(result))
              }
              return
            }

            await session.send(h.text(session.text(`commands.${config.basename}.messages.failed`)))
          } catch (error) {
            log.error(`[${cmdConfig.name}] 处理图片时发生错误:`, error)
            await session.send(h.text(session.text(`commands.${config.basename}.messages.error`, [error.message || "未知错误"])))
          }
        })
    }
  })
}
