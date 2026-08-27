<template>
    <div ref="lottieContainer" :class="['lazy-lottie', {'loaded': loaded }]">
        <Lottie
            ref="lottieRef"
            :animation-link="animationLink"
            :title="title"
            :auto-play="false"
            @on-animation-loaded="loaded = true" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Vue3Lottie as Lottie } from 'vue3-lottie'

defineProps<{
    animationLink: string
    title?: string
}>()

const lottieContainer = ref<HTMLElement | null>(null)
const lottieRef = ref<any>(null)
const loaded = ref(false)
let observer: IntersectionObserver | null = null

const playAnimation = () => {
    if (!lottieRef.value) return
    try {
        lottieRef.value.play?.()
    } catch (e) {
        // do nothing
    }
}

const pauseAnimation = () => {
    if (lottieRef.value) {
        lottieRef.value.pause?.()
    }
}

onMounted(() => {
    if (!lottieContainer.value) return

    observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                    playAnimation()
                } else if (entry.intersectionRatio < 0.1) {
                    pauseAnimation()
                }
            })
        },
        {
            rootMargin: '50px',
            threshold: [0.1, 0.5, 0.9]
        }
    )

    observer.observe(lottieContainer.value)
})

onUnmounted(() => {
    pauseAnimation()
    if (observer && lottieContainer.value) {
        observer.unobserve(lottieContainer.value)
        observer.disconnect()
        observer = null
    }
})
</script>

<style scoped>
.lazy-lottie {
    display: inline-block;
    min-height: 100px;
    min-width: 100px;
}
.lazy-lottie.loaded {
    background: transparent !important;
}
</style>
