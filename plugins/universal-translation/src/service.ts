import Translator from './translator'
import { Config } from "./config"
import { Logger } from 'koishi'

export class UniversalTranslation extends Translator<Config> {

    declare logger: Logger

    async translate(options?: Translator.Result): Promise<string> {
        const q = options.input
        const to = options.target || 'zh'

        const url = [
            `https://api.jaxing.cc/v2/Translate/Tencent?SourceText=${(q)}&Target=${to}`,
            `https://translate.cloudflare.jaxing.cc/?text=${(q)}&source_lang=zh&target_lang=${to}`
        ]

        for (const getUrl of url) {
            try {
                const responseData = await this.ctx.http.get(getUrl)
                return responseData.data?.Response?.TargetText
                    || responseData.response?.translated_text

            } catch (error) {
                this.logger.error(`API request failed for ${getUrl}: ${error.message}`)
            }
        }

    }
}
