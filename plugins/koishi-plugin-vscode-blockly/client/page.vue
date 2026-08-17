<template>
  <div class="vscode-blockly-root vb-shell" :class="{ 'is-mobile': isMobile }">
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
          <source-panel v-show="view === 'source'" />
          <extension-panel
            v-show="view === 'extensions'"
            :files="files"
            @open="openSearchResult"
            @toggle="setExtensionEnabled"
          />
          <chat
            v-show="view === 'chat'"
            @apply-current="applyToCurrent"
            @apply-new="createFromChat"
          />
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
import SourcePanel from './source.vue'
import ExtensionPanel from './extensions.vue'
import FilesIcon from './icons/files.vue'
import SearchIcon from './icons/search.vue'
import SourceIcon from './icons/source.vue'
import ExtensionsIcon from './icons/extensions.vue'
import ChatIcon from './icons/chat.vue'
import SettingsIcon from './icons/settings.vue'
import type { Component } from 'vue'
import type { FileNode, ReloadResult, ScriptContent } from './types'
import { errorMessage, flattenFiles, normalizeScriptName } from './utils'

type View = 'files' | 'search' | 'source' | 'extensions' | 'chat' | 'settings'

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

const media = window.matchMedia('(max-width: 760px)')
const savedWidth = Number(window.localStorage.getItem('vb-sidebar-width') || 260)
const sidebarWidth = ref(Number.isFinite(savedWidth) && savedWidth >= 180 && savedWidth <= 420 ? savedWidth : 260)
let resizeStart: { x: number; width: number } | null = null

const activityItems: ActivityItem[] = [
  { key: 'files', label: '资源管理器', icon: FilesIcon },
  { key: 'search', label: '搜索', icon: SearchIcon },
  { key: 'source', label: '源代码管理', icon: SourceIcon },
  { key: 'extensions', label: '扩展', icon: ExtensionsIcon },
  { key: 'chat', label: 'AI 对话', icon: ChatIcon },
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
  const sidebarViews: View[] = ['files', 'search', 'source', 'extensions', 'chat']
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
    await send('vscode-blockly/write', currentPath.value, content)
    currentScript.value = { ...currentScript.value, content }
    dirty.value = false
    status.value = '已保存'
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
  display: none;
  gap: 2px;
}

.vb-tree-row:hover .vb-tree-actions {
  display: flex;
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

  .vb-editor-actions {
    gap: 4px;
  }

  .vb-editor-actions .vb-button {
    padding: 0 6px;
    font-size: 12px;
  }
}
</style>
