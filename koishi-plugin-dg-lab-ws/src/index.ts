import { Context, Schema, Service } from 'koishi'
import { WsServer } from './wsServer'
import {Config} from './config'

export const name = 'dg-lab-ws'
export * from './config'
export const usage = `
<div align="center">
<img src="https://dungeon-lab.cn/img/icons/u95.png" width="200" height="66">
</div>

通过安装和配置本插件，

你可以实现公网命令转发和连接管理，

让多个用户共享一个 WebSocket 服务器实例。

- \`path\`：WebSocket 服务器的路径。

`;
export function apply(ctx: Context, config: Config) {
        // 启动ws服务器
        ctx.plugin(WsServer, config.path)
        // 下面留给小学发挥
        
}
