import { Context, Session } from 'koishi'

import {
  collectOriginalCommands,
  findOriginalCommand,
  isKnownCommandName,
  normalizeCommandName,
} from './command-info'
import type { Config } from './config'
import type { PluginLogger } from './logger'
import { hasManagePermission } from './permission'
import { getGroupId } from './scope'
import type { AliasStore } from './store'

function getCommandNames(config: Config): Set<string> {
  const names = new Set<string>([
    config.baseCommand,
    `${config.baseCommand}.${config.addCommand}`,
    `${config.baseCommand}.${config.removeCommand}`,
    `${config.baseCommand}.${config.listCommand}`,
    `${config.baseCommand}.${config.availableCommand}`,
  ])
  return new Set([...names].map((name) => normalizeCommandName(name)))
}

function containsMedia(session: Session): boolean {
  const elements = session.elements ?? []
  return elements.some((element) => {
    return ['image', 'img', 'audio', 'video', 'file'].includes(element.type)
  })
}

function formatAvailableCommands(ctx: Context, config: Config): string {
  const commands = collectOriginalCommands(ctx, getCommandNames(config))
  if (commands.length === 0) {
    return '当前没有可设置别名的原始指令'
  }
  return `可设置别名的原始指令：\n${commands.map((command) => command.name).join('\n')}`
}

export function registerCommands(
  ctx: Context,
  config: Config,
  store: AliasStore,
  logger: PluginLogger,
): void {
  ctx.command(config.baseCommand, '管理当前频道的指令别名')

  ctx.command(
    `${config.baseCommand}.${config.addCommand} <raw:string> <alias:string>`,
    '为当前群组添加指令别名',
  ).userFields(['authority']).action(async ({ session }, raw, alias) => {
    const groupId = getGroupId(session)
    if (!groupId) return '无法获取当前群组信息'
    if (!hasManagePermission(session, config)) return '您没有权限执行此操作'
    if (containsMedia(session)) return '别名设置只允许文字参数，不能包含图片'

    let rawName = normalizeCommandName(raw)
    const aliasName = normalizeCommandName(alias)
    if (!rawName || !aliasName) return '请提供原始指令名称和别名名称'
    if (isKnownCommandName(ctx, aliasName)) return '别名不能与已有指令或指令别名重名'

    const excluded = getCommandNames(config)
    if (isKnownCommandName(ctx, rawName)) {
      const original = findOriginalCommand(ctx, excluded, rawName)
      if (!original) {
        return '该名称是已有指令别名或本插件的管理指令，不能作为原始指令'
      }
      rawName = normalizeCommandName(original.name)
    } else {
      return `未找到原始指令「${raw}」。\n${formatAvailableCommands(ctx, config)}`
    }

    return store.add(session.platform, groupId, rawName, aliasName)
  })

  ctx.command(
    `${config.baseCommand}.${config.removeCommand} <raw:string> <alias:string>`,
    '删除当前群组的指令别名',
  ).userFields(['authority']).action(async ({ session }, raw, alias) => {
    const groupId = getGroupId(session)
    if (!groupId) return '无法获取当前群组信息'
    if (!hasManagePermission(session, config)) return '您没有权限执行此操作'
    if (containsMedia(session)) return '别名设置只允许文字参数，不能包含图片'

    const rawName = normalizeCommandName(raw)
    const aliasName = normalizeCommandName(alias)
    if (!rawName || !aliasName) return '请提供原始指令名称和别名名称'

    const original = findOriginalCommand(ctx, getCommandNames(config), rawName)
    if (!original) return '未找到原始指令，无法删除对应别名'

    return store.remove(session.platform, groupId, normalizeCommandName(original.name), aliasName)
  })

  ctx.command(`${config.baseCommand}.${config.listCommand}`, '查看当前群组的指令别名')
    .action(({ session }) => {
      const groupId = getGroupId(session)
      if (!groupId) return '无法获取当前群组信息'

      const entries = store.list(session.platform, groupId)
      if (entries.length === 0) return '当前群组还没有指令别名'
      return `当前群组指令别名：\n${entries.map((entry) => `${entry.alias} -> ${entry.rawCommand}`).join('\n')}`
    })

  ctx.command(`${config.baseCommand}.${config.availableCommand}`, '查看可设置别名的原始指令')
    .action(({ session }) => {
      return formatAvailableCommands(ctx, config)
    })

  logger.debug('指令别名管理指令已注册')
}
