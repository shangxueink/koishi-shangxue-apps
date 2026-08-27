import { Context } from 'koishi'
import {} from '@koishijs/plugin-server'
import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import send from 'koa-send'
import type { DefaultContext, DefaultState, ParameterizedContext } from 'koa'

import { Config } from './config'
import { ChatDatabase } from './database'
import { PluginLogger } from './logger'
import { ContactCacheItem } from './types'

export function registerWeb(
  ctx: Context,
  config: Config,
  database: ChatDatabase,
  logger: PluginLogger,
) {
  const webRoot = path.resolve(__dirname, '..', 'web', 'dist')

  type WebContext = ParameterizedContext<DefaultState, DefaultContext>

  const readCache = async (koa: WebContext) => {
    const platform = String(koa.query.platform ?? '')
    const selfId = String(koa.query.selfId ?? '')
    const type = String(koa.query.type ?? '')
    if (!platform || !selfId || !type) {
      koa.status = 400
      koa.body = { error: 'missing cache params' }
      return
    }
    koa.body = {
      contacts: await database.getContacts(platform, selfId, type),
    }
  }

  ctx.server.get(`${config.basePath}/api/cache/all`, async (koa) => {
    const entries = await database.getAllContacts()
    const botMap = new Map<string, {
      platform: string
      selfId: string
      groups: ContactCacheItem[]
      friends: ContactCacheItem[]
    }>()
    for (const entry of entries) {
      const key = `${entry.platform}:${entry.selfId}`
      const bot = botMap.get(key) ?? {
        platform: entry.platform,
        selfId: entry.selfId,
        groups: [],
        friends: [],
      }
      if (entry.type === 'group') bot.groups = entry.contacts
      if (entry.type === 'friend') bot.friends = entry.contacts
      botMap.set(key, bot)
    }
    koa.body = { bots: [...botMap.values()] }
  })

  ctx.server.get(`${config.basePath}/api/cache`, readCache)

  ctx.server.post(`${config.basePath}/api/cache`, async (koa) => {
    const requestBody = (koa.request as unknown as { body?: unknown }).body
    const body = (requestBody ?? {}) as Record<string, unknown>
    const platform = String(body.platform ?? '')
    const selfId = String(body.selfId ?? '')
    const type = String(body.type ?? '')
    if (!platform || !selfId || !type) {
      koa.status = 400
      koa.body = { error: 'missing cache params' }
      return
    }
    if (Array.isArray(body.contacts)) {
      const contacts = body.contacts as ContactCacheItem[]
      if (body.append === true) {
        for (const contact of contacts) {
          await database.appendContact(platform, selfId, type, contact)
        }
      } else {
        await database.setContacts(platform, selfId, type, contacts)
      }
    }
    koa.body = {
      contacts: await database.getContacts(platform, selfId, type),
    }
  })

  if (!existsSync(webRoot)) {
    logger.warn('未找到 web/dist，请先执行 web 目录下的 npm run build')
    return
  }

  const serveFile = async (koa: WebContext, fileName: string) => {
    const fullPath = path.join(webRoot, fileName)
    if (existsSync(fullPath) && statSync(fullPath).isFile()) {
      await send(koa, path.relative(webRoot, fullPath), { root: webRoot })
      return
    }
    koa.status = 200
    koa.body = ''
    await send(koa, 'index.html', { root: webRoot })
  }

  ctx.server.get(`${config.basePath}/web(/.*)?`, async (koa) => {
    const fileName = koa.params?.[0]?.replace(/^\/+/, '') || 'index.html'
    await serveFile(koa, fileName)
  })
}
