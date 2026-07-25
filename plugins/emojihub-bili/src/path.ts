import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// 统一把 file URL 和本地绝对路径解析成实际文件路径
export function resolveLocalPath(input: string): string | null {
  try {
    return fileURLToPath(input);
  } catch {
    return path.isAbsolute(input) ? input : null;
  }
}

// 统一把本地路径转回 file URL，避免重复拼接
export function toFileHref(input: string): string | null {
  const localPath = resolveLocalPath(input);
  return localPath ? pathToFileURL(localPath).href : null;
}

// 判断是否为可直接交给 HTTP 处理的网络地址
export function isHttpUrl(input: string): boolean {
  try {
    const { protocol } = new URL(input);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
