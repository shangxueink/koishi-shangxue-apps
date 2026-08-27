/*
 * @FileDescription: 语音消息处理工具
 * @Author: FuQuan233
 * @Date: 2026/06/04
 * @Version: 1.0
 * @Description: 通过 OneBot get_record API 加载语音消息。
 *   以 out_format=mp3 请求格式转换，响应 base64 数据直接用于播放。
 */

import { Logger } from '@renderer/function/base'
import { Connector } from '@renderer/function/connect'

const logger = new Logger()

/** 语音消息原始数据（来自 OneBot record 消息段） */
export interface RecordMsgData {
    file?: string
    url?: string
    path?: string
    magic?: boolean
    duration?: number
}

/** 语音加载结果 */
export interface RecordLoadResult {
    src: string
    duration: number
}

/** 加载缓存 */
const loadCache = new Map<string, RecordLoadResult>()

/**
 * base64 字符串转 Blob URL
 */
function base64ToBlobUrl(base64: string): string {
    if (base64.startsWith('base64://')) base64 = base64.substring(9)
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }))
}

/**
 * 获取音频时长
 */
function getAudioDuration(url: string): Promise<number> {
    return new Promise((resolve) => {
        const audio = new Audio()
        let resolved = false
        const done = (val: number) => {
            if (!resolved) {
                resolved = true
                audio.removeEventListener('loadedmetadata', onMeta)
                audio.removeEventListener('error', onErr)
                audio.src = ''
                resolve(val)
            }
        }
        const onMeta = () => done(audio.duration || 0)
        const onErr = () => done(0)
        audio.addEventListener('loadedmetadata', onMeta)
        audio.addEventListener('error', onErr)
        setTimeout(() => done(0), 3000)
        audio.src = url
    })
}

// ============================================================================
// 公开 API
// ============================================================================

/**
 * 加载语音消息为可播放的音频 URL
 *
 * 通过 OneBot get_record API (out_format=mp3) 获取语音，
 * 响应中的 base64 字段直接包含 MP3 数据。
 *
 * @param data   语音消息数据
 * @param msgId  消息 ID（用于缓存键）
 * @returns      加载结果
 * @throws       无法加载时抛出错误
 */
export async function loadRecord(data: RecordMsgData, msgId?: string): Promise<RecordLoadResult> {
    const cacheKey = msgId || data.file!

    // 缓存检查
    const cached = loadCache.get(cacheKey)
    if (cached) return cached

    if (!data.file) {
        throw new Error('语音消息缺少 file 字段')
    }

    // 调用 get_record API
    const raw = await Connector.callApi('get_record', {
        file: data.file,
        out_format: 'mp3',
    })

    if (!raw) throw new Error('get_record API 返回空')

    // result 兼容数组和单个对象
    const result: any = Array.isArray(raw) ? raw[0] : raw

    if (!result?.base64 || typeof result.base64 !== 'string') {
        logger.debug('get_record 响应中没有 base64: ' + JSON.stringify(result).substring(0, 200))
        throw new Error('OneBot 端不支持语音格式转换')
    }

    const blobUrl = base64ToBlobUrl(result.base64)
    const duration = data.duration || (await getAudioDuration(blobUrl))

    logger.debug(`语音加载完成: ${duration.toFixed(1)}s`)

    const loadResult: RecordLoadResult = { src: blobUrl, duration }
    loadCache.set(cacheKey, loadResult)
    return loadResult
}

/**
 * 释放语音资源
 */
export function revokeRecord(msgId?: string): void {
    if (msgId) {
        const cached = loadCache.get(msgId)
        if (cached?.src.startsWith('blob:')) URL.revokeObjectURL(cached.src)
        loadCache.delete(msgId)
    }
}

/**
 * 清除所有缓存
 */
export function clearRecordCache(): void {
    for (const [, r] of loadCache) {
        if (r.src.startsWith('blob:')) URL.revokeObjectURL(r.src)
    }
    loadCache.clear()
}

/**
 * 格式化时长显示
 * @param seconds 秒数
 * @returns 格式化的时长字符串 (m:ss)
 */
export function formatRecordDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
}
