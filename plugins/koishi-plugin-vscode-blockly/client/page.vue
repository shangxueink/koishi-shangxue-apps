<template>
  <div class="vscode-blockly-root vb-shell" :class="{ 'is-mobile': isMobile }">
    <div class="vb-topbar">
      <div class="vb-topbar-title">VSCode Blockly</div>
      <button class="vb-ai-toggle" :class="{ active: aiOpen }" @click="aiOpen = !aiOpen">
        AI 对话
      </button>
    </div>
    <div class="vb-workspace">
      <aside class="vb-activity">
        <button
          v-for="item in activityItems"
          :key="item.key"
          :class="{ active: view === item.key }"
          :title="item.label"
          @click="switchActivity(item.key)"
        >
          <component :is="item.icon" />
          <span v-if="isMobile" class="vb-activity-label">{{ item.label }}</span>
        </button>
        <div class="vb-activity-spacer"></div>
      </aside>

      <aside
        class="vb-sidebar"
        :class="{ hidden: !showSidebar, 'mobile-open': isMobile && sidebarOpen }"
        :style="sidebarStyle"
      >
        <div class="vb-sidebar-header">
          <span>{{ viewTitle }}</span>
          <div class="vb-sidebar-actions">
            <button v-if="view === 'files'" title="新建脚本" @click="newFile">+</button>
            <button v-if="isMobile" title="关闭" @click="sidebarOpen = false">✕</button>
          </div>
        </div>
        <div class="vb-sidebar-content">
          <explorer
            v-show="view === 'files'"
            :files="files"
            :active="currentPath"
            @select="openFile"
            @rename="renameFile"
            @delete="deleteFile"
          />
          <search-panel v-show="view === 'search'" @open="openSearchResult" />
        </div>
        <div v-if="!isMobile" class="vb-resizer" @pointerdown="startResize"></div>
      </aside>

      <main class="vb-main">
        <settings-panel v-if="view === 'settings'" />
        <editor
          v-else
          :script="currentScript"
          :dirty="dirty"
          @save="saveFile"
          @toggle="toggleEnabled"
          @reload="reloadCurrent"
          @change="dirty = true"
        />
      </main>

      <aside
        class="vb-ai-panel"
        :class="{ open: aiOpen && view !== 'settings' }"
        :style="aiPanelStyle"
      >
        <div v-if="!isMobile" class="vb-ai-resizer" @pointerdown="startAiResize"></div>
        <chat
          @apply-current="applyToCurrent"
          @apply-new="createFromChat"
          @file-changed="handleAiFileChanged"
        />
      </aside>
    </div>

    <footer class="vb-statusbar">
      <span>{{ viewLabel }}</span>
      <span v-if="currentScript">{{ currentScript.name }}</span>
      <span>{{ dirty ? '未保存' : '已保存' }}</span>
      <span>{{ currentScript?.enabled ? '已启用' : '已停用' }}</span>
      <span class="vb-status-path">{{ scriptsRootShort }}</span>
      <span class="vb-status-error">{{ status }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { send } from '@koishijs/client'
import Chat from './chat.vue'
import Editor from './editor.vue'
import Explorer from './explorer.vue'
import SettingsPanel from './settings.vue'
import SearchPanel from './search.vue'
import FilesIcon from './icons/files.vue'
import SearchIcon from './icons/search.vue'
import SettingsIcon from './icons/settings.vue'
import type { Component } from 'vue'
import type { FileNode, ReloadResult, ScriptContent, WriteResult } from './types'
import { errorMessage, flattenFiles, normalizeScriptName } from './utils'

type View = 'files' | 'search' | 'settings'

interface ActivityItem {
  key: View
  label: string
  icon: Component
}

const view = ref<View>('files')
const files = ref<FileNode[]>([])
const currentPath = ref('')
const currentScript = ref<ScriptContent>()
const dirty = ref(false)
const status = ref('就绪')
const scriptsRoot = ref('')
const isMobile = ref(false)
const sidebarOpen = ref(true)
const aiOpen = ref(false)

const media = window.matchMedia('(max-width: 760px)')
const savedWidth = Number(window.localStorage.getItem('vb-sidebar-width') || 260)
const sidebarWidth = ref(Number.isFinite(savedWidth) && savedWidth >= 180 && savedWidth <= 420 ? savedWidth : 260)
let resizeStart: { x: number; width: number } | null = null
const savedAiWidth = Number(window.localStorage.getItem('vb-ai-width') || 360)
const aiWidth = ref(Number.isFinite(savedAiWidth) && savedAiWidth >= 280 && savedAiWidth <= 640 ? savedAiWidth : 360)
let aiResizeStart: { x: number; width: number } | null = null

const activityItems: ActivityItem[] = [
  { key: 'files', label: '资源管理器', icon: FilesIcon },
  { key: 'search', label: '搜索', icon: SearchIcon },
  { key: 'settings', label: '设置', icon: SettingsIcon },
]

const showSidebar = computed(() => view.value !== 'settings')

const sidebarStyle = computed(() => {
  if (isMobile.value) return {}
  return {
    width: `${sidebarWidth.value}px`,
    flexBasis: `${sidebarWidth.value}px`,
  }
})

const aiPanelStyle = computed(() => {
  if (isMobile.value) return {}
  return {
    width: `${aiWidth.value}px`,
    flexBasis: `${aiWidth.value}px`,
  }
})

const viewTitle = computed(() => activityItems.find(item => item.key === view.value)?.label ?? '')
const viewLabel = computed(() => viewTitle.value || '编辑器')
const scriptsRootShort = computed(() => {
  const parts = scriptsRoot.value.replace(/\\/g, '/').split('/').filter(Boolean)
  return parts.slice(-3).join('/')
})

function updateMobile() {
  isMobile.value = media.matches
  sidebarOpen.value = !media.matches
}

function switchActivity(key: View) {
  const sidebarViews: View[] = ['files', 'search']
  if (isMobile.value && view.value === key && sidebarViews.includes(key)) {
    sidebarOpen.value = !sidebarOpen.value
    return
  }
  view.value = key
  if (isMobile.value && sidebarViews.includes(key)) {
    sidebarOpen.value = true
  }
}

function startResize(event: PointerEvent) {
  event.preventDefault()
  resizeStart = { x: event.clientX, width: sidebarWidth.value }
  window.addEventListener('pointermove', handleResize)
  window.addEventListener('pointerup', stopResize)
}

function handleResize(event: PointerEvent) {
  if (!resizeStart) return
  const next = Math.min(420, Math.max(180, resizeStart.width + event.clientX - resizeStart.x))
  sidebarWidth.value = next
  window.localStorage.setItem('vb-sidebar-width', String(next))
}

function stopResize() {
  resizeStart = null
  window.removeEventListener('pointermove', handleResize)
  window.removeEventListener('pointerup', stopResize)
}

function startAiResize(event: PointerEvent) {
  event.preventDefault()
  aiResizeStart = { x: event.clientX, width: aiWidth.value }
  window.addEventListener('pointermove', handleAiResize)
  window.addEventListener('pointerup', stopAiResize)
}

function handleAiResize(event: PointerEvent) {
  if (!aiResizeStart) return
  const next = Math.min(640, Math.max(280, aiResizeStart.width - (event.clientX - aiResizeStart.x)))
  aiWidth.value = next
  window.localStorage.setItem('vb-ai-width', String(next))
}

function stopAiResize() {
  aiResizeStart = null
  window.removeEventListener('pointermove', handleAiResize)
  window.removeEventListener('pointerup', stopAiResize)
}

onMounted(async () => {
  updateMobile()
  media.addEventListener('change', updateMobile)
  await refreshFiles()
  try {
    scriptsRoot.value = await send<string>('vscode-blockly/root')
  } catch (error) {
    status.value = errorMessage(error)
  }
})

onBeforeUnmount(() => {
  media.removeEventListener('change', updateMobile)
  stopResize()
  stopAiResize()
})

async function refreshFiles() {
  try {
    files.value = await send<FileNode[]>('vscode-blockly/list')
  } catch (error) {
    status.value = errorMessage(error)
  }
}

async function openFile(path: string) {
  try {
    currentPath.value = path
    currentScript.value = await send<ScriptContent>('vscode-blockly/read', path)
    dirty.value = false
    status.value = '已打开'
  } catch (error) {
    status.value = errorMessage(error)
  }
}

async function saveFile(content: string) {
  if (!currentPath.value || !currentScript.value) return
  try {
    const result = await send<WriteResult>('vscode-blockly/write', currentPath.value, content)
    currentScript.value = { ...currentScript.value, content }
    dirty.value = false
    if (result.disabled) {
      currentScript.value = { ...currentScript.value, enabled: false }
      status.value = '已保存并关闭插件，请手动重新开启'
    } else {
      status.value = '已保存'
    }
    await refreshFiles()
  } catch (error) {
    status.value = errorMessage(error)
  }
}

function nextUntitledName() {
  const existing = new Set(flattenFiles(files.value).map(file => file.path))
  for (let index = 1; index < 10000; index++) {
    const name = `UN-${index}.ts`
    if (!existing.has(name)) return name
  }
  return `UN-${Date.now()}.ts`
}

async function newFile() {
  const name = nextUntitledName()
  const template = `// Koishi 插件脚本\nimport { Context } from 'koishi'\n\nexport function apply(ctx: Context) {\n  ctx.on('ready', () => {\n    ctx.logger('script').info('plugin loaded')\n  })\n}\n`
  try {
    await send('vscode-blockly/create', name, template)
    await refreshFiles()
    await openFile(name)
  } catch (error) {
    status.value = errorMessage(error)
  }
}

async function renameFile(path: string) {
  const input = window.prompt('请输入新的文件名', path)
  if (!input || input === path) return
  const name = normalizeScriptName(input)
  if (!name) return
  try {
    const newPath = await send<string>('vscode-blockly/rename', path, name)
    if (currentPath.value === path) {
      currentPath.value = newPath
      await openFile(newPath)
    }
    await refreshFiles()
    status.value = '已重命名'
  } catch (error) {
    status.value = errorMessage(error)
  }
}

async function deleteFile(path: string) {
  if (!window.confirm(`确定删除 ${path} 吗？`)) return
  try {
    await send('vscode-blockly/delete', path)
    if (currentPath.value === path) {
      currentPath.value = ''
      currentScript.value = undefined
    }
    await refreshFiles()
    status.value = '已删除'
  } catch (error) {
    status.value = errorMessage(error)
  }
}

async function setExtensionEnabled(path: string, enabled: boolean) {
  try {
    const result = await send<ReloadResult>('vscode-blockly/enabled', path, enabled)
    if (currentPath.value === path && currentScript.value) {
      currentScript.value = { ...currentScript.value, enabled }
    }
    status.value = result.error || (enabled ? '插件已开启' : '插件已关闭')
    await refreshFiles()
  } catch (error) {
    status.value = errorMessage(error)
  }
}

async function toggleEnabled() {
  if (!currentPath.value || !currentScript.value) return
  await setExtensionEnabled(currentPath.value, !currentScript.value.enabled)
}

async function reloadCurrent() {
  if (!currentPath.value) return
  try {
    const result = await send<ReloadResult>('vscode-blockly/reload', currentPath.value)
    status.value = result.error || '已重载'
    await openFile(currentPath.value)
    await refreshFiles()
  } catch (error) {
    status.value = errorMessage(error)
  }
}

async function openSearchResult(path: string) {
  view.value = 'files'
  if (isMobile.value) sidebarOpen.value = false
  await openFile(path)
}

async function applyToCurrent(code: string) {
  if (!currentPath.value) {
    await createFromChat(code)
    return
  }
  await saveFile(code)
  status.value = 'AI 代码已写入当前文件'
}

async function createFromChat(code: string) {
  const name = nextUntitledName()
  try {
    await send('vscode-blockly/create', name, code)
    await refreshFiles()
    await openFile(name)
    status.value = 'AI 代码已新建为脚本'
  } catch (error) {
    status.value = errorMessage(error)
  }
}

async function handleAiFileChanged(path: string) {
  try {
    await refreshFiles()
    if (!currentPath.value || currentPath.value === path) {
      await openFile(path)
    }
    status.value = `AI 已更新 ${path}`
  } catch (error) {
    status.value = errorMessage(error)
  }
}
</script>

<style>
.vb-shell {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--vb-bg);
  color: var(--vb-fg);
  font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
  font-size: 13px;
}

