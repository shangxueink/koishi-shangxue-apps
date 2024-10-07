import { Context, Schema, SessionError, h } from "koishi"
import DgLuna from "./dgluna"
import { Config } from "./config"

export const name = "dgluna"
export * from "./config"

import { } from 'koishi-plugin-qrcode-service'

export const inject = {
        optional: ['qrcode']
}


function dgluna(ctx: Context, config: Config) {
        const logger = ctx.logger("dgluna")
        logger.info("Dg-Lab插件已启用")

        ctx.command("dgluna.connect [endpoint: string]", "加入DG-LAB频道")
                .action(async ({ session }, endpoint) => {
                        if (endpoint === undefined) {
                                endpoint = config.endpoint
                        }

                        // 如果已经存在连接，则返回提醒
                        //logger.info(await ctx.dgluna.FindUserConnection(session.event.user.id))
                        if (await ctx.dgluna.FindUserConnection(session.event.user.id) !== null) {
                                return "已经存在Dg-Lab连接，如需创建新连接，请先关闭现有连接"
                        }

                        try {
                                const uuid = await ctx.dgluna.ConnectByUser(session.event.user.id, endpoint)
                                const image = await ctx.qrcode.generateQRCode(`https://www.dungeon-lab.com/app-download.php#DGLAB-SOCKET#${endpoint}/${uuid}`, 'Text')
                                await session.send('请打开DG-LAB软件选择 SOCKET控制 ，并且进行扫码连接：')
                                return image
                        } catch (error) {
                                logger.error(error)
                        }
                })

        ctx.command("dgluna.strchange <channel: string> <value: number>", "调整通道强度")
                .action(async ({ session }, channel, value) => {
                        const user = session.event.user.id
                        if (await ctx.dgluna.FindUserConnection(user) === null) {
                                return "尚未创建Dg-Lab连接"
                        }

                        const numericValue = Number(value)

                        try {
                                if (channel === "A" || channel === "a") {
                                        await ctx.dgluna.ChangeChannelAByUser(user, numericValue)
                                        return `A通道强度调整：强度变化 ${value}`
                                } else if (channel === "B" || channel === "b") {
                                        await ctx.dgluna.ChangeChannelBByUser(user, numericValue)
                                        return `B通道强度调整：强度变化 ${value}`
                                } else {
                                        throw new SessionError("无效的通道")
                                }

                        } catch (error) {
                                logger.error(error)
                        }
                })

        ctx.command("dgluna.strset <channel: string> <value: string>", "设定通道强度")
                .action(async ({ session }, channel, value) => {
                        const user = session.event.user.id
                        if (await ctx.dgluna.FindUserConnection(user) === null) {
                                return "尚未创建Dg-Lab连接"
                        }

                        const numericValue = Number(value)

                        try {
                                if (channel === "A" || channel === "a") {
                                        await ctx.dgluna.SetChannelAByUser(user, numericValue)
                                        return `A通道强度修改为： ${value}`
                                } else if (channel === "B" || channel === "b") {
                                        await ctx.dgluna.SetChannelBByUser(user, numericValue)
                                        return `B通道强度修改为： ${value}`
                                } else {
                                        throw new SessionError("无效的通道")
                                }

                        } catch (error) {
                                logger.error(error)
                        }
                })

        // 邀请其它用户加入连接
        ctx.command("dgluna.invite <user: string>", "邀请用户加入")
                .action(async ({ session }, user) => {
                        let inviteuserId
                        try {
                                const parsedUser = h.parse(user)
                                inviteuserId = parsedUser[0]?.attrs?.id
                                if (!inviteuserId) {
                                        throw new Error("无效的用户")
                                }
                                logger.error('被邀请的用户ID为： ' + inviteuserId)
                        } catch (error) {
                                logger.error(error)
                                return "无效的用户"
                        }

                        const connectionID = await ctx.dgluna.FindUserConnection(session.event.user.id)
                        logger.error('connectionID为： ' + connectionID)
                        logger.error('FindUserConnection传入ID： ' + session.event.user.id)
                        if (connectionID === "undefined") {
                                return "尚未创建Dg-Lab连接"
                        }

                        try {
                                await ctx.dgluna.AddUserToConnection(connectionID, inviteuserId)
                        } catch (error) {
                                logger.error(error)
                        }

                        return "已邀请用户加入连接"
                })


        ctx.command("dgluna.exit", "退出DG-LAB频道")
                .action(async ({ session }) => {
                        const user = session.event.user.id
                        const connectionID = await ctx.dgluna.FindUserConnection(user)
                        if (connectionID === null) {
                                return "尚未创建Dg-Lab连接"
                        }

                        try {
                                await ctx.dgluna.UserExit(user)
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
