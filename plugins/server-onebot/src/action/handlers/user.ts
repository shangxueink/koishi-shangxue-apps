import { ActionHandler, ClientState, UserInfo, FriendInfo } from '../../types'
import { logInfo, loggerError, loggerInfo } from '../../../src/index'
import { BotFinder } from '../../bot-finder'
import { Context, Universal } from 'koishi'

export function createUserHandlers(ctx: Context, config?: { selfId: string, selfname?: string, appName?: string }, botFinder?: BotFinder): Record<string, ActionHandler> {

  const finder = botFinder || new BotFinder(ctx)
  const defaultUserId = config?.selfId || parseInt(config.selfId)
  const defaultNickname = config?.selfname

  return {

    get_login_info: async (params: {}, clientState: ClientState) => {
      const bot = clientState?.selfId
        ? ctx.bots.find(item => item.selfId === clientState.selfId)
        : undefined
      const userId = bot?.selfId || config?.selfId || defaultUserId
      const nickname = bot?.user?.name || defaultNickname || 'Bot of Koishi'

      return {
        user_id: parseInt(String(userId), 10) || userId,
        nickname,
      }
    },



    get_stranger_info: async (params: {
      user_id: string | number
      no_cache?: boolean
    }, clientState: ClientState) => {
      const bot = await finder.findBot(params, clientState)
      if (!bot) {
        throw new Error('Bot not found')
      }

      try {
        const user = await bot.getUser(params.user_id.toString())
        return {
          user_id: parseInt(user.id) || user.id,
          nickname: user.name || user.nick || '',
          sex: 'unknown',
          age: 0,
        } as UserInfo
      } catch (error) {
        throw new Error('User not found')
      }
    },


    get_friend_list: async (params: {}, clientState: ClientState) => {
      const bot = await finder.findBot(params, clientState)
      if (!bot) {
        throw new Error('Bot not found')
      }

      try {
        const friends = await bot.getFriendList()
        return (friends.data || []).map(friend => {
          const friendId = 'id' in friend ? friend.id : ('userId' in friend ? friend.userId : '')
          const friendName = 'name' in friend ? friend.name : ''
          const friendNick = 'nick' in friend ? friend.nick : ''
          return {
            user_id: parseInt(String(friendId)) || friendId,
            nickname: friendName || friendNick || '',
            remark: friendName || friendNick || '',
          } as FriendInfo
        })
      } catch (error) {
        return []
      }
    },


    delete_friend: async (params: {
      user_id: string | number
    }, clientState: ClientState) => {
      const bot = await finder.findBot(params, clientState)
      if (!bot) {
        throw new Error('Bot not found')
      }

      return {}
    },


    set_friend_add_request: async (params: {
      flag: string
      approve: boolean
      remark?: string
    }, clientState: ClientState) => {
      const bot = await finder.findBot(params, clientState)
      if (!bot) {
        throw new Error('Bot not found')
      }

      return {}
    },


    send_like: async (params: {
      user_id: string | number
      times?: number
    }, clientState: ClientState) => {
      const bot = await finder.findBot(params, clientState)
      if (!bot) {
        throw new Error('Bot not found')
      }

      return {}
    },


    get_unidirectional_friend_list: async (params: {}, clientState: ClientState) => {
      const bot = await finder.findBot(params, clientState)
      if (!bot) {
        throw new Error('Bot not found')
      }

      return []
    },


    delete_unidirectional_friend: async (params: {
      user_id: string | number
    }, clientState: ClientState) => {
      const bot = await finder.findBot(params, clientState)
      if (!bot) {
        throw new Error('Bot not found')
      }

      return {}
    },
  }
}