.vb-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  flex: 0 0 36px;
  padding: 0 12px;
  background: #252526;
  border-bottom: 1px solid #3c3c3c;
}

.vb-topbar-title {
  color: #d4d4d4;
  font-size: 12px;
  font-weight: 600;
}

.vb-ai-toggle {
  height: 26px;
  padding: 0 12px;
  color: #ffffff;
  background: #0e639c;
  border: 1px solid #1177bb;
  border-radius: 3px;
  cursor: pointer;
}

.vb-ai-toggle:hover,
.vb-ai-toggle.active {
  background: #1177bb;
}

.vb-workspace {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
}

.vb-activity {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 48px;
  flex: 0 0 48px;
  padding: 6px 0;
  background: #333333;
  border-right: 1px solid #252526;
  z-index: 10;
}

.vb-activity button {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  width: 42px;
  min-height: 42px;
  margin: 0 3px;
  color: #858585;
  background: transparent;
  border: 0;
  border-left: 2px solid transparent;
  cursor: pointer;
}

.vb-activity button svg {
  width: 22px;
  height: 22px;
}

.vb-activity button:hover,
.vb-activity button.active {
  color: #ffffff;
}

.vb-activity button.active {
  border-left-color: #ffffff;
}

.vb-activity-label {
  max-width: 64px;
  margin-top: 2px;
  overflow: hidden;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vb-activity-spacer {
  flex: 1;
}

.vb-sidebar {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 280px;
  min-width: 180px;
  flex: 0 0 280px;
  min-height: 0;
  background: var(--vb-bg-soft);
  border-right: 1px solid var(--vb-border);
}

.vb-sidebar.hidden {
  display: none;
}

.vb-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 34px;
  padding: 0 12px;
  color: var(--vb-fg-dim);
  font-size: 11px;
  text-transform: uppercase;
  border-bottom: 1px solid var(--vb-border);
}

