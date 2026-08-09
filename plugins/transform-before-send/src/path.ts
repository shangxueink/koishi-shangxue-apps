import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** 判断一个资源地址是否指向本地文件 */
export function isLocalResource(input: string): boolean {
  const value = input.trim()
  if (!value) return false
  if (/^file:\/\//i.test(value)) return true
  if (/^(data:|base64:\/\/)/i.test(value)) return false
  if (path.win32.isAbsolute(value) || path.posix.isAbsolute(value)) return true
  return !/^[a-z][a-z0-9+.-]*:/i.test(value)
}

/** 将 file URL、Windows 路径或相对路径解析为本地绝对路径 */
export function resolveLocalPath(input: string, baseDir: string): string | null {
  const value = input.trim()
  if (!value) return null

  if (/^file:\/\//i.test(value)) {
    try {
      return fileURLToPath(value)
    } catch {
      return null
    }
  }

  if (path.win32.isAbsolute(value) || path.posix.isAbsolute(value)) {
    return path.normalize(value)
  }

  try {
    new URL(value)
    return null
  } catch {
    return path.resolve(baseDir, value)
  }
}
