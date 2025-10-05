<template>
    <component :is="'style'">
        {{ generatedStyles }}
    </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { type Config } from '../types'

interface Props {
    config: Config
}

const props = defineProps<Props>()

const generatedStyles = computed(() => {
    let styles = ''

    // 生成 @font-face 规则
    props.config.customFonts.forEach(font => {
        styles += `
      @font-face {
        font-family: "${font.name}";
        src: url("${font.url}");
      }
    `
    })

    return styles
})
</script>