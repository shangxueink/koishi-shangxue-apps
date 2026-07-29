export const LEGACY_CODEBOOK = '嗷呜啊~'

export const MSBT_CODEBOOK = ['齁', '哦', '噢', '喔', '咕', '咿', '嗯', '啊', '～', '哈', '！', '唔', '哼', '❤', '呃', '呼'] as const

export type FurryMode = 'legacy' | 'msbt' | 'custom'

export interface FurryCodec {
  encode(text: string): string
  decode(text: string): string
}

function toCodePoints(value: string) {
  return Array.from(value.trim())
}

function assertFourChars(value: string, label: string) {
  const chars = toCodePoints(value)
  if (chars.length !== 4) {
    throw new Error(`${label}必须是 4 个字符`)
  }
  if (new Set(chars).size !== 4) {
    throw new Error(`${label}不能包含重复字符`)
  }
  return chars
}

class LegacyFurryCodec implements FurryCodec {
  constructor(private readonly codebook: readonly string[]) {}

  encode(text: string) {
    const chars = toCodePoints(text)
    if (chars.length < 1) return ''

    // 保留原始“兽语”风格：前缀 + 每个 UTF-16 码元转 8 个字符 + 后缀。
    let result = this.codebook[3] + this.codebook[1] + this.codebook[0]
    let offset = 0

    for (const char of chars) {
      let codeUnit = char.charCodeAt(0)
      let bit = 12

      while (bit >= 0) {
        const hex = ((codeUnit >> bit) + offset) & 15
        offset += 1
        result += this.codebook[hex >> 2]
        result += this.codebook[hex & 3]
        bit -= 4
      }
    }

    return result + this.codebook[2]
  }

  decode(text: string) {
    const chars = toCodePoints(text)
    if (!this.identify(chars)) {
      throw new Error('输入格式不正确')
    }

    let result = ''
    let index = 3
    let offset = 0

    while (index < chars.length - 1) {
      let codeUnit = 0
      const end = index + 8

      while (index < end) {
        const high = this.codebook.indexOf(chars[index++])
        const low = this.codebook.indexOf(chars[index++])
        if (high < 0 || low < 0) {
          throw new Error('输入包含非法字符')
        }

        codeUnit = (codeUnit << 4) | ((((high << 2) | low) + offset) & 15)
        offset = offset === 0 ? 0xffffffff : offset - 1
      }

      result += String.fromCharCode(codeUnit)
    }

    return result
  }

  private identify(chars: string[]) {
    if (chars.length <= 11) return false
    if (chars[0] !== this.codebook[3]) return false
    if (chars[1] !== this.codebook[1]) return false
    if (chars[2] !== this.codebook[0]) return false
    if (chars[chars.length - 1] !== this.codebook[2]) return false
    if ((chars.length - 4) % 8 !== 0) return false

    for (const char of chars) {
      if (!this.codebook.includes(char)) {
        return false
      }
    }

    return true
  }
}

class ByteFurryCodec implements FurryCodec {
  private readonly codebookMap = new Map<string, number>()

  constructor(private readonly codebook: readonly string[]) {
    for (let i = 0; i < codebook.length; i += 1) {
      this.codebookMap.set(codebook[i], i)
    }
  }

  encode(text: string) {
    const bytes = new TextEncoder().encode(text)
    let result = ''

    for (const byte of bytes) {
      result += this.codebook[byte >> 4] + this.codebook[byte & 15]
    }

    return result
  }

  decode(text: string) {
    const chars = toCodePoints(text)
    if (chars.length % 2 !== 0) {
      throw new Error('输入长度必须为偶数')
    }

    const bytes = new Uint8Array(chars.length / 2)
    let byteIndex = 0

    for (let i = 0; i < chars.length; i += 2) {
      const high = this.codebookMap.get(chars[i])
      const low = this.codebookMap.get(chars[i + 1])
      if (high === undefined || low === undefined) {
        throw new Error('输入包含非法字符')
      }

      bytes[byteIndex++] = (high << 4) | low
    }

    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } catch {
      throw new Error('无法正确解码为 UTF-8 文本')
    }
  }
}

export interface FurryCodecConfig {
  mode: FurryMode
  customCodebook?: string
}

export function createFurryCodec(config: FurryCodecConfig): FurryCodec {
  if (config.mode === 'legacy') {
    return new LegacyFurryCodec(assertFourChars(LEGACY_CODEBOOK, '默认加密方式'))
  }

  if (config.mode === 'msbt') {
    return new ByteFurryCodec(MSBT_CODEBOOK)
  }

  return new LegacyFurryCodec(assertFourChars(config.customCodebook ?? '', '自定义加密方式'))
}
