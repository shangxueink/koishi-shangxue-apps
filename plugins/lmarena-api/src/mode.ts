import type { Config } from "./config"

export type ResolvedApiMode = "edits" | "generations"

// 根据配置、完整 URL 和是否传图，决定本次请求使用哪个协议
export function resolveApiModeForInput(config: Config, hasImages: boolean): ResolvedApiMode {
  if (config.agnesMode) return "generations"
  return hasImages ? "edits" : "generations"
}

// agnes / auto 基础地址下允许“图片可选”，纯文本则直接文生图
export function shouldAskOptionalImage(config: Config): boolean {
  if (config.agnesMode) return true
  return true
}
