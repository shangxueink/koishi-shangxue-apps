import { Context } from 'koishi'
import {} from '@koishijs/plugin-server'
import {} from '@koishijs/plugin-server-satori'
import {} from '@satorijs/plugin-server'

import { Config } from './config'
import { ChatDatabase } from './database'
import { PluginLogger } from './logger'
import { resolveSatoriEndpoint } from './satori'
import { ContactCacheQuery, ContactCacheResult, HistoryQuery, HistoryResult, PluginConfigPayload, SatoriBootstrap } from './types'

export function registerBootstrap(
  ctx: Context,
  config: Config,
  database: ChatDatabase,
  logger: PluginLogger,
  getLogins: () => SatoriBootstrap['logins'],
) {
  ctx.console.addListener('chat-patch/bootstrap', (): SatoriBootstrap => {
    logger.logInfo('返回 Satori bootstrap:', {
      endpoint: resolveSatoriEndpoint(ctx),
      basePath: config.basePath,
    })
    return {
      endpoint: resolveSatoriEndpoint(ctx),
      token: ctx.satori?.server?.config?.token ?? '',
      basePath: config.basePath,
      logins: getLogins(),
      blockedPlatforms: config.blockedPlatforms ?? [],
    }
  }, { authority: 4 })

  ctx.console.addListener('chat-patch/history', async (query: HistoryQuery): Promise<HistoryResult> => {
    const messages = await database.listMessages(
      query.platform,
      query.selfId,
      query.channelId,
      query.limit,
    )
    return { messages }
  }, { authority: 4 })

  ctx.console.addListener('chat-patch/config', (): PluginConfigPayload => {
    return {
      basePath: config.basePath,
      maxMessagesPerChannel: config.maxMessagesPerChannel,
      historyPageSize: config.historyPageSize,
      maxMediaFiles: config.maxMediaFiles,
      blockedPlatforms: config.blockedPlatforms ?? [],
      loggerinfo: config.loggerinfo,
    }
  }, { authority: 4 })

  ctx.console.addListener('chat-patch/contact-cache', async (query: ContactCacheQuery): Promise<ContactCacheResult> => {
    if (query.contacts) {
      if (query.append) {
        for (const contact of query.contacts) {
          await database.appendContact(query.platform, query.selfId, query.type, contact)
        }
        return { contacts: await database.getContacts(query.platform, query.selfId, query.type) }
      }
      await database.setContacts(query.platform, query.selfId, query.type, query.contacts)
      return { contacts: query.contacts }
    }
    return { contacts: await database.getContacts(query.platform, query.selfId, query.type) }
  }, { authority: 4 })
}
