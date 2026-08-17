<template>
  <div class="vb-explorer">
    <div v-if="!files.length" class="vb-explorer-empty">
      暂无脚本，点击上方 + 新建
    </div>
    <div v-else class="vb-explorer-list">
      <tree-item
        v-for="node in files"
        :key="node.path"
        :node="node"
        :active="active"
        @select="select"
        @rename="rename"
        @delete="remove"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import TreeItem from './tree-item.vue'
import type { FileNode } from './types'

defineProps<{
  files: FileNode[]
  active?: string
}>()

const emit = defineEmits<{
  select: [path: string]
  rename: [path: string]
  delete: [path: string]
}>()

function select(path: string) {
  emit('select', path)
}

function rename(path: string) {
  emit('rename', path)
}

function remove(path: string) {
  emit('delete', path)
}
</script>
