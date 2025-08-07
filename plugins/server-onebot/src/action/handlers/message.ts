import { oneBotMessageToElements, decodeStringId } from '../../utils'
import { logInfo, loggerError, loggerInfo } from '../../../src/index'
import { ActionHandler, ClientState } from '../../types'
import { BotFinder } from '../../bot-finder'
import { Context } from 'koishi'

export function createMessageHandlers(ctx: Context, config?: { selfId: string }): Record<string, ActionHandler> {
    const botFinder = new BotFinder(ctx)

    return {

        // 通用发送消息 API
        send_msg: async (params: {
            message_type?: 'private' | 'group'
            user_id?: string | number
            group_id?: string | number
            message: string | any[]
            auto_escape?: boolean
        }, clientState: ClientState) => {
            const bot = await botFinder.findBot(params, clientState)
            if (!bot) {
                throw new Error('Bot not found')
            }

            const elements = oneBotMessageToElements(params.message)

            if (params.group_id) {
                // 发送群消息
                // 解码数字ID为原始字符串ID
                const originalGroupId = decodeStringId(params.group_id)

                // 尝试多种频道 ID 格式发送消息
                let result = await bot.sendMessage(originalGroupId, elements)

                // 检查是否发送成功（非空数组）
                if (!result || (Array.isArray(result) && result.length === 0)) {
                    // 尝试添加 public: 前缀
                    result = await bot.sendMessage(`public:${originalGroupId}`, elements)

                    if (!result || (Array.isArray(result) && result.length === 0)) {
                        // 尝试添加 group: 前缀
                        result = await bot.sendMessage(`group:${originalGroupId}`, elements)

                        if (!result || (Array.isArray(result) && result.length === 0)) {
                            throw new Error('Failed to send message with all channel ID formats')
                        }
                    }
                }

                return {
                    message_id: Array.isArray(result) ? result[0] : result
                }
            } else if (params.user_id) {
                // 发送私聊消息
                try {
                    // 解码数字ID为原始字符串ID
                    const originalUserId = decodeStringId(params.user_id)

                    // 查找对应的私聊channel
                    const privateChannelId = await botFinder.getPrivateChannelId(originalUserId)

                    let result
                    // 尝试多种发送方式
                    try {
                        if (privateChannelId) {
                            result = await bot.sendMessage(privateChannelId, elements)
                        } else {
                            result = await bot.sendPrivateMessage(originalUserId, elements)
                        }
                    } catch (primaryError) {
                        // 尝试其他方法
                        try {
                            result = await bot.sendMessage(`private:${originalUserId}`, elements)
                        } catch (secondaryError) {
                            result = await bot.sendPrivateMessage(originalUserId, elements)
                        }
                    }

                    return {
                        message_id: Array.isArray(result) ? result[0] : result
                    }
                } catch (error) {
                    throw new Error(`Failed to send private message: ${error.message}`)
                }
            } else if (params.message_type === 'private' && params.user_id) {
                // 明确指定私聊类型
                const originalUserId = decodeStringId(params.user_id)
                const result = await bot.sendPrivateMessage(originalUserId, elements)
                return {
                    message_id: Array.isArray(result) ? result[0] : result
                }
            } else if (params.message_type === 'group' && params.group_id) {
                // 明确指定群聊类型
                const originalGroupId = decodeStringId(params.group_id)

                // 尝试多种频道 ID 格式发送消息
                let result = await bot.sendMessage(originalGroupId, elements)

                // 检查是否发送成功（非空数组）
                if (!result || (Array.isArray(result) && result.length === 0)) {
                    // 尝试添加 public: 前缀
                    result = await bot.sendMessage(`public:${originalGroupId}`, elements)

                    if (!result || (Array.isArray(result) && result.length === 0)) {
                        // 尝试添加 group: 前缀
                        result = await bot.sendMessage(`group:${originalGroupId}`, elements)

                        if (!result || (Array.isArray(result) && result.length === 0)) {
                            throw new Error('Failed to send message with all channel ID formats')
                        }
                    }
                }

                return {
                    message_id: Array.isArray(result) ? result[0] : result
                }
            } else {
                throw new Error('Invalid parameters: must specify either user_id or group_id')
            }
        },

        // 发送私聊消息
        send_private_msg: async (params: {
            user_id: string | number
            message: string | any[]
            auto_escape?: boolean
        }, clientState: ClientState) => {
            const bot = await botFinder.findBot(params, clientState)
            if (!bot) {
                throw new Error('Bot not found')
            }

            try {
                const elements = oneBotMessageToElements(params.message)

                // 解码数字ID为原始字符串ID
                const originalUserId = decodeStringId(params.user_id)
                // 查找对应的私聊channel
                const privateChannelId = await botFinder.getPrivateChannelId(originalUserId)
                // 尝试多种发送方式
                let result
                try {
                    if (privateChannelId) {
                        result = await bot.sendMessage(privateChannelId, elements)
                    } else {
                        result = await bot.sendPrivateMessage(originalUserId, elements)
                    }
                } catch (primaryError) {
                    // 尝试其他方法
                    try {
                        result = await bot.sendMessage(`private:${originalUserId}`, elements)
                    } catch (secondaryError) {
                        result = await bot.sendPrivateMessage(originalUserId, elements)
                    }
                }

                return {
                    message_id: Array.isArray(result) ? result[0] : result
                }
            } catch (error) {
                const errorMessage = error.message || 'Unknown error occurred'
                // 如果发送失败，尝试使用 sendPrivateMessage
                try {
                    const elements = oneBotMessageToElements(params.message)
                    const originalUserId = decodeStringId(params.user_id)
                    const result = await bot.sendPrivateMessage(originalUserId, elements)

                    return {
                        message_id: Array.isArray(result) ? result[0] : result
                    }
                } catch (fallbackError) {
                    const fallbackErrorMessage = fallbackError.message || 'Unknown fallback error occurred'
                    loggerError('Fallback private message also failed: %s', fallbackErrorMessage)
                    throw new Error(`Failed to send private message: ${errorMessage}`)
                }
            }
        },

        // 发送群消息
        send_group_msg: async (params: {
            group_id: string | number
            message: string | any[]
            auto_escape?: boolean
        }, clientState: ClientState) => {
            const bot = await botFinder.findBot(params, clientState)
            if (!bot) {
                throw new Error('Bot not found')
            }

            const elements = oneBotMessageToElements(params.message)
            // 解码数字ID为原始字符串ID
            const originalGroupId = decodeStringId(params.group_id)


            // 尝试多种频道 ID 格式发送消息
            let result

            // 首先尝试原始 ID
            result = await bot.sendMessage(originalGroupId, elements)

            // 检查是否发送成功（非空数组）
            if (!result || (Array.isArray(result) && result.length === 0)) {
                // 如果失败，尝试添加 public: 前缀 //（适用于 iirose 等平台）
                const publicChannelId = `public:${originalGroupId}`
                result = await bot.sendMessage(publicChannelId, elements)

                // 如果 public: 前缀也失败，尝试 group: 前缀
                if (!result || (Array.isArray(result) && result.length === 0)) {
                    const groupChannelId = `group:${originalGroupId}`
                    result = await bot.sendMessage(groupChannelId, elements)

                    // 如果所有格式都失败，抛出错误
                    if (!result || (Array.isArray(result) && result.length === 0)) {
                        throw new Error(`Failed to send message with all channel ID formats`)
                    }
                }
            }

            // 尝试不同的方式提取 message_id
            let messageId
            if (Array.isArray(result)) {
                messageId = result[0]
            } else if (result && typeof result === 'object') {
                // 如果返回的是对象，尝试提取 id 或 messageId
                const resultObj = result as any
                messageId = resultObj.id || resultObj.messageId || resultObj.message_id || result
            } else {
                messageId = result
            }

            return {
                message_id: messageId
            }
        },

        // 撤回消息
        delete_msg: async (params: {
            message_id: string | number
        }, clientState: ClientState) => {
            const bot = await botFinder.findBot(params, clientState)
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
            const bot = await botFinder.findBot(params, clientState)
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
            const bot = await botFinder.findBot(params, clientState)
            if (!bot) {
                throw new Error('Bot not found')
            }

            // 这是一个简化实现，实际需要根据 OneBot 协议处理转发消息格式
            const elements = oneBotMessageToElements(params.messages)
            // 解码数字ID为原始字符串ID
            const originalGroupId = decodeStringId(params.group_id)

            // 尝试多种频道 ID 格式发送消息
            let result = await bot.sendMessage(originalGroupId, elements)

            // 检查是否发送成功（非空数组）
            if (!result || (Array.isArray(result) && result.length === 0)) {
                // 尝试添加 public: 前缀
                result = await bot.sendMessage(`public:${originalGroupId}`, elements)

                if (!result || (Array.isArray(result) && result.length === 0)) {
                    // 尝试添加 group: 前缀
                    result = await bot.sendMessage(`group:${originalGroupId}`, elements)

                    if (!result || (Array.isArray(result) && result.length === 0)) {
                        throw new Error('Failed to send message with all channel ID formats')
                    }
                }
            }

            return {
                message_id: Array.isArray(result) ? result[0] : result
            }
        },

        // 发送合并转发消息 (私聊)
        send_private_forward_msg: async (params: {
            user_id: string | number
            messages: any[]
        }, clientState: ClientState) => {
            const bot = await botFinder.findBot(params, clientState)
            if (!bot) {
                throw new Error('Bot not found')
            }

            const elements = oneBotMessageToElements(params.messages)
            // 解码数字ID为原始字符串ID
            const originalUserId = decodeStringId(params.user_id)
            const result = await bot.sendPrivateMessage(originalUserId, elements)

            return {
                message_id: Array.isArray(result) ? result[0] : result
            }
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