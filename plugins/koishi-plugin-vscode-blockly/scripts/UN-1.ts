import { Context, Schema } from 'koishi'

export const name = 'demo'

export interface Config {
  prefix: string
}

 const Config: Schema<Config> = Schema.object({
  prefix:.string().default('Hello').description('消息前缀'),
})

export apply(ctx: Context,: Config) {
 ctx.command('demo []', '一个简单的演示指令')
   action((_, name) => `${config.prefix}, ${name ?? 'world'}!`)
}