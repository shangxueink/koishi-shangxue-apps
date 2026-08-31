import { Context } from 'koishi'
import {} from '@koishijs/plugin-server'
import {} from '@satorijs/plugin-server'

export function resolveSatoriEndpoint(ctx: Context): string {
  const url = ctx.satori?.server?.url ?? '/satori'
  const clean = url.startsWith('undefined') ? url.slice(9) : url
  if (/^https?:\/\//i.test(clean)) return clean
  const base = ctx.server?.selfUrl ?? ctx.server?.config?.selfUrl ?? ''
  return `${base}${clean.startsWith('/') ? clean : `/${clean}`}`
}

export function toSatoriEventUrl(endpoint: string): string {
  const url = new URL(endpoint)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/v1/events`
  url.search = ''
  return url.href
}
