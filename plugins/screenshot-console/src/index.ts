import { Context, h, Logger, Schema, Session } from 'koishi'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { } from 'koishi-plugin-puppeteer'

export const name = 'screenshot-console'
export const inject = ['puppeteer', 'server']

type SearchMapping = {
  key: string
  value: string
}

type BoundEmail = {
  userId: string
  email: string
}

type MarketPackage = {
  name: string
  keywords: string[]
  descriptions: string[]
  emails: string[]
  shortname: string
  version: string
  updatedAt: string
  createdAt: string
  publishTime: number
  downloads: number
  rating: number
  packageSize: number
}

export interface Config {
  registryUrl: string
  proxyUrl: string
  proxyTimeout: number
  cacheDuration: number
  searchMappings: SearchMapping[]
  boundEmails: BoundEmail[]
  loggerinfo: boolean
}

const defaultSearchMappings: SearchMapping[] = [
  { key: '综合', value: '' },
  { key: '按评分', value: 'sort:rating' },
  { key: '按下载量', value: 'sort:download' },
  { key: '按创建时间', value: 'sort:created' },
  { key: '按更新时间', value: 'sort:updated' },
]

export const Config: Schema<Config> = Schema.object({
  registryUrl: Schema.string().role('link').default('https://registry.koishi.chat/index.json').description('插件市场索引地址'),
  proxyUrl: Schema.string().role('link').default('https://web-proxy.apifox.cn/api/v1/request').description('HTTP 代理地址'),
  proxyTimeout: Schema.natural().default(15000).description('HTTP 请求超时，单位为毫秒'),
  cacheDuration: Schema.natural().default(30).description('插件市场索引缓存时间，单位为分钟'),
  searchMappings: Schema.array(Schema.object({
    key: Schema.string().description('需转换'),
    value: Schema.string().description('转换为'),
  })).role('table').default(defaultSearchMappings).description('插件市场搜索关键词映射'),
  boundEmails: Schema.array(Schema.object({
    userId: Schema.string().description('用户 ID，可填写平台前缀'),
    email: Schema.string().description('邮箱地址'),
  })).role('table').default([]).description('用户邮箱映射'),
  loggerinfo: Schema.boolean().default(false).description('调试日志开关').experimental(),
})

const htmlTemplate = readFileSync(resolve(__dirname, '../src/templates/market-result.html'), 'utf8')

const logger = new Logger(name)

function debugLog(enabled: boolean, ...args: unknown[]) {
  if (enabled) logger.info(args.map(String).join(' '))
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character)
}

function getBoundEmail(config: Config, session: Session, userId: string) {
  const candidates = [
    `${session.platform}:${userId}`,
    userId,
  ]
  return config.boundEmails.find(item => candidates.includes(item.userId))?.email
}

function getDescriptions(packageData: Record<string, unknown>, object: Record<string, unknown>) {
  const manifest = object.manifest as Record<string, unknown> | undefined
  const packageDescription = typeof packageData?.description === 'string' ? packageData.description : ''
  const descriptions = manifest?.description as Record<string, unknown> | undefined
  const manifestDescriptions = descriptions
    ? Object.values(descriptions).filter((item): item is string => typeof item === 'string')
    : []
  return [...new Set([packageDescription, ...manifestDescriptions].filter(Boolean))]
}

function getStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function getEmailArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.flatMap(item => {
    if (!item || typeof item !== 'object' || !('email' in item) || typeof item.email !== 'string') return []
    return [item.email]
  })
}

function parseObject(object: Record<string, unknown>): MarketPackage | null {
  const packageData = object.package as Record<string, unknown> | undefined
  if (!packageData || typeof packageData.name !== 'string') return null

  const updatedAt = typeof object.updatedAt === 'string' ? object.updatedAt : ''
  const createdAt = typeof object.createdAt === 'string' ? object.createdAt : ''
  const date = typeof packageData.date === 'string' ? packageData.date : ''
  const publishTime = typeof packageData.publish_time === 'number'
    ? packageData.publish_time
    : Date.parse(updatedAt || date) || 0

  return {
    name: packageData.name,
    keywords: getStringArray(packageData.keywords),
    descriptions: getDescriptions(packageData, object),
    emails: getEmailArray(packageData.maintainers),
    shortname: typeof object.shortname === 'string' ? object.shortname : '',
    version: typeof packageData.version === 'string' ? packageData.version : '',
    updatedAt: updatedAt || date,
    createdAt,
    publishTime,
    downloads: getDownloads(object),
    rating: getNumber(object, 'rating'),
    packageSize: getNumber(object, 'installSize') || getNumber(object, 'publishSize'),
  }
}

function getNumber(object: Record<string, unknown>, key: string) {
  const value = object[key]
  return typeof value === 'number' ? value : 0
}

