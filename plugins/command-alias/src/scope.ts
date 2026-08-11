import { Session } from 'koishi'

export function getGroupId(session: Session): string | undefined {
  return session.guildId ?? session.channelId
}
