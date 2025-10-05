<template>
    <div class="min-h-screen select-none" style="background: transparent;">
        <DynamicStyle :config="config" />
        <!-- 顶部操作栏 -->
        <header class="bg-transparent shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4 relative z-50">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <!-- 侧边栏切换按钮 (PC和移动端都显示) -->
                    <button @click="toggleLeftSidebar"
                        class="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>
                    <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">菜单编辑</h1>
                    <span v-if="!isMobile" class="text-xs text-gray-500 dark:text-gray-400 ml-3">
                        {{ config.columnWidth * config.columns + 80 }} × {{ previewHeight }} (动态高度)
                    </span>
                </div>
                <div class="flex items-center space-x-3">
                    <button @click="showQuickImportModal = true"
                        class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm">
                        快速导入
                    </button>
                    <button @click="downloadScreenshot"
                        class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm">
                        截图下载
                    </button>
                    <button @click="resetData"
                        class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm">
                        重置数据
                    </button>
                    <button @click="saveToIndexedDB"
                        class="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm">
                        保存 (Ctrl+S)
                    </button>
                    <!-- 右侧栏切换按钮 (PC和移动端都显示) -->
                    <button @click="toggleRightSidebar"
                        class="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z">
                            </path>
                        </svg>
                    </button>
                </div>
            </div>
        </header>

        <!-- 主要内容区域 -->
        <div class="flex relative h-[calc(100vh-80px)]">
            <!-- 左侧设置面板 -->
            <div :class="[
                'bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 z-40',
                isMobile ? 'fixed left-0 top-20 h-[calc(100vh-80px)] w-80' : 'w-80 h-full',
                isMobile && !showLeftSidebar ? '-translate-x-full' : 'translate-x-0'
            ]">
                <div class="h-full overflow-y-auto">
                    <SettingsPanel v-model:config="config" />
                </div>
            </div>

            <!-- 左侧收缩按钮 (移动端) -->
            <div v-if="isMobile && !showLeftSidebar" class="fixed left-0 top-1/2 transform -translate-y-1/2 z-50">
                <button @click="toggleLeftSidebar"
                    class="bg-gray-800/80 dark:bg-gray-700/80 backdrop-blur-sm text-white p-2 rounded-r-lg shadow-lg hover:bg-gray-700">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </button>
            </div>

            <!-- 中间预览区域 -->
            <div :class="[
                'flex-1 flex items-start justify-center h-full',
                isMobile ? 'p-4' : 'p-6'
            ]">
                <div class="h-full overflow-y-auto w-full flex justify-center">
                    <!-- 动态高度容器 -->
                    <div class="relative"
                        :style="{ width: isMobile ? '100%' : 'auto', maxWidth: isMobile ? '100%' : 'none' }">
                        <!-- 手机屏幕容器 -->
                        <div :class="[
                            'bg-black rounded-[40px] shadow-2xl',
                            isMobile ? 'w-full max-w-sm mx-auto' : '',
                            isMobile ? 'p-1' : 'p-2'
                        ]" :style="{
                            width: isMobile ? 'auto' : (config.columnWidth * config.columns + 80) + 'px',
                            height: previewHeight + 'px'
                        }">
                            <!-- 手机屏幕 -->
                            <div class="w-full h-full bg-white rounded-[32px] relative">
                                <PreviewArea :config="config" @edit-item="openEditSidebar"
                                    @update-items="updateMenuItems" :is-config-mode="true" ref="previewAreaRef" />
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <!-- 右侧编辑侧边栏 -->
            <div v-if="showEditSidebar" :class="[
                'bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm border-l border-gray-200 dark:border-gray-700 shadow-lg transition-transform duration-300 z-40',
                isMobile ? 'fixed right-0 top-20 h-[calc(100vh-80px)] w-80' : 'w-80 h-full',
                isMobile && !showRightSidebar ? 'translate-x-full' : 'translate-x-0'
            ]">
                <div class="h-full overflow-y-auto">
                    <EditSidebar :item="editingItem" :groups="config.menuGroups" @close="closeEditSidebar"
                        @save="saveEditedItem" @delete="deleteItem" @add-group="addGroup" @add-item="addMenuItem" />
                </div>
            </div>

            <!-- 右侧收缩按钮 (移动端) -->
            <div v-if="isMobile && showEditSidebar && !showRightSidebar"
                class="fixed right-0 top-1/2 transform -translate-y-1/2 z-50">
                <button @click="toggleRightSidebar"
                    class="bg-gray-800/80 dark:bg-gray-700/80 backdrop-blur-sm text-white p-2 rounded-l-lg shadow-lg hover:bg-gray-700">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7">
                        </path>
                    </svg>
                </button>
            </div>
        </div>

        <!-- 移动端遮罩层 -->
        <div v-if="isMobile && (showLeftSidebar || showRightSidebar)" class="fixed inset-0 bg-black bg-opacity-50 z-30"
            @click="closeSidebars"></div>

        <!-- 导入配置模态框 -->
        <div v-if="showImportModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-full">
                <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">导入配置</h3>
                <textarea v-model="importText" placeholder="请粘贴配置JSON..."
                    class="w-full h-32 p-3 border rounded-md resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"></textarea>
                <div class="flex justify-end space-x-3 mt-4">
                    <button @click="showImportModal = false"
                        class="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
                        取消
                    </button>
                    <button @click="confirmImport"
                        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        确认导入
                    </button>
                </div>
            </div>
        </div>

        <!-- 快速导入模态框 -->
        <div v-if="showQuickImportModal"
            class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-full">
                <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">快速导入Koishi菜单</h3>
                <textarea v-model="quickImportText" placeholder="当前可用的指令有：
    clear  清空聊天记录
    help  显示帮助信息
