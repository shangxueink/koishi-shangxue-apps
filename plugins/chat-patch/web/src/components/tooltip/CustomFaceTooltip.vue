<template>
    <img :src="url" :alt="$t('预览图片加载失败')" class="custom-face-tooltip">
</template>

<script setup lang="ts">
const { url } = defineProps<{ url: string }>()
</script>

<style scoped lang="css">
.tooltip-enter-active, .tooltip-leave-active {
    transition: opacity 0.2s, transform 0.2s;
    transform-origin: bottom;
}
.tooltip-enter-from, .tooltip-leave-to {
    opacity: 0;
    transform: translate(-50%, calc(-100% - 0.8rem)) scale(0.5) scaleY(0);
}
.tooltip-enter-to, .tooltip-leave-from {
    opacity: 1;
    transform: translate(-50%, calc(-100% - 0.8rem)) scale(0.5) scaleY(1);
}
</style>
