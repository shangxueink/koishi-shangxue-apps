// 将 UI 消息段转换为 Satori 元素字符串。

import type { MsgItemElem } from './elements/information'

function escapeText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeAttr(value: string): string {
  return escapeText(value).replaceAll('"', '&quot;')
}

function segmentToSatori(segment: MsgItemElem): string {
  const type = String(segment.type ?? '')
  if (type === 'text') return escapeText(String(segment.text ?? ''))
  if (type === 'reply' || type === 'quote') {
    const id = String(segment.id ?? segment.data?.id ?? '')
    return id ? `<quote id="${escapeAttr(id)}"/>` : ''
  }
  if (type === 'at') {
    const id = String(segment.qq ?? segment.id ?? '')
    const name = String(segment.text ?? segment.name ?? '')
    return `<at id="${escapeAttr(id)}"${name ? ` name="${escapeAttr(name)}"` : ''}/>`
  }
  if (type === 'image') {
    const src = String(segment.file ?? segment.url ?? segment.src ?? '')
    return src ? `<img src="${escapeAttr(src)}"/>` : ''
  }
  if (type === 'face' || type === 'bface') {
    const id = String(segment.id ?? segment.data?.id ?? '')
    if (/^\d+$/.test(id)) {
      const codePoint = Number(id)
      if (codePoint >= 128000) return String.fromCodePoint(codePoint)
    }
    return String(segment.text ?? '[表情]')
  }
  if (type === 'record' || type === 'audio') {
    const src = String(segment.file ?? segment.url ?? segment.src ?? '')
    const name = String(segment.fileName ?? segment.name ?? '')
    return src ? `<audio src="${escapeAttr(src)}"${name ? ` name="${escapeAttr(name)}"` : ''}/>` : ''
  }
  if (type === 'video') {
    const src = String(segment.file ?? segment.url ?? segment.src ?? '')
    return src ? `<video src="${escapeAttr(src)}"/>` : ''
  }
  if (type === 'file') {
    const src = String(segment.file ?? segment.url ?? segment.src ?? '')
    const name = String(segment.name ?? '')
    return src ? `<file src="${escapeAttr(src)}"${name ? ` name="${escapeAttr(name)}"` : ''}/>` : ''
  }
  return escapeText(String(segment.text ?? `[${type}]`))
}

export function parseMsg(msg: string, cache: MsgItemElem[], _img: string[]): string {
  let output = ''
  const pattern = /(\[SQ:\d+\]|\[图片\])/g
  const consumed = new Set<number>()
  let match: RegExpExecArray | null
  let cursor = 0

  while ((match = pattern.exec(msg)) !== null) {
    output += escapeText(msg.slice(cursor, match.index))
    const token = match[0]
    if (token.startsWith('[SQ:')) {
      const index = Number(token.slice(4, -1))
      const segment = cache[index]
      if (segment) {
        output += segmentToSatori(segment)
        consumed.add(index)
      }
    } else {
      const imageIndex = cache.findIndex((segment, index) => {
        return !consumed.has(index) && segment?.type === 'image'
      })
      if (imageIndex >= 0) {
        output += segmentToSatori(cache[imageIndex])
        consumed.add(imageIndex)
      } else {
        output += '[图片]'
      }
    }
    cursor = match.index + match[0].length
  }
  output += escapeText(msg.slice(cursor))
  return output
}

export function getSQList(msg: string): RegExpMatchArray | null {
  return msg.match(/\[SQ:\d+\]|\[图片\]/g)
}

export default {
  parseMsg,
  getSQList,
}
