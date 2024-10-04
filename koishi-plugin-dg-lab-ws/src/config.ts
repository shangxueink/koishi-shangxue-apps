import { Schema } from "koishi";

export interface Config {
        port: string
}

export const Config: Schema<Config> = Schema.object({
        port: Schema.string().default("5555").description("Ws服务器监听端口")
}).description("Ws服务器配置")
