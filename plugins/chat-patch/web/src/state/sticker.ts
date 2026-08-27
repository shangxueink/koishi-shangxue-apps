import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useStickerStore = defineStore('sticker', () => {
    const stickerCache = ref<any[] | undefined>([])

    return {
        stickerCache,
    }
})
