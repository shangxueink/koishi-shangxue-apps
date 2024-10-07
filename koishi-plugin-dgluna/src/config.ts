import { Schema } from "koishi";

export interface Config {
        endpoint: string
        timeout: number
}

export const Config: Schema<Config> = Schema.object({
        endpoint: Schema.string().required().description("DG-Lab ws服务端地址<br>类似`ws://123.456.789:5555`，注意末尾没斜杠"),
        timeout: Schema.number().default(60000).description("连接超时时间`单位 毫秒`")
})