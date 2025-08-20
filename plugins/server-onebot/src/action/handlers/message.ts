import { oneBotMessageToElements, decodeStringId, decodeChannelId, sendWithSession } from '../../utils'
import { logInfo, loggerError, loggerInfo } from '../../../src/index'
import { ActionHandler, ClientState } from '../../types'
import { BotFinder } from '../../bot-finder'
import { Context } from 'koishi'

/**
 * 统一的消息发送逻辑
 */
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

    // 确定消息类型和目标
    let isPrivate = false
    let targetChannelId: string
    let targetUserId: string | null = null

    // 优先检查 message_type 参数
    if (params.message_type === 'group') {
        // 明确指定为群消息
        isPrivate = false
        if (params.group_id) {
            targetChannelId = await decodeChannelId(params.group_id, ctx)
        } else {
            throw new Error('group_id is required for group message')
        }
        targetUserId = null
    } else if (params.message_type === 'private') {
        // 明确指定为私聊消息
        isPrivate = true
        if (params.user_id) {
            targetUserId = await decodeStringId(params.user_id, ctx)
            targetChannelId = `private:${targetUserId}`
        } else {
            throw new Error('user_id is required for private message')
        }
    } else if (params.group_id) {
        // 没有指定 message_type，但有 group_id，推断为群消息
        isPrivate = false
        targetChannelId = await decodeChannelId(params.group_id, ctx)
        targetUserId = null
    } else if (params.user_id) {
        // 没有指定 message_type，但有 user_id，推断为私聊消息
        isPrivate = true
        targetUserId = await decodeStringId(params.user_id, ctx)
        targetChannelId = `private:${targetUserId}`
    } else {
        throw new Error('Invalid parameters: must specify message_type or provide user_id/group_id')
    }

    // 使用统一的发送逻辑
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
    // 如果没有传入 botFinder，则创建一个新的（向后兼容）
    const finder = botFinder || new BotFinder(ctx)

    return {

        // 通用发送消息 API
        send_msg: async (params: {
            message_type?: 'private' | 'group'
            user_id?: string | number
            group_id?: string | number
            message: string | any[]
            auto_escape?: boolean
        }, clientState: ClientState) => {
            return await sendMessage(ctx, params, clientState)
        },

        // 发送私聊消息
        send_private_msg: async (params: {
            user_id: string | number
            message: string | any[]
            auto_escape?: boolean
        }, clientState: ClientState) => {
            return await sendMessage(ctx, { ...params, message_type: 'private' }, clientState)
        },

        // 发送群消息
        send_group_msg: async (params: {
            group_id: string | number
            message: string | any[]
            auto_escape?: boolean
        }, clientState: ClientState) => {
            return await sendMessage(ctx, { ...params, message_type: 'group' }, clientState)
        },

        // 撤回消息
        delete_msg: async (params: {
            message_id: string | number
        }, clientState: ClientState) => {
            const bot = await finder.findBot(params, clientState)
            if (!bot) {
                throw new Error('Bot not found')
            }
            // TODO
            try {
                await bot.deleteMessage('', params.message_id.toString())
            } catch (error) {
                // 忽略删除失败的错误
            }

            return {}
        },

        // 获取消息
        get_msg: async (params: {
            message_id: string | number
        }, clientState: ClientState) => {
            const bot = await finder.findBot(params, clientState)
            if (!bot) {
                throw new Error('Bot not found')
            }

            try {
                // TODO
                const message = await bot.getMessage('', params.message_id.toString())

                return {
                    message_id: message.id,
                    real_id: message.id,
                    sender: {
                        user_id: message.user?.id || '',
                        nickname: message.user?.name || '',
                    },
                    time: Math.floor(message.timestamp / 1000),
                    message: [],  // TODO // 这里需要将 message.elements 转换为 OneBot 格式
                    message_type: message.channel?.type === 1 ? 'private' : 'group',
                }
            } catch (error) {
                throw new Error('Message not found')
            }
        },

        // 发送合并转发消息 (群)
        send_group_forward_msg: async (params: {
            group_id: string | number
            messages: any[]
        }, clientState: ClientState) => {
            // 这是一个简化实现，实际需要根据 OneBot 协议处理转发消息格式
            // TODO
            return await sendMessage(ctx, {
                group_id: params.group_id,
                message: params.messages,
                message_type: 'group'
            }, clientState)
        },

        // 发送合并转发消息 (私聊)
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

        // 标记消息已读
        mark_msg_as_read: async (params: {
            message_id: string | number
        }, clientState: ClientState) => {
            // 成功
            return {}
        },

        // 获取合并转发消息
        get_forward_msg: async (params: {
            id: string
        }, clientState: ClientState) => {
            //  // TODO 暂时返回空数组
            return {
                messages: []
            }
        },
    }
}