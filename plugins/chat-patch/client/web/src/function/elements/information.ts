import { PinYinData } from '../utils/pinyin'

export enum BotMsgType {
    CQCode,
    Array
}

export interface ChatInfoElem {
    show: BaseChatInfoElem
    info: {
        group_info: { [key: string]: any }
        user_info: { [key: string]: any }
        me_info: { [key: string]: any }
        group_members: GroupMemberInfoElem[]
        group_files: { [key: string]: any }
        group_sub_files: { [key: string]: any }
        group_notices?: { [key: string]: any }
        now_member_info?: { [key: string]: any }
        image_list?: { index: number; message_id: string; img_url: string }[]
        jin_info: {
            list: { [key: string]: any }[]
            is_end?: boolean
            pages: number
        }
    }
}

export interface BaseChatInfoElem {
    type: string
    id: number | string
    name: string
    avatar: string
    appendInfo?: string
    jump?: string
    channel_id?: string
    guild_id?: string
}

export interface UserElem {
    new_msg?: boolean
    raw_msg?: string
    time?: number
    always_top?: boolean
    message_id?: string
    highlight?: string
}

export interface UserFriendElem extends UserElem {
    group_id: number | string
    group_name: string
    avatar?: string
    channel_id?: string
    channelId?: string
    guild_id?: string
    guildId?: string
    py_name?: PinYinData
    py_start?: string
    member_count?: number
    admin_flag?: boolean
}

export interface UserGroupElem extends UserElem {
    user_id: number | string
    nickname: string
    remark: string
    channel_id?: string
    channelId?: string
    guild_id?: string
    guildId?: string
    raw_msg_base?: string       // 给群收纳箱用的
    py_name?: PinYinData
    py_start?: string
    class_id?: number
    class_name?: string
}

export interface GroupFileElem {
    file_id: string
    file_name: string
    size: number
    download_times: number
    dead_time: number
    upload_time: number
    uploader_name: string

    download_percent?: number
}

export interface GroupFileFolderElem {
    folder_id: string
    folder_name: string
    count: number
    create_time: number
    creater_name: string

    items?: GroupFileElem[]
    show_items?: boolean
}

export interface GroupMemberInfoElem {
    user_id: number | string
    title: string
    card: string
    join_time: number
    last_sent_time: number
    level: number
    nickname: string
    rank: string
    role: string
    sex: string
    shutup_time: number
    py_start?: string
}

export interface SQCodeElem {
    addText: boolean
    addTop?: boolean
    msgObj: MsgItemElem
}

export interface MsgItemElem {
    type: string
    [key: string]: any
}

export interface MergeStackData {
    messageList: any[]      // 消息列表
    imageList: any[]        // 图片列表
    placeCache: number      // 位置缓存
    forwardMsg: any         // 原合并转发消息
}

export interface MenuEventData {
    x: number
    y: number
    target: HTMLElement
}

export type Session = UserGroupElem & UserFriendElem
