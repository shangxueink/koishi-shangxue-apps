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

const satoriMarkupPattern = /<(\/?)(quote|at|img|image|audio|record|video|file|mface|face|sharp|p|br|message|text|json|xml|markdown|keyboard)(?:\s[^>]*)?\/?>/gi

function escapeTextPreservingMarkup(value: string): string {
  const decoded = value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&')
  const saved: string[] = []
  const marker = (index: number) => `\u0000sq${index}\u0000`
  const masked = decoded.replace(satoriMarkupPattern, (tag) => {
    saved.push(tag)
    return marker(saved.length - 1)
  })
  return masked
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replace(/\u0000sq(\d+)\u0000/g, (_, index: string) => saved[Number(index)] ?? '')
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
  if (type === 'json') {
    const data = String(segment.data ?? segment.content ?? '')
    return data ? `<json data="${escapeAttr(data)}"/>` : ''
  }
  if (type === 'xml') {
    const data = String(segment.data ?? segment.content ?? '')
    return data ? `<xml data="${escapeAttr(data)}"/>` : ''
  }
  if (type === 'markdown') {
    const content = String(segment.content ?? '')
    return content ? `<markdown content="${escapeAttr(content)}"/>` : ''
  }
  if (type === 'forward') {
    const id = String(segment.id ?? '')
    return id ? `<forward id="${escapeAttr(id)}"/>` : ''
  }
  return escapeText(String(segment.text ?? `[${type}]`))
}

/**
 * 将一组消息节点构建为 Satori 合并转发元素
 */
export function buildForwardMessage(nodes: unknown[]): string {
  const messages = nodes.map((raw) => {
    const item = typeof raw === 'object' && raw !== null
      ? raw as Record<string, unknown>
      : {}
    const nodeData = typeof item.data === 'object' && item.data !== null
      ? item.data as Record<string, unknown>
      : item
    const userId = String(item.user_id ?? nodeData.user_id ?? nodeData.uin ?? '')
    const nickname = String(item.nickname ?? nodeData.nickname ?? nodeData.name ?? '')
    const displayName = nickname || userId
    const time = String(item.time ?? nodeData.time ?? '')
    const content = Array.isArray(item.content)
      ? item.content as unknown[]
      : Array.isArray(nodeData.content)
        ? nodeData.content as unknown[]
        : []
    const inner = content.map((segment) => segmentToSatori(segment as MsgItemElem)).join('')
    const author = `<author id="${escapeAttr(userId)}" name="${escapeAttr(displayName)}"${time ? ` time="${escapeAttr(time)}"` : ''}/>`
    return `<message>${author}${inner}</message>`
  }).join('')
  return `<figure>${messages}</figure>`
}

export function parseMsg(msg: string, cache: MsgItemElem[], _img: string[]): string {
  let output = ''
  const pattern = /(\[SQ:\d+\]|\[图片\])/g
  const consumed = new Set<number>()
  let match: RegExpExecArray | null
  let cursor = 0

  while ((match = pattern.exec(msg)) !== null) {
    output += escapeTextPreservingMarkup(msg.slice(cursor, match.index))
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
  output += escapeTextPreservingMarkup(msg.slice(cursor))
  return output
}

export function getSQList(msg: string): RegExpMatchArray | null {
  return msg.match(/\[SQ:\d+\]|\[图片\]/g)
}

export default {
  parseMsg,
  getSQList,
}
