import { Session } from 'koishi'

import type { Config } from './config'

function hasAdminRole(session: Session): boolean {
  return session.event.member?.roles?.some((role) => {
    return ['admin', 'owner'].includes(String(role.id ?? role.name ?? role))
  }) ?? false
}

export function hasManagePermission(session: Session<'authority'>, config: Config): boolean {
  const hasAuthority = session.user.authority > config.authorityThreshold
  const hasRole = hasAdminRole(session)

  switch (config.permissionMode) {
    case 'authority':
      return hasAuthority
    case 'role':
      return hasRole
    case 'mixed':
      return hasAuthority || hasRole
  }
}
