<template>
  <div class="vb-tree-node">
    <div v-if="node.type === 'directory'" class="vb-tree-row" @click="expanded = !expanded">
      <span class="vb-tree-arrow">{{ expanded ? '▾' : '▸' }}</span>
      <folder-icon class="vb-tree-icon" :open="expanded" />
      <span class="vb-tree-name">{{ node.name }}</span>
    </div>
    <div v-else class="vb-tree-row vb-tree-file" :class="{ active: active === node.path }" @click="select(node.path)">
      <span class="vb-tree-arrow"></span>
      <file-ts-icon v-if="node.name.endsWith('.ts')" class="vb-tree-icon" />
      <file-js-icon v-else class="vb-tree-icon" />
      <span class="vb-tree-name">{{ node.name }}</span>
      <span v-if="node.enabled" class="vb-tree-dot" title="已启用"></span>
      <span class="vb-tree-actions">
        <button title="重命名" @click.stop="rename(node.path)">✎</button>
        <button title="删除" @click.stop="remove(node.path)">✕</button>
      </span>
    </div>
    <div v-if="node.type === 'directory' && expanded" class="vb-tree-children">
      <tree-item
        v-for="child in node.children || []"
        :key="child.path"
        :node="child"
        :active="active"
        @select="select"
        @rename="rename"
        @delete="remove"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FolderIcon from './icons/folder.vue'
import FileTsIcon from './icons/file-ts.vue'
import FileJsIcon from './icons/file-js.vue'
import type { FileNode } from './types'

defineProps<{
  node: FileNode
  active?: string
}>()

const emit = defineEmits<{
  select: [path: string]
  rename: [path: string]
  delete: [path: string]
}>()

const expanded = ref(false)

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
