import { Context } from 'koishi'
import { Config } from './config'
import { UniversalTranslation } from './service'
export const languageMap = require('./languageMap.json')

export * from './config'

export const name = 'universal-translation'

export function apply(ctx: Context, config: Config) {
    const translation = new UniversalTranslation(ctx, config)

    ctx.command("universal-translation <text:text>", "翻译命令")
        .option('to', '-t [language] 指定翻译的目标语言', { fallback: config.defaultTargetLang})
        .action(async ({ options }, text) => {
            if (!text) {
                return '请输入要翻译的文本...'
            }

            const to = options.to
                ? (languageMap[options.to] || options.to)
                : config.defaultTargetLang

            const result = await translation.translate({
                input: text,
                target: to
            })
            return result
        })

    ctx.command('universal-translation/语言代码对照表')
        .action(async () => {
            return '注意：并不是所列语言均支持翻译，此表仅供参考语言代码\n对照表请见这里【http://www.lingoes.cn/zh/translator/langcode.htm】'
        })
}
