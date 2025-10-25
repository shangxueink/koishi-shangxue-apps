import { Context, h, Logger } from 'koishi'
import Vits from '@initencounter/vits'
import { Config } from './config'
import { SpeakConfig } from './types'
import { SpeakerInfo } from './constants'

export class betavits {
    private logger: Logger

    constructor(
        private ctx: Context,
        public config: Config,
        private speakersMap: Map<string, SpeakerInfo>,
        private SpeakerIdMap: Record<number, string>
    ) {
        this.logger = ctx.logger('bert-vits')
    }

    async say(input: string, options?: Partial<SpeakConfig>): Promise<h> {
        const option = fallback(options, this.config)
        const speakerInfo = this.speakersMap.get(option.speaker)

        if (!speakerInfo) {
            throw new Error(`找不到讲者 "${option.speaker}"。`)
        }

        const payload = this._generatePlayLoad(
            input,
            speakerInfo.internalName,
            option
        )

        try {
            return await this._request(
                payload,
                speakerInfo.api,
                speakerInfo.fileApi
            )
        } catch (error) {
            this.logger.error('语音合成请求失败:', error)
            throw error
        }
    }

    private _generatePlayLoad(
        input: string,
        internalSpeakerName: string,
        options: SpeakConfig
    ) {
        const { sdp_ratio, noise, noisew, length, prompt, weight } = options

        return {
            fn_index: 0,
            data: [
                input,
                internalSpeakerName,
                sdp_ratio,
                noise,
                noisew,
                length,
                'AUTO',
                null,
                prompt,
                'Text prompt',
                '',
                weight,
            ],
            event_data: null,
        }
    }

    private async _request(payload: any, api: string, fileApi: string) {
        const res = await this.ctx.http.post(api, payload)

        if (!res.data || !res.data[1] || !res.data[1].name) {
            this.logger.error('未能在响应中找到预期的文件名:', res)
            throw new Error('API响应格式不正确，无法获取音频文件路径。')
        }

        const audioFilePath = res.data[1].name

        const audioUrl = `${fileApi}${audioFilePath}`
        const buffer = await this.ctx.http.get(audioUrl, {
            responseType: 'arraybuffer',
        })

        return h.audio(buffer, 'wav')
    }
}

export class betavitsService extends Vits {
    constructor(ctx: Context, public impl: betavits) {
        super(ctx)
    }

    say(options: Vits.Result): Promise<h> {
        return this.impl.say(options.input, {
            speaker: this.impl['SpeakerIdMap'][options.speaker_id],
        })
    }
}

function fallback<T>(options: Partial<T>, defaultValues: any): Required<T> {
    if (!options) {
        return defaultValues
    }

    const result = Object.assign({}, defaultValues)

    for (const key in options) {
        if (options[key] && options[key] !== '') {
            result[key] = options[key]
        }
    }

    return result as Required<T>
}
