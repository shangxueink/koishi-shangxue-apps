<template>
  <div class="vb-editor">
    <template v-if="script">
      <div class="vb-editor-tabs">
        <div class="vb-tab">
          <span class="vb-tab-dot" :class="{ dirty }"></span>
          {{ script.name }}
        </div>
        <div class="vb-editor-actions">
          <button class="vb-button" :class="{ danger: script.enabled }" @click="emit('toggle')">
            {{ script.enabled ? '关闭插件' : '开启插件' }}
          </button>
          <button class="vb-button" @click="emit('reload')">重载插件</button>
          <button class="vb-button primary" @click="save">保存</button>
        </div>
      </div>
      <div class="vb-editor-body">
        <div class="vb-gutter">
          <div v-for="line in lineNumbers" :key="line" class="vb-gutter-line">{{ line }}</div>
        </div>
        <textarea
          class="vb-editor-textarea"
          :value="draft"
          spellcheck="false"
          @input="handleInput"
          @keydown="handleKeydown"
        ></textarea>
      </div>
    </template>
    <div v-else class="vb-editor-empty">
      VSCode Blockly
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ScriptContent } from './types'

const props = defineProps<{
  script?: ScriptContent
  dirty: boolean
}>()

const emit = defineEmits<{
  save: [content: string]
  toggle: []
  reload: []
  change: []
}>()

const draft = ref('')

watch(() => [props.script?.path, props.script?.content], () => {
  draft.value = props.script?.content ?? ''
}, { immediate: true })

const lineNumbers = computed(() => {
  const count = draft.value.split('\n').length
  return Array.from({ length: count }, (_, index) => index + 1)
})

function handleInput(event: Event) {
  const target = event.target
  if (target instanceof HTMLTextAreaElement) {
    draft.value = target.value
    emit('change')
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault()
    save()
  }
}

function save() {
  emit('save', draft.value)
}
</script>
