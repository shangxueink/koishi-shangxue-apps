<template>
  <div class="vb-git">
    <template v-if="status && !status.available">
      <div class="vb-git-icon">⛭</div>
      <div class="vb-git-title">Git 未安装</div>
      <div class="vb-git-desc">安装 Git 后即可查看脚本的本地变更记录。</div>
      <button class="vb-button primary" @click="openGitDownload">下载 Git</button>
      <button class="vb-text-button" @click="loadStatus">重新检测</button>
    </template>
    <template v-else-if="status">
      <div class="vb-git-toolbar">
        <span>分支: {{ status.branch || '无仓库' }}</span>
        <button @click="loadStatus">刷新</button>
      </div>
      <div v-if="status.error" class="vb-git-error">{{ status.error }}</div>
      <div v-if="!status.status.length" class="vb-git-clean">没有待提交的脚本变更</div>
      <div v-else class="vb-git-list">
        <div v-for="(line, index) in status.status" :key="index" class="vb-git-line">{{ line }}</div>
      </div>
    </template>
    <div v-else class="vb-git-clean">正在检测 Git 环境...</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { send } from '@koishijs/client'
import type { GitStatus } from './types'
import { errorMessage } from './utils'

const status = ref<GitStatus>()

onMounted(() => loadStatus())

async function loadStatus() {
  try {
    status.value = await send<GitStatus>('vscode-blockly/git/status')
  } catch (error) {
    status.value = {
      available: false,
      branch: '',
      status: [],
      error: errorMessage(error),
    }
  }
}

function openGitDownload() {
  window.open('https://git-scm.com/downloads', '_blank')
}
</script>

<style scoped>
.vb-git {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  padding: 20px 14px;
  color: #d4d4d4;
  text-align: center;
}

.vb-git-icon {
  color: #8a8a8a;
  font-size: 44px;
  line-height: 1;
}

.vb-git-title {
  font-size: 15px;
  font-weight: 600;
}

.vb-git-desc {
  color: #8a8a8a;
  line-height: 1.6;
}

.vb-git .vb-button.primary {
  margin: 0 auto;
}

.vb-git-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #8a8a8a;
  font-size: 12px;
}

.vb-git-toolbar button,
.vb-git .vb-text-button {
  height: 24px;
  padding: 0 8px;
  color: #d4d4d4;
  background: #3c3c3c;
  border: 1px solid #555;
  border-radius: 3px;
  cursor: pointer;
}

.vb-git-error,
.vb-git-clean {
  color: #8a8a8a;
  font-size: 12px;
  line-height: 1.6;
  text-align: left;
}

.vb-git-list {
  overflow: auto;
  text-align: left;
}

.vb-git-line {
  padding: 5px 8px;
  color: #d4d4d4;
  background: #252526;
  border-bottom: 1px solid #333;
  font-family: Consolas, monospace;
  font-size: 12px;
  white-space: pre-wrap;
}
</style>