输入“help 指令名”查看特定指令的语法和使用示例。"
                    class="w-full h-32 p-3 border rounded-md resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"></textarea>
                <div class="flex justify-end space-x-3 mt-4">
                    <button @click="showQuickImportModal = false"
                        class="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
                        取消
                    </button>
                    <button @click="confirmQuickImport"
                        class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                        确认导入
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import SettingsPanel from './components/SettingsPanel.vue'
import PreviewArea from './components/PreviewArea.vue'
import EditSidebar from './components/EditSidebar.vue'
import DynamicStyle from './components/DynamicStyle.vue'
import { type Config, defaultConfig, type MenuItem, type MenuGroup, defaultGradients } from './types'
import html2canvas from 'html2canvas'

const config = reactive<Config>({ ...defaultConfig })
const showImportModal = ref(false)
const showQuickImportModal = ref(false)
const showEditSidebar = ref(true) // 默认开启编辑侧边栏
const importText = ref('')
const quickImportText = ref('')
const editingItem = ref<MenuItem | null>(null) // 初始为null，显示默认状态

// 响应式设计相关
const isMobile = ref(false)
const showLeftSidebar = ref(false)
const showRightSidebar = ref(false)
const previewAreaRef = ref()
const previewHeight = ref(812) // 默认高度

// 检测设备类型
const checkDevice = () => {
    isMobile.value = window.innerWidth < 768
    // PC端默认显示侧边栏，移动端默认隐藏
    if (!isMobile.value) {
        if (showLeftSidebar.value === undefined) showLeftSidebar.value = true
        if (showRightSidebar.value === undefined) showRightSidebar.value = true
    } else {
        showLeftSidebar.value = false
        showRightSidebar.value = false
    }
}

