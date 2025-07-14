import { Context, Schema } from 'koishi'

export const name = 'qq-real-id'

export interface Config {
  overrideUserId: boolean
  logRealId: boolean
}

export const Config: Schema<Config> = Schema.object({
  overrideUserId: Schema.boolean().default(true).description('是否覆盖原始 userId 为真实 QQ 号'),
  logRealId: Schema.boolean().default(false).description('是否在日志中记录解析到的真实 QQ 号')
})

export function apply(ctx: Context, config: Config) {

  ctx.middleware(async (session, next) => {
    // 只处理 QQ 平台的消息
    if (session.platform !== 'qq') return next()

    try {
      // 获取消息场景扩展数据
      const messageScene = session.event._data?.d?.message_scene
      if (!messageScene || !messageScene.ext) return

      // 查找并提取msg_idx参数
      const msgIdxEntry = messageScene.ext.find(e => e.startsWith('msg_idx='))
      if (!msgIdxEntry) return

      const msgIdxValue = msgIdxEntry.split('=')[1].replace('REFIDX_', '')
      const buffer = Buffer.from(msgIdxValue, 'base64')
      const decodedData = decodePbData(buffer)

      // 获取真实QQ号
      const realQQId = decodedData[3]?.toString()

      if (realQQId && realQQId !== '0') {
        if (config.logRealId) {
          ctx.logger.info(`消息发送者真实QQ: ${realQQId}, 原始userId: ${session.userId}`)
        }

        // 根据配置决定是否覆盖原始userId
        if (config.overrideUserId) {
          session.userId = realQQId
          session.event.user.id = realQQId
        }

        // 在session中添加额外的realQQId属性，即使不覆盖userId也可以访问
        session['realQQId'] = realQQId
      }
    } catch (error) {
      ctx.logger.error('[qq-real-id] 解析消息索引时出错:', error)
    }
    return next()
  }, true)


  //   ctx.middleware(async (session, next) => {
  //   if (session.platform !== "qq") return next()
  //   ctx.logger.info("========================")
  //   ctx.logger.info(`[${session.event.user.id}|${session.userId}]:${session._stripped.content}`)

  //   ctx.logger.info("========================")
  // })
}


function decodePbData(buffer: Buffer): any[] {
  const result = []
  let offset = 0

  while (offset < buffer.length) {
    const tag = buffer[offset]
    offset++

    const fieldNumber = tag >> 3
    const wireType = tag & 0x7

    let value: number | bigint | Buffer | undefined;

    if (wireType === 0) {
      // Varint
      const { value: v, bytesRead } = decodeVarint(buffer, offset)
      value = v
      offset += bytesRead
    } else if (wireType === 1) {
      value = buffer.readBigUInt64LE(offset)
      offset += 8
    } else if (wireType === 2) {
      // Length-delimited
      const { value: lenBigInt, bytesRead } = decodeVarint(buffer, offset)

      // 将 bigint 转换为 number
      const len = Number(lenBigInt);
      if (lenBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
        // 警告或抛出错误，如果长度超出 JavaScript number 的安全范围
        console.warn('Decoded length exceeds Number.MAX_SAFE_INTEGER. Data might be truncated.');
      }

      offset += bytesRead
      value = buffer.slice(offset, offset + len) // 现在 offset 和 len 都是 number
      offset += len
    } else if (wireType === 5) {
      // 32-bit (fixed32)
      value = buffer.readUInt32LE(offset)
      offset += 4
    } else {
      throw new Error(`Unsupported wireType: ${wireType}`)
    }

    result[fieldNumber] = value
  }

  return result
}

function decodeVarint(buffer: Buffer, offset: number): { value: bigint, bytesRead: number } {
  let result = 0n
  let shift = 0
  let bytesRead = 0
  let byte

  do {
    if (offset + bytesRead >= buffer.length) {
      throw new Error('Unexpected end of buffer during varint decoding')
    }

    byte = buffer[offset + bytesRead]
    const byteValue = BigInt(byte & 0x7f)
    result |= byteValue << BigInt(shift)
    shift += 7
    bytesRead++
  } while (byte & 0x80)

  return { value: result, bytesRead }
}

