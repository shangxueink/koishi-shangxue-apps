import { Context, Session } from 'koishi'

import type { AssigneeMode } from './config'
import type { DebugLogger } from './logger'

// 固定使用一个不会与真实机器人 selfId 冲突的值。
const OTHER_ASSIGNEE = 'not-self'

function getTargetAssignee(mode: AssigneeMode, selfId: string): string | undefined {
  if (mode === 'self') return selfId
  if (mode === 'other') return OTHER_ASSIGNEE
  return undefined
}

export function registerAssigneeBypass(ctx: Context, mode: AssigneeMode, logDebug: DebugLogger) {
  ctx.on('attach-channel', (session: Session<never, 'assignee'>) => {
    const { channel } = session
    if (!channel) return

    const originalAssignee = channel.assignee
    const targetAssignee = getTargetAssignee(mode, session.selfId)
    if (!targetAssignee || channel.assignee === targetAssignee) return

    // 通过 observed channel 写入 assignee，供本次会话的 assignee 检查使用。
    channel.$merge({ assignee: targetAssignee })

    logDebug(
      '频道 %s 的 assignee 修改：%s -> %s',
      session.cid,
      originalAssignee || '(空)',
      targetAssignee,
    )
  }, true)
}
