<template>
    <div class="h-full bg-gray-100 relative rounded-[32px] overflow-hidden"
        :style="{ fontFamily: config.selectedFont === '默认字体' ? '' : config.selectedFont }">
        <!-- 背景层 -->
        <div class="absolute inset-0 rounded-[32px]" :style="{
            background: backgroundGradient
        }"></div>

        <!-- 背景明暗度蒙版层 -->
        <div class="absolute inset-0 rounded-[32px]" :style="{
            backgroundColor: `rgba(0, 0, 0, ${(100 - config.backgroundBrightness) / 100})`
        }"></div>

        <!-- 毛玻璃效果层 -->
        <div class="absolute inset-0 rounded-[32px] backdrop-blur-glass"
            style="background-color: rgba(255, 255, 255, 0.1)"></div>

        <!-- 内容层 -->
        <div class="relative h-full flex flex-col p-4">
            <!-- 标题区域 -->
            <div class="text-center mb-4">
                <div class="text-xl font-bold mb-1" :style="{ color: config.titleColor }"
                    v-html="renderMarkdown(config.title)"></div>
                <div class="text-sm" :style="{ color: config.subtitleColor }" v-html="renderMarkdown(config.subtitle)">
                </div>
            </div>


            <!-- 菜单网格 -->
            <div class="flex-1">
                <!-- 按分组显示菜单项 -->
                <div v-for="group in groupedMenuItems" :key="group.id" class="mb-4">
                    <h3 v-if="group.items.length > 0" class="font-medium mb-1 px-2"
                        :style="{ color: config.globalTextColor, fontSize: '15px' }">
                        <span class="inline-block bg-black/30 backdrop-blur-sm px-2 rounded"
                            :style="{ paddingTop: '0.1em', paddingBottom: '0.9em', lineHeight: '1' }">
                            {{ group.name }}
                        </span>
                    </h3>
                    <VueDraggable v-if="isConfigMode && group.items.length > 0" v-model="group.items" class="grid gap-2"
                        :style="{ gridTemplateColumns: `repeat(${config.columns}, 1fr)` }" @end="handleDragEnd"
                        :animation="200" ghost-class="opacity-50" chosen-class="scale-105" group="menu-items"
                        handle=".drag-handle">
                        <div v-for="item in group.items" :key="item.id"
                            class="rounded-lg p-3 transition-all duration-200 cursor-pointer group relative select-none hover:brightness-110"
                            :style="{ backgroundColor: config.itemBackgroundColor, backdropFilter: 'blur(4px)', minHeight: '72px' }"
                            @click="handleItemClick(item)">
                            <div class="flex items-start h-full">
                                <div class="flex-1 min-w-0 pr-2 flex flex-col justify-center">
                                    <h4 class="font-medium text-sm leading-tight transition-colors"
                                        :style="{ color: config.globalTextColor }" v-html="renderMarkdown(item.title)">
                                    </h4>
                                    <p class="text-xs mt-1 leading-relaxed line-clamp-2"
                                        :style="{ color: config.globalTextColor, opacity: '0.8', lineHeight: '1.5', minHeight: '2.4em' }"
                                        v-html="renderMarkdown(item.description)"></p>
                                </div>
                                <!-- 拖动条区域 -->
                                <div
                                    class="drag-handle flex flex-col justify-center items-center w-6 h-full cursor-move opacity-30 hover:opacity-60 transition-opacity">
                                    <div class="grid grid-cols-3 gap-0.5">
                                        <div class="w-1 h-1 bg-gray-400 rounded-full"></div>
                                        <div class="w-1 h-1 bg-gray-400 rounded-full"></div>
                                        <div class="w-1 h-1 bg-gray-400 rounded-full"></div>
                                        <div class="w-1 h-1 bg-gray-400 rounded-full"></div>
                                        <div class="w-1 h-1 bg-gray-400 rounded-full"></div>
                                        <div class="w-1 h-1 bg-gray-400 rounded-full"></div>
                                        <div class="w-1 h-1 bg-gray-400 rounded-full"></div>
                                        <div class="w-1 h-1 bg-gray-400 rounded-full"></div>
                                        <div class="w-1 h-1 bg-gray-400 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </VueDraggable>
                    <!-- 非配置模式或静态显示 -->
                    <div v-else-if="group.items.length > 0" class="grid gap-2"
                        :style="{ gridTemplateColumns: `repeat(${config.columns}, 1fr)` }">
                        <div v-for="item in group.items" :key="item.id"
                            class="rounded-lg p-3 hover:scale-105 hover:brightness-110 transition-all duration-200 cursor-pointer group select-none"
                            :style="{ backgroundColor: config.itemBackgroundColor, backdropFilter: 'blur(4px)', minHeight: '72px' }"
                            @click="handleItemClick(item)">
                            <div class="flex items-start h-full">
                                <div class="flex-1 min-w-0 flex flex-col justify-center">
                                    <h4 class="font-medium text-sm leading-tight transition-colors"
                                        :style="{ color: config.globalTextColor }" v-html="renderMarkdown(item.title)">
                                    </h4>
                                    <p class="text-xs mt-1 leading-relaxed line-clamp-2"
                                        :style="{ color: config.globalTextColor, opacity: '0.8', lineHeight: '1.5', minHeight: '2.4em' }"
                                        v-html="renderMarkdown(item.description)"></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 空状态 -->
                <div v-if="config.menuItems.length === 0" class="flex items-center justify-center h-64 text-white/60">
                    <div class="text-center">
                        <div class="text-4xl mb-4">📋</div>
                        <p class="text-lg">暂无菜单项</p>
                        <p class="text-sm">请在左侧添加菜单项</p>
                    </div>
                </div>
            </div>

            <!-- 角标 -->
            <div v-if="config.badgeText" :class="[
                'absolute text-xs z-10 flex',
                badgePositionClass
            ]" :style="{ color: config.globalTextColor }">
                <div class="bg-black/20 backdrop-blur-sm px-2 rounded whitespace-nowrap flex items-center justify-center"
                    :style="{ paddingTop: '0.1em', paddingBottom: '0.9em', lineHeight: '1' }"
                    v-html="renderMarkdown(config.badgeText)">
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { marked } from 'marked'
import { VueDraggable } from 'vue-draggable-plus'
import { type Config, type MenuItem, defaultGradients } from '../types'

