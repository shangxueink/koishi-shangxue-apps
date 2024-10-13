import { Schema } from "koishi"

export interface Config {
    defaultTargetLang: string
}

export const Config: Schema<Config> = Schema.object({
    defaultTargetLang: Schema.string()
        .description("默认的目标语言代码（例如 'en', 'zh', 'ja' 等）")
        .default("en")
})
