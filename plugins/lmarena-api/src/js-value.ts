import vm from "node:vm"
import type { ImageFile } from "./api"

// 判断配置值是否为 JS 代码：支持 js: 前缀，也支持直接写箭头函数/函数表达式
export function isJsValue(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.startsWith("js:")
    || trimmed.startsWith("javascript:")
    || isFunctionExpression(trimmed)
}

// 执行配置值里的 JS，返回最终字段值
export function evaluateJsValue(value: string, body: Record<string, unknown>, files: ImageFile[], prompt: string): unknown {
  const trimmed = value.trim()
  const code = trimmed
    .replace(/^js:/i, "")
    .replace(/^javascript:/i, "")
    .trim()
    .replace(/;+\s*$/, "")

  const filesJson = JSON.stringify(files.map(file => ({
    mime: file.mime,
    filename: file.filename,
    data: Buffer.from(file.data).toString("base64"),
  })))
  const sandbox = {
    body,
    prompt,
    Buffer,
  }
  const expression = isFunctionExpression(code)
    ? `const files = ${filesJson}; const context = { body, files, prompt }; (${code})(context)`
    : `const files = ${filesJson}; (${code})`
  const valueResult = vm.runInNewContext(expression, sandbox, { timeout: 1000 })

  if (valueResult && typeof valueResult === "object") {
    const promiseLike = valueResult as { then?: unknown }
    if (typeof promiseLike.then === "function") {
      throw new Error("请求体 JS 代码暂不支持 async")
    }
  }

  return valueResult
}

function isFunctionExpression(value: string): boolean {
  return /^(async\s+)?function\b/.test(value)
    || /^\([^)]*\)\s*=>/.test(value)
    || /^[A-Za-z_$][\w$]*\s*=>/.test(value)
}
