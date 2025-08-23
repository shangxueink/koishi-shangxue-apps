import { Context, Schema } from 'koishi'
import { OneBotServer } from './server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { } from '@koishijs/plugin-notifier'

export const name = 'server-onebot'
export const reusable = false
export const filter = true

export const inject = {
  required: ['server', 'database', 'logger'],
  optional: ['notifier']
}

export const usage = readFileSync(resolve(__dirname, './../data/usage.md'), 'utf-8');

export let loggerError: (message: any, ...args: any[]) => void;
export let loggerInfo: (message: any, ...args: any[]) => void;
export let logInfo: (message: any, ...args: any[]) => void;

export interface Config {
  selfId: string
  selfname?: string
  groupname?: string
  // 扁平化的启用开关
  enabledWs: boolean
  enabledWsReverse: boolean
  // WebSocket 服务器配置
  path?: string
  token?: string
  // 反向 WebSocket 客户端配置
  connections?: Array<{
    enabled: boolean
    url: string
    name?: string
    token?: string
  }>
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeat?: {
    enabled: boolean
    interval: number
  }
  statuscommand: boolean
  loggerinfo: boolean
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    selfId: Schema.string().description('机器人的账号 （`QQ号`）。').required(),
    selfname: Schema.string().description('机器人的名称，用于转发给其他 OneBot 后端时显示。').default('Bot of Koishi'),
    groupname: Schema.string().description('默认的群组名称').default('koishi-channel'),
  }).description('基础配置'),

  Schema.object({
    enabledWs: Schema.boolean().default(false).description('启用 `WebSocket 服务器`'),
    enabledWsReverse: Schema.boolean().default(false).description('启用 `反向 WebSocket 客户端`'),
  }).description('连接设置'),
  Schema.union([
    Schema.object({
      enabledWs: Schema.const(true).required(),
      path: Schema.string().default('/onebotserver').description('WebSocket 服务路径。<br>默认地址: `ws://localhost:5140/onebotserver`'),
      token: Schema.string().role('secret').description('用于验证的字段。`不包含空格`'),
    }).description('WebSocket 服务器设置'),
    Schema.object({
      enabledWs: Schema.const(false),
    }).description(''),
  ]),
  Schema.union([
    Schema.object({
      enabledWsReverse: Schema.const(true).required(),
      connections: Schema.array(Schema.object({
        enabled: Schema.boolean().default(true).description('启用'),
        name: Schema.string().description('名称（仅标识）'),
        url: Schema.string().description('反向 WebSocket 地址'),
        token: Schema.string().role('secret'),
      })).role('table').description('反向 WebSocket 配置<br>例如：`ws://localhost:2536/OneBotv11`、`ws://localhost:6199/ws`等<br>token应避免空格').default([]),
      reconnectInterval: Schema.number().default(3000).description('重连间隔 (毫秒)'),
      maxReconnectAttempts: Schema.number().default(10).description('最大重连尝试次数，超过后将放弃连接<br>重启插件以重新连接'),
    }).description('反向 WebSocket 客户端设置'),
    Schema.object({
      enabledWsReverse: Schema.const(false),
    }).description(''),
  ]),

  Schema.object({
    heartbeat: Schema.object({
      enabled: Schema.boolean().default(true).description('启用心跳'),
      interval: Schema.number().default(5000).description('心跳间隔 (毫秒)'),
    }).description('心跳设置'),
    statuscommand: Schema.boolean().default(false).description("注册状态指令"),
    loggerinfo: Schema.boolean().default(false).description("日志调试模式 `提issue时请开启此项，并付上完整日志`").experimental(),
  })
])

