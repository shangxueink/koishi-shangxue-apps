<template>
  <div class="vb-extensions">
    <div
      v-for="file in scriptFiles"
      :key="file.path"
      class="vb-extension-row"
      :class="{ enabled: file.enabled }"
      @click="emit('open', file.path)"
    >
      <span class="vb-extension-name">{{ file.name }}</span>
      <span class="vb-extension-path">{{ file.path }}</span>
      <span class="vb-extension-state">{{ file.enabled ? '已启用' : '已停用' }}</span>
      <button @click.stop="emit('toggle', file.path, !file.enabled)">
        {{ file.enabled ? '停用' : '启用' }}
      </button>
    </div>
    <div v-if="!scriptFiles.length" class="vb-extensions-empty">暂无脚本</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FileNode } from './types'
import { flattenFiles } from './utils'

const props = defineProps<{
  files: FileNode[]
}>()

const emit = defineEmits<{
  open: [path: string]
  toggle: [path: string, enabled: boolean]
}>()

const scriptFiles = computed(() => flattenFiles(props.files))
</script>

<style scoped>
.vb-extensions {
  padding: 8px;
}

.vb-extension-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 8px;
  padding: 10px 8px;
  border-bottom: 1px solid #333;
  cursor: pointer;
}

.vb-extension-row:hover {
  background: #37373d;
}

.vb-extension-name {
  color: #d4d4d4;
  font-weight: 600;
}

.vb-extension-path,
.vb-extension-state {
  color: #8a8a8a;
  font-size: 11px;
}

.vb-extension-row button {
  grid-column: 1 / -1;
  height: 24px;
  color: #d4d4d4;
  background: #3c3c3c;
  border: 1px solid #555;
  border-radius: 3px;
  cursor: pointer;
}

.vb-extension-row.enabled button {
  color: #fff;
  background: #a1260d;
  border-color: #a1260d;
}

.vb-extensions-empty {
  padding: 16px 8px;
  color: #8a8a8a;
}
</style>
