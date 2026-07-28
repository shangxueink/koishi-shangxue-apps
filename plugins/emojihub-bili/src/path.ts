import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// 统一解析本地路径，兼容 file URL、Windows 路径和 POSIX 路径
export function resolveLocalPath(input: string): string | null {
  const value = input.trim().replace(/^['"]|['"]$/g, "");

  try {
    return path.normalize(fileURLToPath(value));
  } catch {
    if (path.isAbsolute(value) || path.win32.isAbsolute(value) || path.posix.isAbsolute(value)) {
      return path.normalize(value);
    }
    return null;
  }
}

// 只有需要 file URL 的场景才用这个
export function toFileHref(input: string): string | null {
  const localPath = resolveLocalPath(input);
  return localPath ? pathToFileURL(localPath).href : null;
}

// 判断是否为网络地址
export function isHttpUrl(input: string): boolean {
  try {
    const { protocol } = new URL(input);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