function getDownloads(object: Record<string, unknown>) {
  const downloads = object.downloads
  if (!downloads || typeof downloads !== 'object') return 0
  const lastMonth = (downloads as Record<string, unknown>).lastMonth
  return typeof lastMonth === 'number' ? lastMonth : 0
}

function findObjectEnd(text: string, start: number) {
  let depth = 0
  let quoted = false
  let escaped = false
  for (let index = start; index < text.length; index++) {
    const character = text[index]
    if (quoted) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === '"') quoted = false
      continue
    }
    if (character === '"') {
      quoted = true
      continue
    }
    if (character === '{') depth++
    else if (character === '}' && --depth === 0) return index + 1
  }
  return -1
}

function findPropertyObject(text: string, property: string) {
  const propertyIndex = text.indexOf(`"${property}"`)
  if (propertyIndex < 0) return null
  const objectStart = text.indexOf('{', propertyIndex)
  if (objectStart < 0) return null
  const objectEnd = findObjectEnd(text, objectStart)
  return objectEnd < 0 ? null : text.slice(objectStart, objectEnd)
}

function parsePackageObject(objectText: string) {
  const packageText = findPropertyObject(objectText, 'package')
  if (!packageText) return null
  try {
    const packageData = JSON.parse(packageText) as Record<string, unknown>
    const object = {
      package: packageData,
      manifest: findPropertyObject(objectText, 'manifest')
        ? JSON.parse(findPropertyObject(objectText, 'manifest') as string) as Record<string, unknown>
        : undefined,
      shortname: readStringProperty(objectText, 'shortname'),
      updatedAt: readStringProperty(objectText, 'updatedAt'),
      createdAt: readStringProperty(objectText, 'createdAt'),
      downloads: readProperty(objectText, 'downloads'),
      rating: readNumberProperty(objectText, 'rating'),
    } as Record<string, unknown>
    return parseObject(object)
  } catch {
    return null
  }
}

function readStringProperty(text: string, property: string) {
  const match = text.match(new RegExp(`"${escapeRegExp(property)}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`))
  if (!match) return ''
  try {
    return JSON.parse(`"${match[1]}"`) as string
  } catch {
    return ''
  }
}

function readNumberProperty(text: string, property: string) {
  const match = text.match(new RegExp(`"${escapeRegExp(property)}"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`))
  return match ? Number(match[1]) : 0
}

function readProperty(text: string, property: string) {
  const propertyIndex = text.indexOf(`"${property}"`)
  if (propertyIndex < 0) return undefined
  const objectStart = text.indexOf('{', propertyIndex)
  if (objectStart < 0) return undefined
  const objectEnd = findObjectEnd(text, objectStart)
  if (objectEnd < 0) return undefined
  try {
    return JSON.parse(text.slice(objectStart, objectEnd)) as Record<string, unknown>
  } catch {
    return undefined
  }
}

function scanRegistry(text: string, regexes: RegExp[]) {
  const results: MarketPackage[] = []
  const objectsIndex = text.indexOf('"objects"')
  const arrayStart = text.indexOf('[', objectsIndex)
  if (objectsIndex < 0 || arrayStart < 0) return results

  // 按 objects 数组中的顶层对象逐个处理，避免把整个索引反序列化。
  for (let index = arrayStart + 1; index < text.length;) {
    while (/\s|,/.test(text[index] || '')) index++
    if (text[index] !== '{') break
    const objectEnd = findObjectEnd(text, index)
    if (objectEnd < 0) break
    const objectText = text.slice(index, objectEnd)
    const item = parsePackageObject(objectText)
    if (item && regexes.every(regex => getSearchText(item).some(value => regex.test(value)))) results.push(item)
    index = objectEnd
  }
  return results
}

function getSearchText(item: MarketPackage) {
  return [item.name, item.shortname, ...item.keywords, ...item.descriptions, ...item.emails]
}

function isRegistryText(text: string) {
  const objectsIndex = text.indexOf('"objects"')
  return objectsIndex >= 0 && text.indexOf('[', objectsIndex) >= 0
}

async function requestText(ctx: Context, url: string, init: RequestInit, timeout: number) {
  let currentUrl = url
  for (let attempt = 0; attempt < 4; attempt++) {
    const controller = new AbortController()
    const dispose = ctx.on('dispose', () => controller.abort())
    const timer = ctx.setTimeout(() => controller.abort(), timeout)
    try {
      const response = await fetch(currentUrl, {
        ...init,
        redirect: 'manual',
        signal: controller.signal,
      })
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) throw new Error(`HTTP ${response.status} without location`)
        currentUrl = new URL(location, currentUrl).href
        continue
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const text = await response.text()
      if (!isRegistryText(text)) throw new Error('response is not a registry index')
      return text
    } finally {
      timer()
      dispose()
      controller.abort()
    }
  }
  throw new Error('too many redirects')
}

function firstSuccessful(tasks: Promise<string>[]) {
  return new Promise<string>((resolve, reject) => {
    let pending = tasks.length
    let lastError: unknown
    for (const task of tasks) {
      task.then(resolve).catch(error => {
        lastError = error
        pending--
        if (pending === 0) reject(lastError)
      })
    }
  })
}

