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

<details>
<summary>点击此处————查看指令说明</summary>

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
<li><code>value</code>: 要调整的强度增量值（可以为负）。</li>
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
<li><code>time</code>: 持续时间（秒）。</li>
</ul>
<li><strong>触发示例</strong>: <code>dgluna.setwave A 2 30</code>（A通道设定为波形2，持续30秒）</li>
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

</details>

<p>本插件需要搭配配套的 WebSocket 后端使用。请<a href="/market?keyword=dg-lab-ws">前往插件市场下载 DG-LAB-ws</a> 插件。</p>

<details>
<summary>点击此处————查看玩法说明</summary>
<p>在确保本插件已经填写了正确的 WebSocket 服务器地址之后，您可以开启本插件，然后供用户玩耍。</p>

<p>逻辑是这样的：</p>
<ul>
<li>用户先触发【连接 DG】，然后通过郊狼 APP 扫码连接至服务器。</li>
<li>用户自己在 APP 上选波形，并且按下对应通道的波形，才能让本插件输出。</li>
<li>已经连接的用户可以使用【设定强度 A 10】这样的指令来设定通道强度。</li>
<li>也可以通过【邀请】来让没有通过扫码连接的用户一起控制。</li>
<li>最后用户可以【退出】或在郊狼 APP 上点击【断开连接】。</li>
</ul>

</details>

<hr>

`

function dgluna(ctx: Context, config: Config) {
        const logger = ctx.logger("dgluna")
        logger.info("Dg-Lab插件已启用")

        ctx.command("dgluna.connect [endpoint: string]", "加入DG-LAB频道")
                .alias('连接DG')
                .action(async ({ session }, endpoint) => {
                        if (endpoint === undefined) {
                                endpoint = config.endpoint
                        }

                        const userID = session.event.user.id

                        // 如果已经存在连接，则返回提醒
                        if ((ctx.dgluna.IsUserInRoom(userID) !== false)) {
                                const dglab = await ctx.dgluna.Connect(endpoint)
                                await ctx.dgluna.AddDglabToRoom(userID, dglab)
                                await session.send("已添加新的连接。\n若需连接至默认服务器，请先【退出】后 再【连接DG】")
                                return
                        }

                        try {
                                const dglab = await ctx.dgluna.Connect(endpoint)
                                const uuid = await dglab.GetConnectionId()
                                await ctx.dgluna.CreateRoom(userID, dglab)
                                const image = await ctx.qrcode.generateQRCode(`https://www.dungeon-lab.com/app-download.php#DGLAB-SOCKET#${endpoint}/${uuid}`, 'Text')
                                await session.send('请打开DG-LAB软件选择 SOCKET控制 ，并且进行扫码连接：')
                                await session.send(image)
                                await session.send("在扫码连接后，请按下APP内任意一个波形")
                                return
                        } catch (error) {
                                logger.error(error)
                        }
                })

        ctx.command("dgluna.strchange <channel: string> <value: number>", "调整通道强度")
                .alias('调整强度')
                .example('调整强度 A 1')
                .action(async ({ session }, channel, value) => {
                        const userID = session.event.user.id
                        if (await ctx.dgluna.IsUserInRoom(userID) === false) {
                                await session.send("尚未创建Dg-Lab连接")
                                return
                        }
                        if (!channel || !value) {
                                await session.send("参数不正确。使用示例：\n调整强度 A 1")
                                return
                        }
                        const numericValue = Number(value)

                        try {
                                await ctx.dgluna.ChangeStrengthByRoom(userID, channel, numericValue)
                                await session.send(`已调整 ${channel} 通道强度：${value}\n（若超过上限设定，则不会生效）`)
                        } catch (error) {
                                logger.error(error)
                        }
                })

        ctx.command("dgluna.strset <channel: string> <value: string>", "设定通道强度")
                .alias('设定强度')
                .example('设定强度 A 10')
                .action(async ({ session }, channel, value) => {
                        const userID = session.event.user.id
                        if (await ctx.dgluna.IsUserInRoom(userID) === false) {
                                await session.send("尚未创建Dg-Lab连接")
                                return
                        }
                        if (!channel || !value) {
                                await session.send("参数不正确。使用示例：\n设定强度 A 10")
                                return
                        }
                        const numericValue = Number(value)

                        try {
                                await ctx.dgluna.SetStrengthByRoom(userID, channel, numericValue)
                                await session.send(`已设定 ${channel} 通道强度至：${value}\n（若超过上限设定，则不会生效）`)
                        } catch (error) {
                                logger.error(error)
                        }
                })

        ctx.command("dgluna.waveset <channel: string> <wave: number> <time: number>", "设定通道波形")
                .alias('设定波形')
                .example('设定波形 A 1 300')
                .action(async ({ session }, channel, wave, time) => {
                        const userID = session.event.user.id
                        if (await ctx.dgluna.IsUserInRoom(userID) === false) {
                                await session.send("尚未创建Dg-Lab连接")
                                return
                        }
                        if (!channel || !wave || !time) {
                                await session.send("参数不正确。使用示例：\n设定波形 A 1 300")
                                return
                        }
                        const numericTime = Number(time)

                        try {
                                await ctx.dgluna.SetWaveByRoom(userID, channel, wave, numericTime)
                                await session.send(`已设定 ${channel} 通道：${wave}波形\n持续时间：${numericTime}`)
                        } catch (error) {
                                logger.error(error)
                        }
                })

        // 邀请其它用户加入连接
        ctx.command("dgluna.invite <user: string>", "邀请用户加入")
                .alias('邀请')
                .action(async ({ session }, user) => {
                        let invitedUserId: string
                        try {
                                const parsedUser = h.parse(user)[0]
                                if (parsedUser?.type !== 'at') {
                                        await session.send("请艾特一个有效用户。\n示例： 邀请 @猫猫")
                                        return
                                }
                                invitedUserId = parsedUser.attrs.id
                                if (!invitedUserId) throw new Error("请艾特一个有效用户")
                        } catch (error) {
                                logger.error(error)
                                await session.send("请艾特一个有效用户")
                                return
                        }

                        const userID = session.event.user.id

                        if (await ctx.dgluna.IsUserInRoom(userID) === false) {
                                await session.send("尚未创建Dg-Lab连接")
                                return
                        }

                        try {
                                await ctx.dgluna.AddUserToRoom(userID, invitedUserId)
                        } catch (error) {
                                logger.error(error)
                        }
                        await session.send("已邀请用户加入连接")
                        return
                })


        ctx.command("dgluna.exit", "退出DG-LAB频道")
                .alias('退出')
                .action(async ({ session }) => {
                        const userID = session.event.user.id
                        const connectionID = await ctx.dgluna.IsUserInRoom(userID)
                        if (connectionID === null) {
                                await session.send("尚未创建Dg-Lab连接")
                                return
                        }

                        try {
                                await ctx.dgluna.UserExit(userID)
                        } catch (error) {
                                logger.error(error)
                        }
                        await session.send("连接已断开")
                        return
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