import { Context } from 'koishi'
import { ActionHandler, ClientState, GroupInfo, UserInfo } from '../../types'
import { BotFinder } from '../../bot-finder'
import { loggerError } from '../../../src/index'
import { encodeStringId } from '../../utils'

export function createGroupHandlers(ctx: Context, config?: { selfId: string }): Record<string, ActionHandler> {
    const botFinder = new BotFinder(ctx)

    // 群组信息获取
    const getGroupInfoLogic = async (groupId: string | number, params: any, clientState: ClientState) => {
        try {
            const bot = await botFinder.findBot(params, clientState)
            if (!bot) {
                throw new Error('Bot not found')
            }

            // 检查 bot 是否有 getGuild 方法
            if (typeof bot.getGuild === 'function') {
                const guild = await bot.getGuild(groupId.toString())
                return {
                    id: encodeStringId(guild.id),
                    name: guild.name || guild.id,
                    member_count: (guild as any).memberCount || 0,
                    max_member_count: (guild as any).maxMemberCount || 0,
                }
            } else {
                // 如果没有 getGuild 方法，返回基本信息
                loggerError('Bot %s (platform: %s) does not have getGuild method', bot.selfId, bot.platform)
                return {
                    id: encodeStringId(groupId.toString()),
                    name: `群组${groupId}`,
                    member_count: 0,
                    max_member_count: 0,
                }
            }
        } catch (error) {
            loggerError('Failed to get group/guild info for %s: %s', groupId, error.message)

            // 如果无法获取群信息，返回基本信息而不是抛出错误
            return {
                id: encodeStringId(groupId.toString()),
                name: `群组${groupId}`,
                member_count: 0,
                max_member_count: 0,
            }
        }
    }

    // 群组列表获取
    const getGroupListLogic = async (params: { no_cache?: boolean }, clientState: ClientState) => {
        try {
            // 首先尝试通过 bot 获取群组列表
            const bot = await botFinder.findBot(params, clientState)
            if (bot && typeof bot.getGuildList === 'function') {
                try {
                    const guilds = await bot.getGuildList()
                    return (guilds.data || []).map(guild => ({
                        id: encodeStringId(guild.id),
                        name: guild.name || guild.id,
                        member_count: (guild as any).memberCount || 0,
                        max_member_count: (guild as any).maxMemberCount || 0,
                    }))
                } catch (error) {
                    // 如果通过 bot 获取失败，继续尝试数据库方式
                    loggerError('Failed to get guild list from bot: %s', error.message)
                }
            }

            // 检查数据库是否可用
            if (!ctx.database || typeof ctx.database.get !== 'function') {
                return []
            }

            // 查询 channel 表获取所有群组/频道信息
            const channels = await ctx.database.get('channel', {})

            // 去重 guildId，因为一个群可能有多个频道
            const uniqueGuildIds = new Set<string>()
            const guilds: Array<{ id: string | number, name: string, member_count?: number, max_member_count?: number }> = []

            for (const channel of channels) {
                const guildId = channel.guildId || channel.id

                // 跳过已处理的 guildId
                if (uniqueGuildIds.has(guildId)) {
                    continue
                }
                uniqueGuildIds.add(guildId)

                const encodedId = encodeStringId(guildId)

                // 尝试通过 bot 获取群组名称
                let guildName = guildId // 默认使用 ID 作为名称

                try {
                    // 尝试找到对应的 bot
                    const bot = await botFinder.findBotByChannelId(guildId)
                    if (bot && typeof bot.getGuild === 'function') {
                        const guildInfo = await bot.getGuild(guildId)
                        guildName = guildInfo.name || guildId
                    }
                } catch (error) {
                    // 忽略错误，使用默认名称
                }

                guilds.push({
                    id: encodedId,
                    name: guildName,
                    member_count: 0,
                    max_member_count: 0,
                })
            }
            return guilds
        } catch (error) {
            loggerError('Failed to get group/guild list: %s', error.message)
            return []
        }
    }

    return {
        // 获取群信息
        get_group_info: async (params: {
            group_id: string | number
            no_cache?: boolean
        }, clientState: ClientState) => {
            const groupInfo = await getGroupInfoLogic(params.group_id, params, clientState)
            return {
                group_id: groupInfo.id,
                group_name: groupInfo.name,
                member_count: groupInfo.member_count,
                max_member_count: groupInfo.max_member_count,
            } as GroupInfo
        },

        // 获取群列表
        get_group_list: async (params: {
            no_cache?: boolean
        }, clientState: ClientState) => {
            const groups = await getGroupListLogic(params, clientState)
            return groups.map(group => ({
                group_id: group.id,
                group_name: group.name,
                member_count: group.member_count || 0,
                max_member_count: group.max_member_count || 0,
            } as GroupInfo))
        },

        // 获取频道信息 // get_group_info  这三个不一样吗
        get_guild_info: async (params: {
            guild_id: string | number
            no_cache?: boolean
        }, clientState: ClientState) => {
            const groupInfo = await getGroupInfoLogic(params.guild_id, params, clientState)
            return {
                guild_id: groupInfo.id,
                guild_name: groupInfo.name,
            }
        },

        // get_group_list 
        get_guild_channel_list: async (params: {
            no_cache?: boolean
        }, clientState: ClientState) => {
            const groups = await getGroupListLogic(params, clientState)
            return groups.map(group => ({
                guild_id: group.id,
                guild_name: group.name,
            }))
        },

        // 获取频道列表 // get_group_list 
        get_guild_list: async (params: {
            no_cache?: boolean
        }, clientState: ClientState) => {
            const groups = await getGroupListLogic(params, clientState)
            return groups.map(group => ({
                guild_id: group.id,
                guild_name: group.name,
            }))
        },

        // 获取群成员信息
        get_group_member_info: async (params: {
            group_id: string | number
            user_id: string | number
            no_cache?: boolean
        }, clientState: ClientState) => {
            const bot = await botFinder.findBot(params, clientState)
            if (!bot) {
                throw new Error('Bot not found')
            }

            try {
                const member = await bot.getGuildMember(params.group_id.toString(), params.user_id.toString())
                return {
                    user_id: parseInt(member.user?.id) || member.user?.id,
                    nickname: member.user?.name || '',
                    card: member.nick || '',
                    sex: 'unknown',
                    age: 0,
                    area: '',
                    level: '0',
                    role: member.roles?.includes('admin') ? 'admin' :
                        member.roles?.includes('owner') ? 'owner' : 'member',
                    title: '',
                    join_time: 0,
                    last_sent_time: 0,
                    unfriendly: false,
                    card_changeable: true,
                    shut_up_timestamp: 0,
                } as UserInfo
            } catch (error) {
                // loggerError('Failed to get member info for %s in %s: %s', params.user_id, params.group_id, error.message)

                // 返回基本的成员信息
                return {
                    user_id: parseInt(params.user_id.toString()) || params.user_id,
                    nickname: `用户${params.user_id}`,
                    card: '',
                    sex: 'unknown',
                    age: 0,
                    area: '',
                    level: '0',
                    role: 'member',
                    title: '',
                    join_time: 0,
                    last_sent_time: 0,
                    unfriendly: false,
                    card_changeable: true,
                    shut_up_timestamp: 0,
                } as UserInfo
            }
        },

        // 获取群成员列表
        get_group_member_list: async (params: {
            group_id: string | number
            no_cache?: boolean
        }, clientState: ClientState) => {
            const bot = await botFinder.findBot(params, clientState)
            if (!bot) {
                throw new Error('Bot not found')
            }

            try {
                const members = await bot.getGuildMemberList(params.group_id.toString())
                return (members.data || []).map(member => ({
                    user_id: parseInt(member.user?.id) || member.user?.id,
                    nickname: member.user?.name || '',
                    card: member.nick || '',
                    sex: 'unknown',
                    age: 0,
                    area: '',
                    level: '0',
                    role: member.roles?.includes('admin') ? 'admin' :
                        member.roles?.includes('owner') ? 'owner' : 'member',
                    title: '',
                    join_time: 0,
                    last_sent_time: 0,
                    unfriendly: false,
                    card_changeable: true,
                    shut_up_timestamp: 0,
                } as UserInfo))
            } catch (error) {
                // loggerError('Failed to get member list for %s: %s', params.group_id, error.message)
                return []
            }
        },

        // 群组踢人
        set_group_kick: async (params: {
            group_id: string | number
            user_id: string | number
            reject_add_request?: boolean
        }, clientState: ClientState) => {
            const bot = await botFinder.findBot(params, clientState)
            if (!bot) {
                throw new Error('Bot not found')
            }

            try {
                await bot.kickGuildMember(params.group_id.toString(), params.user_id.toString())
                return {}
            } catch (error) {
                throw new Error('Failed to kick member')
            }
        },

        // 群组单人禁言
        set_group_ban: async (params: {
            group_id: string | number
            user_id: string | number
            duration?: number
        }, clientState: ClientState) => {
            const bot = await botFinder.findBot(params, clientState)
            if (!bot) {
                throw new Error('Bot not found')
            }

            try {
                await bot.muteGuildMember(params.group_id.toString(), params.user_id.toString(), params.duration || 0)
                return {}
            } catch (error) {
                throw new Error('Failed to mute member')
            }
        },

        // 群组全员禁言
        set_group_whole_ban: async (params: {
            group_id: string | number
            enable?: boolean
        }, clientState: ClientState) => {
            const bot = await botFinder.findBot(params, clientState)
            if (!bot) {
                throw new Error('Bot not found')
            }
            // TODO
            // 这个功能需要特殊的 API 支持，暂时返回成功
            return {}
        },

        // 群组设置管理员
        set_group_admin: async (params: {
            group_id: string | number
            user_id: string | number
            enable?: boolean
        }, clientState: ClientState) => {
            const bot = await botFinder.findBot(params, clientState)
            if (!bot) {
                throw new Error('Bot not found')
            }
            // TODO
            // 这个功能需要特殊的 API 支持，暂时返回成功
            return {}
        },

        // 设置群名片
        set_group_card: async (params: {
            group_id: string | number
            user_id: string | number
            card?: string
        }, clientState: ClientState) => {
            const bot = await botFinder.findBot(params, clientState)
            if (!bot) {
                throw new Error('Bot not found')
            }
            // TODO
            // 这个功能需要特殊的 API 支持，暂时返回成功
            return {}
        },

        // 退出群组
        set_group_leave: async (params: {
            group_id: string | number
            is_dismiss?: boolean
        }, clientState: ClientState) => {
            const bot = await botFinder.findBot(params, clientState)
            if (!bot) {
                throw new Error('Bot not found')
            }

            try { // TODO
                await (bot as any).leaveGuild(params.group_id.toString())
                return {}
            } catch (error) {
                throw new Error('Failed to leave group')
            }
        },

        // 设置群组专属头衔
        set_group_special_title: async (params: {
            group_id: string | number
            user_id: string | number
            special_title?: string
            duration?: number
        }, clientState: ClientState) => {
            const bot = await botFinder.findBot(params, clientState)
            if (!bot) {
                throw new Error('Bot not found')
            }
            // TODO
            // 这个功能需要特殊的 API 支持，暂时返回成功
            return {}
        },

        // 处理加群请求
        set_group_add_request: async (params: {
            flag: string
            sub_type: 'add' | 'invite'
            approve: boolean
            reason?: string
        }, clientState: ClientState) => {
            const bot = await botFinder.findBot(params, clientState)
            if (!bot) {
                throw new Error('Bot not found')
            }
            // TODO
            // 这需要根据具体的 bot 实现来处理群请求
            return {}
        },

        // 获取群荣誉信息
        get_group_honor_info: async (params: {
            group_id: string | number
            type: string
        }, clientState: ClientState) => {
            const bot = await botFinder.findBot(params, clientState)
            if (!bot) {
                throw new Error('Bot not found')
            }
            // TODO
            // 这个功能需要特殊的 API 支持，返回空数据
            return {
                group_id: params.group_id,
                current_talkative: null,
                talkative_list: [],
                performer_list: [],
                legend_list: [],
                strong_newbie_list: [],
                emotion_list: [],
            }
        },

        // 获取群系统消息
        get_group_system_msg: async (params: {}, clientState: ClientState) => {
            const bot = await botFinder.findBot(params, clientState)
            if (!bot) {
                throw new Error('Bot not found')
            }
            // TODO
            // 返回空的系统消息列表
            return {
                invited_requests: [],
                join_requests: [],
            }
        },

        // 获取群 @全体成员 剩余次数
        get_group_at_all_remain: async (params: {
            group_id: string | number
        }, clientState: ClientState) => {
            const bot = await botFinder.findBot(params, clientState)
            if (!bot) {
                throw new Error('Bot not found')
            }
            // 返回默认值
            return {
                can_at_all: true,
                remain_at_all_count_for_group: 10,
                remain_at_all_count_for_uin: 5,
            }
        },
    }
}