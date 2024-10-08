import { Context, h } from "koishi"
import DgLuna from "./dgluna"
import { Config } from "./config"

export const name = "dgluna"
export * from "./config"

import { } from 'koishi-plugin-qrcode-service-null'

export const inject = {
        required: ['qrcode']
}
export const usage = `
<h1>DgLuna 插件</h1>

<p>DgLuna 是一个用于 DG-LAB 游戏的插件，提供了公共放映厅的功能。</p>

<h2>使用方法</h2>

<h3>连接 DG-LAB 频道</h3>
<ul>
<li><strong>参数</strong>:</li>
<ul>
<li><code>endpoint</code>: 可选，指定连接的 DG-LAB 频道。</li>
</ul>
<li><strong>触发示例</strong>: <code>dgluna.connect ws://1.2.3.4:5555</code> 或者 <code>dgluna.connect</code></li>
</ul>

<h3>调整通道强度</h3>
<ul>
<li><strong>参数</strong>:</li>
<ul>
<li><code>channel</code>: 要调整的通道名称。</li>
<li><code>value</code>: 要设定的强度值。</li>
</ul>
<li><strong>触发示例</strong>: <code>dgluna.strchange A -5</code>（A通道减弱5）</li>
</ul>

<h3>设定通道强度</h3>
<ul>
<li><strong>参数</strong>:</li>
<ul>
<li><code>channel</code>: 要设定的通道名称。</li>
<li><code>value</code>: 要设定的强度值。</li>
</ul>
<li><strong>触发示例</strong>: <code>dgluna.strset A 15</code>（A通道设定至15）</li>
</ul>

<h3>设定通道波形</h3>
<ul>
<li><strong>参数</strong>:</li>
<ul>
<li><code>channel</code>: 要设定的通道名称。</li>
<li><code>wave</code>: 波形编号。</li>
<li><code>time</code>: 持续时间。</li>
</ul>
</ul>

<h3>邀请用户加入</h3>
<ul>
<li><strong>参数</strong>:</li>
<ul>
<li><code>user</code>: 要邀请的用户 ID。</li>
</ul>
<li><strong>触发示例</strong>: <code>dgluna.invite @猫猫</code></li>
</ul>

<h3>退出频道</h3>
<pre><code>dgluna.exit</code></pre>

<hr>

`;

function dgluna(ctx: Context, config: Config) {
        const logger = ctx.logger("dgluna")
        logger.info("Dg-Lab插件已启用")

        ctx.command("dgluna.connect [endpoint: string]", "加入DG-LAB频道")
                .action(async ({ session }, endpoint) => {
                        if (endpoint === undefined) {
                                endpoint = config.endpoint
                        }

                        const userID = session.event.user.id

                        // 如果已经存在连接，则返回提醒
                        if (ctx.dgluna.IsUserInRoom(userID) !== false) {
                                const dglab = await ctx.dgluna.Connect(endpoint)
                                ctx.dgluna.AddDglabToRoom(userID, dglab)
                                return "已添加新的连接"
                        }

                        try {
                                const dglab = await ctx.dgluna.Connect(endpoint)
                                const uuid = await dglab.GetConnectionId()
                                ctx.dgluna.CreateRoom(userID, dglab)
                                const image = await ctx.qrcode.generateQRCode(`https://www.dungeon-lab.com/app-download.php#DGLAB-SOCKET#${endpoint}/${uuid}`, 'Text')
                                await session.send('请打开DG-LAB软件选择 SOCKET控制 ，并且进行扫码连接：')
                                return image
                        } catch (error) {
                                logger.error(error)
                        }
                })

        ctx.command("dgluna.strchange <channel: string> <value: number>", "调整通道强度")
                .action(async ({ session }, channel, value) => {
                        const userID = session.event.user.id
                        if (ctx.dgluna.IsUserInRoom(userID) === false) {
                                return "尚未创建Dg-Lab连接"
                        }

                        const numericValue = Number(value)

                        try {
                                ctx.dgluna.ChangeStrengthByRoom(userID, channel, numericValue)
                        } catch (error) {
                                logger.error(error)
                        }
                })

        ctx.command("dgluna.strset <channel: string> <value: string>", "设定通道强度")
                .action(async ({ session }, channel, value) => {
                        const userID = session.event.user.id
                        if (ctx.dgluna.IsUserInRoom(userID) === false) {
                                return "尚未创建Dg-Lab连接"
                        }

                        const numericValue = Number(value)

                        try {
                                ctx.dgluna.SetStrengthByRoom(userID, channel, numericValue)
                        } catch (error) {
                                logger.error(error)
                        }
                })

        ctx.command("dgluna.waveset <channel: string> <wave: number> <time: number>", "设定通道波形")
                .action(async ({ session }, channel, wave, time) => {
                        const userID = session.event.user.id
                        if (ctx.dgluna.IsUserInRoom(userID) === false) {
                                return "尚未创建Dg-Lab连接"
                        }

                        const numericTime = Number(time)

                        try {
                                ctx.dgluna.SetWaveByRoom(userID, channel, wave, numericTime)
                        } catch (error) {
                                logger.error(error)
                        }
                })

        // 邀请其它用户加入连接
        ctx.command("dgluna.invite <user: string>", "邀请用户加入")
                .action(async ({ session }, user) => {
                        let invitedUserId: string
                        try {
                                invitedUserId = h.parse(user)[0]?.attrs?.id
                                if (!invitedUserId) throw new Error("无效的用户")
                        } catch (error) {
                                logger.error(error)
                                return "无效的用户"
                        }

                        const userID = session.event.user.id

                        if (ctx.dgluna.IsUserInRoom(userID) === false) {
                                return "尚未创建Dg-Lab连接"
                        }

                        try {
                                ctx.dgluna.AddUserToRoom(userID, invitedUserId)
                        } catch (error) {
                                logger.error(error)
                        }

                        return "已邀请用户加入连接"
                })


        ctx.command("dgluna.exit", "退出DG-LAB频道")
                .action(async ({ session }) => {
                        const userID = session.event.user.id
                        const connectionID = await ctx.dgluna.IsUserInRoom(userID)
                        if (connectionID === null) {
                                return "尚未创建Dg-Lab连接"
                        }

                        try {
                                ctx.dgluna.UserExit(userID)
                        } catch (error) {
                                logger.error(error)
                        }

                        return "连接已断开"
                })
}

export function apply(ctx: Context, config: Config) {
        ctx.plugin(DgLuna, config)
        ctx.plugin(
                {
                        apply: dgluna,
                        inject: {
                                dgluna: { required: true }
                        },
                        name: "dgluna"
                },
                config
        )
}