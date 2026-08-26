export interface ImageSize {
  width: number
  height: number
}

export interface DynamicImageParams {
  size: string
  ratio?: string
}

// 解析常见图片格式的宽高，失败时返回 null
export function getImageSize(buffer: Buffer): ImageSize | null {
  if (buffer.length < 12) return null

  if (isPng(buffer)) return readPngSize(buffer)
  if (isJpeg(buffer)) return readJpegSize(buffer)
  if (isGif(buffer)) return readGifSize(buffer)
  if (isBmp(buffer)) return readBmpSize(buffer)
  if (isWebp(buffer)) return readWebpSize(buffer)

  return null
}

// 根据输入图片比例生成请求参数；agnes 使用 size + ratio，OpenAI 使用动态 size
export function resolveDynamicImageParams(
  configuredSize: string,
  width: number,
  height: number,
  agnesMode: boolean,
): DynamicImageParams {
  const ratio = height > 0 ? width / height : 1

  if (agnesMode) {
    const size = /^[1-4]K$/i.test(configuredSize.trim()) ? configuredSize.trim() : "1K"
    return {
      size,
      ratio: findClosestAgnesRatio(ratio),
    }
  }

  // OpenAI 兼容接口支持 auto，用户显式填写 auto 时不要覆盖
  if (configuredSize.trim().toLowerCase() === "auto") {
    return { size: "auto" }
  }

  const size = ratio >= 1.2
    ? "1536x1024"
    : ratio <= 0.8
      ? "1024x1536"
      : "1024x1024"

  return { size }
}

export function resolveFallbackSize(configuredSize: string, agnesMode: boolean): string {
  if (agnesMode) {
    return /^[1-4]K$/i.test(configuredSize.trim()) ? configuredSize.trim() : "1K"
  }
  const trimmed = configuredSize.trim()
  return trimmed && trimmed !== "{{dynamic_size}}" ? trimmed : "1024x1024"
}

const AGNES_RATIOS: Array<{ label: string; value: number }> = [
  { label: "1:1", value: 1 },
  { label: "3:4", value: 3 / 4 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
  { label: "2:3", value: 2 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "21:9", value: 21 / 9 },
]

function findClosestAgnesRatio(ratio: number): string {
  let best = AGNES_RATIOS[0]
  let bestDiff = Number.POSITIVE_INFINITY

  for (const item of AGNES_RATIOS) {
    const diff = Math.abs(ratio - item.value)
    if (diff < bestDiff) {
      bestDiff = diff
      best = item
    }
  }

  return best.label
}

function isPng(buffer: Buffer): boolean {
  return buffer.length >= 24
    && buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4e
    && buffer[3] === 0x47
}

function readPngSize(buffer: Buffer): ImageSize | null {
  if (buffer.toString("ascii", 12, 16) !== "IHDR") return null
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  }
}

function isJpeg(buffer: Buffer): boolean {
  return buffer[0] === 0xff && buffer[1] === 0xd8
}

function readJpegSize(buffer: Buffer): ImageSize | null {
  let offset = 2
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1
      continue
    }

    let marker = buffer[offset + 1]
    while (marker === 0xff && offset + 2 < buffer.length) {
      offset += 1
      marker = buffer[offset + 1]
    }

    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2
      continue
    }

    const length = buffer.readUInt16BE(offset + 2)
    if (isSofMarker(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      }
    }

    offset += 2 + length
  }

  return null
}

function isSofMarker(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)
}

function isGif(buffer: Buffer): boolean {
  return buffer.toString("ascii", 0, 3) === "GIF"
}

function readGifSize(buffer: Buffer): ImageSize | null {
  if (buffer.length < 10) return null
  return {
    width: buffer.readUInt16LE(6),
    height: buffer.readUInt16LE(8),
  }
}

function isBmp(buffer: Buffer): boolean {
  return buffer.toString("ascii", 0, 2) === "BM"
}

function readBmpSize(buffer: Buffer): ImageSize | null {
  if (buffer.length < 26) return null
  return {
    width: buffer.readInt32LE(18),
    height: Math.abs(buffer.readInt32LE(22)),
  }
}

function isWebp(buffer: Buffer): boolean {
  return buffer.length >= 30
    && buffer.toString("ascii", 0, 4) === "RIFF"
    && buffer.toString("ascii", 8, 12) === "WEBP"
}

function readWebpSize(buffer: Buffer): ImageSize | null {
  const fourCC = buffer.toString("ascii", 12, 16)

  if (fourCC === "VP8X") {
    return {
      width: readUInt24LE(buffer, 24) + 1,
      height: readUInt24LE(buffer, 27) + 1,
    }
  }

  if (fourCC === "VP8L") {
    const b1 = buffer[21]
    const b2 = buffer[22]
    const b3 = buffer[23]
    const b4 = buffer[24]
    const b5 = buffer[25]
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b2),
      height: 1 + (((b3 & 0x0f) << 10) | (b4 << 2) | ((b5 & 0xc0) >> 6)),
    }
  }

  if (fourCC === "VP8 " && buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    }
  }

  return null
}

function readUInt24LE(buffer: Buffer, offset: number): number {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16)
}
