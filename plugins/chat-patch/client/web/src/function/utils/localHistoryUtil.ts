/**
 * @FileDescription: 本地历史消息工具（Tauri 平台）
 * @Description:
 *   封装对 Tauri 后端 db_* 命令的调用，提供类型安全的本地 SQLite 历史消息读写接口。
 *   非 Tauri 平台调用时会静默 no-op / 返回空数组，不影响其他平台逻辑。
 */

import { backend } from '@renderer/runtime/backend'
import { getMsgRawTxt } from './msgUtil'
import { Logger } from '../base'
import { useSettingsStore } from '@renderer/state/settings'
import { useAuthStore } from '@renderer/state/auth'

const logger = new Logger()

// ── 类型定义（与 Rust MsgRecord 对应） ───────────────────────────

export interface LocalMsgRecord {
    /** Bot 侧的消息 ID */
    message_id: string
    /** 会话 ID（group_id 或 user_id） */
    chat_id: number | string
    /** 会话类型："group" | "private" */
    chat_type: string
    /** 发送者 user_id */
    sender_id: number | string
    /** 发送者昵称（card 优先，fallback nickname） */
    sender_name: string | null
    /** 消息序号（并非所有 Bot 都提供，可能为 null） */
    seq: number | null
    /** 消息时间戳（秒，Bot 原始值） */
    time: number
    /** JSON 序列化的 MsgItemElem[] 消息段数组 */
    message: string
    /** 纯文本摘要 */
    raw_message: string | null
    /** 是否已撤回 */
    revoked: boolean
}

function isTauriHistoryAvailable(): boolean {
    const settingsStore = useSettingsStore()
    return backend.type === 'tauri' && settingsStore.sysConfig.enable_local_history === true
}

async function callDbRecordList(
    selfId: string | number,
    command: string,
    payload: Record<string, any>,
    errorTag: string,
): Promise<any[]> {
    if (!isTauriHistoryAvailable()) return []
    try {
        const records: LocalMsgRecord[] = await backend.call(
            undefined,
            command,
            true,
            { selfId: String(selfId), ...payload },
        )
        return (records ?? []).map(deserializeRecord)
    } catch (e) {
        logger.error(e as unknown as Error, errorTag)
        return []
    }
}

async function callDb(
    selfId: string | number,
    command: string,
    payload: Record<string, any>,
    fallback: any,
    errorTag: string,
): Promise<any> {
    if (!isTauriHistoryAvailable()) return fallback
    try {
        return await backend.call(
            undefined,
            command,
            true,
            { selfId: String(selfId), ...payload },
        )
    } catch (e) {
        logger.error(e as unknown as Error, errorTag)
        return fallback
    }
}

const META_SEGMENT_TYPE = 'chat-patch-meta'

function serializeMsgSegments(segments: any[] | undefined, timeMs?: number): string {
    try {
        const next = [...(segments ?? [])]
        if (Number.isFinite(timeMs) && timeMs && timeMs > 0) {
            next.push({ type: META_SEGMENT_TYPE, time: timeMs })
        }
        return JSON.stringify(next)
    } catch {
        return '[]'
    }
}

function deserializeMsgSegments(serialized: string): any[] {
    try {
        return JSON.parse(serialized)
    } catch {
        return []
    }
}

function computeRawMessage(msg: any): string | null {
    try {
        return getMsgRawTxt(msg) || msg.raw_message || null
    } catch {
        return msg.raw_message ?? null
    }
}

function deriveChatId(selfId: string | number, msgs: any[]): number | string | undefined {
    const firstMsg = msgs[0]
    let chatId: number | string | undefined = firstMsg?.infoList?.group_id ?? firstMsg?.infoList?.target_id
    if (chatId != null) return chatId

    for (const item of msgs) {
        if (item?.infoList?.sender != null && String(item.infoList.sender) !== String(selfId)) {
            chatId = item.infoList.sender
            break
        }
    }
    return chatId
}

export function ensureChatIdOnMsgs(selfId: string | number, msgs: any[]): any[] {
    const chatId = deriveChatId(selfId, msgs)
    if (chatId == null) return msgs

    return msgs.map((item: any) => {
        if (!item?.infoList) return item
        if (item.infoList.group_id != null || item.infoList.target_id != null) {
            return item
        }
        return {
            ...item,
            infoList: {
                ...item.infoList,
                target_id: chatId,
            },
        }
    })
}

