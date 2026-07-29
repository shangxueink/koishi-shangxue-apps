import { Context, Logger, Schema } from 'koishi'

import { createFurryCodec, type FurryCodec, type FurryCodecConfig } from './shouyu'

export const name = 'furry-encode-decode'

export interface Config {
  loggerinfo: boolean
  encryptMethod: 'legacy' | 'msbt' | 'custom'
  customCodebook: string
}

export const Config: Schema<Config> = Schema.object({
  loggerinfo: Schema.boolean().default(false).description('调试日志开关'),
  encryptMethod: Schema.union([
    Schema.const('legacy').description('嗷呜啊~'),
    Schema.const('msbt').description('呃嗯！呼～❤呃啊～哼！！呃嗯哈嗯～啊'),
    Schema.const('custom').description('自定义'),
  ]).role('radio').default('legacy').description('加密方式'),
  customCodebook: Schema.string().default('嗷呜啊~').description('自定义加密字符串，必须是 4 个不重复字符'),
})

const logger = new Logger('furry-encode-decode')

function logDebug(config: Config, message: string, error?: unknown) {
  if (!config.loggerinfo) return
  if (error !== undefined) {
    logger.info(`${message}: %o`, error)
    return
  }
  logger.info(message)
}

function formatError(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}

function createCodec(config: Config): FurryCodec | null {
  const codecConfig: FurryCodecConfig = {
    mode: config.encryptMethod,
    customCodebook: config.customCodebook,
  }

  try {
    return createFurryCodec(codecConfig)
  } catch (error) {
    logger.error('兽语编码器初始化失败: %s', formatError(error))
    return null
  }
}

async function handleCommand(config: Config, codec: FurryCodec | null, text: string | undefined, operation: 'encode' | 'decode') {
  if (!codec) {
    return '插件配置有误，请检查“加密方式”和“自定义加密字符串”'
  }

  const input = text?.trim()
  if (!input) {
    return '请输入要处理的内容'
  }

  try {
    const output = operation === 'encode' ? codec.encode(input) : codec.decode(input)
    logDebug(config, `${operation} 完成`)
    return output
  } catch (error) {
    logDebug(config, `${operation} 失败`, error)
    return formatError(error)
  }
}

export function apply(ctx: Context, config: Config) {
  const codec = createCodec(config)

  ctx.command('兽语加密 [text:text]')
    .action(async (_, text) => {
      return handleCommand(config, codec, text, 'encode')
    })

  ctx.command('兽语解密 [text:text]')
    .action(async (_, text) => {
      return handleCommand(config, codec, text, 'decode')
    })
}
