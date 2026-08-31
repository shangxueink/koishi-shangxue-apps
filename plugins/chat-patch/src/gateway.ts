import { Context } from 'koishi'
import { Opcode } from '@satorijs/protocol'
import {} from '@koishijs/plugin-http'
import type { WebSocket } from '@koishijs/plugin-http'
import {} from '@koishijs/plugin-server'
import {} from '@satorijs/plugin-server'

import { Config } from './config'
import { ChatDatabase } from './database'
import { PluginLogger } from './logger'
import { Recorder } from './recorder'
import { resolveSatoriEndpoint, toSatoriEventUrl } from './satori'
import { SatoriEventPayload, SatoriLoginInfo } from './types'

const WS_OPEN = 1
const RECONNECT_MAX_DELAY = 30000

export type SatoriGatewayPayload =
  | { kind: 'ready'; logins: SatoriLoginInfo[] }
  | { kind: 'event'; event: SatoriEventPayload }
  | { kind: 'status'; online: boolean }

type SatoriGatewayHandler = (payload: SatoriGatewayPayload) => void

function getObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : {}
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function getNumber(value: unknown): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

export class SatoriGateway {
  private socket?: WebSocket
  private pingDispose?: () => void
  private reconnectDispose?: () => void
  private stopped = true
  private retry = 0
  private sequence = 0
  private logins: SatoriLoginInfo[] = []
  private online = false

  constructor(
    private ctx: Context,
    private config: Config,
    private database: ChatDatabase,
    private recorder: Recorder,
    private logger: PluginLogger,
    private onPayload: SatoriGatewayHandler,
  ) {}

  async start() {
    this.stopped = false
    this.retry = 0
    this.sequence = await this.loadSequence()
    this.connect()
  }

  dispose() {
    this.stopped = true
    this.pingDispose?.()
    this.reconnectDispose?.()
    this.socket?.close()
    this.socket = undefined
    this.setOnline(false)
  }

  getLogins(): SatoriLoginInfo[] {
    return this.logins.map((item) => ({ ...item }))
  }

  private async loadSequence(): Promise<number> {
    const value = await this.database.getMeta('satori:sn')
    return getNumber(value)
  }

  private connect() {
    if (this.stopped) return
    let socket: WebSocket
    try {
      socket = this.ctx.http.ws(toSatoriEventUrl(resolveSatoriEndpoint(this.ctx)))
    } catch (error) {
      this.logger.warn('Satori 连接创建失败:', error)
      this.scheduleReconnect()
      return
    }
    this.socket = socket

    socket.addEventListener('open', () => {
      if (this.socket !== socket) {
        socket.close()
        return
      }
      this.retry = 0
      this.setOnline(true)
      socket.send(JSON.stringify({
        op: Opcode.IDENTIFY,
        body: {
          token: this.token,
          sn: this.sequence || undefined,
        },
      }))
      if (!this.pingDispose) {
        this.pingDispose = this.ctx.setInterval(() => {
          if (this.socket?.readyState === WS_OPEN) {
            this.socket.send(JSON.stringify({ op: Opcode.PING, body: {} }))
          }
        }, 10000)
      }
    })

    socket.addEventListener('message', (event) => {
      void this.handleMessage(event.data).catch((error) => {
        this.logger.warn('Satori 事件处理失败:', error)
      })
    })

    socket.addEventListener('close', () => {
      if (this.socket === socket) this.socket = undefined
      this.pingDispose?.()
      this.pingDispose = undefined
      this.setOnline(false)
      this.scheduleReconnect()
    })

    socket.addEventListener('error', () => {
      socket.close()
    })
  }

  private get token(): string {
    return getString(this.ctx.satori?.server?.config?.token)
  }

  private scheduleReconnect() {
    if (this.stopped || this.reconnectDispose) return
    const delay = Math.min(RECONNECT_MAX_DELAY, 1000 * 2 ** this.retry)
    this.retry += 1
    this.logger.logInfo('Satori 将在', delay, 'ms 后重连')
    this.reconnectDispose = this.ctx.setTimeout(() => {
      this.reconnectDispose = undefined
      this.connect()
    }, delay)
  }

  private async handleMessage(data: unknown) {
    let payload: { op?: unknown; body?: unknown }
    try {
      payload = JSON.parse(String(data)) as { op?: unknown; body?: unknown }
    } catch {
      this.logger.warn('Satori 消息解析失败')
      return
    }

    if (payload.op === Opcode.READY) {
      const body = getObject(payload.body)
      this.logins = this.normalizeLogins(body.logins)
      this.onPayload({ kind: 'ready', logins: this.getLogins() })
      return
    }

    if (payload.op !== Opcode.EVENT) return

    const body = getObject(payload.body)
    const sn = getNumber(body.sn)
    if (sn) {
      this.sequence = sn
      void this.database.setMeta('satori:sn', sn).catch((error) => {
        this.logger.warn('Satori sequence 保存失败:', error)
      })
    }

    const login = getObject(body.login)
    const loginUser = getObject(login.user)
    const platform = getString(body.platform) || getString(login.platform)
    const selfId = getString(body.self_id) || getString(body.selfId) || getString(loginUser.id)
    const event: SatoriEventPayload = {
      type: getString(body.type),
      platform,
      selfId,
      timestamp: getNumber(body.timestamp) || Date.now(),
      sn,
      body,
    }
    if (this.isBlocked(platform)) return

    try {
      await this.recorder.handleEvent(body)
    } catch (error) {
      this.logger.warn('Satori 消息写入失败:', error)
    }
    this.onPayload({ kind: 'event', event })
  }

  private normalizeLogins(value: unknown): SatoriLoginInfo[] {
    if (!Array.isArray(value)) return []
    const result: SatoriLoginInfo[] = []
    for (const item of value) {
      const login = getObject(item)
      const user = getObject(login.user)
      const platform = getString(login.platform) || getString(user.platform)
      const selfId = getString(login.self_id) || getString(login.selfId) || getString(user.id)
      if (!platform || !selfId || this.isBlocked(platform)) continue
      result.push({
        platform,
        selfId,
        name: getString(user.name) || getString(user.nick) || getString(user.nickname) || selfId,
        avatar: getString(user.avatar) || undefined,
        status: getNumber(login.status),
        features: Array.isArray(login.features) ? login.features.map(String) : [],
      })
    }
    return result
  }

  private isBlocked(platform: string): boolean {
    return (this.config.blockedPlatforms ?? []).some((item) => {
      return item.exactMatch
        ? platform === item.platformName
        : platform.includes(item.platformName)
    })
  }

  private setOnline(online: boolean) {
    if (this.online === online) return
    this.online = online
    this.onPayload({ kind: 'status', online })
  }
}
