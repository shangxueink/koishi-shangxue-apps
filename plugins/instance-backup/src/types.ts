export {}

declare module 'koishi' {
  interface Context {
    cron?: (expression: string, callback: () => void) => () => void
  }
}
