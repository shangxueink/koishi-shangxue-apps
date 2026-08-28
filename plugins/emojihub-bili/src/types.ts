export {}

// 仅补全当前插件用到的服务类型，避免运行时引入额外依赖
declare module 'koishi' {
  interface Context {
    canvas: {
      loadImage(source: string): Promise<CanvasImage>
    }
    assets: {
      transform(content: string): Promise<string>
    }
    cron?: (expression: string, callback: () => void) => () => void
  }
}

export interface CanvasImage {
  readonly naturalWidth: number
  readonly naturalHeight: number
  width: number
  height: number
  dispose(): Promise<void>
}
