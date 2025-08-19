import { Context, Schema } from 'koishi'
import { OneBotServer } from './server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const name = 'server-onebot'
export const reusable = false
export const filter = false

export const inject = {
  required: ['server', 'database', 'logger']
}

export const usage = readFileSync(resolve(__dirname, './../usage.md'), 'utf-8');

export let loggerError: (message: any, ...args: any[]) => void;
export let loggerInfo: (message: any, ...args: any[]) => void;
export let logInfo: (message: any, ...args: any[]) => void;

export interface Config {
  selfId: string
  selfname?: string
  token?: string
  protocol: 'ws' | 'ws-reverse'
  path?: string
  url?: string[]
  reverseConnections?: Array<{
    enabled: boolean
    url: string
    name?: string
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
    selfname: Schema.string().description('机器人的名称，用于转发给其他 OneBot 后端时显示。').default('Bot of Koishi Server'),
    token: Schema.string().role('secret').description('发送信息时用于验证的字段。<br>应与 `onebot客户端` 配置文件中的 `token` 保持一致。'),
  }).description('基础配置'),

  Schema.object({
    protocol: Schema.union(['ws', 'ws-reverse']).description('选择要使用的协议。').default('ws'),
  }).description('连接设置'),

  Schema.union([
    Schema.object({
      protocol: Schema.const('ws'),
      path: Schema.string().default('/onebotserver').description('WebSocket 服务路径。<br>默认地址: `ws://localhost:5140/onebotserver`'),
    }),
    Schema.object({
      protocol: Schema.const('ws-reverse').required(),
      reverseConnections: Schema.array(Schema.object({
        enabled: Schema.boolean().default(true).description('启用'),
        url: Schema.string().description('反向 WebSocket 连接地址').required(),
        name: Schema.string().description('连接名称（仅标识）'),
      })).role('table').description('反向 WebSocket 连接配置<br>例如：`ws://localhost:2536/OneBotv11`').default([null]),
      reconnectInterval: Schema.number().default(3000).description('重连间隔 (毫秒)'),
      maxReconnectAttempts: Schema.number().default(5).description('最大重连尝试次数，超过后将放弃连接<br>重启插件以重新连接'),
    }),
  ]),

  Schema.object({
    heartbeat: Schema.object({
      enabled: Schema.boolean().default(true).description('启用心跳'),
      interval: Schema.number().default(5000).description('心跳间隔 (毫秒)'),
    }).description('心跳设置'),
    statuscommand: Schema.boolean().default(false).description("注册状态指令"),
    loggerinfo: Schema.boolean().default(false).description("日志调试模式 `提issue时请开启此项 并付上完整日志`").experimental(),
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

export * from './types'
export * from './server'
export * from './utils'
export * from './network'
export * from './action'