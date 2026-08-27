import { defineStore } from 'pinia'
import { shallowReactive, ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
    const loginInfo = shallowReactive<Record<string, any>>({})
    const botInfo = shallowReactive<Record<string, any>>({})
    const jsonMap = ref<any>(undefined)

    return {
        loginInfo,
        botInfo,
        jsonMap,
    }
})
