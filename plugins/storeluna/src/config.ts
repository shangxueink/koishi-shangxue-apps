import { Schema } from "koishi"

export interface Config {
        upstream: string
        path: string
        time: number
        filterRule: boolean
        filterUnsafe: boolean
}

export const Config: Schema<Config> = Schema.object({
        upstream: Schema.string()
                .default("https://registry.koishi.chat/index.json")
                .description("上游市场源地址"),
        path: Schema.string()
                .default("/server/storeluna")
                .description("监听路径"),
        time: Schema.number()
                .default(60)
                .description("同步上游间隔时间"),
        filterRule: Schema.boolean()
                .default(false)
                .description("规则屏蔽功能"),
        filterUnsafe: Schema.boolean()
                .default(false)
                .description("过滤不安全插件")
})