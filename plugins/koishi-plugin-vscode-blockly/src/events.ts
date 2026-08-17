import { Context } from 'koishi'
import { } from '@koishijs/plugin-console'
import { startChatStream } from './ai'
import {
  createScript,
  deleteScript,
  listScripts,
  readScript,
  renameScript,
  searchScripts,
  writeScript,
} from './files'
import { getGitStatus } from './git'
import { setDebug } from './logger'
import { ScriptManager } from './runtime'
import { Store } from './store'
import {
  ChatRequest,
  ChatStartRequest,
  ChatResponse,
  FileNode,
  GitStatus,
  ReloadResult,
  RuntimeConfig,
  ScriptContent,
  SearchMatch,
  WriteResult,
} from './types'

declare module '@koishijs/plugin-console' {
  interface Events {
    'vscode-blockly/list'(): Promise<FileNode[]>
    'vscode-blockly/read'(path: string): Promise<ScriptContent>
    'vscode-blockly/write'(path: string, content: string): Promise<WriteResult>
    'vscode-blockly/create'(path: string, content?: string): Promise<string>
    'vscode-blockly/rename'(oldPath: string, newPath: string): Promise<string>
    'vscode-blockly/delete'(path: string): Promise<string>
    'vscode-blockly/config/get'(): Promise<RuntimeConfig>
    'vscode-blockly/config/set'(config: RuntimeConfig): Promise<void>
    'vscode-blockly/chat'(request: ChatRequest): Promise<ChatResponse>
    'vscode-blockly/chat/start'(request: ChatStartRequest): Promise<string>
    'vscode-blockly/search'(query: string): Promise<SearchMatch[]>
    'vscode-blockly/git/status'(): Promise<GitStatus>
    'vscode-blockly/root'(): Promise<string>
    'vscode-blockly/enabled'(path: string, enabled: boolean): Promise<ReloadResult>
    'vscode-blockly/reload'(path?: string): Promise<ReloadResult>
  }
}

export function registerConsoleEvents(ctx: Context, store: Store, runtime: ScriptManager) {
  ctx.console.addListener('vscode-blockly/list', async () => listScripts(ctx, store), { authority: 4 })
  ctx.console.addListener('vscode-blockly/read', async (path) => readScript(ctx, store, path), { authority: 4 })
  ctx.console.addListener('vscode-blockly/write', async (path, content) => {
    const result = await writeScript(ctx, store, path, content)
    const state = await store.getState()
    const wasEnabled = state.enabled.includes(path)
    if (wasEnabled) {
      await store.setEnabled(path, false)
      await runtime.stop(path)
    }
    return { path: result, disabled: wasEnabled }
  }, { authority: 4 })
  ctx.console.addListener('vscode-blockly/create', async (path, content) => createScript(ctx, store, path, content), { authority: 4 })
  ctx.console.addListener('vscode-blockly/rename', async (oldPath, newPath) => {
    const result = await renameScript(ctx, store, oldPath, newPath)
    await runtime.reload(newPath)
    return result
  }, { authority: 4 })
  ctx.console.addListener('vscode-blockly/delete', async (path) => {
    await runtime.stop(path)
    return deleteScript(ctx, store, path)
  }, { authority: 4 })
  ctx.console.addListener('vscode-blockly/config/get', async () => store.getConfig(), { authority: 4 })
  ctx.console.addListener('vscode-blockly/config/set', async (config) => {
    await store.setConfig(config)
    setDebug(config.debug)
  }, { authority: 4 })
  ctx.console.addListener('vscode-blockly/chat/start', async (request) => startChatStream(ctx, store, request.id, request), { authority: 4 })
  ctx.console.addListener('vscode-blockly/search', async (query) => searchScripts(ctx, store, query), { authority: 4 })
  ctx.console.addListener('vscode-blockly/git/status', async () => getGitStatus(store.scriptsRoot), { authority: 4 })
  ctx.console.addListener('vscode-blockly/root', async () => store.scriptsRoot, { authority: 4 })
  ctx.console.addListener('vscode-blockly/enabled', async (path, enabled) => {
    await store.setEnabled(path, enabled)
    if (enabled) {
      return runtime.reload(path)
    }
    await runtime.stop(path)
    return { ok: true }
  }, { authority: 4 })
  ctx.console.addListener('vscode-blockly/reload', async (path) => runtime.reload(path), { authority: 4 })
}
