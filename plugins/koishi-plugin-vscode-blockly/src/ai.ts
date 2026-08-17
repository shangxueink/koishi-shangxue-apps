import { Context } from 'koishi'
import { createScript, listScripts, readScript, writeScript } from './files'
import { logDebug } from './logger'
import { ScriptManager } from './runtime'
import { Store } from './store'
import { ChatRequest, ChatStatus } from './types'

interface ChatTask extends ChatStatus {}

const tasks = new Map<string, ChatTask>()

interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

interface ChatMessageInput {
  role: string
  content?: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

interface OpenAIResponse {
  choices?: Array<{
    message?: {
      content?: string | null
      tool_calls?: ToolCall[]
    }
  }>
}

interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: object
  }
}

const systemPrompt = `你是 Koishi 插件代码助手。你可以直接调用工具读写本地脚本文件，不要只把代码返回给用户。

## 工具使用
- 用户要求创建或修改脚本时，优先调用 write_file / create_file 直接写入本地文件。
- 写入前可以先调用 read_file / list_files 查看当前已有脚本。
- 写入完成后，只需要在回复中简要说明文件路径和修改内容，不要再重复整段代码。

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
10. 只输出一个文件，不要拆分模块。`

const tools: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: '列出 scripts 目录下的所有 TS/JS 脚本',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: '读取一个 TS/JS 脚本文件的内容',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '脚本相对路径，例如 UN-1.ts' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: '覆盖写入一个 TS/JS 脚本文件；如果文件原本已启用，写入后会自动停用',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '脚本相对路径，例如 UN-1.ts' },
          content: { type: 'string', description: '完整文件内容' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_file',
      description: '新建一个 TS/JS 脚本文件',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '脚本相对路径，例如 UN-2.ts' },
          content: { type: 'string', description: '完整文件内容' },
        },
        required: ['path', 'content'],
      },
    },
  },
]

export async function startChatStream(
  ctx: Context,
  store: Store,
  runtime: ScriptManager,
  id: string,
  request: ChatRequest,
) {
  const task: ChatTask = { content: '', done: false }
  tasks.set(id, task)
  void runChatStream(ctx, store, runtime, request, task)
  return id
}

export function getChatTask(id: string): ChatStatus {
  const task = tasks.get(id)
  if (!task) return { content: '', done: true, error: '对话任务不存在或已过期' }
  return {
    content: task.content,
    done: task.done,
    error: task.error,
    tool: task.tool,
  }
}

async function runChatStream(
  ctx: Context,
  store: Store,
  runtime: ScriptManager,
  request: ChatRequest,
  task: ChatTask,
) {
  try {
    const config = await store.getConfig()
    if (!config.apiKey) throw new Error('请先在设置页面填写 API Key')
    const base = config.apiBase.trim().replace(/\/+$/, '')
    if (!base) throw new Error('请先在设置页面填写 API 地址')
    const endpoint = `${base}/v1/chat/completions`
    const messages: ChatMessageInput[] = [
      { role: 'system', content: systemPrompt },
      ...request.messages,
    ]

    logDebug(`调用 AI: ${endpoint}`)
    let content = ''
    for (let index = 0; index < 8; index++) {
      const response = await ctx.http.post<OpenAIResponse>(endpoint, {
        model: config.model,
        messages,
        temperature: config.temperature,
        tools,
        tool_choice: 'auto',
      }, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      })
      const message = response.choices?.[0]?.message
      if (!message) throw new Error('AI 返回内容为空')

      if (message.tool_calls?.length) {
        messages.push({
          role: 'assistant',
          content: message.content ?? null,
          tool_calls: message.tool_calls,
        })
        for (const call of message.tool_calls) {
          const result = await executeTool(ctx, store, runtime, call)
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: result,
          })
          task.tool = call.function.name
        }
        continue
      }

      content = message.content?.trim() ?? ''
      break
    }

    if (!content) content = '已完成工具调用，但没有生成可显示内容。'
    task.content = content
    task.done = true
    task.tool = undefined
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    task.error = message
    task.done = true
    task.tool = undefined
  }
}

async function executeTool(
  ctx: Context,
  store: Store,
  runtime: ScriptManager,
  call: ToolCall,
) {
  try {
    const args: unknown = JSON.parse(call.function.arguments)
    if (!args || typeof args !== 'object') throw new Error('工具参数不是对象')
    const record = args as Record<string, unknown>

    if (call.function.name === 'list_files') {
      const files = await listScripts(ctx, store)
      return JSON.stringify({ ok: true, files })
    }

    if (call.function.name === 'read_file') {
      const path = String(record.path ?? '')
      const file = await readScript(ctx, store, path)
      return JSON.stringify({ ok: true, path, content: file.content })
    }

    if (call.function.name === 'write_file') {
      const path = String(record.path ?? '')
      const content = String(record.content ?? '')
      await writeScript(ctx, store, path, content)
      const state = await store.getState()
      if (state.enabled.includes(path)) {
        await store.setEnabled(path, false)
        await runtime.stop(path)
      }
      return JSON.stringify({ ok: true, path, disabled: true })
    }

    if (call.function.name === 'create_file') {
      const path = String(record.path ?? '')
      const content = String(record.content ?? '')
      await createScript(ctx, store, path, content)
      return JSON.stringify({ ok: true, path, disabled: false })
    }

    return JSON.stringify({ ok: false, error: `未知工具: ${call.function.name}` })
  } catch (error) {
    return JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