// ── 辅助：将运行时消息对象转换为 LocalMsgRecord ──────────────────

/**
 * 将已经过 msgPreprocess 处理的消息对象转成可存入 DB 的 LocalMsgRecord。
 * 若必要字段缺失则返回 null，调用方需过滤掉 null。
 */
export function msgToRecord(msg: any): LocalMsgRecord | null {
    const messageId = msg.message_id
    if (!messageId) return null

    const chatId: number | string = msg.infoList.group_id ?? msg.infoList.target_id
    if (chatId == null) return null

    const chatType: string =
        msg.message_type ?? (msg.group_id != null ? 'group' : 'private')
    const senderId: number | string = msg.infoList.sender
    if (senderId == null) return null

    const senderName: string | null =
        (msg.sender?.card && msg.sender.card !== '') ? msg.sender.card : (msg.sender?.nickname ?? null)

    const rawMessage = computeRawMessage(msg)
    const timeMs = Number(msg.local_time ?? msg.timestamp_ms ?? msg.time_ms ?? 0)
    const messageSerialized = serializeMsgSegments(
        msg.message,
        Number.isFinite(timeMs) && timeMs > 0 ? timeMs : undefined,
    )

    return {
        message_id: String(messageId),
        chat_id: chatId,
        chat_type: chatType,
        sender_id: senderId,
        sender_name: senderName,
        seq: msg.seq_id != null ? Number(msg.seq_id) : null,
        time: Number(msg.time),
        message: messageSerialized,
        raw_message: rawMessage,
        revoked: false,
    }
}

// ── 读写接口 ──────────────────────────────────────────────────────

/**
 * 批量将消息保存到本地 SQLite（已有的 message_id 自动忽略，不覆盖）。
 *
 * @param selfId  当前登录账号 uin
 * @param msgs    已完成预处理的消息对象数组（来自 chatStore.messageList 或 newMsg）
 */
export async function dbSaveMessages(selfId: string | number, msgs: any[]): Promise<void> {
    if (!isTauriHistoryAvailable()) return

    const persistableMsgs = ensureChatIdOnMsgs(selfId, msgs)
    const records: LocalMsgRecord[] = persistableMsgs
        .map(msgToRecord)
        .filter((r): r is LocalMsgRecord => r !== null)

    if (records.length === 0) {
        logger.error(null, '[LocalHistory] dbSaveMessages: 没有有效消息可保存')
        return
    }

    try {
        await backend.call(undefined, 'db:saveMessages', true, {
            selfId: String(selfId),
            messages: records,
        })
    } catch (e) {
        logger.error(e as unknown as Error, '[LocalHistory] dbSaveMessages 失败')
    }
}

export async function saveMessagesWithSideEffects(selfId: string | number, msgs: any[]): Promise<void> {
    const settingsStore = useSettingsStore()
    const persistableMsgs = ensureChatIdOnMsgs(selfId, msgs)
    await dbSaveMessages(selfId, persistableMsgs)
    if (settingsStore.sysConfig.disable_local_history_image_cache === true) return
    cacheImagesFromMsgs(selfId, persistableMsgs).catch(() => {})
}

/**
 * 获取某会话最新 n 条本地消息（正序，revoked 消息不包含）。
 *
 * @returns 消息段数组已反序列化的消息对象数组，出错或非 Tauri 返回空数组
 */
export async function dbGetLatest(
    selfId: string | number,
    chatId: number | string,
    n: number,
): Promise<any[]> {
    return callDbRecordList(selfId, 'db:getLatest', { chatId, n }, '[LocalHistory] dbGetLatest 失败')
}

/**
 * 获取锚点消息之前（更旧）的 n 条，不含锚点本身，正序返回。
 *
 * 典型用途：上拉加载更多历史。
 */
export async function dbGetBefore(
    selfId: string | number,
    chatId: number | string,
    messageId: string,
    n: number,
): Promise<any[]> {
    return callDbRecordList(selfId, 'db:getBefore', { chatId, messageId, n }, '[LocalHistory] dbGetBefore 失败')
}

/**
 * 获取某个时间戳之前（更旧）的 n 条消息，正序返回。
 */
