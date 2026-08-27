/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module '*.yaml' {
  const content: unknown
  export default content
}

declare module '*.yml' {
  const content: unknown
  export default content
}

declare module '*.po' {
  const value: string
  export default value
}

declare interface Window {
  moYu?: unknown
  pinyin?: {
    pinyin: (value: string, options: {
      heteronym: boolean
      compact: boolean
      style: string
    }) => string[][]
  }
  _AMapSecurityConfig?: string
  electron?: {
    shell?: {
      openPath?: (...args: unknown[]) => Promise<unknown>
      openExternal?: (url: string) => Promise<unknown>
    }
    process?: {
      platform?: string
      versions?: Record<string, string>
    }
    ipcRenderer?: {
      invoke?: (...args: unknown[]) => Promise<unknown>
      on?: (...args: unknown[]) => void
    }
    webUtils?: {
      getPathForFile?: (file: File) => string
    }
  }
  __TAURI_INTERNALS__?: unknown
  Capacitor?: {
    isNativePlatform?: () => boolean
    getPlatform?: () => string
  }
}
