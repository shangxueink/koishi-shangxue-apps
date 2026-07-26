import type { Context, Session } from 'koishi'
import type { Config, JrysData } from '../types'
import { generateFortuneHTML, getImageBuffer } from './render'

async function waitForCaptureReady(page: Awaited<ReturnType<NonNullable<Context['puppeteer']>['page']>>): Promise<void> {
  await page.evaluate(async () => {
    if ('fonts' in document) {
      await document.fonts.ready.catch(() => {})
    }

    const imageTasks = Array.from(document.images, (img) => {
      if (img.complete) return Promise.resolve()
      return new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true })
        img.addEventListener('error', () => resolve(), { once: true })
      })
    })

    await Promise.all(imageTasks)
  })
}

function bufferToDataUrl(buffer: Buffer, rawUrl: string): string {
  const cleanUrl = rawUrl.split('?')[0].toLowerCase()
  const mimeType = cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')
    ? 'image/jpeg'
    : cleanUrl.endsWith('.webp')
      ? 'image/webp'
      : cleanUrl.endsWith('.gif')
        ? 'image/gif'
        : 'image/png'
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

export async function renderFortuneCardImage(
  ctx: Context,
  session: Session,
  config: Config,
  dJson: JrysData,
  backgroundUrl: string,
  logInfo: (...args: any[]) => void,
): Promise<Buffer> {
  if (!ctx.puppeteer) {
    throw new Error('puppeteer service not available')
  }

  const backgroundBuffer = await getImageBuffer(ctx, backgroundUrl)
  const backgroundDataUrl = bufferToDataUrl(backgroundBuffer, backgroundUrl)
  const html = await generateFortuneHTML(ctx, session, config, dJson, backgroundDataUrl, logInfo)

  const page = await ctx.puppeteer.page()
  try {
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 })
    await page.setContent(html, { waitUntil: 'load' })
    await waitForCaptureReady(page)
    return await page.screenshot({ type: 'png' })
  } finally {
    await page.close().catch(() => {})
  }
}
