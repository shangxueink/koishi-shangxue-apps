<template>
  <div class="vb-search">
    <input v-model="query" placeholder="搜索文件内容" />
    <div v-if="loading" class="vb-search-status">正在搜索...</div>
    <div v-else-if="error" class="vb-search-error">{{ error }}</div>
    <div v-else-if="!query.trim()" class="vb-search-status">输入关键词以搜索文件内容</div>
    <div v-else-if="!matches.length" class="vb-search-status">无匹配</div>
    <div v-else class="vb-search-results">
      <button
        v-for="(match, index) in matches"
        :key="`${match.path}:${match.line}:${index}`"
        class="vb-search-result"
        @click="emit('open', match.path)"
      >
        <span class="vb-search-location">{{ match.path }}:{{ match.line }}</span>
        <span class="vb-search-content">{{ match.content }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { send } from '@koishijs/client'
import type { SearchMatch } from './types'
import { errorMessage } from './utils'

const emit = defineEmits<{
  open: [path: string]
}>()

const query = ref('')
const matches = ref<SearchMatch[]>([])
const loading = ref(false)
const error = ref('')
let timer: number | undefined

watch(query, () => {
  window.clearTimeout(timer)
  timer = window.setTimeout(runSearch, 300)
})

onBeforeUnmount(() => {
  window.clearTimeout(timer)
})

async function runSearch() {
  const keyword = query.value.trim()
  if (!keyword) {
    matches.value = []
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    matches.value = await send<SearchMatch[]>('vscode-blockly/search', keyword)
  } catch (caught) {
    error.value = errorMessage(caught)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.vb-search {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 8px;
}

.vb-search input {
  width: 100%;
  height: 28px;
  padding: 0 8px;
  color: #d4d4d4;
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 3px;
  outline: none;
}

.vb-search-status,
.vb-search-error {
  padding: 14px 8px;
  color: #8a8a8a;
  font-size: 12px;
}

.vb-search-error {
  color: #f48771;
}

.vb-search-results {
  overflow: auto;
}

.vb-search-result {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  padding: 7px 8px;
  color: #d4d4d4;
  background: transparent;
  border: 0;
  border-bottom: 1px solid #333;
  text-align: left;
  cursor: pointer;
}

.vb-search-result:hover {
  background: #37373d;
}

.vb-search-location {
  color: #569cd6;
  font-size: 11px;
}

.vb-search-content {
  overflow: hidden;
  color: #9d9d9d;
  font-family: Consolas, monospace;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
