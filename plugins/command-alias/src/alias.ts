import { Context } from 'koishi'

import { normalizeCommandName } from './command-info'
import type { Config } from './config'
import type { PluginLogger } from './logger'
import { getGroupId } from './scope'
import type { AliasStore } from './store'

function normalizePrefixes(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value]
}

interface ChannelWithAssignee {
  assignee?: string
}

function resolveAliases(
  store: AliasStore,
  platform: string,
  groupId: string,
  prefixes: string[],
  currentCommand: string,
): string[] {
  const normalizedCurrent = normalizeCommandName(currentCommand)
  const direct = store.resolveAll(platform, groupId, normalizedCurrent)
  if (direct.length > 0) return direct

  for (const prefix of prefixes) {
    if (!prefix) continue
    const normalizedPrefix = normalizeCommandName(prefix)
    if (!normalizedCurrent.startsWith(normalizedPrefix)) continue

    const alias = normalizedCurrent.slice(normalizedPrefix.length)
    if (!alias) continue
    const rawCommands = store.resolveAll(platform, groupId, alias)
    if (rawCommands.length > 0) return rawCommands
  }

  return []
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

    const rawCommands = resolveAliases(store, session.platform, groupId, prefixes, currentCommand)
    if (rawCommands.length === 0) return next()
    if (hasAt && !atSelf) return next()

    const channel = session.channel as ChannelWithAssignee | undefined
    if (channel?.assignee && session.selfId !== channel.assignee) return next()

    for (const rawCommand of rawCommands) {
      const target = `${rawCommand} ${remainingArgs}`.trim()
      logger.debug(`用户 ${session.userId} 在群组 ${groupId} 触发别名 ${currentCommand} -> ${target}`)

      try {
        await session.execute(target)
      } catch (error) {
        logger.error(`执行别名 ${currentCommand} 对应的指令失败`, error)
      }
    }
  }, true)
}
