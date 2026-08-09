import { h, type Context, type Session } from 'koishi'
import { } from '@koishijs/assets'
import { pathToFileURL } from 'node:url'

import type { Config } from './config'
import type { PluginLogger } from './logger'
import { isLocalResource, resolveLocalPath } from './path'

const resourceTypes = new Set(['img', 'image', 'audio', 'video', 'file'])
const assetsSupportedTypes = new Set(['img', 'audio', 'video'])

interface ResourceRef {
  key: 'src' | 'url'
  source: string
}

function getResourceRef(element: h): ResourceRef | null {
  for (const key of ['src', 'url'] as const) {
    const source = element.attrs[key]
    if (typeof source === 'string' && source.trim()) {
      return { key, source }
    }
  }
  return null
}

/** 读取本地文件并生成 data URL */
async function toBase64Source(ctx: Context, localPath: string, logger: PluginLogger): Promise<string | null> {
  try {
    const file = await ctx.http.file(pathToFileURL(localPath).href)
    const type = file.type || file.mime || 'application/octet-stream'
    return `data:${type};base64,${Buffer.from(file.data).toString('base64')}`
  } catch (error) {
    logger.error(`读取本地文件失败: ${localPath}`, error)
    return null
  }
}

/** 使用 assets 服务转换元素，兼容只返回 URL 的 assets 实现 */
async function toAssetsElements(
  ctx: Context,
  element: h,
  localPath: string,
  logger: PluginLogger,
): Promise<h[] | null> {
  if (!ctx.assets) {
    logger.error('assets 服务不可用，请安装 assets 服务插件')
    return null
  }

  try {
    const transformed = await ctx.assets.transform(element.toString())
    const parsed = h.parse(transformed)
    if (!parsed.length) return null

    const ref = getResourceRef(element)
    if (parsed.length === 1 && parsed[0].type === 'text' && ref) {
      element.attrs[ref.key] = transformed.trim()
      return [element]
    }

    const target = parsed[0]
    const targetRef = resourceTypes.has(target.type) ? getResourceRef(target) : null
    if (ref && targetRef && typeof target.attrs[targetRef.key] === 'string') {
      if (target.attrs[targetRef.key] === ref.source) return null
      element.attrs[ref.key] = target.attrs[targetRef.key]
      return [element]
    }

    return parsed
  } catch (error) {
    logger.error(`assets 转换失败: ${localPath}`, error)
    return null
  }
}

interface TransformState {
  changed: boolean
}

/** 递归遍历消息元素，转换其中的本地媒体文件 */
async function transformElements(
  ctx: Context,
  config: Config,
  elements: h[],
  state: TransformState,
  logger: PluginLogger,
): Promise<void> {
  for (let index = 0; index < elements.length; index++) {
    const element = elements[index]
    const ref = resourceTypes.has(element.type) ? getResourceRef(element) : null

    if (ref && isLocalResource(ref.source)) {
      const localPath = resolveLocalPath(ref.source, ctx.baseDir)
      if (localPath) {
        logger.debug(`转换本地资源: ${element.type} -> ${localPath}`)

        // 默认 assets 服务只处理 img/audio/video，文件元素回退为 base64
        if (config.mode === 'assets' && assetsSupportedTypes.has(element.type)) {
          const replaced = await toAssetsElements(ctx, element, localPath, logger)
          if (replaced) {
            elements.splice(index, 1, ...replaced)
            index += replaced.length - 1
            state.changed = true
            continue
          }
        } else {
          const dataUrl = await toBase64Source(ctx, localPath, logger)
          if (dataUrl) {
            element.attrs[ref.key] = dataUrl
            state.changed = true
            logger.debug(`转换完成: ${element.type} ${ref.key}=${dataUrl.slice(0, 80)}...`)
          }
        }
      }
    }

    await transformElements(ctx, config, element.children, state, logger)
  }
}

/** before-send 入口：解析消息，转换后写回 session.content */
export async function transformBeforeSend(
  ctx: Context,
  session: Session,
  config: Config,
  logger: PluginLogger,
): Promise<void> {
  if (!session.content) return

  try {
    const elements = h.parse(session.content)
    const state: TransformState = { changed: false }
    await transformElements(ctx, config, elements, state, logger)

    if (state.changed) {
      session.content = elements.map((element) => element.toString()).join('')
    }
  } catch (error) {
    logger.error('before-send 转换失败，保留原消息', error)
  }
}
