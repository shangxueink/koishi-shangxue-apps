import { Context } from 'koishi'
import type { ReadableStream } from 'node:stream/web'
import { ChatRequest } from './types'
import { Store } from './store'
import { logDebug } from './logger'

interface OpenAIStreamChoice {
  delta?: {
    content?: string
  }
}

interface OpenAIStreamResponse {
  choices?: OpenAIStreamChoice[]
}

const systemPrompt = `你是 Koishi 插件代码助手。请只输出一个可保存为单个 .ts 或 .js 文件的 Koishi 插件脚本。
脚本应导出 apply(ctx) 或默认导出插件对象。你可以从 koishi 中导入 Context、Schema 等类型和 API。
保持代码完整、可运行，不要编写 readme 或测试脚本。若用户要求完整代码，请使用代码块包裹。`

export async function startChatStream(ctx: Context, store: Store, id: string, request: ChatRequest) {
  void runChatStream(ctx, store, request, id)
  return id
}

async function runChatStream(ctx: Context, store: Store, request: ChatRequest, id: string) {
  try {
  const config = await store.getConfig()
  if (!config.apiKey) throw new Error('请先在设置页面填写 API Key')
  const base = config.apiBase.trim().replace(/\/+$/, '')
  if (!base) throw new Error('请先在设置页面填写 API 地址')
  const endpoint = `${base}/v1/chat/completions`
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...request.messages,
  ]
  logDebug(`调用 AI: ${endpoint}`)
  const response = await ctx.http.post<ReadableStream<Uint8Array>>(endpoint, {
    model: config.model,
    messages,
    temperature: config.temperature,
    stream: true,
  }, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 120000,
    responseType: 'stream',
  })
    let content = ''
    const reader = response.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value, { stream: true })
      content += consumeSse(ctx, id, text)
    }
    content += consumeSse(ctx, id, decoder.decode())
    ctx.console.broadcast('vscode-blockly/chat-done', { id, content }).catch(() => {})
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    ctx.console.broadcast('vscode-blockly/chat-error', { id, error: message }).catch(() => {})
  }
}

function consumeSse(ctx: Context, id: string, text: string) {
  let output = ''
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line.startsWith('data:')) continue
    const data = line.slice(5).trim()
    if (!data || data === '[DONE]') continue
    try {
      const parsed: unknown = JSON.parse(data)
      const payload = parsed as OpenAIStreamResponse
      const delta = payload.choices?.[0]?.delta?.content
      if (delta) {
        output += delta
        ctx.console.broadcast('vscode-blockly/chat-chunk', { id, delta }).catch(() => {})
      }
    } catch {
      // 忽略不完整的 SSE 分片
    }
  }
  return output
}
