import { Schema } from "koishi";

export interface Config {
        path: string
}

export const Config: Schema<Config> = Schema.object({
        path: Schema.string().default("/dglab").description("Ws服务器监听路径")
}).description("Ws服务器配置")