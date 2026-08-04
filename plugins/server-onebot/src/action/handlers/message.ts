import { oneBotMessageToElements, decodeStringId, decodeChannelId, sendWithSession } from '../../utils'
import { logInfo, loggerError, loggerInfo } from '../../../src/index'
import { ActionHandler, ClientState } from '../../types'
import { BotFinder } from '../../bot-finder'
import { Context } from 'koishi'




async function sendMessage(
  ctx: Context,
  params: {
    message: string | any[]
    user_id?: string | number
    group_id?: string | number
    message_type?: 'private' | 'group'
  },
  clientState: ClientState
): Promise<{ message_id: string | string[] }> {
  logInfo(`=== sendMessage called ===`)
  logInfo(`clientState.selfId: ${clientState.selfId}`)
  logInfo(`clientState.lastMessageId: ${clientState.lastMessageId}`)
  logInfo(`params: ${JSON.stringify(params)}`)

  const elements = await oneBotMessageToElements(params.message, ctx)


  let isPrivate = false
  let targetChannelId: string
  let targetUserId: string | null = null


  if (params.message_type === 'group') {

    isPrivate = false
    if (params.group_id) {
      targetChannelId = await decodeChannelId(params.group_id, ctx)
    } else {
      throw new Error('group_id is required for group message')
    }
    targetUserId = null
  } else if (params.message_type === 'private') {

    isPrivate = true
    if (params.user_id) {
      targetUserId = await decodeStringId(params.user_id, ctx)
      targetChannelId = `private:${targetUserId}`
    } else {
      throw new Error('user_id is required for private message')
    }
  } else if (params.group_id) {

    isPrivate = false
    targetChannelId = await decodeChannelId(params.group_id, ctx)
    targetUserId = null
  } else if (params.user_id) {

    isPrivate = true
    targetUserId = await decodeStringId(params.user_id, ctx)
    targetChannelId = `private:${targetUserId}`
  } else {
    throw new Error('Invalid parameters: must specify message_type or provide user_id/group_id')
  }


  const result = await sendWithSession(
    ctx,
    targetChannelId,
    targetUserId,
    elements,
    isPrivate,
    clientState.selfId
  )

  return {
    message_id: Array.isArray(result) ? result[0] : result
  }
}

export function createMessageHandlers(ctx: Context, config?: { selfId: string }, botFinder?: BotFinder): Record<string, ActionHandler> {

  const finder = botFinder || new BotFinder(ctx)

  return {


    send_msg: async (params: {
      message_type?: 'private' | 'group'
      user_id?: string | number
      group_id?: string | number
      message: string | any[]
      auto_escape?: boolean
    }, clientState: ClientState) => {
      return await sendMessage(ctx, params, clientState)
    },


    send_private_msg: async (params: {
      user_id: string | number
      message: string | any[]
      auto_escape?: boolean
    }, clientState: ClientState) => {
      return await sendMessage(ctx, { ...params, message_type: 'private' }, clientState)
    },


    send_group_msg: async (params: {
      group_id: string | number
      message: string | any[]
      auto_escape?: boolean
    }, clientState: ClientState) => {
      return await sendMessage(ctx, { ...params, message_type: 'group' }, clientState)
    },


    delete_msg: async (params: {
      message_id: string | number
    }, clientState: ClientState) => {
      const bot = await finder.findBot(params, clientState)
      if (!bot) {
        throw new Error('Bot not found')
      }

      try {
        await bot.deleteMessage('', params.message_id.toString())
      } catch (error) {

      }

      return {}
    },


    get_msg: async (params: {
      message_id: string | number
    }, clientState: ClientState) => {
      const bot = await finder.findBot(params, clientState)
      if (!bot) {
        throw new Error('Bot not found')
      }

      try {

        const message = await bot.getMessage('', params.message_id.toString())

        return {
          message_id: message.id,
          real_id: message.id,
          sender: {
            user_id: message.user?.id || '',
            nickname: message.user?.name || message.user?.nick || '',
            card: message.user?.nick || '',
            sex: 'unknown',
            age: 0,
            area: '',
            level: '0',
            role: 'member',
            title: '',
          },
          time: Math.floor(message.timestamp / 1000),
          message: [],
          message_type: message.channel?.type === 1 ? 'private' : 'group',
        }
      } catch (error) {
        throw new Error('Message not found')
      }
    },


    send_group_forward_msg: async (params: {
      group_id: string | number
      messages: any[]
    }, clientState: ClientState) => {


      return await sendMessage(ctx, {
        group_id: params.group_id,
        message: params.messages,
        message_type: 'group'
      }, clientState)
    },


    send_private_forward_msg: async (params: {
      user_id: string | number
      messages: any[]
    }, clientState: ClientState) => {
      return await sendMessage(ctx, {
        user_id: params.user_id,
        message: params.messages,
        message_type: 'private'
      }, clientState)
    },


    mark_msg_as_read: async (params: {
      message_id: string | number
    }, clientState: ClientState) => {

      return {}
    },


    get_forward_msg: async (params: {
      id: string
    }, clientState: ClientState) => {

      return {
        messages: []
      }
    },
  }
}
