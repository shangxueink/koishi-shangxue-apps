import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { h } from 'koishi'
import type { Context, Session } from 'koishi'
import type { Config, JrysData } from '../types'
import { recordOriginalImage } from './database'
import { markdown, plainTextImageMarkdown, sendmarkdownMessage } from './markdown'
import { encodeTimestamp } from './image'
import { renderFortuneCardImage } from './render-card'

function getPublicImageUrl(rawUrl: string): string {
  if (/response-content-type=image%2Fjpeg/i.test(rawUrl)) {
    return rawUrl
  }
  return `${rawUrl}&response-content-type=image%2Fjpeg`
}

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

function getImageMimeType(source: string): string {
  const lower = source.split('?')[0].toLowerCase()
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  return 'image/png'
}

async function resolveAssetsPublicUrl(ctx: Context, source: string): Promise<string> {
  const assets = (ctx as any).assets
  if (!assets) throw new Error('assets service not available')

  const transformed = await assets.transform(String(h.image(source)))
  const match = transformed.match(/<img\s+src="([^"]+)"/i)
  if (!match?.[1]) {
    throw new Error(`assets.transform did not return an image url: ${transformed}`)
  }
  return h.unescape(match[1])
}

function getSimpleFortuneText(dJson: JrysData): string {
  return [
    '今日运势',
    `您今天的运势是：${dJson.fortuneSummary}`,
    dJson.signText,
    dJson.unsignText,
  ].join('\n\n')
}

/**
 * 发送图片消息并处理响应
 */
export async function sendImageMessage(
  ctx: Context,
  session: Session,
  config: Config,
  dJson: JrysData,
  imageBuffer: Buffer,
  BackgroundURL: string,
  hasSignedInToday: boolean,
  jsonFilePath: string,
  logInfo: (...args: any[]) => void
): Promise<void> {
  const messageTime = encodeTimestamp(new Date().toISOString())
  const isSimpleOriginalMode = config.GetOriginalImage_Command_HintText === '0'

  if (isSimpleOriginalMode) {
    const simpleText = getSimpleFortuneText(dJson)

    if (config.markdown_button_mode === 'raw' && session.platform === 'qq') {
      const publicUrl = isHttpUrl(BackgroundURL)
        ? BackgroundURL
        : await resolveAssetsPublicUrl(ctx, BackgroundURL)
      const qqmarkdownmessage = await plainTextImageMarkdown(ctx, session, publicUrl, dJson, logInfo)
      const sentMessage = await sendmarkdownMessage(ctx, session, qqmarkdownmessage, logInfo)

      await recordOriginalImage(ctx, jsonFilePath, {
        messageId: sentMessage,
        messageTime,
        backgroundURL: BackgroundURL,
      }, logInfo)
      return
    }

    const imageMessage = h.image(imageBuffer, getImageMimeType(BackgroundURL))
    const sentMessage = await session.send(`${simpleText}\n${imageMessage}`)
    await recordOriginalImage(ctx, jsonFilePath, {
      messageId: sentMessage,
      messageTime,
      backgroundURL: BackgroundURL,
    }, logInfo)
    return
  }

  const renderBuffer = await renderFortuneCardImage(ctx, session, config, dJson, BackgroundURL, logInfo)
  const imageMessage = h.image(renderBuffer, 'image/png')

  if (config.markdown_button_mode === 'raw' && session.platform === 'qq') {
    const assets = (ctx as any).assets
    if (!assets) throw new Error('assets service not available')

    const cacheDir = path.join(path.dirname(jsonFilePath), '.assets-cache')
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
    }

    const tempFile = path.join(cacheDir, `${session.userId}-${Date.now()}-${Math.random().toString(36).slice(2)}.png`)
    fs.writeFileSync(tempFile, renderBuffer)

    try {
      const transformed = await assets.transform(String(h.image(pathToFileURL(tempFile).href)))
      const match = transformed.match(/<img\s+src="([^"]+)"/i)
      if (!match?.[1]) {
        throw new Error(`assets.transform did not return an image url: ${transformed}`)
      }

      const publicUrl = getPublicImageUrl(h.unescape(match[1]))
      const qqmarkdownmessage = await markdown(ctx, session, messageTime, publicUrl, tempFile, dJson, config, logInfo)
      const sentMessage = await sendmarkdownMessage(ctx, session, qqmarkdownmessage, logInfo)

      await recordOriginalImage(ctx, jsonFilePath, {
        messageId: sentMessage,
        messageTime,
        backgroundURL: BackgroundURL,
      }, logInfo)
    } finally {
      try {
        fs.unlinkSync(tempFile)
      } catch { }
    }
    return
  }

  switch (config.GetOriginalImage_Command_HintText) {
    case '2': {
      const hintText2_encodedMessageTime = `${config.command2} ${messageTime}`
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
      const sentMessage = await session.send(combinedMessage2)
      await recordOriginalImage(ctx, jsonFilePath, {
        messageId: sentMessage,
        messageTime,
        backgroundURL: BackgroundURL,
      }, logInfo)
      return
    }
    case '3': {
      const hintText3_encodedMessageTime = `${config.command2} ${messageTime}`
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
      const sentMessage = await session.send(imageMessage)
      await recordOriginalImage(ctx, jsonFilePath, {
        messageId: sentMessage,
        messageTime,
        backgroundURL: BackgroundURL,
      }, logInfo)
      await session.send(hintText3)
      return
    }
    default: {
      const sentMessage = await session.send(imageMessage)
      await recordOriginalImage(ctx, jsonFilePath, {
        messageId: sentMessage,
        messageTime,
        backgroundURL: BackgroundURL,
      }, logInfo)
    }
  }
}
