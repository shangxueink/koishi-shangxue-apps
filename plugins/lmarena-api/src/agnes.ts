export type AgnesRegion = "cn" | "intl"
export type AgnesModel = "agnes-image-2.0-flash" | "agnes-image-2.1-flash"
export const AGNES_VIDEO_MODELS = ["agnes-video-v2.0", "agnes-video-2.5-flash"] as const
export type AgnesVideoModel = (typeof AGNES_VIDEO_MODELS)[number]

// agnes 两个地区的内置 Key，使用 base64 混淆存储
const AGNES_API_KEYS: Record<AgnesRegion, string> = {
  cn: "c2stQ3A1S0cyTkoxWDRkNlF4Y1UxczZMV0lWQjFGYUJQY0lrRVBKRGdSbm9MWHQwRDE0",
  intl: "c2stU1VldXNjSmtSZkNVU1ZzT0VVM2w1aFFycHBlWnR4QkxwVFl2MGRMemF3SWpQM2JU",
}

const AGNES_API_ORIGINS: Record<AgnesRegion, string> = {
  cn: "https://api.agnes-ai.cn",
  intl: "https://apihub.agnes-ai.com",
}

const AGNES_API_URLS: Record<AgnesRegion, string> = {
  cn: `${AGNES_API_ORIGINS.cn}/v1/images/generations`,
  intl: `${AGNES_API_ORIGINS.intl}/v1/images/generations`,
}

export interface AgnesConfig {
  apiUrl: string
  apiKey: string
  model: AgnesModel
  apiParams: Record<string, string>
}

export function getAgnesConfig(
  configuredKey: string | null | undefined = null,
  configuredParams: Record<string, string> = {},
  region: AgnesRegion = "intl",
  model: AgnesModel = "agnes-image-2.1-flash",
): AgnesConfig {
  const apiKey = resolveAgnesApiKey(configuredKey, region)
  return {
    apiUrl: AGNES_API_URLS[region],
    apiKey,
    model,
    apiParams: { ...configuredParams, model },
  }
}

export interface AgnesVideoConfig {
  apiUrl: string
  queryUrl: string
  apiKey: string
  model: AgnesVideoModel
}

export function getAgnesVideoConfig(
  configuredKey: string | null | undefined = null,
  region: AgnesRegion = "intl",
  model: AgnesVideoModel = "agnes-video-2.5-flash",
): AgnesVideoConfig {
  return {
    apiUrl: `${AGNES_API_ORIGINS[region]}/v1`,
    queryUrl: `${AGNES_API_ORIGINS[region]}/agnesapi`,
    apiKey: resolveAgnesApiKey(configuredKey, region),
    model,
  }
}

function resolveAgnesApiKey(
  configuredKey: string | null | undefined,
  region: AgnesRegion,
): string {
  const trimmed = (configuredKey ?? "").trim()
  if (!trimmed) {
    return Buffer.from(AGNES_API_KEYS[region], "base64").toString("utf-8")
  }

  // 明文 sk- 直接使用
  if (trimmed.startsWith("sk-")) return trimmed

  // 兼容把内置 Key 的 Base64 填进配置的情况
  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf-8")
    if (decoded.startsWith("sk-")) return decoded
  } catch {}

  return trimmed
}