export function apply(ctx: Context, config: Config) {
  // 初始化全局函数
  logInfo = (message: any, ...args: any[]) => {
    if (config.loggerinfo) {
      ctx.logger.info(message, ...args);
    }
  };
  loggerInfo = (message: any, ...args: any[]) => {
    ctx.logger.info(message, ...args);
  };
  loggerError = (message: any, ...args: any[]) => {
    ctx.logger.error(message, ...args);
  };

  // 扩展 binding 表，添加 botselfid 字段
  ctx.model.extend('binding', {
    botselfid: 'string'
  })

  // 检查配置是否有效
  const hasValidConfig = checkConfiguration(config)

  if (!hasValidConfig && ctx.notifier) {
    // 如果配置无效且有 notifier，启动自动关闭流程
    startAutoShutdown(ctx)
    return
  }

  const server = new OneBotServer(ctx, config)

  ctx.on('ready', async () => {
    await server.start()
  })

  ctx.on('dispose', async () => {
    try {
      loggerInfo('Plugin dispose triggered, stopping OneBot server...')
      await server.stop()
    } catch (error) {
      loggerError('Error during OneBot server disposal:', error)
    }
  })

  if (config.statuscommand) {
    ctx.command('onebot.status', '查看 OneBot 服务器状态')
      .action(() => {
        const status = server.getStatus()
        let result = `OneBot Server Status:
WebSocket Server: ${status.wsServer.enabled ? `Enabled (${status.wsServer.clientCount} clients)` : 'Disabled'}
Reverse WebSocket Clients: ${status.wsClients.enabled ? `${status.wsClients.connected}/${status.wsClients.total} Connected` : 'Disabled'}`

        if (status.wsClients.enabled && status.wsClients.details.length > 0) {
          result += '\n  Client Details:'
          for (const client of status.wsClients.details) {
            const statusText = client.connected ? 'Connected' :
              client.canReconnect ? `Reconnecting (${client.reconnectAttempts}/${client.maxReconnectAttempts})` :
                client.isStopped ? 'Stopped' : 'Failed'
            const displayName = client.name ? `${client.name} (${client.url})` : client.url
            result += `\n    - ${displayName}: ${statusText}`
          }
        }

        result += `\n  Heartbeat: ${status.heartbeat.enabled ? `Enabled (${status.heartbeat.interval}ms)` : 'Disabled'}`
        return result
      })
  }

}

/**
 * 检查配置是否有效
 */
function checkConfiguration(config: Config): boolean {
  // 检查是否至少启用了一种连接方式
  const wsServerEnabled = config.enabledWs === true
  const wsReverseEnabled = config.enabledWsReverse === true

  if (!wsServerEnabled && !wsReverseEnabled) {
    return false
  }

  // 如果启用了反向连接，检查是否有有效的连接配置
  if (wsReverseEnabled) {
    if (!config.connections || config.connections.length === 0) {
      return false
    }

    // 检查是否有启用的连接
    const enabledConnections = config.connections.filter(conn =>
      conn && conn.enabled && conn.url && conn.url.trim() !== ''
    )

    if (enabledConnections.length === 0) {
      return false
    }
  }

  return true
}

/**
 * 启动自动关闭流程
 */
async function startAutoShutdown(ctx: Context): Promise<void> {
  const notifier = ctx.notifier?.create()

  if (!notifier) {
    logInfo('OneBot Server: 配置无效且 notifier 不可用，插件将立即关闭')
    ctx.scope.dispose()
    return
  }

  let countdown = 4 // 秒

  const updateNotification = () => {
    notifier.update(`检测到连接配置无效，插件将在 ${countdown} 秒后自动关闭...`)
  }

  // 开始倒计时
  while (countdown > 0) {
    updateNotification()
    try {
      await ctx.sleep(1000)
      countdown--
    } catch {
      // 如果插件被手动停止，直接返回
      return
    }
  }

  // 倒计时结束，关闭插件
  loggerInfo('OneBot Server: 连接配置无效，自动关闭...')
  ctx.scope.dispose()
}

export * from './types'
export * from './server'
export * from './utils'
export * from './action'
export * from './network'