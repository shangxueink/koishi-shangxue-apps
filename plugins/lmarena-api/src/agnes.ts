// apihub.agnes-ai.com 专用站点配置，key 使用 base64 混淆存储
const AGNES_API_KEY_BASE64 = "c2stU1VldXNjSmtSZkNVU1ZzT0VVM2w1aFFycHBlWnR4QkxwVFl2MGRMemF3SWpQM2JU"

export interface AgnesConfig {
  apiUrl: string
  apiKey: string
  model: string
  apiParams: Record<string, string>
}

export function getAgnesConfig(configuredKey: string | null | undefined = null): AgnesConfig {
  const apiKey = resolveAgnesApiKey(configuredKey)
  return {
    apiUrl: "https://apihub.agnes-ai.com/v1/images/generations",
    apiKey,
    model: "agnes-image-2.1-flash",
    apiParams: {
      model: "agnes-image-2.1-flash",
      image: "{{inputimage}}",
      prompt: "{{prompt}}",
      size: "1024x1024",
      n: "1",
      type: "normal",
      response_format: "b64_json",
    },
  }
}

function resolveAgnesApiKey(configuredKey: string | null | undefined): string {
  const trimmed = (configuredKey ?? "").trim()
  if (!trimmed) {
    return Buffer.from(AGNES_API_KEY_BASE64, "base64").toString("utf-8")
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
