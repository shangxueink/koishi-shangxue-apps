import { Context } from "koishi"

export interface DownloadedFile {
  data: ArrayBuffer
  mime: string
  filename: string
}

// API 请求统一走原生 fetch，并使用配置的 apiTimeout
export async function fetchWithTimeout(
  ctx: Context,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timer = ctx.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    timer()
  }
}

// 图片下载统一走 ctx.http.file，同样使用配置的 apiTimeout
export async function downloadFileWithTimeout(
  ctx: Context,
  url: string,
  timeoutMs: number,
): Promise<DownloadedFile> {
  const file = await ctx.http.file(url, { timeout: timeoutMs })
  return {
    data: file.data,
    mime: file.type || file.mime || "application/octet-stream",
    filename: file.filename,
  }
}
