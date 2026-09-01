import type { DefaultContext, DefaultState, ParameterizedContext } from 'koa'

type ServerContext = ParameterizedContext<DefaultState, DefaultContext>

declare module '@satorijs/core' {
  interface Satori {
    server: {
      url: string
      config: {
        path: string
        token?: string
      }
    }
  }
}

declare module 'cordis' {
  interface Context {
    server: {
      selfUrl?: string
      config?: {
        selfUrl?: string
      }
      get: (path: string, ...handlers: Array<(context: ServerContext) => unknown>) => unknown
    }
  }
}
