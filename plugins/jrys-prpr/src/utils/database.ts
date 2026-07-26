import fs from 'node:fs'
import type { Context } from 'koishi'
import type { Config } from '../types'

export interface OriginalImageRecord {
  messageId: string[]
  messageTime: string
  backgroundURL: string
}

function normalizeMessageIds(messageId: unknown): string[] {
  if (!messageId) return []
  if (Array.isArray(messageId)) {
    return Array.from(new Set(messageId.map(item => String(item)).filter(Boolean)))
  }
  return [String(messageId)].filter(Boolean)
}

function normalizeOriginalImageRecord(record: any): OriginalImageRecord | null {
  if (!record || typeof record !== 'object') return null
  const messageTime = typeof record.messageTime === 'string' ? record.messageTime : ''
  const backgroundURL = typeof record.backgroundURL === 'string' ? record.backgroundURL : ''
  const messageId = normalizeMessageIds(record.messageId)
  if (!messageTime || !backgroundURL) return null
  return { messageId, messageTime, backgroundURL }
}

function readOriginalImageRecords(jsonFilePath: string): OriginalImageRecord[] {
  try {
    if (!fs.existsSync(jsonFilePath)) return []
    const raw = fs.readFileSync(jsonFilePath, 'utf-8')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeOriginalImageRecord).filter(Boolean) as OriginalImageRecord[]
  } catch {
    return []
  }
}

function writeOriginalImageRecords(jsonFilePath: string, records: OriginalImageRecord[]): void {
  fs.writeFileSync(jsonFilePath, JSON.stringify(records, null, 2), 'utf-8')
}

export async function recordSignIn(ctx: Context, userId: string, channelId: string): Promise<void> {
  const dateString = new Date().toISOString().split('T')[0]
  const [record] = await ctx.database.get('jrysprprdata', { userid: userId, channelId })

  if (record) {
    await ctx.database.set('jrysprprdata', { userid: userId, channelId }, { lastSignIn: dateString })
  } else {
    await ctx.database.create('jrysprprdata', { userid: userId, channelId, lastSignIn: dateString })
  }
}

export async function alreadySignedInToday(ctx: Context, userId: string, channelId: string, config: Config): Promise<boolean> {
  const dateString = new Date().toISOString().split('T')[0]

  if (!config.Repeated_signin_for_different_groups) {
    const records = await ctx.database.get('jrysprprdata', { userid: userId })
    return records.some(record => record.lastSignIn === dateString)
  }

  const [record] = await ctx.database.get('jrysprprdata', { userid: userId, channelId })
  return !!record && record.lastSignIn === dateString
}

export async function updateUserCurrency(
  ctx: Context,
  uid: string,
  amount: number,
  currency: string,
  logInfo: (...args: any[]) => void
): Promise<string> {
  try {
    const numericUserId = Number(uid)
    if (amount > 0) {
      await ctx.monetary.gain(numericUserId, amount, currency)
      logInfo(`updated currency for ${uid}: +${amount} ${currency}`)
    } else if (amount < 0) {
      await ctx.monetary.cost(numericUserId, -amount, currency)
      logInfo(`updated currency for ${uid}: ${amount} ${currency}`)
    }
    return `user ${uid} updated by ${Math.abs(amount)} ${currency}`
  } catch (error) {
    ctx.logger.error(`failed to update currency for ${uid}: ${error}`)
    return `failed to update currency for ${uid}`
  }
}

export async function getUserCurrency(ctx: Context, uid: string, currency: string): Promise<number> {
  try {
    const numericUserId = Number(uid)
    const [data] = await ctx.database.get('monetary', { uid: numericUserId, currency }, ['value'])
    return data ? data.value : 0
  } catch (error) {
    ctx.logger.error(`failed to get currency for ${uid}: ${error}`)
    return 0
  }
}

export async function recordOriginalImage(
  ctx: Context,
  jsonFilePath: string,
  record: Partial<OriginalImageRecord>,
  logInfo: (...args: any[]) => void
): Promise<void> {
  try {
    const nextRecord = normalizeOriginalImageRecord(record)
    if (!nextRecord) return

    const current = readOriginalImageRecords(jsonFilePath)
    const filtered = current.filter(item => {
      if (item.messageTime === nextRecord.messageTime) return false
      return !item.messageId.some(id => nextRecord.messageId.includes(id))
    })

    filtered.unshift(nextRecord)
    writeOriginalImageRecords(jsonFilePath, filtered.slice(0, 100))
    logInfo(`recorded original image cache: ${nextRecord.messageTime}`)
  } catch (error) {
    ctx.logger.error(`failed to write original image cache: ${error}`)
  }
}

export async function getOriginalImageURL(ctx: Context, jsonFilePath: string, messageIdOrTime: string): Promise<string | null> {
  try {
    const images = readOriginalImageRecords(jsonFilePath)
    const input = String(messageIdOrTime)
    const isTimestamp = /^\d{15,}$/.test(input)

    for (const image of images) {
      if (isTimestamp) {
        if (image.messageTime === input) return image.backgroundURL
      } else if (image.messageId.includes(input)) {
        return image.backgroundURL
      } else if (image.messageId.length === 0 && image.messageTime === input) {
        return image.backgroundURL
      }
    }

    return null
  } catch (error) {
    ctx.logger.error(`failed to read original image cache: ${error}`)
    throw error
  }
}
