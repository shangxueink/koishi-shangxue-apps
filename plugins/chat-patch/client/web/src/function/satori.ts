// Satori 协议客户端：负责 WebSocket 事件与 HTTP API 请求。

export interface SatoriBootstrap {
  endpoint: string
  token: string
  basePath: string
  blockedPlatforms: Array<{
    platformName: string
    exactMatch: boolean
  }>
}

export interface SatoriLogin {
  platform: string
  selfId: string
  name: string
  avatar?: string
  status: number
  features?: string[]
}

export interface SatoriEvent {
  type: string
  platform: string
  selfId: string
  timestamp: number
  sn: number
  body: Record<string, unknown>
}

// 同一机器人 ID 可能同时存在于不同平台（例如 qq / qqguild），用平台 + ID 做唯一键
export function botKey(platform: string, selfId: string): string {
  return [platform, selfId].map((value) => encodeURIComponent(value)).join(':')
}

interface PendingConsoleRequest {
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}

let bootstrap: SatoriBootstrap | null = null
let bootstrapPromise: Promise<SatoriBootstrap> | null = null
let logins: SatoriLogin[] = []
let activeBot: { platform: string; selfId: string } | null = null
let sequence = Number(localStorage.getItem('chat-patch:sn') ?? 0)
const pendingConsole = new Map<string, PendingConsoleRequest>()
let consoleRequestId = 0
let resolveBootstrapCallback: ((value: SatoriBootstrap) => void) | null = null
let bootstrapTimeout = 0

function getString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function getObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
}

function isBlockedPlatform(
  platform: string,
  blockedPlatforms: SatoriBootstrap['blockedPlatforms'],
): boolean {
  return (blockedPlatforms ?? []).some((item) => {
    return item.exactMatch
      ? platform === item.platformName
      : platform.includes(item.platformName)
  })
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`Satori API 返回 ${response.status}`)
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error(`Satori API 返回了非 JSON 内容: ${text.slice(0, 120)}`)
  }
}

function normalizeEndpoint(endpoint: string): string {
  const raw = endpoint.startsWith('undefined') ? endpoint.slice(9) : endpoint
  if (import.meta.env.DEV) {
    const url = /^https?:\/\//i.test(raw)
      ? new URL(raw)
      : new URL(raw, location.origin)
    return `${location.origin}${url.pathname}`.replace(/\/+$/, '')
  }
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, '')
  return `${location.origin}${raw.startsWith('/') ? raw : `/${raw}`}`.replace(/\/+$/, '')
}

function resolveBootstrap(): Promise<SatoriBootstrap> {
  if (bootstrap) return Promise.resolve(bootstrap)
  if (bootstrapPromise) return bootstrapPromise

  bootstrapPromise = new Promise<SatoriBootstrap>((resolve, reject) => {
    resolveBootstrapCallback = resolve
    bootstrapTimeout = window.setTimeout(() => {
      resolveBootstrapCallback = null
      bootstrapPromise = null
      reject(new Error('等待 Satori bootstrap 超时'))
    }, 10000)
  })

  window.parent.postMessage({ source: 'chat-patch-ready' }, '*')
  return bootstrapPromise
}

function receiveBootstrap(data: Record<string, unknown>) {
  const payload = getObject(data.payload)
  bootstrap = {
    endpoint: getString(payload.endpoint) || '/satori',
    token: getString(payload.token),
    basePath: getString(payload.basePath) || '/chat-patch',
    blockedPlatforms: Array.isArray(payload.blockedPlatforms)
      ? payload.blockedPlatforms as SatoriBootstrap['blockedPlatforms']
      : [],
  }
  window.clearTimeout(bootstrapTimeout)
  resolveBootstrapCallback?.(bootstrap)
  resolveBootstrapCallback = null
}

window.addEventListener('message', (event) => {
  const data = getObject(event.data)
  if (getString(data.source) === 'chat-patch-bootstrap') {
    receiveBootstrap(data)
  }
})

function wsUrl(): string {
  const endpoint = normalizeEndpoint(bootstrap?.endpoint || '/satori')
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const url = new URL(endpoint)
  return `${protocol}//${url.host}${url.pathname}/v1/events`
}

export function getBootstrap(): Promise<SatoriBootstrap> {
  return resolveBootstrap()
}

export function getBlockedPlatforms(): SatoriBootstrap['blockedPlatforms'] {
  return bootstrap?.blockedPlatforms ?? []
}

export function getLogins(): SatoriLogin[] {
  return logins
}

export function getActiveBot(): { platform: string; selfId: string } | null {
  return activeBot
}

export function setActiveBot(platform: string, selfId: string) {
  activeBot = { platform, selfId }
}

export function getSequence(): number {
  return sequence
}

