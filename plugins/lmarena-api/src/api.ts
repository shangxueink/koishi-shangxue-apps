import { Context } from "koishi"
import type { ApiMode } from "./config"
import type { AppLogger } from "./logger"

export interface ImageFile {
  data: ArrayBuffer
  mime: string
  filename: string
}

export interface ImageApiOptions {
  apiUrl: string
  apiKey: string
  apiMode: ApiMode
  apiParams: Record<string, string>
  log: AppLogger
}

interface ApiImageItem {
  b64_json?: string
  url?: string
  content_type?: string
  mime_type?: string
}

interface ApiSuccessResponse {
  data?: ApiImageItem[]
}

interface ApiErrorResponse {
  error?: {
    message?: string
    type?: string
    code?: string
  }
}

// 按配置或 URL 自动选择 edits(multipart) / generations(JSON) 协议
export async function callImageApi(ctx: Context, files: ImageFile[], prompt: string, options: ImageApiOptions): Promise<string[] | string | null> {
  const mode = resolveApiMode(options.apiMode, options.apiUrl)
  const body = mode === "generations"
    ? JSON.stringify(buildJsonBody(files, prompt, options.apiParams))
    : buildFormBody(files, prompt, options.apiParams)

  logRequest(options, mode, files, prompt)

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${options.apiKey}`,
    }
    if (mode === "generations") headers["Content-Type"] = "application/json"

    const response = await fetch(options.apiUrl, {
      method: "POST",
      headers,
      body,
    })

    if (options.log.enabled) {
      const responseContentType = response.headers.get("content-type") || ""
      if (responseContentType.includes("application/json")) {
        try {
          options.log.info("API响应:", await response.clone().json())
        } catch {}
      }
    }

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response))
    }

    return await parseImageResponse(ctx, response, options.log)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    options.log.error(`API request failed: ${errorMsg}`, error)
    if (errorMsg !== "openai_error") throw new Error(errorMsg)
    return null
  }
}

function resolveApiMode(mode: ApiMode, apiUrl: string): "edits" | "generations" {
  if (mode === "edits" || mode === "generations") return mode

  try {
    const pathname = new URL(apiUrl).pathname
    if (pathname.includes("/images/generations")) return "generations"
  } catch {}

  return "edits"
}

// generations 接口要求 JSON body，image 占位符替换为不带 data: 前缀的 base64 数组
function buildJsonBody(files: ImageFile[], prompt: string, apiParams: Record<string, string>): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  for (const key in apiParams) {
    const value = apiParams[key]
    // agnes 等 generations 模型不接受 response_format / type，省略后仍会把返回 URL 转成 Base64
    if (key === "response_format" || key === "type") continue
    if (value === "{{inputimage}}") {
      body[key] = files.map(file => Buffer.from(file.data).toString("base64"))
      continue
    }
    if (value === "{{prompt}}") {
      body[key] = prompt
      continue
    }
    body[key] = normalizeJsonValue(value)
  }

  return body
}

// 兼容旧的 edits multipart 写法
function buildFormBody(files: ImageFile[], prompt: string, apiParams: Record<string, string>): FormData {
  const formData = new FormData()
  const imageKey = Object.keys(apiParams).find(key => apiParams[key] === "{{inputimage}}")

  if (imageKey) {
    for (const file of files) {
      const blob = new Blob([file.data], { type: file.mime })
      formData.append(imageKey, blob, file.filename || "image.png")
    }
  }

  for (const key in apiParams) {
    const value = apiParams[key]
    if (value === "{{inputimage}}") continue
    formData.append(key, value === "{{prompt}}" ? prompt : value)
  }

  return formData
}

// JSON 数字/布尔参数尽量转成对应类型，避免字符串被部分服务端拒绝
function normalizeJsonValue(value: string): string | number | boolean {
  if (value === "true") return true
  if (value === "false") return false
  if (/^-?\d+$/.test(value)) return Number(value)
  return value
}

function logRequest(options: ImageApiOptions, mode: string, files: ImageFile[], prompt: string) {
  if (!options.log.enabled) return

  const params = { ...options.apiParams }
  const imageKey = Object.keys(params).find(key => params[key] === "{{inputimage}}")
  if (imageKey) params[imageKey] = `[${files.length} 张 base64]`
  if (params.prompt === "{{prompt}}") {
    params.prompt = prompt.substring(0, 100) + (prompt.length > 100 ? "..." : "")
  }
  if (mode === "generations") {
    delete params.response_format
    delete params.type
  }

  options.log.info("API请求参数:", {
    url: options.apiUrl,
    mode,
    ...params,
  })
}

async function parseImageResponse(ctx: Context, response: Response, log: AppLogger): Promise<string[] | string | null> {
  const contentType = response.headers.get("content-type") || ""

  if (contentType.includes("application/json")) {
    const result = await response.json() as ApiSuccessResponse
    if (Array.isArray(result.data)) {
      const images: string[] = []
      for (const item of result.data) {
        if (!item) continue
        if (item.b64_json) {
          const mime = item.content_type || item.mime_type || "image/png"
          images.push(toDataUrl(item.b64_json, mime))
          continue
        }
        if (item.url) images.push(await toUrlDataUrl(ctx, item.url, log))
      }

      if (images.length > 0) {
        log.info(`API success response (JSON): returned ${images.length} images`)
        return images.length === 1 ? images[0] : images
      }
    }
  } else if (contentType.startsWith("image/")) {
    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString("base64")
    log.info(`API success response (Image Buffer): data:${contentType};base64,[${base64.length} chars]`)
    return `data:${contentType};base64,${base64}`
  }

  throw new Error("Unknown API response format")
}

function toDataUrl(source: string, mime: string): string {
  if (source.startsWith("data:")) return source
  return `data:${mime};base64,${source}`
}

// 若服务端返回公网 URL，下载后转成 data URL，插件只发送 Base64 图片
async function toUrlDataUrl(ctx: Context, source: string, log: AppLogger): Promise<string> {
  if (source.startsWith("data:")) return source
  if (!/^https?:\/\//i.test(source)) return source

  log.info("转换HTTP URL为Data URL")
  const file = await ctx.http.file(source)
  const mime = file.type || file.mime || "application/octet-stream"
  return `data:${mime};base64,${Buffer.from(file.data).toString("base64")}`
}

async function parseErrorMessage(response: Response): Promise<string> {
  const text = await response.text()
  if (!text) return `HTTP error! status: ${response.status}`

  try {
    const data = JSON.parse(text) as ApiErrorResponse
    const message = data.error?.message || data.error?.type || data.error?.code
    if (message) return message
  } catch {}

  return text
}
