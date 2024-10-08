import { Schema } from "koishi";

export interface Config {
        endpoint: string
}

export const Config: Schema<Config> = Schema.object({
        endpoint: Schema.string().required().description("DG-Lab ws服务端地址"),
})
