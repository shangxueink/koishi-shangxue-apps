<template>
    <div class="h-full flex flex-col bg-transparent">
        <!-- 头部 -->
        <div
            class="flex items-center justify-between p-4 border-b bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700">
            <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">编辑内容</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">实时预览编辑效果</p>
            </div>
            <button @click="$emit('close')"
                class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-xl font-bold">
                ×
            </button>
        </div>

        <!-- 内容区域 -->
        <div v-if="item && item.id" class="flex-1 p-4 space-y-4">
            <!-- 标题 -->
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">标题</label>
                <input v-model="localItem.title" type="text" placeholder="标题：在这里填入标题"
                    class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>

            <!-- 描述 -->
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">描述</label>
                <textarea v-model="localItem.description" placeholder="描述：在这里填入描述" rows="3"
                    class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"></textarea>
            </div>

            <!-- 排序按钮 -->
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">排序</label>
                <div class="flex space-x-2">
                    <button @click="moveUp"
                        class="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 flex items-center">
                        ↑ 上移
                    </button>
                    <button @click="moveDown"
                        class="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 flex items-center">
                        ↓ 下移
                    </button>
                </div>
            </div>

            <!-- 分组设置 -->
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">分组</label>
                <div class="flex space-x-2 mb-2">
                    <select v-model="localItem.groupId"
                        class="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option v-for="group in groups" :key="group.id" :value="group.id">
                            {{ group.name }}
                        </option>
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <button @click="showAddGroup = true"
                        class="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                        添加分组
                    </button>
                    <button @click="deleteGroup"
                        class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                        删除该组
                    </button>
                    <button @click="addNewItem"
                        class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                        添加指令
                    </button>
                    <button @click="deleteItem"
                        class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                        删除指令
                    </button>
                </div>
            </div>

        </div>

        <!-- 默认状态 -->
        <div v-else class="flex-1 flex items-center justify-center p-4">
            <div class="text-center text-gray-500 dark:text-gray-400">
                <div class="text-4xl mb-4">📝</div>
                <h3 class="text-lg font-medium mb-2">选择一个菜单项进行编辑</h3>
                <p class="text-sm">点击预览区域中的任意菜单项开始编辑</p>
            </div>
        </div>


        <!-- 添加分组弹窗 -->
        <div v-if="showAddGroup" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-80">
                <h4 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">添加新分组</h4>
                <input v-model="newGroupName" type="text" placeholder="分组名称"
                    class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                <div class="flex justify-end space-x-2">
                    <button @click="showAddGroup = false; newGroupName = ''"
                        class="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
                        取消
                    </button>
                    <button @click="addGroup" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        添加
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { type MenuItem, type MenuGroup } from '../types'

interface Props {
    item?: MenuItem | null
    groups: MenuGroup[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
    close: []
    save: [item: MenuItem]
    delete: [itemId: string]
    'add-group': [group: MenuGroup]
    'add-item': [item: MenuItem]
}>()

const localItem = reactive<MenuItem>(props.item || {
    id: '',
    title: '',
    description: '',
    groupId: '',
    order: 0
})
const showAddGroup = ref(false)
const showIconSelector = ref(false)
const newGroupName = ref('')

// 监听props变化，更新本地数据
watch(() => props.item, (newItem) => {
    if (newItem) {
        Object.assign(localItem, newItem)
    }
}, { deep: true })

// 实时保存功能
watch(localItem, () => {
    if (props.item && props.item.id) {
        emit('save', { ...localItem })
    }
}, { deep: true })

const moveUp = () => {
    // 找到当前项目在同分组中的位置
    const currentGroupItems = props.groups.find(g => g.id === localItem.groupId)
    if (!currentGroupItems) return

    // 直接修改order值，允许负数，确保能够一直上移
    const newOrder = localItem.order - 1.5
    const updatedItem = { ...localItem, order: newOrder }
    emit('save', updatedItem)
    Object.assign(localItem, updatedItem)
}

const moveDown = () => {
    // 找到当前项目在同分组中的位置
    const currentGroupItems = props.groups.find(g => g.id === localItem.groupId)
    if (!currentGroupItems) return

    // 直接修改order值，确保立即生效
    const newOrder = localItem.order + 1.5
    const updatedItem = { ...localItem, order: newOrder }
    emit('save', updatedItem)
    Object.assign(localItem, updatedItem)
}

const addGroup = () => {
    if (newGroupName.value.trim()) {
        const newGroup: MenuGroup = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: newGroupName.value.trim(),
            order: Date.now()
        }
        emit('add-group', newGroup)
        showAddGroup.value = false
        newGroupName.value = ''
    }
}

const deleteGroup = () => {
    if (confirm('确定要删除该分组吗？')) {
        console.log('删除分组:', localItem.groupId)
    }
}

const addNewItem = () => {
    // 获取当前分组或默认分组
    const currentGroupId = localItem.groupId || props.groups[0]?.id || 'default'

    const newItem: MenuItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        title: '新指令',
        description: '请输入指令描述',
        groupId: currentGroupId,
        order: Date.now()
    }

    // 发送添加新项目的事件
    emit('add-item', newItem)

    // 切换到新创建的项目进行编辑
    Object.assign(localItem, newItem)
}

const deleteItem = () => {
    emit('delete', localItem.id)
}

const saveItem = () => {
    emit('save', { ...localItem })
}
</script>

<style scoped>
.z-60 {
    z-index: 60;
}
</style>