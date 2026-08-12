import { Schema, h, Context } from 'koishi'
import { writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import nodeurl from 'node:url'
import { createTempDirectory, prepareStaticImage } from './media'
import { Command6Config, ExtractImageUrl, LoggerInfo } from './types'
import { } from 'koishi-plugin-puppeteer'

export const command6Config = Schema.union([
  Schema.object({
    enablecommand6: Schema.const(false),
  }),
  Schema.object({
    enablecommand6: Schema.const(true).required(),
    enablecommand6Name: Schema.string().default('原图坦克2').description('指令主名称'),
    extractName: Schema.string().default('提取').description('提取指令后缀'),
    composeName: Schema.string().default('合成').description('合成指令后缀'),
    firstFrameDelay: Schema.number().min(1).max(65535).default(10).description('第一帧停留毫秒数'),
    background: Schema.string().role('color').default('#ffffff').description('表图背景填充颜色'),
  }),
])

interface ApngPageWindow extends Window {
  __apngResult: string | null
  __apngError: string | null
  __extractResults: string[]
  __extractError: string | null
  __firstFrameDelay: number
  __background: string
}

async function downloadToFile(ctx: Context, url: string, filePath: string): Promise<void> {
  const file = await ctx.http.file(url)
  await writeFile(filePath, Buffer.from(file.data))
}

export function applyCommand6(
  ctx: Context,
  config: Command6Config,
  loggerinfo: LoggerInfo,
  extractImageUrl: ExtractImageUrl,
) {
  if (!config.enablecommand6) return

  const baseName = config.enablecommand6Name || '原图坦克2'
  const extractName = config.extractName || '提取'
  const composeName = config.composeName || '合成'
  const apngHtml = path.join(__dirname, '../html/apng/apng.html')

  ctx.command(`patina/${baseName}.${composeName} [img1] [img2]`, '将两张图片合成为 APNG 幻影坦克')
    .action(async ({ session }, img1?: string, img2?: string) => {
      if (!session) return
      if (!ctx.puppeteer) {
        await session.send('没有开启 puppeteer 服务')
        return
      }

      if (!img1) {
        await session.send('请发送第一张图片（表图）：')
        img1 = await session.prompt(30000)
      }
      if (!img2) {
        await session.send('请发送第二张图片（里图）：')
        img2 = await session.prompt(30000)
      }
      if (!img1 || !img2) {
        return '未检测到有效的图片，请重试。'
      }

      // 先收齐两个图片链接，再统一下载，避免用户等下载完成才能发第二张
      const [coverUrl, innerUrl] = await Promise.all([
        extractImageUrl(session, img1),
        extractImageUrl(session, img2),
      ])
      if (!coverUrl || !innerUrl) {
        return '未检测到有效的图片，请重试。'
      }
      loggerinfo(`表图 URL: ${coverUrl}`)
      loggerinfo(`里图 URL: ${innerUrl}`)

      await session.send('正在处理图片，请稍候...')
      const tempDir = await createTempDirectory('patina-apng')
      try {
        // 两个链接都拿到后才开始同时下载
        const [coverPrepared, innerPrepared] = await Promise.all([
          prepareStaticImage(ctx, coverUrl, tempDir),
          prepareStaticImage(ctx, innerUrl, tempDir),
        ])
        loggerinfo(`表图 MIME: ${coverPrepared.mime}${coverPrepared.isGif ? ' (GIF首帧)' : ''}`)
        loggerinfo(`里图 MIME: ${innerPrepared.mime}${innerPrepared.isGif ? ' (GIF首帧)' : ''}`)

        const page = await ctx.puppeteer.page()
        try {
          await page.goto(nodeurl.pathToFileURL(apngHtml).href, { waitUntil: 'networkidle2' })
          await page.evaluate(({ delay, background }) => {
            const target = globalThis as unknown as ApngPageWindow
            target.__firstFrameDelay = delay
            target.__background = background
            target.__apngResult = null
            target.__apngError = null
          }, {
            delay: config.firstFrameDelay ?? 10,
            background: config.background || '#ffffff',
          })

          const [coverChooser] = await Promise.all([
            page.waitForFileChooser(),
            page.click('label[for="coverFileInput"]'),
          ])
          await coverChooser.accept([coverPrepared.path])

          const [innerChooser] = await Promise.all([
            page.waitForFileChooser(),
            page.click('label[for="innerFileInput"]'),
          ])
          await innerChooser.accept([innerPrepared.path])

          await page.click('#composeButton')
          await page.waitForFunction(() => {
            const target = globalThis as unknown as ApngPageWindow
            return target.__apngResult !== null || target.__apngError !== null
          }, { timeout: 60000 })

          const result = await page.evaluate(() => {
            const target = globalThis as unknown as ApngPageWindow
            return { base64: target.__apngResult, error: target.__apngError }
          })
          if (result.error) throw new Error(result.error)
          if (!result.base64) throw new Error('APNG 生成结果为空')

          loggerinfo(`APNG 输出大小: ${result.base64.length}`)
          await session.send(h.image(Buffer.from(result.base64, 'base64'), 'image/png'))
        } finally {
          await page.close()
        }
      } catch (error) {
        ctx.logger.error('处理图片时出错', error)
        return `处理图片时出错：${error instanceof Error ? error.message : String(error)}`
      } finally {
        await rm(tempDir, { recursive: true, force: true })
      }
    })

  ctx.command(`patina/${baseName}.${extractName} [img]`, '从 APNG 中提取表图和里图')
    .action(async ({ session }, img?: string) => {
      if (!session) return
      if (!ctx.puppeteer) {
        await session.send('没有开启 puppeteer 服务')
        return
      }

      if (!img) {
        await session.send('请发送一张 APNG 图片：')
        img = await session.prompt(30000)
      }
      if (!img) {
        return '未检测到有效的图片，请重试。'
      }

      const imageUrl = await extractImageUrl(session, img)
      if (!imageUrl) {
        return '未检测到有效的图片，请重试。'
      }
      loggerinfo(`APNG URL: ${imageUrl}`)

      const tempDir = await createTempDirectory('patina-apng-extract')
      try {
        const apngPath = path.join(tempDir, 'input.apng')
        await downloadToFile(ctx, imageUrl, apngPath)

        const page = await ctx.puppeteer.page()
        try {
          await page.goto(nodeurl.pathToFileURL(apngHtml).href, { waitUntil: 'networkidle2' })
          await page.evaluate(() => {
            const target = globalThis as unknown as ApngPageWindow
            target.__extractResults = []
            target.__extractError = null
          })

          const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            page.click('label[for="apngFileInput"]'),
          ])
          await fileChooser.accept([apngPath])

          await page.click('#extractButton')
          await page.waitForFunction(() => {
            const target = globalThis as unknown as ApngPageWindow
            return target.__extractResults.length >= 2 || target.__extractError !== null
          }, { timeout: 60000 })

          const result = await page.evaluate(() => {
            const target = globalThis as unknown as ApngPageWindow
            return { images: target.__extractResults, error: target.__extractError }
          })
          if (result.error) throw new Error(result.error)
          if (result.images.length < 2) throw new Error('APNG 帧数量不足')

          loggerinfo(`APNG 提取帧数: ${result.images.length}`)
          for (const image of result.images) {
            await session.send(h.image(image))
          }
        } finally {
          await page.close()
        }
      } catch (error) {
        ctx.logger.error('提取 APNG 时出错', error)
        return `提取 APNG 时出错：${error instanceof Error ? error.message : String(error)}`
      } finally {
        await rm(tempDir, { recursive: true, force: true })
      }
    })
}