async function requestRegistry(ctx: Context, config: Config) {
  const proxyHeaders = {
    'api-u': config.registryUrl,
    'api-o0': `method=GET, timings=true, timeout=${config.proxyTimeout}`,
    'Content-Type': 'application/json',
  }
  return firstSuccessful([
    requestText(ctx, config.registryUrl, {}, config.proxyTimeout),
    requestText(ctx, config.proxyUrl, {
      method: 'POST',
      headers: proxyHeaders,
      body: '{}',
    }, config.proxyTimeout),
  ])
}

function renderResults(items: MarketPackage[]) {
  const results = items.slice(0, 9).map(item => `
    <article class="item">
      <div class="name">${escapeHtml(item.name)}</div>
      <div class="stats">
        <span>评分 ${item.rating.toFixed(2)}</span>
        <span>最新版本 ${escapeHtml(item.version || '未知')}</span>
        <span>包体积 ${formatBytes(item.packageSize)}</span>
        <span>月下载 ${formatCount(item.downloads)}</span>
      </div>
    </article>
  `).join('')
  return htmlTemplate.replace('<!--RESULTS-->', results || '<div class="empty">没有搜索到相关插件。</div>')
}

function formatCount(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value)
}

function formatBytes(value: number) {
  if (!value) return '未知'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`
  return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`
}

function getTokens(session: Session, config: Config, input: string) {
  return h.select(input, 'text, at').flatMap(element => {
    if (element.type === 'at') {
      const email = getBoundEmail(config, session, element.attrs.id)
      return email ? [`email:${email}`] : []
    }
    return element.attrs.content.split(/\s+/).filter(Boolean)
  })
}

export function apply(ctx: Context, config: Config) {
  let registryCache: { text: string; expiresAt: number } | null = null
  let registryTask: Promise<string> | null = null

  const getRegistry = async () => {
    const now = Date.now()
    if (registryCache && registryCache.expiresAt > now) {
      debugLog(config.loggerinfo, '使用插件市场索引缓存')
      return registryCache.text
    }
    if (!registryTask) {
      debugLog(config.loggerinfo, '刷新插件市场索引缓存')
      registryTask = requestRegistry(ctx, config)
        .then(text => {
          registryCache = {
            text,
            expiresAt: Date.now() + config.cacheDuration * 60 * 1000,
          }
          return text
        })
        .finally(() => {
          registryTask = null
        })
    }
    return registryTask
  }

  ctx.on('dispose', () => {
    registryCache = null
    registryTask = null
  })

  ctx.command('插件市场搜索 <keyword:text>', '插件市场搜索')
    .action(async ({ session }, keyword) => {
      const tokens = getTokens(session, config, keyword || '')
      if (!tokens.length) return '请输入搜索关键词。'

      const queries = tokens
        .map(token => config.searchMappings.find(item => item.key === token)?.value || token)
        .filter(Boolean)
      let sort = 'updated'
      const searchQueries = queries.filter(query => {
        if (query === 'sort:updated') {
          sort = 'updated'
          return false
        }
        if (query === 'sort:created') {
          sort = 'created'
          return false
        }
        if (query === 'sort:download') {
          sort = 'download'
          return false
        }
        if (query === 'sort:rating') {
          sort = 'rating'
          return false
        }
        return true
      })
      let regexes: RegExp[]
      try {
        // 搜索词默认直接作为正则表达式处理。
        regexes = searchQueries.map(query => new RegExp(query, 'i'))
      } catch {
        return '搜索关键词不是有效的正则表达式。'
      }

      try {
        debugLog(config.loggerinfo, '开始请求插件市场索引')
        const raw = await getRegistry()
        debugLog(config.loggerinfo, `索引长度 ${raw.length}`)
        const packages = scanRegistry(raw, regexes)
        packages.sort((left, right) => {
          if (sort === 'created') return Date.parse(right.createdAt) - Date.parse(left.createdAt)
          if (sort === 'download') return right.downloads - left.downloads
          if (sort === 'rating') return right.rating - left.rating
          return right.publishTime - left.publishTime
        })
        debugLog(config.loggerinfo, `搜索完成，命中 ${packages.length} 个插件`)

        const page = await ctx.puppeteer.page()
        try {
          await page.setViewport({ width: 1000, height: 900, deviceScaleFactor: 1 })
          await page.setContent(renderResults(packages), { waitUntil: 'load' })
          const result = await page.$('#result-root')
          if (!result) return '搜索失败。'
          return h.image(await result.screenshot({ captureBeyondViewport: false }), 'image/png')
        } finally {
          await page.close().catch(() => { })
        }
      } catch (error) {
        debugLog(config.loggerinfo, '插件市场搜索失败', error)
        return '插件市场搜索失败。'
      }
    })
}
