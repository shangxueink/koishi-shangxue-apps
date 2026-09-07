export interface ResolvedVideoTarget {
  kind: 'video'
  bvid?: string
  aid?: string
  page: number
}

export interface ShortVideoTarget {
  kind: 'short'
  host: string
  code: string
  page: number
}

export type BilibiliTarget = ResolvedVideoTarget | ShortVideoTarget

interface CardElementLike {
  type: string
  attrs: Record<string, unknown>
  children: unknown[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeId(id: string): string | null {
  const bvid = id.match(/bv1[0-9A-Za-z]{9}/i)?.[0]
  if (bvid) return `BV${bvid.slice(2)}`
  const avid = id.match(/av\d+/i)?.[0]
  return avid ? avid.toLowerCase() : null
}

function parsePage(searchParams: URLSearchParams): number {
  const raw = searchParams.get('p') ?? searchParams.get('page')
  const page = Number.parseInt(raw ?? '', 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

function createVideoTarget(id: string, page: number): ResolvedVideoTarget | null {
  const normalized = normalizeId(id)
  if (!normalized) return null
  if (normalized.startsWith('av')) {
    return { kind: 'video', aid: normalized.slice(2), page }
  }
  return { kind: 'video', bvid: normalized, page }
}

function parseBilibiliUrl(rawUrl: string): BilibiliTarget | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }
  const hostname = url.hostname.replace(/^www\./, '').replace(/^m\./, '')
  if (hostname === 'bilibili.com' && url.pathname.startsWith('/video/')) {
    const match = url.pathname.match(/\/(BV1[0-9A-Za-z]{9}|av\d+)(?:\/|$)/i)
    if (!match) return null
    return createVideoTarget(match[1], parsePage(url.searchParams))
  }
  return null
}

function visitJsonValue(value: unknown, output: string[]) {
  if (typeof value === 'string') {
    output.push(value)
    const trimmed = value.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        visitJsonValue(JSON.parse(trimmed), output)
      } catch {
        // JSON 卡片里也可能混入普通文本，忽略解析失败
      }
    }
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) visitJsonValue(item, output)
    return
  }
  if (isRecord(value)) {
    for (const item of Object.values(value)) visitJsonValue(item, output)
  }
}

function visitElement(element: CardElementLike, output: string[]) {
  if (element.type === 'json') {
    visitJsonValue(element.attrs.data ?? element.attrs.content, output)
  }
  for (const child of element.children) {
    if (isRecord(child) && Array.isArray(child.children)) {
      visitElement(child as unknown as CardElementLike, output)
    }
  }
}

// 提取 QQ json 卡片中所有字符串，避免卡片链接被转义后漏掉
export function collectJsonCardText(elements: readonly CardElementLike[]): string {
  const output: string[] = []
  for (const element of elements) visitElement(element, output)
  return output.join('\n')
}

function cleanUrl(raw: string): string {
  return raw.trim().replace(/[)\]}>.,;:!?，。；：！？]+$/g, '')
}

export function parseBilibiliContent(content: string, parseStandaloneIds: boolean): BilibiliTarget[] {
  const normalized = content.replace(/\\\//g, '/')
  const targets = new Map<string, BilibiliTarget>()
  const seenVideoIds = new Set<string>()

  const pushTarget = (target: BilibiliTarget | null) => {
    if (!target) return
    if (target.kind === 'video') {
      const id = target.bvid ?? `av${target.aid}`
      seenVideoIds.add(id)
      targets.set(`${id}:${target.page}`, target)
    } else {
      targets.set(`${target.host}/${target.code}:${target.page}`, target)
    }
  }

  const videoDomainPattern = /(?:^|[\s"'<(（【，。；：;、])(?:(?:https?:\/\/)?(?:www\.|m\.)?bilibili\.com\/video\/[^\s<>"']+)/gi
  for (const match of normalized.matchAll(videoDomainPattern)) {
    pushTarget(parseBilibiliUrl(cleanUrl(match[0])))
  }

  const urlPattern = /https?:\/\/[^\s<>"']+/gi
  for (const match of normalized.matchAll(urlPattern)) {
    pushTarget(parseBilibiliUrl(cleanUrl(match[0])))
  }

  const shortPattern = /(?:(?:https?:\/\/)?(?:www\.)?(b23\.tv|bili(?:22|23|33|2233)\.cn)\/([A-Za-z0-9]+))/gi
  for (const match of normalized.matchAll(shortPattern)) {
    const tail = normalized.slice(match.index + match[0].length)
    const query = tail.match(/^\?([^\s<>"']*)/)?.[1] ?? ''
    const page = parsePage(new URLSearchParams(query))
    const direct = createVideoTarget(match[2], page)
    if (direct) {
      pushTarget(direct)
    } else {
      pushTarget({
        kind: 'short',
        host: match[1],
        code: match[2],
        page,
      })
    }
  }

  if (parseStandaloneIds) {
    const standalonePattern = /(?:^|[\s,，。；;：:()（）[\]【】])(BV1[0-9A-Za-z]{9}|av\d+)(?=$|[\s,，。；;：:()（）[\]【】])/gi
    for (const match of normalized.matchAll(standalonePattern)) {
      const id = normalizeId(match[1])
      if (id && !seenVideoIds.has(id)) {
        pushTarget(createVideoTarget(id, 1))
      }
    }
  }

  return [...targets.values()]
}

// 短链跳转后可能得到完整视频页，将其转换为可直接请求的视频目标
export function targetFromResolvedUrl(url: string): ResolvedVideoTarget | null {
  const target = parseBilibiliUrl(url)
  if (target?.kind === 'video') return target
  return null
}
