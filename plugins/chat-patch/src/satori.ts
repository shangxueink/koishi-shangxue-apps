import { Context } from 'koishi'
import {} from '@koishijs/plugin-server'
import {} from '@satorijs/plugin-server'

function getSatoriPath(ctx: Context): string {
  const path = ctx.satori?.server?.config?.path ?? '/satori'
  return path.startsWith('/') ? path : `/${path}`
}

export function resolveSatoriEndpoint(ctx: Context): string {
  const port = ctx.server?.port ?? ctx.server?.config?.port
  const base = `http://localhost${port ? `:${port}` : ''}`
  return `${base}${getSatoriPath(ctx)}`
}

export function toSatoriEventUrl(endpoint: string): string {
  const url = new URL(endpoint)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/v1/events`
  url.search = ''
  return url.href
}
