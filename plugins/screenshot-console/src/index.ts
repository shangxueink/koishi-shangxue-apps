import { Context, h, Logger, Schema, Session } from 'koishi'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { } from 'koishi-plugin-puppeteer'

export const name = 'screenshot-console'
export const inject = ['puppeteer', 'server']

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
}

type ColorTheme = 'black' | 'white' | 'gray'

export interface Config {
  registryUrl: string
  proxyUrl: string
  proxyTimeout: number
  cacheDuration: number
  colorTheme: ColorTheme
  boundEmails: BoundEmail[]
  loggerinfo: boolean
}

export const Config: Schema<Config> = Schema.object({
  registryUrl: Schema.string().role('link').default('https://registry.koishi.chat/index.json').description('插件市场索引地址'),
  proxyUrl: Schema.string().role('link').default('https://web-proxy.apifox.cn/api/v1/request').description('HTTP 代理地址'),
  proxyTimeout: Schema.natural().default(15000).description('HTTP 请求超时，单位为毫秒'),
  cacheDuration: Schema.natural().default(30).description('插件市场索引缓存时间，单位为分钟'),
  colorTheme: Schema.union([
    Schema.const('black').description('黑色'),
    Schema.const('white').description('白色'),
    Schema.const('gray').description('灰色'),
  ]).role('radio').default('gray').description('搜索结果颜色主题'),
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

const requestRetryCount = 2
const requestRetryDelay = 1000

class RegistryRequestError extends Error {
  constructor(message: string, readonly retryCount: number) {
    super(message)
    this.name = 'RegistryRequestError'
  }
}

function waitForRetry(ctx: Context, delay: number) {
  return new Promise<void>(resolve => {
    let settled = false
    let timer: () => void
    let dispose: () => void
    const finish = () => {
      if (settled) return
      settled = true
      timer()
      dispose()
      resolve()
    }
    timer = ctx.setTimeout(finish, delay)
    dispose = ctx.on('dispose', finish)
  })
}

function getRequestError(error: unknown) {
  if (error instanceof RegistryRequestError) return error.message
  if (error instanceof Error) return error.message || error.name
  return String(error)
}

async function requestText(ctx: Context, url: string, init: RequestInit, timeout: number, cancelSignal: AbortSignal) {
  let lastError: unknown = new Error('未知请求错误')
  let disposed = false
  const removeDispose = ctx.on('dispose', () => {
    disposed = true
  })

  try {
    for (let retry = 0; retry <= requestRetryCount; retry++) {
      let currentUrl = url
      let timedOut = false
      try {
        for (let redirect = 0; redirect < 4; redirect++) {
          if (disposed || cancelSignal.aborted) throw new Error('请求已取消')
          const controller = new AbortController()
          const abort = () => controller.abort()
          const removeAbort = ctx.on('dispose', abort)
          cancelSignal.addEventListener('abort', abort, { once: true })
          const timer = ctx.setTimeout(() => {
            timedOut = true
            controller.abort()
          }, timeout)
          try {
            const response = await fetch(currentUrl, {
              ...init,
              redirect: 'manual',
              signal: controller.signal,
            })
            if (response.status >= 300 && response.status < 400) {
              const location = response.headers.get('location')
              if (!location) throw new Error(`HTTP ${response.status}`)
              currentUrl = new URL(location, currentUrl).href
              continue
            }
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const text = await response.text()
            if (!isRegistryText(text)) throw new Error('返回内容不是有效索引')
            return text
          } catch (error) {
            if (disposed) throw new Error('请求已中止')
            if (cancelSignal.aborted) throw new Error('请求已取消')
            if (timedOut || (error instanceof Error && error.name === 'AbortError')) {
              throw new Error(`请求超时（${Math.ceil(timeout / 1000)} 秒）`)
            }
            throw error
          } finally {
            timer()
            removeAbort()
            cancelSignal.removeEventListener('abort', abort)
            controller.abort()
          }
        }
        throw new Error('重定向次数过多')
      } catch (error) {
        lastError = error
        if (disposed || cancelSignal.aborted) throw new RegistryRequestError(getRequestError(error), retry)
        if (retry < requestRetryCount) await waitForRetry(ctx, requestRetryDelay)
      }
    }
  } finally {
    removeDispose()
  }

  throw new RegistryRequestError(`${getRequestError(lastError)}（已重试 ${requestRetryCount} 次）`, requestRetryCount)
}

function firstSuccessful(tasks: Promise<string>[], cancelController: AbortController) {
  return new Promise<string>((resolve, reject) => {
    let pending = tasks.length
    const errors: string[] = []
    for (const task of tasks) {
      task.then(value => {
        cancelController.abort()
        resolve(value)
      }).catch(error => {
        errors.push(getRequestError(error))
        pending--
        if (pending === 0) {
          cancelController.abort()
          reject(new RegistryRequestError(errors.join('；'), requestRetryCount))
        }
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
  const cancelController = new AbortController()
  return firstSuccessful([
    requestText(ctx, config.registryUrl, {}, config.proxyTimeout, cancelController.signal),
    requestText(ctx, config.proxyUrl, {
      method: 'POST',
      headers: proxyHeaders,
      body: '{}',
    }, config.proxyTimeout, cancelController.signal),
  ], cancelController)
}

function renderResults(items: MarketPackage[], theme: ColorTheme) {
  const visibleItems = items.slice(0, 21)
  const columns = visibleItems.length <= 7 ? 1 : visibleItems.length <= 14 ? 2 : 3
  const results = visibleItems.map((item, index) => `
    <article class="item">
      <div class="result-index">${index + 1}</div>
      <div class="name">${escapeHtml(getShortName(item.name))}</div>
      <div class="stats">
        <span>评分 ${item.rating.toFixed(2)}</span>
        <span>最新版本 ${escapeHtml(item.version || '未知')}</span>
        <span>月下载 ${formatCount(item.downloads)}</span>
      </div>
    </article>
  `).join('')
  return htmlTemplate
    .replace('__THEME__', theme)
    .replace('__COLUMNS__', String(columns))
    .replace('<!--RESULTS-->', results || '<div class="empty">没有搜索到相关插件。</div>')
}

function formatCount(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value)
}

function getShortName(name: string) {
  const scopedPrefix = name.match(/^(@[^/]+)\/koishi-plugin-(.+)$/)
  if (scopedPrefix) return `${scopedPrefix[1]}/${scopedPrefix[2]}`
  return name.replace(/^koishi-plugin-/, '')
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

      const queries = tokens.filter(Boolean)
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
          await page.setContent(renderResults(packages, config.colorTheme), { waitUntil: 'load' })
          const result = await page.$('#result-root')
          if (!result) return '搜索失败。'
          return h.image(await result.screenshot({ captureBeyondViewport: false }), 'image/png')
        } finally {
          await page.close().catch(() => { })
        }
      } catch (error) {
        debugLog(config.loggerinfo, '插件市场搜索失败', error)
        return `插件市场搜索失败：${getRequestError(error)}`
      }
    })
}
