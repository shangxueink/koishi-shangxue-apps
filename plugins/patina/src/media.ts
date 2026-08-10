import { Context } from 'koishi'
import { randomBytes } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { } from 'koishi-plugin-ffmpeg'

export interface PreparedImage {
  path: string
  mime: string
  isGif: boolean
}

const mimeToExtension: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/svg+xml': 'svg',
}

// 创建只属于本次指令调用的临时目录，方便 finally 整体清理
export async function createTempDirectory(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix))
}

// 下载图片并写入临时目录；如果是 GIF，则用 ffmpeg 提取第一帧为 PNG
export async function prepareStaticImage(ctx: Context, url: string, directory: string): Promise<PreparedImage> {
  const file = await ctx.http.file(url)
  const data = Buffer.from(file.data)
  const detectedMime = detectMime(data)
  const rawMime = file.mime || 'image/png'
  const mime = detectedMime || (rawMime === 'application/octet-stream' ? 'image/png' : rawMime)
  const ext = mimeToExtension[mime] || 'png'
  const inputPath = join(directory, `input-${randomId()}.${ext}`)

  await writeFile(inputPath, data)

  const isGif = mime === 'image/gif'
  if (!isGif) {
    return { path: inputPath, mime, isGif: false }
  }

  if (!ctx.ffmpeg) {
    await rm(inputPath, { force: true })
    throw new Error('处理 GIF 需要 ffmpeg 服务')
  }

  const outputPath = join(directory, `frame-${randomId()}.png`)
  const builder = ctx.ffmpeg.builder()
  builder.input(inputPath)
  builder.outputOption('-vframes', '1')
  builder.outputOption('-f', 'image2')
  builder.outputOption('-c:v', 'png')
  builder.outputOption('-update', '1')
  builder.outputOption('-pix_fmt', 'rgba')

  try {
    await builder.run('file', outputPath)
  } catch (error) {
    await rm(inputPath, { force: true })
    await rm(outputPath, { force: true })
    throw error
  }

  await rm(inputPath, { force: true })
  return { path: outputPath, mime: 'image/png', isGif: true }
}

function randomId(): string {
  return randomBytes(8).toString('hex')
}

// 根据文件头判断真实类型，避免 HTTP MIME 被聊天平台改写成 octet-stream
function detectMime(data: Buffer): string | null {
  if (data.length >= 6) {
    const header = data.subarray(0, 6).toString('latin1')
    if (header === 'GIF87a' || header === 'GIF89a') return 'image/gif'
  }
  if (data.length >= 4 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    return 'image/png'
  }
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    data.length >= 12 &&
    data.subarray(0, 4).toString('latin1') === 'RIFF' &&
    data.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'image/webp'
  }
  if (data.length >= 2 && data.subarray(0, 2).toString('latin1') === 'BM') {
    return 'image/bmp'
  }
  return null
}
