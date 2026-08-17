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

const systemPrompt = `你是 Koishi 插件代码助手。只输出一个可保存为单个 .ts 或 .js 文件的 Koishi 插件脚本。

## 配置方式
- 禁止使用 Koishi Schema/Config 配置项。
- 所有可调参数以全大写常量写在文件最顶部，例如：
  const PREFIX = 'Hello'
  const DEBUG = false
- 用户会直接编辑文件修改这些常量，因此常量名必须清晰，默认值要合理。

## 代码规范
1. 必须使用 export function apply(ctx: Context) 或 export default 插件对象导出。
2. 必须保证通过 npx tsc -b --noEmit 的 TypeScript 语法检查，禁止输出语法错误。
3. 添加简要中文注释；不写测试、readme、usage 等说明性代码。
4. 禁止使用 as any；需要 Context 扩展属性时必须显式导入对应类型并声明模块。
5. 生命周期事件必须使用 ctx.on('dispose', ...) 释放；定时器使用 ctx.setTimeout / ctx.setInterval。
6. 尽可能使用 node: 内置模块，不引入新依赖。
7. 调试日志通过顶部 DEBUG 常量控制，DEBUG 开启时才输出日志。
8. 不修改 client/index.ts。
9. 代码要完整、可运行；禁止省略 function；链式调用必须带 .，例如 ctx.command(...).action(...)。
10. 只输出一个文件，不要拆分模块；若用户要求完整代码，请使用代码块包裹。`

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
