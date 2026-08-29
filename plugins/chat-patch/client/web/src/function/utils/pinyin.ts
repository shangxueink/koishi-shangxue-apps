import { isDebugMode } from '../debug'

export type PinYinData = {
    main: string[]
    short: string[]
}

type PinyinModule = typeof import('pinyin')

let pinyinModule: PinyinModule | null = null
let pinyinLoadPromise: Promise<boolean> | null = null

function createEmptyPinyinData(): PinYinData {
    return {
        main: [],
        short: [],
    }
}

function scheduleIdleTask(task: () => void) {
    if (typeof window === 'undefined') return

    const idleWindow = window as Window & {
        requestIdleCallback?: (
            callback: IdleRequestCallback,
            options?: IdleRequestOptions,
        ) => number
    }

    if (typeof idleWindow.requestIdleCallback === 'function') {
        idleWindow.requestIdleCallback(() => task(), { timeout: 1500 })
        return
    }

    window.setTimeout(task, 300)
}

export function isPinyinReady() {
    return pinyinModule !== null
}

export function ensurePinyinLoaded(): Promise<boolean> {
    if (pinyinModule) return Promise.resolve(true)
    if (pinyinLoadPromise) return pinyinLoadPromise

    pinyinLoadPromise = import('pinyin')
        .then((mod) => {
            pinyinModule = mod
            return true
        })
        .catch((error: unknown) => {
            if (isDebugMode()) console.warn('本地拼音库加载失败:', error)
            pinyinLoadPromise = null
            return false
        })

    return pinyinLoadPromise
}

export function preloadPinyin() {
    scheduleIdleTask(() => {
        void ensurePinyinLoaded()
    })
}

export function getPinyin(name: string): PinYinData {
    if (!pinyinModule) return createEmptyPinyinData()

    try {
        const pinyinLib = pinyinModule.pinyin
        return {
            main: pinyinLib(name, {
                heteronym: true,
                compact: true,
                style: 'normal',
            }).map((item) => item.join('').toLowerCase()),
            short: pinyinLib(name, {
                heteronym: true,
                compact: true,
                style: 'first_letter',
            }).map((item) => item.join('').toLowerCase()),
        }
    } catch (error) {
        if (isDebugMode()) console.warn('拼音转换失败:', error)
        return createEmptyPinyinData()
    }
}

export function matchPinyin(
    pinyinData: PinYinData,
    matchStr: string,
): boolean {
    const str = matchStr.toLowerCase()
    for (const py of pinyinData.main) {
        if (py.includes(str)) return true
    }
    for (const pyShort of pinyinData.short) {
        if (pyShort.includes(str)) return true
    }
    return false
}