// 计算预览区域高度
const calculatePreviewHeight = async () => {
    await nextTick()

    // 基于内容计算高度，而不是依赖DOM元素
    const totalItems = config.menuItems.length

    // 基础高度计算 - 精确匹配实际渲染尺寸
    const titleHeight = 68 // 标题区域高度（包含标题和副标题）
    const itemHeight = 72 // 每个指令方块的高度（固定72px）
    const itemGap = 8 // 方块间距
    const groupGap = 16 // 分组间距
    const groupTitleHeight = 32 // 分组标题高度（包含背景和内边距）
    const topPadding = 16 // 顶部内边距
    const bottomPadding = 16 // 底部内边距
    // 角标高度计算：如果有角标且位于底部居中，需要额外空间避免遮挡
    const badgeHeight = config.badgeText ? (config.badgePosition === 'bottom-center' ? 48 : 32) : 0

    // 如果没有菜单项，使用固定的空状态高度
    if (totalItems === 0) {
        previewHeight.value = 400
        return
    }

    // 按分组计算实际行数和分组标题数量
    let totalRows = 0
    let activeGroupCount = 0

    config.menuGroups.forEach(group => {
        const groupItems = config.menuItems.filter(item => item.groupId === group.id)
        if (groupItems.length > 0) {
            activeGroupCount++
            const groupRows = Math.ceil(groupItems.length / config.columns)
            totalRows += groupRows
        }
    })

    // 计算菜单内容高度：
    // 总行数 * 项目高度 + 行间距 + 分组间距 + 分组标题高度
    const rowsGapHeight = totalRows > 1 ? (totalRows - 1) * itemGap : 0
    const groupsGapHeight = activeGroupCount > 1 ? (activeGroupCount - 1) * groupGap : 0
    const groupTitlesHeight = activeGroupCount * groupTitleHeight
    const menuContentHeight = totalRows * itemHeight + rowsGapHeight + groupsGapHeight + groupTitlesHeight

    // 计算总高度：标题 + 顶部边距 + 菜单内容 + 底部边距 + 角标 + 额外安全边距
    const safetyMargin = 20 // 额外安全边距，确保内容不会超出
    const totalContentHeight = titleHeight + topPadding + menuContentHeight + bottomPadding + badgeHeight + safetyMargin

    // 设置最小高度，确保界面美观
    const minHeight = 400
    // 应用用户的高度调整误差
    const finalHeight = Math.max(minHeight, totalContentHeight) + (config.heightAdjustment || 0)
    previewHeight.value = Math.max(minHeight, finalHeight)
}

// 监听配置变化，重新计算高度
watch(() => [config.menuItems, config.menuGroups, config.title, config.subtitle, config.columns, config.columnWidth, config.heightAdjustment], () => {
    setTimeout(calculatePreviewHeight, 100)
}, { deep: true })

const toggleLeftSidebar = () => {
    if (isMobile.value && showRightSidebar.value) {
        showRightSidebar.value = false
    }
    showLeftSidebar.value = !showLeftSidebar.value
}

const toggleRightSidebar = () => {
    if (isMobile.value && showLeftSidebar.value) {
        showLeftSidebar.value = false
    }
    showRightSidebar.value = !showRightSidebar.value
}

const closeSidebars = () => {
    showLeftSidebar.value = false
    showRightSidebar.value = false
}

// IndexedDB 数据库操作
const DB_NAME = 'KoishiHelpConfig'
const DB_VERSION = 1
const STORE_NAME = 'config'

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' })
            }
        }
    })
}

const saveToIndexedDB = async () => {
    try {
        const db = await openDB()
        const transaction = db.transaction([STORE_NAME], 'readwrite')
        const store = transaction.objectStore(STORE_NAME)

        await store.put({
            id: 'main-config',
            data: JSON.parse(JSON.stringify(config)),
            timestamp: Date.now()
        })

        // 显示保存提示
        const toast = document.createElement('div')
        toast.textContent = '配置已保存到本地'
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50'
        document.body.appendChild(toast)
        setTimeout(() => {
            document.body.removeChild(toast)
        }, 2000)
    } catch (error) {
        console.error('保存配置失败:', error)
        const toast = document.createElement('div')
        toast.textContent = '保存失败'
        toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50'
        document.body.appendChild(toast)
        setTimeout(() => {
            document.body.removeChild(toast)
        }, 2000)
    }
}