export async function dbGetBeforeByTime(
    selfId: string | number,
    chatId: number | string,
    beforeTime: number,
    n: number,
): Promise<any[]> {
    return callDbRecordList(selfId, 'db:getBeforeByTime', { chatId, beforeTime, n }, '[LocalHistory] dbGetBeforeByTime 失败')
}

/**
 * 获取锚点消息之后（更新）的 n 条，不含锚点本身，正序返回。
 *
 * 典型用途：从指定消息位置向后展开查看。
 */
export async function dbGetAfter(
    selfId: string | number,
    chatId: number | string,
    messageId: string,
    n: number,
): Promise<any[]> {
    return callDbRecordList(selfId, 'db:getAfter', { chatId, messageId, n }, '[LocalHistory] dbGetAfter 失败')
}

/**
 * 将指定 message_id 在本地 DB 中标记为已撤回。
 *
 * @returns 是否命中（true = DB 中存在该消息并更新成功）
 */
export async function dbRevokeMessage(
    selfId: string | number,
    messageId: string,
): Promise<boolean> {
    return callDb(selfId, 'db:revokeMessage', { messageId }, false, '[LocalHistory] dbRevokeMessage 失败')
}

/**
 * 在指定会话的本地 DB 中按关键词搜索消息（对 raw_message 做 LIKE 匹配）。
 *
 * @returns 匹配消息列表（正序），出错或非 Tauri 返回空数组
 */
export async function dbSearchMessages(
    selfId: string | number,
    chatId: number | string,
    query: string,
): Promise<any[]> {
    if (!isTauriHistoryAvailable() || !query) return []
    return callDbRecordList(selfId, 'db:searchMessages', { chatId, query }, '[LocalHistory] dbSearchMessages 失败')
}

export async function dbGetStats(
    selfId: string | number,
): Promise<{ totalMessages: number; imageCount: number; imageCacheBytes: number; dbSizeBytes: number } | null> {
    return callDb(selfId, 'db:getStats', {}, null, '[LocalHistory] dbGetStats 失败')
}

/**
 * 计算 URL 的 SHA-256 十六进制摘要，用作图片缓存的唯一键。
 */
export async function hashUrl(url: string): Promise<string> {
    const data = new TextEncoder().encode(url)
    const buf = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}

/**
 * 将图片缓存到本地加密数据库。
 * `data` 为 base64 编码的原始图片字节。
 */
export async function dbCacheImage(
    selfId: string | number,
    urlHash: string,
    mimeType: string,
    data: string,
): Promise<void> {
    if (!isTauriHistoryAvailable()) return

    try {
        await backend.call(undefined, 'db:cacheImage', true, {
            selfId: String(selfId),
            urlHash,
            mimeType,
            data,
        })
    } catch (e) {
        logger.error(e as unknown as Error, '[LocalHistory] dbCacheImage 失败')
    }
}

/**
 * 从本地数据库读取已缓存的图片。
 * 返回 `{ mimeType, data }` （data 为 base64），未缓存则返回 `null`。
 */
export async function dbGetImage(
    selfId: string | number,
    urlHash: string,
): Promise<{ mimeType: string; data: string } | null> {
    return callDb(selfId, 'db:getImage', { urlHash }, null, '[LocalHistory] dbGetImage 失败')
}

export interface DbClearImagesProgress {
    selfId: string
    total: number
    deleted: number
    batchDeleted: number
    progress: number
    done: boolean
}

export interface DbClearImagesResult {
    total: number
    deleted: number
    batches: number
}

export async function dbClearImages(
    selfId: string | number,
    onProgress?: (progress: DbClearImagesProgress) => void,
): Promise<DbClearImagesResult> {
    if (!isTauriHistoryAvailable()) {
        return { total: 0, deleted: 0, batches: 0 }
    }

    let unlisten: undefined | (() => void | Promise<void>)
    if (onProgress && backend.type === 'tauri') {
        const { listen } = await import('@tauri-apps/api/event')
        unlisten = await listen<DbClearImagesProgress>('db:clearImagesProgress', (event) => {
            const payload = event.payload
            if (!payload) return
            if (String(payload.selfId) !== String(selfId)) return
            onProgress(payload)
        })
    }

    try {
        const result = await callDb(
            selfId,
            'db:clearImages',
            {},
            { total: 0, deleted: 0, batches: 0 },
            '[LocalHistory] dbClearImages 失败',
        )
        return {
            total: Number(result?.total ?? 0),
            deleted: Number(result?.deleted ?? 0),
            batches: Number(result?.batches ?? 0),
        }
    } finally {
        if (unlisten) await unlisten()
    }
}

