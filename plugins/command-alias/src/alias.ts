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

function resolveAlias(
  store: AliasStore,
  platform: string,
  groupId: string,
  prefixes: string[],
  currentCommand: string,
): string | undefined {
  const normalizedCurrent = normalizeCommandName(currentCommand)
  const direct = store.resolve(platform, groupId, normalizedCurrent)
  if (direct) return direct

  for (const prefix of prefixes) {
    if (!prefix) continue
    const normalizedPrefix = normalizeCommandName(prefix)
    if (!normalizedCurrent.startsWith(normalizedPrefix)) continue

    const alias = normalizedCurrent.slice(normalizedPrefix.length)
    if (!alias) continue
    const rawCommand = store.resolve(platform, groupId, alias)
    if (rawCommand) return rawCommand
  }

  return undefined
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

    const rawCommand = resolveAlias(store, session.platform, groupId, prefixes, currentCommand)
    if (!rawCommand) return next()
    if (hasAt && !atSelf) return next()

    const channel = session.channel as ChannelWithAssignee | undefined
    if (channel?.assignee && session.selfId !== channel.assignee) return next()

    const target = `${rawCommand} ${remainingArgs}`.trim()
    logger.debug(`用户 ${session.userId} 在群组 ${groupId} 触发别名 ${currentCommand} -> ${target}`)

    try {
      await session.execute(target)
    } catch (error) {
      logger.error(`执行别名 ${currentCommand} 对应的指令失败`, error)
    }
  }, true)
}
