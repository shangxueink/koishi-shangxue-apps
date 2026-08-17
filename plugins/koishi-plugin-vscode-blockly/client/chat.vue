<template>
  <div class="vb-chat">
    <div class="vb-chat-header">
      <div class="vb-chat-title">AI 对话</div>
      <button class="vb-text-button" @click="clear">清空</button>
    </div>
    <div class="vb-chat-messages">
      <div v-if="!messages.length" class="vb-chat-empty">开始描述插件需求</div>
      <div
        v-for="(message, index) in messages"
        :key="`${message.id || index}-${index}`"
        class="vb-chat-message"
        :class="message.role"
      >
        <div class="vb-chat-message-content">
          {{ message.content }}
          <span v-if="loading && message.id === activeId" class="vb-chat-cursor">▍</span>
        </div>
        <div v-if="message.role === 'assistant' && !loading && message.content" class="vb-chat-actions">
          <button class="vb-button small" @click="applyCurrent(message.content)">写入当前文件</button>
          <button class="vb-button small" @click="applyNew(message.content)">新建脚本</button>
        </div>
      </div>
      <div v-if="error" class="vb-chat-error">{{ error }}</div>
    </div>
    <div class="vb-chat-input">
      <textarea
        v-model="input"
        rows="4"
        placeholder="描述插件需求，Ctrl+Enter 发送"
        @keydown.ctrl.enter.prevent="sendMessage"
      ></textarea>
      <button class="vb-button primary" :disabled="loading || !input.trim()" @click="sendMessage">发送</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { receive, send } from '@koishijs/client'
import type {
  ChatChunkPayload,
  ChatDonePayload,
  ChatErrorPayload,
  ChatMessage,
  ChatStartRequest,
} from './types'
import { errorMessage, extractCode } from './utils'

const emit = defineEmits<{
  applyCurrent: [code: string]
  applyNew: [code: string]
}>()

const storageKey = 'vscode-blockly-chat'
const messages = ref<ChatMessage[]>(loadMessages())
const input = ref('')
const activeId = ref('')
const error = ref('')

const loading = ref(false)

receive<ChatChunkPayload>('vscode-blockly/chat-chunk', ({ id, delta }) => {
  const message = messages.value.find(item => item.id === id)
  if (message) {
    message.content += delta
    saveMessages()
  }
})

receive<ChatDonePayload>('vscode-blockly/chat-done', ({ id, content }) => {
  const message = messages.value.find(item => item.id === id)
  if (message) message.content = content
  if (activeId.value === id) {
    activeId.value = ''
    loading.value = false
  }
  saveMessages()
})

receive<ChatErrorPayload>('vscode-blockly/chat-error', ({ id, error: message }) => {
  const target = messages.value.find(item => item.id === id)
  if (target) target.content += `\n\n生成失败: ${message}`
  if (activeId.value === id) {
    activeId.value = ''
    loading.value = false
  }
  error.value = message
  saveMessages()
})

onBeforeUnmount(() => saveMessages())

async function sendMessage() {
  const content = input.value.trim()
  if (!content || loading.value) return
  const id = createChatId()
  messages.value.push({ role: 'user', content })
  messages.value.push({ id, role: 'assistant', content: '' })
  input.value = ''
  error.value = ''
  activeId.value = id
  loading.value = true
  saveMessages()
  try {
    const payload: ChatStartRequest = {
      id,
      messages: messages.value.filter(item => item.role !== 'system'),
    }
    await send('vscode-blockly/chat/start', payload)
  } catch (caught) {
    error.value = errorMessage(caught)
    activeId.value = ''
    loading.value = false
  }
}

function applyCurrent(content: string) {
  emit('applyCurrent', extractCode(content))
}

function applyNew(content: string) {
  emit('applyNew', extractCode(content))
}

function clear() {
  messages.value = []
  error.value = ''
  activeId.value = ''
  loading.value = false
  saveMessages()
}

function createChatId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `chat-${Date.now()}`
}

function loadMessages(): ChatMessage[] {
  try {
    const value = window.localStorage.getItem(storageKey)
    if (!value) return []
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is ChatMessage => {
      if (!item || typeof item !== 'object') return false
      const record = item as Record<string, unknown>
      return record.role === 'user' || record.role === 'assistant'
    })
  } catch {
    return []
  }
}

function saveMessages() {
  window.localStorage.setItem(storageKey, JSON.stringify(messages.value))
}
</script>

<style scoped>
.vb-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #252526;
}

.vb-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 34px;
  padding: 0 12px;
  color: #d4d4d4;
  border-bottom: 1px solid #3c3c3c;
}

.vb-chat-title {
  font-size: 12px;
  font-weight: 600;
}

.vb-chat-messages {
  flex: 1;
  min-height: 0;
  padding: 10px;
  overflow: auto;
}

.vb-chat-empty {
  padding: 24px 8px;
  color: #8a8a8a;
  font-size: 12px;
  text-align: center;
}

.vb-chat-message {
  margin-bottom: 10px;
  padding: 8px 10px;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  background: #2d2d30;
}

.vb-chat-message.user {
  border-color: #569cd6;
}

.vb-chat-message.assistant {
  border-color: #4ec9b0;
}

.vb-chat-message-content {
  color: #d4d4d4;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.vb-chat-cursor {
  color: #4ec9b0;
  animation: vb-blink 0.8s steps(1) infinite;
}

.vb-chat-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.vb-chat-error {
  padding: 8px;
  color: #f48771;
  font-size: 12px;
}

.vb-chat-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-top: 1px solid #3c3c3c;
}

.vb-chat-input textarea {
  width: 100%;
  min-height: 64px;
  padding: 8px;
  resize: vertical;
  color: #d4d4d4;
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 3px;
  outline: none;
  font-family: inherit;
  font-size: 12px;
}

.vb-chat-input button {
  align-self: flex-end;
}

@keyframes vb-blink {
  50% {
    opacity: 0;
  }
}
</style>
