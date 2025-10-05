<template>
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div ref="modalRef"
            class="bg-white rounded-lg shadow-xl w-96 max-w-full max-h-[80vh] overflow-y-auto cursor-move"
            @mousedown="startDrag">
            <!-- 头部 -->
            <div class="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
                <div>
                    <h3 class="text-lg font-semibold text-gray-900">编辑内容</h3>
                    <p class="text-xs text-gray-500">按住可拖动</p>
                </div>
                <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 text-xl font-bold">
                    ×
                </button>
            </div>

            <!-- 内容 -->
            <div class="p-4 space-y-4">
                <!-- 分组设置 -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">分组</label>
                    <div class="flex space-x-2 mb-2">
                        <select v-model="localItem.groupId"
                            class="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option v-for="group in groups" :key="group.id" :value="group.id">
                                {{ group.name }}
                            </option>
                        </select>
                    </div>
                    <div class="flex space-x-2">
                        <button @click="showAddGroup = true"
                            class="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                            添加分组
                        </button>
                        <button @click="deleteGroup"
                            class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                            删除该组
                        </button>
                    </div>
                </div>

                <!-- 仅主人可看 -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">仅主人可看</label>
                    <select v-model="localItem.onlyOwner"
                        class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option :value="false">否</option>
                        <option :value="true">是</option>
                    </select>
                </div>

                <!-- 排序按钮 -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">排序</label>
                    <div class="flex space-x-2">
                        <button @click="moveUp"
                            class="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center">
                            ↑ 上移
                        </button>
                        <button @click="moveDown"
                            class="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center">
                            ↓ 下移
                        </button>
                    </div>
                </div>

                <!-- 预览图标 -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">预览图标</label>
                    <div class="flex items-center space-x-3">
                        <div class="w-12 h-12 border rounded flex items-center justify-center bg-gray-50">
                            <img v-if="localItem.icon" :src="localItem.icon" alt="图标"
                                class="w-8 h-8 object-cover rounded" />
                            <span v-else class="text-gray-400 text-xs">无图标</span>
                        </div>
                        <button @click="showIconSelector = true"
                            class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                            ⚙️ 编辑
                        </button>
                    </div>
                </div>

                <!-- 标题 -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">标题</label>
                    <input v-model="localItem.title" type="text" placeholder="标题：在这里填入标题"
                        class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>

                <!-- 描述 -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
                    <textarea v-model="localItem.description" placeholder="描述：在这里填入描述" rows="3"
                        class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"></textarea>
                </div>
            </div>

            <!-- 底部操作按钮 -->
            <div class="flex justify-between p-4 border-t bg-gray-50 rounded-b-lg">
                <div class="space-x-2">
                    <button @click="addNewItem" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                        添加项目
                    </button>
                </div>
                <div class="space-x-2">
                    <button @click="deleteItem" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                        删除该项
                    </button>
                    <button @click="saveItem" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        保存
                    </button>
                </div>
            </div>
        </div>

        <!-- 添加分组弹窗 -->
        <div v-if="showAddGroup" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div class="bg-white rounded-lg p-6 w-80">
                <h4 class="text-lg font-semibold mb-4">添加新分组</h4>
                <input v-model="newGroupName" type="text" placeholder="分组名称"
                    class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4" />
                <div class="flex justify-end space-x-2">
                    <button @click="showAddGroup = false; newGroupName = ''"
                        class="px-4 py-2 text-gray-600 hover:text-gray-800">
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
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { type MenuItem, type MenuGroup } from '../types'

interface Props {
    item: MenuItem
    groups: MenuGroup[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
    close: []
    save: [item: MenuItem]
    delete: [itemId: string]
}>()

const localItem = reactive<MenuItem>({ ...props.item })
const showAddGroup = ref(false)
const showIconSelector = ref(false)
const newGroupName = ref('')
const modalRef = ref<HTMLElement>()

// 拖拽相关
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

const startDrag = (e: MouseEvent) => {
    if (!modalRef.value) return

    isDragging.value = true
    const rect = modalRef.value.getBoundingClientRect()
    dragOffset.value = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    }

    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e: MouseEvent) => {
    if (!isDragging.value || !modalRef.value) return

    const x = e.clientX - dragOffset.value.x
    const y = e.clientY - dragOffset.value.y

    modalRef.value.style.position = 'fixed'
    modalRef.value.style.left = `${x}px`
    modalRef.value.style.top = `${y}px`
    modalRef.value.style.transform = 'none'
}

const stopDrag = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
}

const moveUp = () => {
    emit('save', { ...localItem, order: localItem.order - 1 })
}

const moveDown = () => {
    emit('save', { ...localItem, order: localItem.order + 1 })
}

const addGroup = () => {
    if (newGroupName.value.trim()) {
        // 这里应该通过emit通知父组件添加分组
        console.log('添加分组:', newGroupName.value)
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
    const newItem: MenuItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        title: '新项目',
        description: '描述信息',
        icon: '',
        command: '',
        groupId: localItem.groupId,
        onlyOwner: false,
        order: 0
    }
    emit('save', newItem)
}

const deleteItem = () => {
    if (confirm('确定要删除该项目吗？')) {
        emit('delete', localItem.id)
    }
}

const saveItem = () => {
    emit('save', { ...localItem })
}

onUnmounted(() => {
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
})
</script>

<style scoped>
.z-60 {
    z-index: 60;
}
</style>