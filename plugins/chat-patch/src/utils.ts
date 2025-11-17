import { Config } from './config'

export class Utils {
  constructor(private config: Config) { }

  // 检查平台是否被屏蔽
  isPlatformBlocked(platform: string): boolean {
    if (!this.config.blockedPlatforms || this.config.blockedPlatforms.length === 0) {
      return false
    }

    for (const blockedPlatform of this.config.blockedPlatforms) {
      if (blockedPlatform.exactMatch) {
        if (platform === blockedPlatform.platformName) {
          return true
        }
      } else {
        if (platform.includes(blockedPlatform.platformName)) {
          return true
        }
      }
    }

    return false
  }

  // 递归提取所有文本内容的函数
  extractTextContent(elements: any[]): string {
    let text = ''
    for (const element of elements) {
      if (element.type === 'text') {
        text += element.attrs?.content || ''
      } else if (element.type === 'p') {
        if (element.children && element.children.length > 0) {
          text += this.extractTextContent(element.children) + '\n'
        }
      } else if (element.children && element.children.length > 0) {
        text += this.extractTextContent(element.children)
      }
    }
    return text
  }

  // 检查字符串是否为base64格式
  private isBase64(str: string): boolean {
    if (!str || typeof str !== 'string') return false

    // 检查是否以data:开头的base64格式
    if (str.startsWith('data:')) {
      return str.includes('base64,')
    }

    // 检查纯base64字符串（长度大于100且符合base64格式）
    if (str.length > 100) {
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
      return base64Regex.test(str)
    }

    return false
  }

  // 清理对象中的base64内容
  cleanBase64Content(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj
    }

    if (typeof obj === 'string') {
      if (this.isBase64(obj)) {
        return '暂不支持记录base64内容'
      }
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanBase64Content(item))
    }

    if (typeof obj === 'object') {
      const cleaned: any = {}
      for (const [key, value] of Object.entries(obj)) {
        // 特别处理常见的base64字段
        if (typeof value === 'string' && (
          key === 'src' ||
          key === 'url' ||
          key === 'file' ||
          key === 'data' ||
          key === 'content'
        ) && this.isBase64(value)) {
          cleaned[key] = '暂不支持记录base64内容'
        } else {
          cleaned[key] = this.cleanBase64Content(value)
        }
      }
      return cleaned
    }

    return obj
  }
}