.vb-sidebar-actions {
  display: flex;
  gap: 6px;
}

.vb-sidebar-header button {
  width: 22px;
  height: 22px;
  color: var(--vb-fg);
  background: transparent;
  border: 1px solid var(--vb-border);
  border-radius: 3px;
  cursor: pointer;
}

.vb-sidebar-header button:hover {
  background: var(--vb-bg-panel);
}

.vb-sidebar-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.vb-resizer {
  position: absolute;
  top: 0;
  right: -3px;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 5;
}

.vb-resizer:hover {
  background: var(--vb-accent);
}

.vb-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  background: var(--vb-bg);
}

.vb-ai-panel {
  display: none;
  width: 360px;
  flex: 0 0 360px;
  background: #252526;
  border-left: 1px solid #3c3c3c;
  overflow: hidden;
}

.vb-ai-resizer {
  position: absolute;
  top: 0;
  left: -3px;
  bottom: 0;
  width: 8px;
  cursor: col-resize;
  touch-action: none;
  z-index: 5;
}

.vb-ai-resizer:hover {
  background: #0e639c;
}

.vb-sidebar-content,
.vb-chat-messages,
.vb-search-results,
.vb-editor-body,
.vb-settings-body {
  scrollbar-width: thin;
  scrollbar-color: #424242 transparent;
}

