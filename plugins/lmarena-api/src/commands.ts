import { Context } from "koishi"
import type { Config } from "./config"
import type { AppLogger } from "./logger"
import { collectImages, collectParentInput } from "./interaction"
import { checkCurrency, generateImage } from "./generator"

// 注册父级交互绘图、预设子命令与 i18n
export function registerCommands(ctx: Context, config: Config, log: AppLogger): void {
  ctx.on("ready", () => {
    ctx.i18n.define("zh-CN", {
      commands: {
        [config.basename]: {
          description: "AI 交互绘图",
          messages: {
            invalidimage: "未检测到有效的图片，请重新发送带图片的消息。",
            processing: "正在处理图片，请稍候...",
            failed: "图片生成失败，请稍后重试。",
            error: "处理过程中发生错误: {0}",
            needimages: "请发送图片：",
            needPrompt: "请发送画图提示词：",
            noPrompt: "未检测到有效提示词，请重新输入。",
            insufficientCurrency: "余额不足！当前余额: {0} {1}，需要: {2} {1}",
            currencyDeducted: "成功扣除 {0} {1}，当前余额: {2} {1}",
            noImagesInPrompt: "未检测到图片，请稍后重新交互。",
            promptTimeout: "等待输入超时，请稍后重试。",
            promptError: "交互式输入发生错误，请稍后重试。",
          },
        },
      },
    })

    const parent = ctx.command(config.basename, "AI 交互绘图", {
      authority: config.commandAuthority,
    })

    // 父级指令：交互收集图片和自定义提示词后绘图
    if (config.parentCommandEnabled) {
      parent
        .userFields(["id"])
        .action(async ({ session }, ...promptArgs: string[]) => {
          if (!session) return
          if (!(await checkCurrency(ctx, session, config, log))) return

          const extraContent = promptArgs.join(" ")
          const input = await collectParentInput(session, extraContent, config, log)
          if (!input) return

          await generateImage(ctx, session, input.images, input.prompt, config, log)
        })
    }

    for (const cmdConfig of config.customCommands) {
      if (!cmdConfig.enabled) continue

      ctx.command(`${config.basename}.${cmdConfig.name} [...args]`, `${cmdConfig.name} 风格绘画`, {
        authority: config.commandAuthority,
      })
        .usage(`${cmdConfig.name} 处理图片`)
        .userFields(["id"])
        .action(async ({ session }, ...args: string[]) => {
          if (!session) return
          if (!(await checkCurrency(ctx, session, config, log))) return

          const extraContent = args.join(" ")
          const images = await collectImages(session, extraContent, config, log)
          if (!images) return

          // 子命令固定使用配置里的预设提示词
          await generateImage(ctx, session, images.images, cmdConfig.prompt, config, log)
        })
    }
  })
}
