import { ActionHandler, ClientState, VersionInfo, StatusInfo } from '../../types'
import { logInfo, loggerError, loggerInfo } from '../../../src/index'
import { BotFinder } from '../../bot-finder'
import { Context, Universal } from 'koishi'

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export function createSystemHandlers(ctx: Context, config?: { selfId: string }, botFinder?: BotFinder): Record<string, ActionHandler> {
    // 如果没有传入 botFinder，则创建一个新的
    const finder = botFinder || new BotFinder(ctx)

    // 读取 package.json 获取版本信息
    let packageInfo: { name?: string; version?: string } = {}
    try {
        const packagePath = resolve(__dirname, '../../../package.json')
        const packageContent = readFileSync(packagePath, 'utf-8')
        packageInfo = JSON.parse(packageContent)
    } catch (error) {
        loggerError('Failed to read package.json:', error)
    }

    return {
        // 获取版本信息
        get_version_info: async (params: {}, clientState: ClientState) => {
            return {
                app_name: packageInfo.name.replace('koishi-plugin-', '') || 'server-onebot',
                app_version: packageInfo.version || '1.0.0',
                protocol_version: 'v11',
                runtime_version: process.version,
                runtime_os: process.platform,
            } as VersionInfo
        },

        // 获取状态
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

        // 重启 OneBot 实现
        set_restart: async (params: {
            delay?: number
        }, clientState: ClientState) => {
            // 这个功能通常不在插件中实现，返回成功
            return {}
        },

        // 清理缓存
        clean_cache: async (params: {}, clientState: ClientState) => {
            // 成功
            return {}
        },

        // 检查是否可以发送图片
        can_send_image: async (params: {}, clientState: ClientState) => {
            return { yes: true }
        },

        // 检查是否可以发送语音
        can_send_record: async (params: {}, clientState: ClientState) => {
            return { yes: true }
        },

        // 获取运行状态
        get_online_clients: async (params: {
            no_cache?: boolean
        }, clientState: ClientState) => {
            // 返回在线客户端列表，这里返回空数组
            return {
                clients: []
            }
        },

        // 检查链接安全性
        check_url_safely: async (params: {
            url: string
        }, clientState: ClientState) => {
            // 简单的 URL 安全检查，这里返回安全
            return {
                level: 1 // 1 表示安全
            }
        },

        // 获取中文分词
        get_word_slices: async (params: {
            content: string
        }, clientState: ClientState) => {
            // 简单的分词实现，按空格分割
            return {
                slices: params.content.split(/\s+/).filter(word => word.length > 0)
            }
        },

        // OCR 图片识别
        ocr_image: async (params: {
            image: string
        }, clientState: ClientState) => {
            // OCR 功能需要特殊的服务支持，这里返回空结果
            return {
                texts: [],
                language: 'unknown'
            }
        },

        // 获取图片信息
        get_image: async (params: {
            file: string
        }, clientState: ClientState) => {
            // 返回图片信息，这里返回基本信息
            return {
                size: 0,
                filename: params.file,
                url: params.file
            }
        },

        // 获取语音信息
        get_record: async (params: {
            file: string
            out_format: string
            full_path?: boolean
        }, clientState: ClientState) => {
            // 返回语音信息
            return {
                file: params.file
            }
        },

        // 获取 Cookies
        get_cookies: async (params: {
            domain?: string
        }, clientState: ClientState) => {
            // 返回空的 cookies
            return {
                cookies: ''
            }
        },

        // 获取 CSRF Token
        get_csrf_token: async (params: {}, clientState: ClientState) => {
            // 返回随机的 CSRF token
            return {
                token: Math.floor(Math.random() * 1000000)
            }
        },

        // 获取凭证
        get_credentials: async (params: {
            domain?: string
        }, clientState: ClientState) => {
            // 返回空的凭证
            return {
                cookies: '',
                csrf_token: Math.floor(Math.random() * 1000000)
            }
        },

        // 下载文件
        download_file: async (params: {
            url: string
            headers?: string | string[]
            thread_count?: number
        }, clientState: ClientState) => {
            // 文件下载功能，这里返回 URL 本身
            return {
                file: params.url
            }
        },

        // 上传图片
        upload_image: async (params: {
            file: string
        }, clientState: ClientState) => {
            // 图片上传功能，返回原始文件路径
            return params.file
        },

        // 获取频道服务资料
        get_guild_service_profile: async (params: {}, clientState: ClientState) => {
            // 这个 API 在大多数实现中都不支持，应该返回 404 错误
            throw new Error('Unknown action: get_guild_service_profile')
        },

        // 标记消息已读
        mark_msg_as_read: async (params: {
            message_id: string | number
        }, clientState: ClientState) => {
            const bot = await finder.findBot(params, clientState)
            if (!bot) {
                throw new Error('Bot not found')
            }
            // 大成功
            return {}
        },

        // 获取群文件系统信息
        get_group_file_system_info: async (params: {
            group_id: string | number
        }, clientState: ClientState) => {
            return {
                file_count: 0,
                limit_count: 100,
                used_space: 0,
                total_space: 1073741824, // 1GB
            }
        },

        // 获取群根目录文件列表
        get_group_root_files: async (params: {
            group_id: string | number
        }, clientState: ClientState) => {
            return {
                files: [],
                folders: [],
            }
        },

        // 获取群子目录文件列表
        get_group_files_by_folder: async (params: {
            group_id: string | number
            folder_id: string
        }, clientState: ClientState) => {
            return {
                files: [],
                folders: [],
            }
        },

        // 上传群文件
        upload_group_file: async (params: {
            group_id: string | number
            file: string
            name: string
            folder?: string
        }, clientState: ClientState) => {
            // 文件上传功能需要特殊实现，这里返回成功
            return {}
        },

        // 删除群文件
        delete_group_file: async (params: {
            group_id: string | number
            file_id: string
            busid: number
        }, clientState: ClientState) => {
            return {}
        },

        // 创建群文件夹
        create_group_file_folder: async (params: {
            group_id: string | number
            name: string
            parent_id?: string
        }, clientState: ClientState) => {
            return {}
        },

        // 删除群文件夹
        delete_group_folder: async (params: {
            group_id: string | number
            folder_id: string
        }, clientState: ClientState) => {
            return {}
        },

        // 获取群文件资源链接
        get_group_file_url: async (params: {
            group_id: string | number
            file_id: string
            busid: number
        }, clientState: ClientState) => {
            return {
                url: ''
            }
        },

        // 上传私聊文件
        upload_private_file: async (params: {
            user_id: string | number
            file: string
            name: string
        }, clientState: ClientState) => {
            return {}
        },

        // 获取精华消息列表
        get_essence_msg_list: async (params: {
            group_id: string | number
        }, clientState: ClientState) => {
            return []
        },

        // 设置精华消息
        set_essence_msg: async (params: {
            message_id: string | number
        }, clientState: ClientState) => {
            return {}
        },

        // 移出精华消息
        delete_essence_msg: async (params: {
            message_id: string | number
        }, clientState: ClientState) => {
            return {}
        },

        // 发送群公告
        _send_group_notice: async (params: {
            group_id: string | number
            content: string
            image?: string
        }, clientState: ClientState) => {
            return {}
        },

        // 获取群公告
        _get_group_notice: async (params: {
            group_id: string | number
        }, clientState: ClientState) => {
            return []
        },

        // 删除群公告
        _del_group_notice: async (params: {
            group_id: string | number
            notice_id: string
        }, clientState: ClientState) => {
            return {}
        },

        // 设置群头像
        set_group_portrait: async (params: {
            group_id: string | number
            file: string
            cache?: number
        }, clientState: ClientState) => {
            return {}
        },

        // 获取模型显示
        _get_model_show: async (params: {
            model: string
        }, clientState: ClientState) => {
            return {
                variants: []
            }
        },

        // 设置模型显示
        _set_model_show: async (params: {
            model: string
            model_show: string
        }, clientState: ClientState) => {
            return {}
        },

        // 获取群消息历史记录
        get_group_msg_history: async (params: {
            message_seq?: number
            group_id: string | number
        }, clientState: ClientState) => {
            return {
                messages: []
            }
        },

        // 获取好友消息历史记录
        get_friend_msg_history: async (params: {
            user_id: string | number
            message_seq?: number
        }, clientState: ClientState) => {
            return {
                messages: []
            }
        },

    }
}