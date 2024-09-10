import { Context, h, Logger } from 'koishi';
import Vits from '@initencounter/vits';
import { Config } from './config';
import { APISpeakerList, SpeakerKeyIdMap } from './constants';
import { API, SpeakConfig, Speaker } from './types';
import type {} from '@koishijs/translator';

export class betavits {
    private logger: Logger;

    private _cacheSpeakers: Record<string, [API, Speaker, string]> = {};

    constructor(
        private ctx: Context,
        private config: Config
    ) {
        this.logger = ctx.logger('bert-vits');
    }

    async say(input: string, options?: Partial<SpeakConfig>): Promise<h> {
        const option = fallback(options, this.config);
        const [api, speaker, lang] = this.findSpeaker(option.speaker);
        option.speaker = speaker.speaker ?? option.speaker;
        option.language = lang ?? option.language ?? 'ZH';

        input = await this.checkLanguage(input, option);

        const payload = this._generatePlayLoad(input, option);

        try {
            return await this._request(payload, api, speaker);
        } catch (error) {
            this.logger.error('ERROR:', error);
            throw error;
        }
    }

    private async checkLanguage(
        input: string,
        options: SpeakConfig
    ): Promise<string> {
        try {
            const franc = await importFranc();

            const sourceLanguage =
                francLanguageMapping[franc.franc(input)] ?? options.language;

            if (
                sourceLanguage === options.language ||
                !this.config.autoTranslate
            ) {
                return input;
            }

            return this.ctx.translator.translate({
                input: input,
                source: sourceLanguage.toLocaleLowerCase(),
                target: options.language.toLocaleLowerCase(),
            });
        } catch (error) {
            return input;
        }
    }

    private findSpeaker(rawSpeaker: string): [API, Speaker, string] {
        if (this._cacheSpeakers[rawSpeaker]) {
            return this._cacheSpeakers[rawSpeaker];
        }

        let [speaker, lang] = rawSpeaker.split('_');

        if (!lang) {
            lang = 'ZH';
        }

        for (const apiSpeakers of APISpeakerList) {
            for (const [currentSpeaker, value] of Object.entries(
                apiSpeakers.speakers
            )) {
                if (speaker === currentSpeaker) {
                    const result: [API, Speaker, string] = [
                        apiSpeakers.api,
                        value,
                        lang,
                    ];
                    this._cacheSpeakers[speaker] = result;
                    return result;
                }
            }
        }
    }

    private _generatePlayLoad(input: string, options: SpeakConfig) {
        const {
            sdp_ratio,
            language,
            speaker,
            noise,
            noisew,
            length,
            prompt,
            weight,
        } = options;

        return {
            data: [
                input,
                speaker,
                sdp_ratio,
                noise,
                noisew,
                length,
                language,
                null,
                prompt,
                'Text prompt',
                '',
                weight,
            ],
            event_data: null,
            fn_index: 0,
            dataType: [
                'textbox',
                'dropdown',
                'slider',
                'slider',
                'slider',
                'slider',
                'dropdown',
                'audio',
                'textbox',
                'radio',
                'textbox',
                'slider',
            ],
            session_hash: 'kg71r7fv3e8',
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async _request(payload: any, api: API, speaker: Speaker) {
        let requestUrl = `${api.base.replace('{version}', speaker.version)}${api.endpoint}`;

        const urlParams = new URLSearchParams();

        if (api.params) {
            Object.entries(api.params).forEach(([key, value]) => {
                urlParams.append(
                    key,
                    value
                        .replace('{version}', speaker.version)
                        .replace('{date}', String(Date.now()))
                );
            });

            requestUrl = `${requestUrl}?${urlParams}`;
        }

        if (api.is_gradio) {
            delete payload.session_hash;
        }

        let audioMessage: h;

        const res = await this.ctx.http.post(requestUrl, payload);

        // if gradio
        if (res.event_id) {
            const gradioUrl = `${api.base.replace('{version}', speaker.version)}${api.endpoint}/${res.event_id}`;

            // first, request it
            const gradioEvents = await this.ctx.http.get(gradioUrl, {
                responseType: 'text',
                headers: {
                    'Content-Type': 'text/event-stream',
                },
            });

            // parse the event source ('data')
            const dataSource = gradioEvents.split('\n');
            for (const data of dataSource) {
                if (data.startsWith('data:')) {
                    const dataJson = JSON.parse(data.substring(5));
                    if (dataJson[0] === 'Success') {
                        // get the final url
                        audioMessage = h.audio(dataJson[1].url);
                    } else {
                        this.logger.error('ERROR(gradio):', dataJson);
                    }
                }
            }
        } else {
            audioMessage = h.audio(
                `${api.base.replace('{version}', speaker.version)}/file=${res.data[1].name}`
            );
        }
        return audioMessage;
    }
}

export class betavitsService extends Vits {
    constructor(
        ctx: Context,
        public impl: betavits
    ) {
        super(ctx);
    }

    say(options: Vits.Result): Promise<h> {
        return this.impl.say(options.input, {
            speaker: SpeakerKeyIdMap[options.speaker_id],
        });
    }
}

// ??
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fallback<T>(options: Partial<T>, defaultValues: any): Required<T> {
    if (!options) {
        return defaultValues;
    }

    const result = Object.assign({}, defaultValues);

    for (const key in options) {
        if (options[key] && options[key] !== '') {
            result[key] = options[key];
        }
    }

    return result as Required<T>;
}

async function importFranc() {
    try {
        return await import('franc-min');
    } catch (e) {
        throw new Error(
            'Please install franc-min as a dependency with, e.g. `npm install -S franc-min`'
        );
    }
}

const francLanguageMapping: Record<string, string> = {
    jpn: 'jp',
    zho: 'zh',
    eng: 'en',
    spa: 'es',
    fra: 'fr',
    deu: 'de',
    ita: 'it',
    por: 'pt',
    rus: 'ru',
    kor: 'ko',
    ara: 'ar',
    heb: 'he',
    hin: 'hi',
    tur: 'tr',
    vie: 'vi',
    cmn: 'zh',
    ell: 'el',
};
