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
}