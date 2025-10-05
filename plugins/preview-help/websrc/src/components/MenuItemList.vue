<template>
    <div class="space-y-2">
        <VueDraggable v-model="items" :animation="150" ghost-class="opacity-50" chosen-class="ring-2 ring-blue-500">
            <div v-for="(item, index) in items" :key="item.id"
                class="p-3 border rounded-lg bg-white hover:bg-gray-50 cursor-move">
                <div class="flex items-start space-x-3">
                    <div class="flex-1 space-y-2">
                        <input v-model="item.title" type="text" placeholder="标题"
                            class="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                        <input v-model="item.description" type="text" placeholder="描述"
                            class="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />

                        <div class="flex items-center space-x-2">
                            <select v-model="item.groupId"
                                class="flex-1 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                                <option v-for="group in groups" :key="group.id" :value="group.id">
                                    {{ group.name }}
                                </option>
                            </select>
                            <button @click="removeItem(index)"
                                class="px-2 py-1 text-xs text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50">
                                删除
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </VueDraggable>

        <div v-if="items.length === 0" class="text-center py-8 text-gray-500">
            暂无菜单项，点击下方按钮添加
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { type MenuItem, type MenuGroup } from '../types'

interface Props {
    items: MenuItem[]
    groups: MenuGroup[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
    'update:items': [items: MenuItem[]]
}>()

const items = computed({
    get: () => props.items,
    set: (value: MenuItem[]) => emit('update:items', value)
})

const removeItem = (index: number) => {
    const newItems = [...props.items]
    newItems.splice(index, 1)
    emit('update:items', newItems)
}
</script>