interface Props {
    config: Config
    isConfigMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    isConfigMode: false
})

const emit = defineEmits<{
    'edit-item': [item: MenuItem]
    'update-items': [items: MenuItem[]]
}>()

// 移除长按检测相关代码，改用拖动条

const backgroundGradient = computed(() => {
    if (props.config.useRandomGradient) {
        const randomIndex = Math.floor(Math.random() * defaultGradients.length)
        const gradient = defaultGradients[randomIndex]
        return `linear-gradient(135deg, ${gradient.color1}, ${gradient.color2})`
    }
    return `linear-gradient(135deg, ${props.config.gradientColor1}, ${props.config.gradientColor2})`
})

const badgePositionClass = computed(() => {
    const position = props.config.badgePosition
    const classes = {
        'top-left': 'top-4 left-4',
        'top-right': 'top-4 right-4',
        'bottom-left': 'bottom-4 left-4',
        'bottom-right': 'bottom-4 right-4',
        'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 justify-center'
    }
    return classes[position as keyof typeof classes] || classes['bottom-center']
})

const groupedMenuItems = computed(() => {
    const groups = props.config.menuGroups.map(group => ({
        ...group,
        items: props.config.menuItems
            .filter(item => item.groupId === group.id)
            .sort((a, b) => a.order - b.order)
    }))

    // 返回所有分组，包括空分组（用于显示分组标题）
    return groups
})

const handleItemClick = (item: MenuItem) => {
    if (props.isConfigMode) {
        emit('edit-item', item)
    }
}

const handleDragEnd = (event: any) => {
    // 重新计算所有菜单项的order和groupId
    const allItems: MenuItem[] = []
    let orderIndex = 0

    // 遍历所有分组，重新分配order和groupId
    groupedMenuItems.value.forEach(group => {
        group.items.forEach(item => {
            item.order = orderIndex++
            item.groupId = group.id // 确保groupId正确
            allItems.push(item)
        })
    })

    emit('update-items', allItems)
}

const renderMarkdown = (text: string) => {
    if (!text) return ''
    try {
        // 简单的markdown渲染，只处理基本格式
        return marked.parse(text, {
            breaks: true,
            gfm: true
        })
    } catch (error) {
        return text
    }
}
</script>

<style scoped>
.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
    text-overflow: ellipsis;
    box-sizing: border-box;
}

.grid-cols-1 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
}

.grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

.grid-cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
}

.grid-cols-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
}
</style>