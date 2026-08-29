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

<style scoped>
.tab-main > div:first-child {
    margin-bottom: 10px;
}
.tab-bar {
    --bc-tab-margin: 20px;

    margin: -17px -20px -17px -40px;
    justify-content: center;
    align-items: center;
    position: relative;
    display: flex;
}
.tab-bar > span {
    font-weight: bold;
    flex: 0 0 auto;
    margin-right: 20px;
}
.tab-bar > li {
    margin: 0 var(--bc-tab-margin);
    justify-content: center;
    flex-direction: column;
    list-style-type: none;
    align-items: center;
    border-radius: 3px;
    min-width: 30px;
    cursor: pointer;
    padding: 10px;
    display: flex;
}
.tab-bar > li span,
.tab-bar > li svg {
    color: var(--color-font);
    transition: color 0.3s;
    font-size: 0.9rem;
}

.tab-bar > li > div {
    width: calc(100% + 10px);
    margin-bottom: -10px;
    transition: all .35s;
    border-radius: 7px;
    margin-top: 6px;
    height: 3px;
}
.tab-bar > li:last-child > div {
    background: var(--color-main);
}
.tab-bar > li.select span,
.tab-bar > li.select svg {
    color: var(--color-main);
}
</style>
