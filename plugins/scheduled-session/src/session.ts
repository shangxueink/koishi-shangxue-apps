import { Bot, Context, Universal, h } from 'koishi'

import type { ScheduleTask } from './config'

const SYSTEM_USER_ID = 'system-scheduler'

export function createScheduledSession(bot: Bot<Context>, task: ScheduleTask) {
  const timestamp = Date.now()
  const platform = bot.platform ?? bot.adapterName
  const elements = h.parse(task.executecommand)

  return bot.session({
    type: 'message-created',
    subtype: 'group',
    selfId: bot.selfId,
    platform,
    timestamp,
    user: {
      id: SYSTEM_USER_ID,
      name: '定时任务系统',
      avatar: '',
    },
    channel: {
      id: task.channelId,
      type: Universal.Channel.Type.TEXT,
    },
    guild: {
      id: task.channelId.replace(/^private:/, ''),
    },
    message: {
      id: `${bot.selfId}-${task.channelId}-${timestamp}`,
      content: task.executecommand,
      elements,
    },
    _type: platform,
    _data: {
      post_type: 'message',
      message_type: 'group',
      sub_type: 'normal',
      group_id: task.channelId,
      user_id: SYSTEM_USER_ID,
      message: [{
        type: 'text',
        data: { text: task.executecommand },
      }],
    },
  })
}