.vb-sidebar-content::-webkit-scrollbar,
.vb-chat-messages::-webkit-scrollbar,
.vb-search-results::-webkit-scrollbar,
.vb-editor-body::-webkit-scrollbar,
.vb-settings-body::-webkit-scrollbar {
  width: 10px;
}

.vb-sidebar-content::-webkit-scrollbar-thumb,
.vb-chat-messages::-webkit-scrollbar-thumb,
.vb-search-results::-webkit-scrollbar-thumb,
.vb-editor-body::-webkit-scrollbar-thumb,
.vb-settings-body::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 5px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.vb-sidebar-content::-webkit-scrollbar-thumb:hover,
.vb-chat-messages::-webkit-scrollbar-thumb:hover,
.vb-search-results::-webkit-scrollbar-thumb:hover,
.vb-editor-body::-webkit-scrollbar-thumb:hover,
.vb-settings-body::-webkit-scrollbar-thumb:hover {
  background: #4f4f4f;
  background-clip: content-box;
}

.vb-ai-panel.open {
  display: flex;
}

.vb-statusbar {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 24px;
  flex: 0 0 24px;
  padding: 0 12px;
  color: #ffffff;
  background: var(--vb-accent);
  font-size: 12px;
  white-space: nowrap;
}

.vb-status-path {
  color: rgba(255, 255, 255, 0.78);
}

.vb-status-error {
  overflow: hidden;
  text-overflow: ellipsis;
}

