<template>
    <div class="p-4 space-y-4">
        <!-- 高级设置 -->
        <div class="border rounded-lg border-gray-200 dark:border-gray-700">
            <button @click="toggleSection('advanced')"
                class="w-full px-4 py-3 text-left font-medium bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-t-lg flex items-center justify-between text-gray-800 dark:text-gray-200">
                高级设置
                <span class="text-gray-500 dark:text-gray-400">{{ openSections.advanced ? '−' : '+' }}</span>
            </button>
            <div v-show="openSections.advanced" class="p-4 space-y-4 bg-white dark:bg-gray-800/50 rounded-b-lg">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">标题</label>
                    <input v-model="config.title" type="text"
                        class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">副标题</label>
                    <input v-model="config.subtitle" type="text"
                        class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">列表</label>
                    <select v-model="config.columns"
                        class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option :value="1">1</option>
                        <option :value="2">2</option>
                        <option :value="3">3</option>
                        <option :value="4">4</option>
                    </select>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">设置列表可能出现的列数</p>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">单列宽度</label>
                    <input v-model.number="config.columnWidth" type="number" min="150" max="500"
                        class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">可设置单列宽度，范围150-500</p>
                </div>


                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">高度调整误差</label>
                    <input v-model.number="config.heightAdjustment" type="number" min="-200" max="200"
                        class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">手动调整高度，正数增加高度，负数减少高度（范围：-200到200）</p>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">角标文本</label>
                    <input v-model="config.badgeText" type="text"
                        class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">显示在页面底部的角标文本</p>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">角标位置</label>
                    <select v-model="config.badgePosition"
                        class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="top-left">左上角</option>
                        <option value="top-right">右上角</option>
                        <option value="bottom-left">左下角</option>
                        <option value="bottom-right">右下角</option>
                        <option value="bottom-center">底部居中</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- 背景设置 -->
        <div class="border rounded-lg border-gray-200 dark:border-gray-700">
            <button @click="toggleSection('background')"
                class="w-full px-4 py-3 text-left font-medium bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-t-lg flex items-center justify-between text-gray-800 dark:text-gray-200">
                背景设置
                <span class="text-gray-500 dark:text-gray-400">{{ openSections.background ? '−' : '+' }}</span>
            </button>
            <div v-show="openSections.background" class="p-4 space-y-4 bg-white dark:bg-gray-800/50 rounded-b-lg">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">渐变色背景</label>
                    <div class="space-y-3">
                        <div class="flex items-center space-x-2">
                            <button @click="config.useRandomGradient = !config.useRandomGradient" :class="[
                                'px-3 py-2 rounded-md text-sm',
                                config.useRandomGradient
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200'
                            ]">
                                随机渐变
                            </button>
                            <span class="text-sm text-gray-600 dark:text-gray-400">{{ config.useRandomGradient ?
                                '使用随机渐变色' :
                                '使用自定义渐变色'
                                }}</span>
                        </div>

                        <div v-if="!config.useRandomGradient" class="grid grid-cols-2 gap-3">
                            <div>
                                <label
                                    class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">起始颜色</label>
                                <div class="flex space-x-2">
                                    <input v-model="config.gradientColor1" type="color"
                                        class="w-12 h-8 border rounded cursor-pointer dark:border-gray-600" />
                                    <input v-model="config.gradientColor1" type="text"
                                        class="flex-1 px-2 py-1 text-sm border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                </div>
                            </div>
                            <div>
                                <label
                                    class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">结束颜色</label>
                                <div class="flex space-x-2">
                                    <input v-model="config.gradientColor2" type="color"
                                        class="w-12 h-8 border rounded cursor-pointer dark:border-gray-600" />
                                    <input v-model="config.gradientColor2" type="text"
                                        class="flex-1 px-2 py-1 text-sm border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                </div>
                            </div>
                        </div>

                        <!-- 渐变预览 -->
                        <div class="h-16 rounded-lg border-2 border-gray-200 dark:border-gray-600"
                            :style="{ background: `linear-gradient(135deg, ${config.gradientColor1}, ${config.gradientColor2})` }">
                        </div>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">设置背景渐变色，支持随机渐变或自定义两个颜色的渐变效果。</p>
                </div>


                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">背景明暗度</label>
                    <input v-model="config.backgroundBrightness" type="range" min="0" max="100" class="w-full" />
                    <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ config.backgroundBrightness }}%</div>
                </div>
            </div>
        </div>

        <!-- 字体设置 -->
        <div class="border rounded-lg border-gray-200 dark:border-gray-700">
            <button @click="toggleSection('font')"
                class="w-full px-4 py-3 text-left font-medium bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-t-lg flex items-center justify-between text-gray-800 dark:text-gray-200">
                字体设置
                <span class="text-gray-500 dark:text-gray-400">{{ openSections.font ? '−' : '+' }}</span>
            </button>
            <div v-show="openSections.font" class="p-4 space-y-4 bg-white dark:bg-gray-800/50 rounded-b-lg">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">上传字体文件</label>
                    <div class="flex space-x-2">
                        <input type="file" @change="handleFontUpload" accept=".ttf,.otf,.woff,.woff2"
                            class="flex-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/50 dark:file:text-blue-300 dark:hover:file:bg-blue-900" />
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">选择字体</label>
                    <select v-model="config.selectedFont"
                        class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="默认字体">默认字体</option>
                        <option v-for="font in config.customFonts" :key="font.name" :value="font.name">{{ font.name }}
                        </option>
                    </select>
                </div>
            </div>
        </div>

        <!-- 文字颜色设置 -->
        <div class="border rounded-lg border-gray-200 dark:border-gray-700">
            <button @click="toggleSection('textColors')"
                class="w-full px-4 py-3 text-left font-medium bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-t-lg flex items-center justify-between text-gray-800 dark:text-gray-200">
                文字颜色设置
                <span class="text-gray-500 dark:text-gray-400">{{ openSections.textColors ? '−' : '+' }}</span>
            </button>
            <div v-show="openSections.textColors" class="p-4 space-y-4 bg-white dark:bg-gray-800/50 rounded-b-lg">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">标题颜色</label>
                    <div class="flex space-x-2">
                        <input v-model="config.titleColor" type="color"
                            class="w-12 h-8 border rounded cursor-pointer dark:border-gray-600" />
                        <input v-model="config.titleColor" type="text"
                            class="flex-1 px-2 py-1 text-sm border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">设置主标题的文字颜色</p>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">副标题颜色</label>
                    <div class="flex space-x-2">
                        <input v-model="config.subtitleColor" type="color"
                            class="w-12 h-8 border rounded cursor-pointer dark:border-gray-600" />
                        <input v-model="config.subtitleColor" type="text"
                            class="flex-1 px-2 py-1 text-sm border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">设置副标题的文字颜色</p>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">全局文字颜色</label>
                    <div class="flex space-x-2">
                        <input v-model="config.globalTextColor" type="color"
                            class="w-12 h-8 border rounded cursor-pointer dark:border-gray-600" />
                        <input v-model="config.globalTextColor" type="text"
                            class="flex-1 px-2 py-1 text-sm border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">设置指令文字、分组文字、角标文字的颜色</p>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">指令方块背景色</label>
                    <div class="flex space-x-2">
                        <input v-model="config.itemBackgroundColor" type="color"
                            class="w-12 h-8 border rounded cursor-pointer dark:border-gray-600" />
                        <input v-model="config.itemBackgroundColor" type="text"
                            class="flex-1 px-2 py-1 text-sm border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">设置指令方块的背景颜色</p>
                </div>
            </div>
        </div>

        <!-- 分组管理 -->
        <div class="border rounded-lg border-gray-200 dark:border-gray-700">
            <button @click="toggleSection('groups')"
                class="w-full px-4 py-3 text-left font-medium bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-t-lg flex items-center justify-between text-gray-800 dark:text-gray-200">
                分组管理
                <span class="text-gray-500 dark:text-gray-400">{{ openSections.groups ? '−' : '+' }}</span>
            </button>
            <div v-show="openSections.groups" class="p-4 space-y-4 bg-white dark:bg-gray-800/50 rounded-b-lg">
                <div class="space-y-2">
                    <div v-for="(group, index) in config.menuGroups" :key="group.id"
                        class="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <input v-model="group.name" type="text"
                            class="flex-1 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-600 dark:border-gray-500 dark:text-white" />
                        <button @click="removeGroup(index)"
                            class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm px-2 py-1">
                            删除
                        </button>
                    </div>
                </div>
                <button @click="addGroup"
                    class="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                    添加分组
                </button>
            </div>
        </div>

        <!-- 菜单项 -->
        <div class="border rounded-lg border-gray-200 dark:border-gray-700">
            <button @click="toggleSection('menu')"
                class="w-full px-4 py-3 text-left font-medium bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-t-lg flex items-center justify-between text-gray-800 dark:text-gray-200">
                菜单项
                <span class="text-gray-500 dark:text-gray-400">{{ openSections.menu ? '−' : '+' }}</span>
            </button>
            <div v-show="openSections.menu" class="p-4 space-y-4 bg-white dark:bg-gray-800/50 rounded-b-lg">
                <MenuItemList v-model:items="config.menuItems" :groups="config.menuGroups" />
                <button @click="addMenuItem"
                    class="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                    添加菜单项
                </button>
            </div>
        </div>


    </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { type Config, type MenuItem, type MenuGroup } from '../types'
