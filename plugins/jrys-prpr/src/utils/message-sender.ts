import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { h } from 'koishi'
import type { Context, Session } from 'koishi'
import type { Config } from '../types'
import { } from '@koishijs/assets'
import { markdown, sendmarkdownMessage } from './markdown'
import { encodeTimestamp } from './image'

/**
 * 发送图片消息并处理响应
 */
export async function sendImageMessage(
  ctx: Context,
  session: Session,
  config: Config,
  imageBuffer: Buffer,
  BackgroundURL: string,
  hasSignedInToday: boolean,
  jsonFilePath: string,
  logInfo: (...args: any[]) => void
): Promise<void> {
  let sentMessage: any
  const messageTime = new Date().toISOString()
  const encodedMessageTime = encodeTimestamp(messageTime)

  if (config.markdown_button_mode === 'raw' && session.platform === 'qq') {
    if (!ctx.assets) throw new Error('assets service not available')

    const cacheDir = path.join(path.dirname(jsonFilePath), '.assets-cache')
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
    }

    const tempFile = path.join(cacheDir, `${session.userId}-${Date.now()}-${Math.random().toString(36).slice(2)}.png`)
    fs.writeFileSync(tempFile, imageBuffer)

    try {
      const transformed = await ctx.assets.transform(String(h.image(pathToFileURL(tempFile).href)))
      const match = transformed.match(/<img\s+src="([^"]+)"/i)
      if (!match?.[1]) {
        throw new Error(`assets.transform did not return an image url: ${transformed}`)
      }

      const publicUrl = h.unescape(match[1])
      const qqmarkdownmessage = await markdown(ctx, session, encodedMessageTime, publicUrl, tempFile, config, logInfo)
      await sendmarkdownMessage(ctx, session, qqmarkdownmessage, logInfo)
    } finally {
      try {
        fs.unlinkSync(tempFile)
      } catch {}
    }
    return
  }

  const imageMessage = h.image(imageBuffer, 'image/png')
  switch (config.GetOriginalImage_Command_HintText) {
    case '2': {
      const hintText2_encodedMessageTime = `${config.command2} ${encodedMessageTime}`
      let hintText2: string
      if (config.enablecurrency) {
        if (!hasSignedInToday) {
          hintText2 = session.text('.CurrencyGetbackgroundimage', [config.maintenanceCostPerUnit, hintText2_encodedMessageTime])
        } else {
          hintText2 = session.text('.hasSignedInToday', [hintText2_encodedMessageTime])
        }
      } else {
        hintText2 = session.text('.Getbackgroundimage', [hintText2_encodedMessageTime])
      }
      const combinedMessage2 = `${imageMessage}\n${hintText2}`
      logInfo(`获取原图：\n${encodedMessageTime}`)
      sentMessage = await session.send(combinedMessage2)
      break
    }
    case '3': {
      const hintText3_encodedMessageTime = `${config.command2} ${encodedMessageTime}`
      let hintText3: string
      if (config.enablecurrency) {
        if (!hasSignedInToday) {
          hintText3 = session.text('.CurrencyGetbackgroundimage', [config.maintenanceCostPerUnit, hintText3_encodedMessageTime])
        } else {
          hintText3 = session.text('.hasSignedInToday', [hintText3_encodedMessageTime])
        }
      } else {
        hintText3 = session.text('.Getbackgroundimage', [hintText3_encodedMessageTime])
      }
      logInfo(`获取原图：\n${encodedMessageTime}`)
      sentMessage = await session.send(imageMessage)
      await session.send(hintText3)
      break
    }
    default:
      sentMessage = await session.send(imageMessage)
      break
  }
}