.vb-explorer-empty {
  padding: 16px;
  color: var(--vb-fg-dim);
}

.vb-tree-node {
  user-select: none;
}

.vb-tree-row {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 8px 0 12px;
  color: var(--vb-fg-dim);
  cursor: default;
}

.vb-tree-row:hover,
.vb-tree-file.active {
  background: #37373d;
  color: var(--vb-fg);
}

.vb-tree-file {
  cursor: pointer;
}

.vb-tree-arrow {
  width: 14px;
  flex: 0 0 14px;
  font-size: 11px;
}

.vb-tree-icon {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  color: #8a8a8a;
}

.vb-tree-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vb-tree-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  border-radius: 50%;
  background: var(--vb-green);
}

.vb-tree-actions {
  display: flex;
  gap: 2px;
}

.vb-tree-actions button {
  width: 20px;
  height: 20px;
  color: var(--vb-fg);
  background: transparent;
  border: 0;
  cursor: pointer;
}

.vb-tree-actions button:hover {
  color: #ffffff;
  background: #45454a;
}

.vb-tree-children {
  padding-left: 12px;
}

.vb-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.vb-editor-tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  padding-left: 12px;
  background: var(--vb-bg-soft);
  border-bottom: 1px solid var(--vb-border);
}

.vb-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 100%;
  color: #ffffff;
}

.vb-tab-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: transparent;
}

.vb-tab-dot.dirty {
  background: var(--vb-orange);
}

.vb-editor-actions {
  display: flex;
  gap: 6px;
  padding-right: 10px;
}

.vb-button,
.vb-text-button {
  height: 26px;
  padding: 0 10px;
  color: var(--vb-fg);
  background: #3c3c3c;
  border: 1px solid #555555;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
}

.vb-button:hover,
.vb-text-button:hover {
  background: #4a4a4a;
}

.vb-button.primary {
  color: #ffffff;
  background: var(--vb-accent);
  border-color: var(--vb-accent);
}

.vb-button.primary:hover {
  background: var(--vb-accent-hover);
}

.vb-button.danger {
  color: #ffffff;
  background: #a1260d;
  border-color: #a1260d;
}

.vb-button.small {
  height: 22px;
  padding: 0 8px;
  font-size: 12px;
}

.vb-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.vb-text-button {
  height: 22px;
  color: var(--vb-fg-dim);
  background: transparent;
  border: 0;
}

.vb-editor-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.vb-gutter {
  width: 52px;
  flex: 0 0 52px;
  padding: 8px 0;
  overflow: hidden;
  background: var(--vb-bg);
  border-right: 1px solid var(--vb-border);
  color: #6e7681;
  text-align: right;
  user-select: none;
}

.vb-gutter-line,
.vb-editor-textarea {
  min-height: 20px;
  line-height: 20px;
  font-family: Consolas, "Courier New", monospace;
  font-size: 13px;
}

.vb-gutter-line {
  padding-right: 10px;
}

.vb-editor-textarea {
  flex: 1;
  width: 100%;
  min-height: 0;
  padding: 8px 10px;
  resize: none;
  color: #d4d4d4;
  background: var(--vb-bg);
  border: 0;
  outline: 0;
  tab-size: 2;
  white-space: pre;
}

.vb-editor-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6e7681;
  font-size: 26px;
  font-weight: 300;
  background: var(--vb-bg);
}

@media (max-width: 760px) {
  .vb-activity {
    width: 56px;
    flex-basis: 56px;
  }

  .vb-activity button {
    width: 50px;
  }

  .vb-sidebar {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 56px;
    z-index: 20;
    width: min(82vw, 340px);
    flex-basis: auto;
    box-shadow: 8px 0 24px rgba(0, 0, 0, 0.35);
    transform: translateX(calc(-100% - 56px));
    transition: transform 0.2s ease;
  }

  .vb-sidebar.mobile-open {
    transform: translateX(0);
  }

  .vb-ai-panel {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 21;
    width: min(86vw, 360px);
    flex-basis: auto;
    box-shadow: -8px 0 24px rgba(0, 0, 0, 0.35);
  }

  .vb-editor-actions {
    gap: 4px;
  }

  .vb-editor-actions .vb-button {
    padding: 0 6px;
    font-size: 12px;
  }
}
</style>
