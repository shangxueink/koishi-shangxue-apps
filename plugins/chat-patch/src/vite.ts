import NodeConsole from '@koishijs/plugin-console'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

interface ViteServer {
  middlewares(req: unknown, res: unknown, next: () => void): void
  close(): Promise<void> | void
}

interface ViteNodeConsole {
  config: {
    cacheDir?: string
    dev?: {
      fs?: unknown
    }
  }
  ctx: {
    baseDir: string
    server: {
      all(path: string, handler: (ctx: { req: unknown; res: unknown }) => Promise<void>): unknown
    }
    on(event: 'dispose', callback: () => void): unknown
  }
  vite?: ViteServer
}

interface CreateServer {
  (baseDir: string, config?: Record<string, unknown>): Promise<ViteServer>
}

const consoleClass = NodeConsole as unknown as {
  prototype: {
    createVite?: (this: ViteNodeConsole) => Promise<void>
  }
}

const webSource = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'client',
  'web',
  'src',
)

let originalCreateVite: ((this: ViteNodeConsole) => Promise<void>) | null = null

// 在 Koishi 创建 Vite 前注入 @renderer 别名，避免运行时再修改插件容器
export function patchKoishiVite(baseDir: string): () => void {
  if (originalCreateVite || !consoleClass.prototype.createVite) return () => {}

  originalCreateVite = consoleClass.prototype.createVite
  consoleClass.prototype.createVite = async function (this: ViteNodeConsole) {
    const require = createRequire(path.join(baseDir, 'package.json'))
    const { createServer } = require('@koishijs/client/lib') as { createServer: CreateServer }
    const server = await createServer(this.ctx.baseDir, {
      cacheDir: path.resolve(this.ctx.baseDir, this.config.cacheDir ?? 'cache/vite'),
      server: {
        fs: this.config.dev?.fs,
        preTransformRequests: false,
      },
      resolve: {
        alias: [
          { find: '@renderer', replacement: webSource },
        ],
      },
    })

    this.vite = server
    this.ctx.server.all('/vite(.*)', (ctx) => new Promise<void>((done) => {
      server.middlewares(ctx.req, ctx.res, done)
    }))
    this.ctx.on('dispose', () => server.close())
  }

  return () => {
    if (originalCreateVite && consoleClass.prototype.createVite) {
      consoleClass.prototype.createVite = originalCreateVite
      originalCreateVite = null
    }
  }
}
