<template>
  <div class="vb-settings">
    <div class="vb-settings-header">
      <div class="vb-chat-title">API 设置</div>
      <button class="vb-button primary" @click="save">保存设置</button>
    </div>
    <div class="vb-settings-body">
      <label class="vb-field">
        <span>API 地址</span>
        <input v-model="config.apiBase" placeholder="https://api.deepseek.com" />
      </label>
      <label class="vb-field">
        <span>API Key</span>
        <input v-model="config.apiKey" type="password" placeholder="sk-..." autocomplete="off" />
      </label>
      <label class="vb-field">
        <span>模型</span>
        <input v-model="config.model" placeholder="deepseek-chat" />
      </label>
      <label class="vb-field">
        <span>温度</span>
        <input v-model.number="config.temperature" type="number" min="0" max="2" step="0.1" />
      </label>
      <label class="vb-check">
        <input v-model="config.debug" type="checkbox" />
        <span>调试日志</span>
      </label>
    </div>
    <div v-if="status" class="vb-settings-status">{{ status }}</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { send } from '@koishijs/client'
import type { RuntimeConfig } from './types'
import { errorMessage } from './utils'

const config = ref<RuntimeConfig>({
  apiBase: 'https://api.deepseek.com',
  apiKey: '',
  model: 'deepseek-chat',
  temperature: 0.2,
  debug: false,
})
const status = ref('')

onMounted(async () => {
  try {
    config.value = await send<RuntimeConfig>('vscode-blockly/config/get')
  } catch (error) {
    status.value = errorMessage(error)
  }
})

async function save() {
  try {
    await send('vscode-blockly/config/set', { ...config.value })
    status.value = '设置已保存'
  } catch (error) {
    status.value = errorMessage(error)
  }
}
</script>

<style scoped>
.vb-settings {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  max-width: 680px;
  margin: 0 auto;
  padding: 0 16px;
}

.vb-settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 42px;
  color: #ffffff;
  border-bottom: 1px solid #3c3c3c;
}

.vb-settings-body {
  display: grid;
  gap: 14px;
  padding: 24px 0;
}

.vb-field {
  display: grid;
  gap: 6px;
  color: #d4d4d4;
}

.vb-field span {
  color: #8a8a8a;
}

.vb-field input {
  height: 30px;
  padding: 0 10px;
  color: #d4d4d4;
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 3px;
  outline: none;
}

.vb-field input:focus {
  border-color: #0e639c;
}

.vb-check {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #d4d4d4;
}

.vb-settings-status {
  color: #8a8a8a;
}
</style>
