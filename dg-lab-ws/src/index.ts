import { Context, Schema, Service } from 'koishi'
import { WsServer } from './wsServer'
import {Config} from './config'

export const name = 'dg-lab-ws'
export * from './config'

export function apply(ctx: Context, config: Config) {
        // 启动ws服务器
        ctx.plugin(WsServer, config.path)
        // 下面留给小学发挥
        
}
