<template>
    <!-- 设置页专用选项卡，避免 BcTab 在多实例/HMR 下取错 tab body -->
    <div class="tab-main">
        <Card>
            <ul v-if="tabs.length" class="tab-bar">
                <span v-if="title">{{ title }}</span>
                <li
                    v-for="(tab, index) in tabs"
                    :key="tab.name"
                    :class="{ select: activeIndex === index }"
                    @click="selectTab(index)">
                    <span>{{ tab.name }}</span>
                    <div
                        v-if="index === tabs.length - 1"
                        :style="getTabLineStyle(index)" />
                </li>
            </ul>
        </Card>
        <div ref="bodyRef" class="tab-body">
            <slot />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useSlots, watch } from 'vue'
import Card from 'vue3-bcui/packages/ss-card'

const props = defineProps<{
    title?: string
}>()

const slots = useSlots()
const bodyRef = ref<HTMLElement>()
const activeIndex = ref(0)

const tabs = computed(() => {
    const nodes = slots.default?.() ?? []
    return nodes.filter((node) => {
        const props = node.props as Record<string, unknown> | undefined
        return Boolean(props?.name)
    }).map((node) => {
        const props = node.props as Record<string, unknown>
        return {
            name: String(props.name ?? ''),
        }
    })
})

function selectTab(index: number) {
    activeIndex.value = index
    nextTick(() => {
        const children = bodyRef.value?.children
        if (!children) return
        const activeName = tabs.value[index]?.name
        for (let i = 0; i < children.length; i++) {
            const child = children[i] as HTMLElement
            if (child.nodeName === 'DIV' && child.hasAttribute('name')) {
                child.style.display = child.getAttribute('name') === activeName
                    ? 'block'
                    : 'none'
            }
        }
    })
}

function getTabLineStyle(maxIndex: number) {
    const offset = maxIndex - activeIndex.value
    return `transform: translateX(calc(-${offset}00% - (var(--bc-tab-margin) * 2 + 10px) * ${offset}))`
}

onMounted(() => {
    selectTab(0)
})

watch(tabs, () => {
    nextTick(() => selectTab(activeIndex.value))
})
</script>
