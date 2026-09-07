import { h } from 'koishi'
import type { BiliVideoView } from './bilibili-api'
import type { Config } from './config'

type OutputComponent = 'text' | 'link'

interface DurationDecision {
  allowed: boolean
  tip: 'return' | string | null
  includeText: boolean
  includeTip: boolean
}

function toHttps(url: string): string {
  return url.replace(/^http:\/\//i, 'https://')
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function numeral(value: number, useNumeral: boolean): string {
  if (!useNumeral) return String(value)
  if (value >= 100000000) return `${(value / 100000000).toFixed(1)}亿`
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
  return String(value)
}

function outputComponents(config: Config): OutputComponent[] {
  const result: OutputComponent[] = []
  for (const component of config.videoParseComponents) {
    const normalized: OutputComponent | 'log' = component === 'video' ? 'link' : component
    if (normalized === 'log' || result.includes(normalized)) continue
    result.push(normalized)
  }
  return result
}

function pageLink(view: BiliVideoView, config: Config): string {
  return config.bVideoIDPreference === 'av'
    ? `https://www.bilibili.com/video/av${view.aid}`
    : `https://www.bilibili.com/video/${view.bvid}`
}

function playerLink(view: BiliVideoView, page: number): string {
  return `https://www.bilibili.com/blackboard/webplayer/mbplayer.html?bvid=${view.bvid}&p=${page}&autoplay=true`
}

export function formatVideoText(config: Config, view: BiliVideoView, page: number): string {
  const maxLength = config.bVideoShowIntroductionTofixed
  const description = view.desc.length > maxLength
    ? `${view.desc.slice(0, maxLength)}...`
    : view.desc

  const placeholders: Record<string, string> = {
    '${标题}': escapeText(view.title),
    '${UP主}': escapeText(view.owner?.name ?? ''),
    '${简介}': escapeText(description),
    '${点赞}': numeral(view.stat.like ?? 0, config.useNumeral),
    '${投币}': numeral(view.stat.coin ?? 0, config.useNumeral),
    '${收藏}': numeral(view.stat.favorite ?? 0, config.useNumeral),
    '${转发}': numeral(view.stat.share ?? 0, config.useNumeral),
    '${观看}': numeral(view.stat.view ?? 0, config.useNumeral),
    '${弹幕}': numeral(view.stat.danmaku ?? 0, config.useNumeral),
    '${封面}': view.pic ? h.image(toHttps(view.pic)).toString() : '',
    '${tab}': '\t',
  }

  let template = config.bVideo_area.replace(/\r?\n*\s*\$\{~~~\}\s*\r?\n*/g, '\n')
  for (const [placeholder, value] of Object.entries(placeholders)) {
    template = template.split(placeholder).join(value)
  }
  if (config.bVideoShowLink) {
    template += `\n${pageLink(view, config)}`
  }
  return template
}

export function checkDuration(config: Config, durationSeconds: number): DurationDecision {
  const minutes = durationSeconds / 60
  const tooShort = minutes < config.Minimumduration
  const tooLong = minutes > config.Maximumduration
  if (!tooShort && !tooLong) {
    return { allowed: true, tip: null, includeText: true, includeTip: false }
  }

  const tipConfig = tooShort ? config.Minimumduration_tip : config.Maximumduration_tip
  if (tipConfig === 'return') {
    return { allowed: false, tip: 'return', includeText: false, includeTip: false }
  }
  if (tipConfig && typeof tipConfig === 'object') {
    return {
      allowed: false,
      tip: tipConfig.tipcontent || null,
      includeText: tipConfig.tipanalysis,
      includeTip: Boolean(tipConfig.tipcontent),
    }
  }
  return { allowed: false, tip: null, includeText: true, includeTip: false }
}

export function buildVideoMessage(
  config: Config,
  view: BiliVideoView,
  page: number,
  quoteMessageId: string | null,
): h[] {
  const components = outputComponents(config)
  const text = formatVideoText(config, view, page)
  const link = playerLink(view, page)
  const parts: h[][] = []
  for (const component of components) {
    if (component === 'text') {
      const parsed = h.parse(text)
      if (parsed.length > 0) parts.push(parsed)
    } else {
      parts.push([h.text(link)])
    }
  }

  if (parts.length === 0) return []
  const elements: h[] = []
  if (quoteMessageId) elements.push(h.quote(quoteMessageId))
  parts.forEach((part, index) => {
    if (index > 0) elements.push(h.text('\n'))
    elements.push(...part)
  })
  return elements
}

export function buildDurationMessage(
  config: Config,
  view: BiliVideoView,
  page: number,
  decision: DurationDecision,
  quoteMessageId: string | null,
): h[] {
  const parts: h[][] = []
  if (decision.includeText && config.videoParseComponents.includes('text')) {
    const parsed = h.parse(formatVideoText(config, view, page))
    if (parsed.length > 0) parts.push(parsed)
  }
  if (decision.includeTip && decision.tip) {
    parts.push([h.text(decision.tip)])
  }

  if (parts.length === 0) return []
  const elements: h[] = []
  if (quoteMessageId) elements.push(h.quote(quoteMessageId))
  parts.forEach((part, index) => {
    if (index > 0) elements.push(h.text('\n'))
    elements.push(...part)
  })
  return elements
}