const loadFromIndexedDB = async () => {
    try {
        const db = await openDB()
        const transaction = db.transaction([STORE_NAME], 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.get('main-config')

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                if (request.result) {
                    resolve(request.result.data)
                } else {
                    resolve(null)
                }
            }
            request.onerror = () => reject(request.error)
        })
    } catch (error) {
        console.error('加载配置失败:', error)
        return null
    }
}

// Ctrl+S 快捷键保存功能
const handleKeydown = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.key === 's') {
        event.preventDefault()
        saveToIndexedDB()
    }
}

onMounted(async () => {
    checkDevice()
    calculatePreviewHeight()
    window.addEventListener('resize', checkDevice)
    window.addEventListener('keydown', handleKeydown)

    // 尝试从 IndexedDB 加载配置
    const savedConfig = await loadFromIndexedDB()
    if (savedConfig) {
        Object.assign(config, savedConfig)
        console.log('从 IndexedDB 加载配置成功')
    } else {
        // 如果 IndexedDB 中没有配置，尝试从 localStorage 加载（兼容旧版本）
        const localStorageConfig = localStorage.getItem('miao-help-config')
        if (localStorageConfig) {
            try {
                Object.assign(config, JSON.parse(localStorageConfig))
                // 迁移到 IndexedDB
                await saveToIndexedDB()
                localStorage.removeItem('miao-help-config')
                console.log('从 localStorage 迁移配置到 IndexedDB')
            } catch (error) {
                console.warn('加载 localStorage 配置失败，使用默认配置')
            }
        }
    }
})

onUnmounted(() => {
    window.removeEventListener('resize', checkDevice)
    window.removeEventListener('keydown', handleKeydown)
})



const resetData = () => {
    if (confirm('确定要重置所有数据吗？此操作不可撤销。')) {
        Object.assign(config, defaultConfig)
        saveToIndexedDB()
    }
}

const downloadScreenshot = async () => {
    try {
        // 显示加载提示
        const loadingToast = document.createElement('div')
        loadingToast.textContent = '正在生成截图...'
        loadingToast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-50'
        document.body.appendChild(loadingToast)

        // 等待更长时间确保DOM完全渲染，特别是字体和样式
        await nextTick()
        await new Promise(resolve => setTimeout(resolve, 500))

        // 获取预览区域的内部屏幕容器（白色圆角区域）
        const screenContainer = document.querySelector('.bg-black.rounded-\\[40px\\] .bg-white.rounded-\\[32px\\]') as HTMLElement
        if (!screenContainer) {
            throw new Error('找不到预览区域')
        }

        // 使用html2canvas截图，优化配置
        const canvas = await html2canvas(screenContainer, {
            backgroundColor: '#ffffff', // 使用白色背景而不是透明
            scale: 2, // 适中的分辨率
            useCORS: true, // 允许跨域图片
            allowTaint: true,
            logging: false,
            width: screenContainer.offsetWidth,
            height: screenContainer.offsetHeight,
            scrollX: 0,
            scrollY: 0,
            // 等待图片加载
            imageTimeout: 15000,
            // 忽略元素的某些样式问题
            ignoreElements: (element) => {
                // 忽略可能导致问题的元素
                return element.classList?.contains('drag-handle') || false
            }
        })

        // 创建下载链接
        canvas.toBlob((blob) => {
            if (blob) {
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = `${config.title}-help-menu-${new Date().toISOString().slice(0, 10)}.png`
                link.click()
                URL.revokeObjectURL(url)

                // 移除加载提示，显示成功提示
                document.body.removeChild(loadingToast)
                const successToast = document.createElement('div')
                successToast.textContent = '截图下载成功'
                successToast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50'
                document.body.appendChild(successToast)
                setTimeout(() => {
                    document.body.removeChild(successToast)
                }, 2000)
            }
        }, 'image/png', 1.0)

    } catch (error) {
        console.error('截图失败:', error)

        // 移除加载提示
        const loadingToast = document.querySelector('.fixed.top-4.right-4.bg-blue-500')
        if (loadingToast) {
            document.body.removeChild(loadingToast)
        }

        // 显示错误提示
        const errorToast = document.createElement('div')
        errorToast.textContent = '截图失败，请重试'
        errorToast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50'
        document.body.appendChild(errorToast)
        setTimeout(() => {
            document.body.removeChild(errorToast)
        }, 3000)
    }
}