import MenuItemList from './MenuItemList.vue'

interface Props {
    config: Config
}

const props = defineProps<Props>()
const emit = defineEmits<{
    'update:config': [config: Config]
}>()

const config = reactive(props.config)

const openSections = reactive({
    advanced: true,
    background: false,
    font: false,
    textColors: false,
    groups: false,
    menu: false
})
const toggleSection = (section: keyof typeof openSections) => {
    openSections[section] = !openSections[section]
}

const handleFontUpload = (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
            const fontName = file.name.split('.')[0] || `Font-${config.customFonts.length + 1}`
            const fontUrl = e.target?.result as string
            if (!config.customFonts.some(font => font.name === fontName)) {
                config.customFonts.push({ name: fontName, url: fontUrl })
            } else {
                alert('该字体已存在')
            }
        }
        reader.readAsDataURL(file)
    }
}


const addGroup = () => {
    const newGroup: MenuGroup = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: '新分组',
        order: config.menuGroups.length
    }
    config.menuGroups.push(newGroup)
}

const removeGroup = (index: number) => {
    if (config.menuGroups.length > 1) {
        config.menuGroups.splice(index, 1)
    }
}

const addMenuItem = () => {
    const newItem: MenuItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        title: '新菜单项',
        description: '描述信息',
        groupId: config.menuGroups[0]?.id || 'default',
        order: config.menuItems.length
    }
    config.menuItems.push(newItem)
}


</script>