import { Context, Session } from 'koishi'

import { normalizeCommandName } from './command-info'
import type { Config } from './config'
import type { PluginLogger } from './logger'
import { getGroupId } from './scope'
import type { AliasStore } from './store'

function normalizePrefixes(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value]
}

function isAliasMatch(session: Session, prefixes: string[], alias: string, currentCommand: string): boolean {
  const normalizedAlias = normalizeCommandName(alias)
  const normalizedCurrent = normalizeCommandName(currentCommand)

  if (session.isDirect && normalizedCurrent === normalizedAlias) {
    return true
  }

  return prefixes.some((prefix) => normalizedCurrent === normalizeCommandName(prefix + alias))
}

export function registerAliasMiddleware(
  ctx: Context,
  config: Config,
  store: AliasStore,
  logger: PluginLogger,
): void {
  if (!config.enabled) {
    return
  }

  ctx.middleware(async (session, next) => {
    const groupId = getGroupId(session)
    if (!groupId) return next()

    const { hasAt, content, atSelf } = session.stripped
    const parts = content.trim().split(/\s+/)
    const currentCommand = parts[0] ?? ''
    const remainingArgs = parts.slice(1).join(' ')
    const rawPrefixes = session.resolve(ctx.root.config.prefix ?? [])
    const prefixes = normalizePrefixes(rawPrefixes)

    const entry = store.list(session.platform, groupId).find((item) => {
      return isAliasMatch(session, prefixes, item.alias, currentCommand)
    })

    if (!entry) return next()
    if (hasAt && !atSelf) return next()

    try {
      const channel = await session.observeChannel(['assignee'])
      if (channel.assignee && session.selfId !== channel.assignee) return next()
    } catch (error) {
      logger.warn('获取频道 assignee 信息失败', error)
    }

    const target = `${entry.rawCommand} ${remainingArgs}`.trim()
    logger.debug(`用户 ${session.userId} 在群组 ${groupId} 触发别名 ${entry.alias} -> ${target}`)

    try {
      await session.execute(target)
    } catch (error) {
      logger.error(`执行别名 ${entry.alias} 对应的指令失败`, error)
    }
  }, true)
}
