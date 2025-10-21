import { Context, Logger, Schema } from 'koishi'
import { ChatLunaPlugin } from 'koishi-plugin-chatluna/services/chat'
import {
    ChatLunaError,
    ChatLunaErrorCode
} from 'koishi-plugin-chatluna/utils/error'
import { createLogger } from 'koishi-plugin-chatluna/utils/logger'
import { PublicApiClient } from './public-api-client'
import { initializeLogger } from './logger'

export let logger: Logger
export const reusable = true
export const usage = `
<p><strong>另一个零成本、快速体验Chatluna的适配器</strong>。</p>
<ul>
<li><strong>API来源：</strong> pearktrue</li>
<li>
<strong>接口地址：</strong>
<a href="api.pearktrue.cn" target="_blank" rel="noopener noreferrer">https://api.pearktrue.cn/dashboard/detail/311</a>
</li>
</ul>
`

export function apply(ctx: Context, config: Config) {
    logger = createLogger(ctx, 'chatluna-another-public-api-adapter')
    initializeLogger(logger, config)

    ctx.on('ready', async () => {
        if (config.platform == null || config.platform.length < 1) {
            throw new ChatLunaError(
                ChatLunaErrorCode.UNKNOWN_ERROR,
                new Error('Cannot find any platform')
            )
        }

        const platform = config.platform

        const plugin = new ChatLunaPlugin(ctx, config, platform)

        plugin.parseConfig((config) => {
            // a fake client
            return [
                {
                    apiKey: 'any',
                    apiEndpoint: 'any',
                    platform,
                    chatLimit: config.chatTimeLimit,
                    timeout: config.timeout,
                    maxRetries: config.maxRetries,
                    concurrentMaxSize: config.chatConcurrentMaxSize
                }
            ]
        })

        plugin.registerClient(() => new PublicApiClient(ctx, config, plugin))

        await plugin.initClient()
    })
}

export interface Config extends ChatLunaPlugin.Config {
    platform: string
    loggerinfo: boolean
}

export const Config: Schema<Config> = Schema.intersect([
    ChatLunaPlugin.Config,
    Schema.object({
        platform: Schema.string().default('public-api'),
        loggerinfo: Schema.boolean()
            .default(false)
            .description('日志调试模式')
            .experimental()
    })
]).i18n({
    'zh-CN': require('./locales/zh-CN.schema.yml'),
    'en-US': require('./locales/en-US.schema.yml')
}) as Schema<Config>

export const inject = ['chatluna']

export const name = 'chatluna-another-public-api-adapter'
