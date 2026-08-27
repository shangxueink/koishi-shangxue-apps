import { defineStore } from 'pinia'
import { shallowReactive, ref, shallowRef } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
    const sysConfig = shallowReactive<Record<string, any>>({})
    const darkMode = ref(false)
    const connectSsl = ref(false)
    const firstLoad = ref(false)
    const classes = shallowRef<any[]>([])

    return {
        sysConfig,
        darkMode,
        connectSsl,
        firstLoad,
        classes,
    }
})
