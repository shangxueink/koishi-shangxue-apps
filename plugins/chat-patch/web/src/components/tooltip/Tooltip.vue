<template>
    <component :is="compData.comp"
        ref="body"
        v-bind="compData.props"
        v-model="model"
        class="tooltip"
        :style="{ position: 'absolute', left: posInfo.x + 'px', top: posInfo.y + 'px' }"
        v-on="compData.emit || {}" />
</template>

<script setup lang="ts" generic="T extends Component">
import { TooltipInfo } from '@renderer/function/tooltip'
import { type Component, onMounted, shallowReactive, useTemplateRef } from 'vue'

const { compData, pos } = defineProps<TooltipInfo<T>>()

const model = defineModel()

const body = useTemplateRef('body')

const posInfo = shallowReactive({
    x: 0,
    y: 0,
})

onMounted(async ()=>{
    if (!body.value) return
    posInfo.x = pos.x
    posInfo.y = pos.y
    // 高度
    const el = (body.value as any).$el as HTMLElement
    const panHeight = el.clientHeight
    if (pos.y < panHeight + 20) {
        posInfo.y = panHeight + 20
    }
    // 宽度
    const menuWidth = el.clientWidth
    const bodyWidth = document.body.clientWidth
    if (pos.x + menuWidth > bodyWidth - 20) {
        posInfo.x = bodyWidth - menuWidth - 10
    }
})
</script>

<style>
.tooltip {
    z-index: 50;
    transition: left 0s, top 0s;
}
</style>