// ── 内部工具 ──────────────────────────────────────────────────────

/**
 * 遍历消息列表，将所有图片段下载并缓存到本地数据库。
 * 已缓存的图片（url_hash 命中）不会重复下载。
 */
async function cacheImagesFromMsgs(selfId: string | number, msgs: any[]): Promise<void> {
    if (!isTauriHistoryAvailable()) return
    const urls = extractImageUrlsFromMsgs(msgs)
    for (const url of urls) {
        try {
            await cacheSingleImage(selfId, url)
        } catch {
            // 单张图片失败不影响其余图片
        }
    }
}

function extractImageUrlsFromMsgs(msgs: any[]): string[] {
    const urls: string[] = []
    for (const msg of msgs) {
        if (!Array.isArray(msg.message)) continue
        for (const seg of msg.message) {
            if (seg.type === 'image' && seg.url && seg.url.startsWith('http')) {
                urls.push(seg.url)
            }
        }
    }
    return urls
}

async function downloadImageViaProxy(url: string): Promise<{ mimeType: string; base64: string } | null> {
    const fetchUrl = backend.proxy? `http://localhost:${backend.proxy}/proxy?url=${encodeURIComponent(url)}`: url

    const resp = await fetch(fetchUrl)
    if (!resp.ok) return null

    const mimeType = resp.headers.get('Content-Type')?.split(';')[0]?.trim() ?? 'image/jpeg'
    const buffer = await resp.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
    const base64 = btoa(binary)
    return { mimeType, base64 }
}

async function cacheSingleImage(selfId: string | number, url: string): Promise<void> {
    const urlHash = await hashUrl(url)
    const existing = await dbGetImage(selfId, urlHash)
    if (existing) return

    const downloaded = await downloadImageViaProxy(url)
    if (!downloaded) return

    await dbCacheImage(selfId, urlHash, downloaded.mimeType, downloaded.base64)
}

/**
 * 将 DB 返回的 LocalMsgRecord 还原为与 chatStore.messageList 兼容的消息对象。
 */
function deserializeRecord(record: LocalMsgRecord): any {
    const authStore = useAuthStore()
    const parsed = deserializeMsgSegments(record.message)
    const meta = parsed.find((item) => item?.type === META_SEGMENT_TYPE)
    const timeMs = Number(meta?.time ?? 0)
    const message = parsed.filter((item) => item?.type !== META_SEGMENT_TYPE)

    // 判断是否为自己发送的消息，还原 post_type
    const isSelf = record.sender_id === Number(authStore.loginInfo.uin)
    const postType = isSelf ? 'message_sent' : 'message'

    // 群消息：sender_name 来自 card，私聊来自 nickname
    const isGroup = record.chat_type === 'group'
    const sender = isGroup ? { user_id: record.sender_id, card: record.sender_name ?? '', nickname: record.sender_name ?? '' } : { user_id: record.sender_id, card: '', nickname: record.sender_name ?? '' }
    const infoList = {
        message_id: record.message_id,
        private_id: isGroup ? undefined : record.chat_id,
        group_id: isGroup ? record.chat_id : undefined,
        target_id: isGroup ? undefined : record.chat_id,
        sender: record.sender_id,
    }

    return {
        post_type: postType,
        message_id: record.message_id,
        message_type: record.chat_type,
        // 根据 chat_type 恢复对应的 id 字段
        ...(isGroup ? { group_id: record.chat_id } : { user_id: record.chat_id }),
        sender,
        time: record.time,
        timestamp_ms: timeMs || undefined,
        local_time: timeMs || undefined,
        time_ms: timeMs || undefined,
        message,
        infoList,
        raw_message: record.raw_message ?? '',
        revoked: record.revoked,
        // 消息序列号（并非所有 Bot 都提供，可为 null）
        ...(record.seq != null ? { message_seq: record.seq, seq_id: record.seq } : {}),
        // 标记来源为本地缓存，业务层可按需用此字段区分
        _from_local_db: true,
    }
}
