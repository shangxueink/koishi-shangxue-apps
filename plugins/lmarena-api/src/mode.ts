import type { Config } from "./config"

export type ResolvedApiMode = "edits" | "generations"

// 根据配置、完整 URL 和是否传图，决定本次请求使用哪个协议
export function resolveApiModeForInput(config: Config, hasImages: boolean): ResolvedApiMode {
  if (config.agnesMode) return "generations"
  if (config.apiMode === "edits") return "edits"
  if (config.apiMode === "generations") return "generations"

  const endpointMode = getEndpointMode(config.apiUrl)
  if (endpointMode) return endpointMode

  return hasImages ? "edits" : "generations"
}

// 从完整 URL 中识别 edits / generations 节点
export function getEndpointMode(apiUrl: string): ResolvedApiMode | null {
  try {
    const path = new URL(apiUrl).pathname.replace(/\/+$/, "")
    if (path.endsWith("/images/generations") || path.endsWith("/generations")) {
      return "generations"
    }
    if (path.endsWith("/images/edits") || path.endsWith("/edits")) {
      return "edits"
    }
  } catch {}

  return null
}

// agnes / auto 基础地址下允许“图片可选”，纯文本则直接文生图
export function shouldAskOptionalImage(config: Config): boolean {
  if (config.agnesMode) return true
  if (config.apiMode === "auto" && !getEndpointMode(config.apiUrl)) return true
  return false
}