export async function request(
  method: string,
  params: Record<string, unknown> = {},
  bot: { platform?: string; selfId?: string } | null = activeBot,
): Promise<unknown> {
  const info = await resolveBootstrap()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (info.token) headers.Authorization = `Bearer ${info.token}`
  if (bot?.platform) headers['Satori-Platform'] = bot.platform
  if (bot?.selfId) headers['Satori-User-ID'] = bot.selfId

  const response = await fetch(`${normalizeEndpoint(info.endpoint)}/v1/${method}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  })
  return parseJsonResponse(response)
}

export async function upload(files: File[], bot: { platform: string; selfId: string }): Promise<unknown> {
  const info = await resolveBootstrap()
  const form = new FormData()
  for (const file of files) form.append('file', file, file.name)
  const headers: Record<string, string> = {}
  if (info.token) headers.Authorization = `Bearer ${info.token}`
  headers['Satori-Platform'] = bot.platform
  headers['Satori-User-ID'] = bot.selfId

  const response = await fetch(`${normalizeEndpoint(info.endpoint)}/v1/upload.create`, {
    method: 'POST',
    headers,
    body: form,
  })
  return parseJsonResponse(response)
}

export function requestConsole(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const id = ++consoleRequestId
  return new Promise((resolve, reject) => {
    pendingConsole.set(String(id), { resolve, reject })
    window.parent.postMessage({
      source: 'chat-patch-request',
      id,
      method,
      params,
    }, '*')
  })
}

export function handleConsoleResponse(data: Record<string, unknown>) {
  const id = getString(data.id)
  const pending = pendingConsole.get(id)
  if (!pending) return
  pendingConsole.delete(id)
  if (data.ok === false) {
    pending.reject(new Error(getString(data.error) || 'console 请求失败'))
  } else {
    pending.resolve(data.payload)
  }
}

export function connect(
  onEvent: (event: SatoriEvent) => void,
  onReady: (logins: SatoriLogin[]) => void,
  onStatus: (online: boolean) => void,
): () => void {
  let socket: WebSocket | null = null
  let pingTimer = 0
  let reconnectTimer = 0
  let retry = 0
  let disposed = false

  const handleMessage = (event: MessageEvent) => {
    if (getString(event.data.source) === 'chat-patch-response') {
      handleConsoleResponse(getObject(event.data))
      return
    }
    if (getString(event.data.source) === 'chat-patch-bootstrap') {
      const payload = getObject(event.data.payload)
      bootstrap = {
        endpoint: getString(payload.endpoint) || '/satori',
        token: getString(payload.token),
        basePath: getString(payload.basePath) || '/chat-patch',
        blockedPlatforms: Array.isArray(payload.blockedPlatforms)
          ? payload.blockedPlatforms as SatoriBootstrap['blockedPlatforms']
          : [],
      }
    }
  }

  const open = () => {
    void resolveBootstrap().then((info) => {
      if (disposed) return
      bootstrap = info
      socket = new WebSocket(wsUrl())
      socket.addEventListener('open', () => {
        retry = 0
        socket?.send(JSON.stringify({
          op: 3,
          body: {
            token: info.token || undefined,
            sn: sequence || undefined,
          },
        }))
        pingTimer = window.setInterval(() => {
          socket?.send(JSON.stringify({ op: 1, body: {} }))
        }, 10000)
        onStatus(true)
      })

      socket.addEventListener('message', (event) => {
        try {
          const raw = JSON.parse(String(event.data)) as Record<string, unknown>
          const op = Number(raw.op)
          const body = getObject(raw.body)
          if (op === 4) {
            const loginList = Array.isArray(body.logins) ? body.logins : []
            const seen = new Set<string>()
            const nextLogins: SatoriLogin[] = []
            for (const item of loginList) {
              const login = getObject(item)
              const user = getObject(login.user)
              const platform = getString(login.platform) || getString(user.platform)
              const selfId = getString(user.id) || getString(login.selfId)
              const key = [platform, selfId].map((value) => encodeURIComponent(value)).join(':')
              if (!platform || !selfId || seen.has(key) || isBlockedPlatform(platform, bootstrap?.blockedPlatforms ?? [])) continue
              seen.add(key)
              nextLogins.push({
                platform: getString(login.platform) || getString(user.platform),
                selfId,
                name: getString(user.name) || getString(user.nick) || getString(login.selfId),
                avatar: getString(user.avatar) || undefined,
                status: Number(login.status ?? 1),
                features: Array.isArray(login.features) ? login.features.map(String) : [],
              })
            }
            logins = nextLogins
            if (!activeBot && logins[0]) {
              activeBot = { platform: logins[0].platform, selfId: logins[0].selfId }
            }
            onReady(logins)
            return
          }
          if (op === 5) return
          if (op === 0) {
            sequence = Number(getObject(body).sn ?? sequence)
            localStorage.setItem('chat-patch:sn', String(sequence))
            onEvent({
              type: getString(body.type),
              platform: getString(body.platform),
              selfId: getString(body.selfId) || getString(getObject(getObject(body.login).user).id),
              timestamp: Number(body.timestamp ?? Date.now()),
              sn: sequence,
              body,
            })
          }
        } catch {
          // 忽略无法解析的信令
        }
      })

      socket.addEventListener('close', () => {
        window.clearInterval(pingTimer)
        onStatus(false)
        if (disposed) return
        retry += 1
        const delay = Math.min(30000, 1000 * 2 ** retry)
        reconnectTimer = window.setTimeout(open, delay)
      })

      socket.addEventListener('error', () => {
        socket?.close()
      })
    }).catch(() => {
      onStatus(false)
    })
  }

  window.addEventListener('message', handleMessage)
  open()

  return () => {
    disposed = true
    window.clearInterval(pingTimer)
    window.clearTimeout(reconnectTimer)
    window.removeEventListener('message', handleMessage)
    socket?.close()
    socket = null
  }
}
