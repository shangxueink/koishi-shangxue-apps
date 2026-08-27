/*
 * @FileDescription: MsgBody.vue 所使模块用的通用的消息显示相关
 * @Author: Stapxs
 * @Date: 2022/11/29
 * @Version: 1.0
 * @Description: 此模块抽离出了本来在 MsgBody.vue 中的一些较为通用的方法便于进行多 Bot 适配。
 */

import xss from 'xss'

export class MsgBodyFuns {
    /**
     * 判断消息块是否需要行内显示
     * @param typeName 消息类型
     * @returns T / F
     */
    static isMsgInline(typeName: string) {
        switch (typeName) {
            case 'at':
            case 'text':
            case 'face':
                return true
            case 'bface':
            case 'image':
            case 'record':
            case 'video':
            case 'file':
            case 'json':
            case 'xml':
                return false
        }
        return false
    }

    /**
     * 处理纯文本消息（处理换行，转义字符并进行 xss 过滤便于高亮链接）
     * @param { string } text 文本
     * @returns 处理完成的文本
     */
    static parseText(text: string) {
        // 把 r 转为 n
        text = text.replaceAll('\r\n', '\n').replaceAll('\r', '\n')
        // 还原转义字符
        text = text.replace(/&([^;]+);/g, '&amp;$1;')
        // XSS 过滤
        text = xss(text, { whiteList: { a: ['href', 'target'] } })
        // 返回
        return text
    }
}
