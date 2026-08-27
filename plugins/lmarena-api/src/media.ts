import { Context } from "koishi"
import { randomBytes } from "node:crypto"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { } from "koishi-plugin-ffmpeg"
import type { ImageFile } from "./api"
import { createPage } from "./browser"
import type { Config } from "./config"
import { getImageSize } from "./image-size"
import type { AppLogger } from "./logger"

interface UpscalePageWindow extends Window {
  __upscaleReady?: boolean
  __upscaleError?: string | null
}

// 统一处理上传图片：GIF 先提取首帧，分辨率不足时用 puppeteer 放大
export async function prepareImageForApi(
  ctx: Context,
  file: ImageFile,
  config: Config,
  log: AppLogger,
): Promise<ImageFile> {
  if (!isGifImage(file)) return file
  if (!ctx.ffmpeg) throw new Error("处理 GIF 需要 ffmpeg 服务")

  const directory = await mkdtemp(join(tmpdir(), "lmarena-gif-"))
  const inputPath = join(directory, `input-${randomId()}.gif`)
  const outputPath = join(directory, `frame-${randomId()}.png`)

  try {
    await writeFile(inputPath, Buffer.from(file.data))

    const builder = ctx.ffmpeg.builder()
    builder.input(inputPath)
    builder.outputOption("-vframes", "1")
    builder.outputOption("-f", "image2")
    builder.outputOption("-c:v", "png")
    builder.outputOption("-update", "1")
    builder.outputOption("-pix_fmt", "rgba")
    await builder.run("file", outputPath)

    let data = await readFile(outputPath)
    const size = getImageSize(data)
    log.info(`GIF 已提取第一帧: ${size ? `${size.width}x${size.height}` : "未知尺寸"}`)

    if (config.gifUpscaleEnabled && size && size.width > 0 && size.height > 0 && needsUpscale(size, config)) {
      const target = resolveUpscaleSize(size, config)
      if (!ctx.puppeteer) throw new Error("处理小尺寸 GIF 需要 puppeteer 服务")
      data = await upscaleStaticImage(ctx, data, target.width, target.height, config, log)
      log.info(`GIF 首帧已放大: ${size.width}x${size.height} -> ${target.width}x${target.height}`)
    }

    return {
      data: toArrayBuffer(data),
      mime: "image/png",
      filename: gifOutputName(file.filename),
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

// 通过本地 HTML 页面加载图片，再按目标尺寸截图
async function upscaleStaticImage(
  ctx: Context,
  source: Buffer,
  width: number,
  height: number,
  config: Config,
  log: AppLogger,
): Promise<Buffer<ArrayBuffer>> {
  const htmlPath = join(__dirname, "../html/upscale/upscale.html")
  const page = await createPage(ctx, config.apiTimeout)

  try {
    await page.setViewport({ width, height, deviceScaleFactor: 1 })
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle2" })
    await page.evaluate(({ src, width, height }) => {
      const root = document.documentElement
      const body = document.body
      root.style.width = `${width}px`
      root.style.height = `${height}px`
      body.style.width = `${width}px`
      body.style.height = `${height}px`

      const image = document.getElementById("source") as HTMLImageElement
      const target = globalThis as unknown as UpscalePageWindow
      target.__upscaleReady = false
      target.__upscaleError = null
      image.onload = () => {
        target.__upscaleReady = true
      }
      image.onerror = () => {
        target.__upscaleError = "图片加载失败"
      }
      image.src = src
    }, {
      src: `data:image/png;base64,${source.toString("base64")}`,
      width,
      height,
    })

    await page.waitForFunction(() => {
      const target = globalThis as unknown as UpscalePageWindow
      return target.__upscaleReady === true || target.__upscaleError !== null
    })

    const state = await page.evaluate(() => {
      const target = globalThis as unknown as UpscalePageWindow
      return { error: target.__upscaleError ?? null }
    })
    if (state.error) throw new Error(state.error)

    log.info(`puppeteer 放大完成: ${width}x${height}`)
    const screenshot = await page.screenshot({
      clip: { x: 0, y: 0, width, height },
      type: "png",
    })
    return Buffer.from(screenshot)
  } finally {
    await page.close()
  }
}

function needsUpscale(size: { width: number; height: number }, config: Config): boolean {
  const min = Math.max(1, Math.min(config.gifUpscaleMinSize, config.gifUpscaleMaxSize))
  return Math.min(size.width, size.height) < min
}

function resolveUpscaleSize(
  size: { width: number; height: number },
  config: Config,
): { width: number; height: number } {
  const min = Math.max(1, Math.min(config.gifUpscaleMinSize, config.gifUpscaleMaxSize))
  const max = Math.max(min, config.gifUpscaleMaxSize)
  const targetScale = Math.max(min / size.width, min / size.height)
  const maxSide = Math.max(size.width, size.height)
  const capScale = maxSide <= max ? Number.POSITIVE_INFINITY : max / maxSide
  const scale = Math.min(targetScale, Math.max(1, capScale))

  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  }
}

function gifOutputName(filename: string): string {
  if (!filename) return "gif-first-frame.png"
  return `${filename.replace(/\.gif$/i, "")}.png`
}

function isGifImage(file: ImageFile): boolean {
  if (/^image\/gif\b/i.test(file.mime)) return true
  const data = Buffer.from(file.data)
  if (data.length < 6) return false
  const header = data.subarray(0, 6).toString("latin1")
  return header === "GIF87a" || header === "GIF89a"
}

function randomId(): string {
  return randomBytes(8).toString("hex")
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const result = new ArrayBuffer(buffer.byteLength)
  new Uint8Array(result).set(buffer)
  return result
}
