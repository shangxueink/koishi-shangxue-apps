import { Context, Schema, Service } from 'koishi'
import { WsServer } from './wsServer'
import { Config } from './config'

export const name = 'dg-lab-ws'
export * from './config'
export const usage = `
<div style="text-align: center;">
<img src="https://dungeon-lab.cn/img/icons/u95.png" width="200" height="66" alt="DG-LAB Logo">
</div>

<p>通过安装和配置本插件，你可以实现公网命令转发和连接管理，让多个用户共享一个 WebSocket 服务器实例。</p>

<ul>
<li><code>port</code>：WebSocket 服务器的端口。</li>
</ul>

<p><strong>注意：</strong>本插件提供的服务是一个 WebSocket 服务。与 DG-LAB 的 WebSocket 服务器连接时，强制需要二维码链接。二维码直接对应 WebSocket 服务器的地址，因此本插件可能会泄露服务器 IP。请谨慎考虑后再决定是否开启公开服务。</p>

`;
export function apply(ctx: Context, config: Config) {
        // 启动ws服务器
        ctx.plugin(WsServer, config.port)
        // 下面留给小学发挥

}