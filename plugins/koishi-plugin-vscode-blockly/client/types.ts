export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  enabled?: boolean
  children?: FileNode[]
}

export interface ScriptContent {
  path: string
  name: string
  content: string
  language: 'typescript' | 'javascript'
  enabled: boolean
}

export interface WriteResult {
  path: string
  disabled: boolean
}

export interface RuntimeConfig {
  apiBase: string
  apiKey: string
  model: string
  temperature: number
  debug: boolean
}

export interface ChatMessage {
  id?: string
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  content: string
}

export interface ChatStartRequest {
  id: string
  messages: ChatMessage[]
}

export interface ChatStatus {
  content: string
  done: boolean
  error?: string
  tool?: string
}

export interface ReloadResult {
  ok: boolean
  error?: string
}

export interface SearchMatch {
  path: string
  line: number
  content: string
}