const openEditSidebar = (item: MenuItem) => {
    editingItem.value = { ...item }
    // 手机端自动弹出右侧工具栏
    if (isMobile.value) {
        showRightSidebar.value = true
        // 如果左侧栏也开着，关闭它
        if (showLeftSidebar.value) {
            showLeftSidebar.value = false
        }
    }
}

const closeEditSidebar = () => {
    // 手机端折叠右侧面板，PC端只清空编辑项目
    if (isMobile.value) {
        showRightSidebar.value = false
    }
    editingItem.value = null
}

const saveEditedItem = (updatedItem: MenuItem) => {
    const index = config.menuItems.findIndex(item => item.id === updatedItem.id)
    if (index !== -1) {
        config.menuItems[index] = updatedItem
        // 更新编辑项目以保持编辑状态
        editingItem.value = { ...updatedItem }
    }
}

const deleteItem = (itemId: string) => {
    const index = config.menuItems.findIndex(item => item.id === itemId)
    if (index !== -1) {
        config.menuItems.splice(index, 1)
    }
    // 删除后关闭编辑状态
    closeEditSidebar()
}

const confirmImport = () => {
    try {
        const imported = JSON.parse(importText.value)
        Object.assign(config, imported)
        showImportModal.value = false
        importText.value = ''
    } catch (error) {
        alert('配置格式错误，请检查JSON格式')
    }
}

const confirmQuickImport = () => {
    try {
        const lines = quickImportText.value.split('\n').filter((line: string) => line.trim())
        const menuItems: MenuItem[] = []
        let commandPrefix = '++'  // 默认前缀

        // 提取指令前缀
        const helpLine = lines.find(line => line.includes('help') && line.includes('指令名'))
        if (helpLine) {
            const prefixMatch = helpLine.match(/^.*?"([^"]*?)help\s/)
            if (prefixMatch) {
                commandPrefix = prefixMatch[1]
            }
        }

        for (const line of lines) {
            // 跳过第一行（当前可用的指令有）和最后一行（输入help指令名）
            if (line.includes('当前可用的指令有') ||
                line.includes('输入') ||
                line.includes('查看特定指令') ||
                line.includes('help') && line.includes('指令名')) {
                continue
            }

            // 解析指令行，格式：++command  description 或 ++command（空描述）
            const trimmedLine = line.trim()
            if (trimmedLine.startsWith(commandPrefix)) {
                // 移除前缀
                const withoutPrefix = trimmedLine.substring(commandPrefix.length)

                // 分割指令名和描述
                const parts = withoutPrefix.split(/\s+/)
                const command = parts[0]
                const description = parts.slice(1).join(' ') || ''  // 允许空描述

                if (command) {
                    menuItems.push({
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        title: command,
                        description: description,
                        groupId: 'default',
                        order: menuItems.length
                    })
                }
            }
        }

        config.menuItems = menuItems
        showQuickImportModal.value = false
        quickImportText.value = ''

        // 显示导入成功提示
        const toast = document.createElement('div')
        toast.textContent = `成功导入 ${menuItems.length} 个指令`
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50'
        document.body.appendChild(toast)
        setTimeout(() => {
            document.body.removeChild(toast)
        }, 3000)
    } catch (error) {
        alert('导入失败，请检查文本格式')
    }
}

const updateMenuItems = (items: MenuItem[]) => {
    config.menuItems = items
}

const addGroup = (group: MenuGroup) => {
    config.menuGroups.push(group)
}

const addMenuItem = (item: MenuItem) => {
    config.menuItems.push(item)
}

</script>