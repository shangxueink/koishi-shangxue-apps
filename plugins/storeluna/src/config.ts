import { Schema } from "koishi"

interface baseConfig {
        upstream: string
        path: string
        time: number
        filterRule: boolean
        filterUnsafe: boolean
}

interface noticeConfig {
        updateNotice?: boolean
        Notice?: string
}

export type Config = baseConfig & noticeConfig

const baseConfig: Schema<baseConfig> = Schema.object({
        upstream: Schema.string()
                .default("https://registry.koishi.chat/index.json")
                .description("上游市场源地址"),
        path: Schema.string()
                .default("/storeluna/index.json")
                .description("监听路径"),
        time: Schema.number()
                .default(60)
                .description("同步上游间隔时间"),
        filterRule: Schema.boolean()
                .default(false)
                .description("规则屏蔽功能"),
        filterUnsafe: Schema.boolean()
                .default(false)
                .description("过滤不安全插件"),
})

const noticeConfig: Schema<noticeConfig> = Schema.intersect([
        Schema.object({
                updateNotice: Schema.boolean()
                        .default(true)
                        .description("在storeluna插件简介中启用同步提示")
        }),
        Schema.union([
                Schema.object({
                        updateNotice: Schema.const(true),
                        Notice: Schema.string()
                                .default(
                                        "通过koishi，⭐快速搭建你的koishi镜像！✅-已同步上游市场源 📅-上次同步时间: {date}"
                                )
                                .description("自定义简介")
                }),
                Schema.object({})
        ])
])

export const Config: Schema<Config> = Schema.intersect([
        baseConfig,
        noticeConfig
])
