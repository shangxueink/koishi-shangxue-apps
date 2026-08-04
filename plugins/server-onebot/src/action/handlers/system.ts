import { ActionHandler, ClientState, VersionInfo, StatusInfo } from '../../types'
import { logInfo, loggerError, loggerInfo } from '../../../src/index'
import { BotFinder } from '../../bot-finder'
import { Context, Universal } from 'koishi'

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getRecentSessions, sessionToOneBotEvent, encodeChannelId, encodeStringId } from '../../utils'

export function createSystemHandlers(ctx: Context, config?: { selfId: string, appName?: string, groupname?: string }, botFinder?: BotFinder): Record<string, ActionHandler> {

  const finder = botFinder || new BotFinder(ctx)


  let packageInfo: { name?: string; version?: string } = {}
  try {
    const packagePath = resolve(__dirname, '../../../package.json')
    const packageContent = readFileSync(packagePath, 'utf-8')
    packageInfo = JSON.parse(packageContent)
  } catch (error) {
    loggerError('Failed to read package.json:', error)
  }

  return {

    get_version_info: async (params: {}, clientState: ClientState) => {
      return {
        app_name: config?.appName || packageInfo.name.replace('koishi-plugin-', '') || 'server-onebot',
        app_version: packageInfo.version || '1.0.0',
        protocol_version: 'v11',
        runtime_version: process.version,
        runtime_os: process.platform,
      } as VersionInfo
    },


    get_status: async (params: {}, clientState: ClientState) => {
      const bot = await finder.findBot(params, clientState)

      return {
        online: bot ? bot.status === Universal.Status.ONLINE : false,
        good: bot ? bot.status === Universal.Status.ONLINE : false,
        stat: {
          packet_received: 0,
          packet_sent: 0,
          packet_lost: 0,
          message_received: 0,
          message_sent: 0,
          disconnect_times: 0,
          lost_times: 0,
        }
      } as StatusInfo
    },


    set_restart: async (params: {
      delay?: number
    }, clientState: ClientState) => {

      return {}
    },


    clean_cache: async (params: {}, clientState: ClientState) => {

      return {}
    },


    can_send_image: async (params: {}, clientState: ClientState) => {
      return { yes: true }
    },


    can_send_record: async (params: {}, clientState: ClientState) => {
      return { yes: true }
    },


    get_online_clients: async (params: {
      no_cache?: boolean
    }, clientState: ClientState) => {

      return {
        clients: []
      }
    },


    check_url_safely: async (params: {
      url: string
    }, clientState: ClientState) => {

      return {
        level: 1
      }
    },


    get_word_slices: async (params: {
      content: string
    }, clientState: ClientState) => {

      return {
        slices: params.content.split(/\s+/).filter(word => word.length > 0)
      }
    },


    ocr_image: async (params: {
      image: string
    }, clientState: ClientState) => {

      return {
        texts: [],
        language: 'unknown'
      }
    },


    get_image: async (params: {
      file: string
    }, clientState: ClientState) => {

      return {
        size: 0,
        filename: params.file,
        url: params.file
      }
    },


    get_record: async (params: {
      file: string
      out_format: string
      full_path?: boolean
    }, clientState: ClientState) => {

      return {
        file: params.file
      }
    },


    get_cookies: async (params: {
      domain?: string
    }, clientState: ClientState) => {

      return {
        cookies: ''
      }
    },


    get_csrf_token: async (params: {}, clientState: ClientState) => {

      return {
        token: Math.floor(Math.random() * 1000000)
      }
    },


    get_credentials: async (params: {
      domain?: string
    }, clientState: ClientState) => {

      return {
        cookies: '',
        csrf_token: Math.floor(Math.random() * 1000000)
      }
    },


    download_file: async (params: {
      url: string
      headers?: string | string[]
      thread_count?: number
    }, clientState: ClientState) => {

      return {
        file: params.url
      }
    },


    upload_image: async (params: {
      file: string
    }, clientState: ClientState) => {

      return params.file
    },


    get_guild_service_profile: async (params: {}, clientState: ClientState) => {

      throw new Error('Unknown action: get_guild_service_profile')
    },


    mark_msg_as_read: async (params: {
      message_id: string | number
    }, clientState: ClientState) => {
      const bot = await finder.findBot(params, clientState)
      if (!bot) {
        throw new Error('Bot not found')
      }

      return {}
    },


    get_group_file_system_info: async (params: {
      group_id: string | number
    }, clientState: ClientState) => {
      return {
        file_count: 0,
        limit_count: 100,
        used_space: 0,
        total_space: 1073741824,
      }
    },


    get_group_root_files: async (params: {
      group_id: string | number
    }, clientState: ClientState) => {
      return {
        files: [],
        folders: [],
      }
    },


    get_group_files_by_folder: async (params: {
      group_id: string | number
      folder_id: string
    }, clientState: ClientState) => {
      return {
        files: [],
        folders: [],
      }
    },


    upload_group_file: async (params: {
      group_id: string | number
      file: string
      name: string
      folder?: string
    }, clientState: ClientState) => {

      return {}
    },


    delete_group_file: async (params: {
      group_id: string | number
      file_id: string
      busid: number
    }, clientState: ClientState) => {
      return {}
    },


    create_group_file_folder: async (params: {
      group_id: string | number
      name: string
      parent_id?: string
    }, clientState: ClientState) => {
      return {}
    },


    delete_group_folder: async (params: {
      group_id: string | number
      folder_id: string
    }, clientState: ClientState) => {
      return {}
    },


    get_group_file_url: async (params: {
      group_id: string | number
      file_id: string
      busid: number
    }, clientState: ClientState) => {
      return {
        url: ''
      }
    },


    upload_private_file: async (params: {
      user_id: string | number
      file: string
      name: string
    }, clientState: ClientState) => {
      return {}
    },


    get_essence_msg_list: async (params: {
      group_id: string | number
    }, clientState: ClientState) => {
      return []
    },


    set_essence_msg: async (params: {
      message_id: string | number
    }, clientState: ClientState) => {
      return {}
    },


    delete_essence_msg: async (params: {
      message_id: string | number
    }, clientState: ClientState) => {
      return {}
    },


    _send_group_notice: async (params: {
      group_id: string | number
      content: string
      image?: string
    }, clientState: ClientState) => {
      return {}
    },


    _get_group_notice: async (params: {
      group_id: string | number
    }, clientState: ClientState) => {
      return []
    },


    _del_group_notice: async (params: {
      group_id: string | number
      notice_id: string
    }, clientState: ClientState) => {
      return {}
    },


    set_group_portrait: async (params: {
      group_id: string | number
      file: string
      cache?: number
    }, clientState: ClientState) => {
      return {}
    },


    _get_model_show: async (params: {
      model: string
    }, clientState: ClientState) => {
      return {
        variants: []
      }
    },


    _set_model_show: async (params: {
      model: string
      model_show: string
    }, clientState: ClientState) => {
      return {}
    },


    get_group_msg_history: async (params: {
      message_seq?: number
      group_id: string | number
    }, clientState: ClientState) => {
      const recentSessions = getRecentSessions()
      const messages = []


      let targetEncodedGroupId = null
      try {

        if (typeof params.group_id === 'number') {
          targetEncodedGroupId = params.group_id
        } else {

          targetEncodedGroupId = await encodeChannelId(params.group_id.toString(), ctx)
        }
      } catch (error) {
        loggerError('Error encoding group_id:', error)
      }


      for (const sessionData of recentSessions) {
        const session = sessionData.session

        if (!session.isDirect && (session.guildId || session.channelId)) {
          const groupId = session.guildId || session.channelId
          try {

            const encodedGroupId = await encodeChannelId(groupId, ctx)


            if (encodedGroupId && targetEncodedGroupId && encodedGroupId === targetEncodedGroupId) {
              const oneBotEvent = await sessionToOneBotEvent(session, ctx, config?.selfId)
              if (oneBotEvent) {

                if (oneBotEvent.message_type === 'group') {

                  if (!oneBotEvent.group_name && config?.groupname) {
                    oneBotEvent.group_name = config.groupname
                  }
                  messages.push(oneBotEvent)
                }
              }
            }
          } catch (error) {
            loggerError('Error processing group session:', error)
          }
        }
      }


      messages.sort((a, b) => b.time - a.time)

      return {
        messages
      }
    },


    get_friend_msg_history: async (params: {
      user_id: string | number
      message_seq?: number
    }, clientState: ClientState) => {
      const recentSessions = getRecentSessions()
      const messages = []


      let targetEncodedUserId = null
      try {

        if (typeof params.user_id === 'number') {
          targetEncodedUserId = params.user_id
        } else {

          targetEncodedUserId = await encodeStringId(params.user_id.toString(), ctx)
        }
      } catch (error) {
        loggerError('Error encoding user_id:', error)
      }


      for (const sessionData of recentSessions) {
        const session = sessionData.session

        if (session.isDirect && session.userId) {
          try {

            const encodedUserId = await encodeStringId(session.userId, ctx)


            if (encodedUserId && targetEncodedUserId && encodedUserId === targetEncodedUserId) {
              const oneBotEvent = await sessionToOneBotEvent(session, ctx, config?.selfId)
              if (oneBotEvent) {

                if (oneBotEvent.message_type === 'private') {
                  messages.push(oneBotEvent)
                }
              }
            }
          } catch (error) {
            loggerError('Error processing private session:', error)
          }
        }
      }


      messages.sort((a, b) => b.time - a.time)

      return {
        messages
      }
    },

  }
}
