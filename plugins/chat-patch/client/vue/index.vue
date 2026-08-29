<template>
  <div class="chat-patch-frame">
    <iframe ref="frameRef" :src="frameSrc" class="chat-patch-iframe" allow="clipboard-read; clipboard-write; microphone" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { send } from '@koishijs/client'

const frameRef = ref<HTMLIFrameElement | null>(null)
const frameSrc = ref('')

function getObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function post(payload: Record<string, unknown>) {
  frameRef.value?.contentWindow?.postMessage(payload, '*')
}

function sendBootstrap() {
  void send('chat-patch/bootstrap').then((res) => {
    const data = getObject(res)
    const basePath = getString(data.basePath) || '/chat-patch'
    frameSrc.value = `${basePath}/web/`
    post({
      source: 'chat-patch-bootstrap',
      payload: data,
    })
  })
}

async function handleMessage(event: MessageEvent) {
  const data = getObject(event.data)
  const source = getString(data.source)
  if (source === 'chat-patch-ready') {
    sendBootstrap()
    return
  }
  if (source !== 'chat-patch-request') return

  const id = getString(data.id)
  const method = getString(data.method)
  const params = getObject(data.params)
  try {
    const payload = await send(`chat-patch/${method}`, params)
    post({ source: 'chat-patch-response', id, ok: true, payload })
  } catch (error) {
    post({ source: 'chat-patch-response', id, ok: false, error: String(error) })
  }
}

onMounted(() => {
  window.addEventListener('message', handleMessage)
  // 开发与生产都走 Koishi 服务端；开发时该路由由 Koishi 自己的 Vite 转换源码
  frameSrc.value = '/chat-patch/web/'
})

onUnmounted(() => {
  window.removeEventListener('message', handleMessage)
})
</script>

<style scoped>
.chat-patch-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f7f9fa;
}

.chat-patch-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
