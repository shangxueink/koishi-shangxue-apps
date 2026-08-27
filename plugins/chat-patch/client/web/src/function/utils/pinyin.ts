export type PinYinData = {
    main: string[]
    short: string[]
}

/* eslint-disable no-console */

const PINYIN_SCRIPT_SRC = 'https://lib.stapxs.cn/modules/pinyin.min.js'

let pinyinLoadPromise: Promise<boolean> | null = null

function createEmptyPinyinData(): PinYinData {
    return {
        main: [],
        short: []
    }
}

function hasPinyinLib() {
    return typeof window !== 'undefined' && typeof window.pinyin !== 'undefined'
}

function scheduleIdleTask(task: () => void) {
    if (typeof window === 'undefined') return

    const idleWindow = window as Window & {
        requestIdleCallback?: (
            callback: IdleRequestCallback,
            options?: IdleRequestOptions
        ) => number
    }

    if (typeof idleWindow.requestIdleCallback === 'function') {
        idleWindow.requestIdleCallback(() => task(), { timeout: 1500 })
        return
    }

    window.setTimeout(task, 300)
}

export function isPinyinReady() {
    return hasPinyinLib()
}

export function ensurePinyinLoaded(): Promise<boolean> {
    if (hasPinyinLib()) return Promise.resolve(true)
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return Promise.resolve(false)
    }
    if (pinyinLoadPromise !== null) return pinyinLoadPromise

    pinyinLoadPromise = new Promise((resolve) => {
        let script = document.querySelector(
            'script[data-ssqq-pinyin-lib="true"]',
        ) as HTMLScriptElement | null

        const finish = (success: boolean) => {
            if (!success) {
                pinyinLoadPromise = null
            }
            resolve(success)
        }

        const handleLoad = () => {
            if (script) {
                script.dataset.loaded = 'true'
            }
            finish(hasPinyinLib())
        }

        const handleError = () => {
            console.warn('拼音库加载失败')
            script?.remove()
            finish(false)
        }

        if (script?.dataset.loaded === 'true') {
            finish(hasPinyinLib())
            return
        }

        if (!script) {
            script = document.createElement('script')
            script.src = PINYIN_SCRIPT_SRC
            script.async = true
            script.dataset.ssqqPinyinLib = 'true'
            document.body.appendChild(script)
        }

        script.addEventListener('load', handleLoad, { once: true })
        script.addEventListener('error', handleError, { once: true })
    })

    return pinyinLoadPromise
}

export function preloadPinyin() {
    scheduleIdleTask(() => {
        void ensurePinyinLoaded()
    })
}

export function getPinyin(name: string): PinYinData {
    if (!hasPinyinLib()) return createEmptyPinyinData()

    try {
        const pinyinLib = window.pinyin
        if (!pinyinLib) return createEmptyPinyinData()
        return {
            main: pinyinLib.pinyin(name, {
                heteronym: true,
                compact: true,
                style: 'normal',
            }).map((item: string[]) => item.join('').toLowerCase()),
            short: pinyinLib.pinyin(name, {
                heteronym: true,
                compact: true,
                style: 'first_letter',
            }).map((item: string[]) => item.join('').toLowerCase()),
        }
    } catch (error) {
        console.warn('拼音转换失败:', error)
        return createEmptyPinyinData()
    }
}

export function matchPinyin(
    pinyinData: PinYinData,
    matchStr: string
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
