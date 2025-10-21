import { ChatGeneration, ChatGenerationChunk } from '@langchain/core/outputs'
import {
    ModelRequester,
    ModelRequestParams
} from 'koishi-plugin-chatluna/llm-core/platform/api'
import {
    ClientConfig,
    ClientConfigPool
} from 'koishi-plugin-chatluna/llm-core/platform/config'
import { Config, logger } from './index'
import { logInfo } from './logger'
import { ChatLunaPlugin } from 'koishi-plugin-chatluna/services/chat'
import { Context } from 'koishi'
import {
    AIMessageChunk,
    HumanMessage,
    SystemMessage
} from '@langchain/core/messages'
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// HACK: extend ModelRequestParams to include properties that are available at runtime
interface InternalModelRequestParams extends ModelRequestParams {
    input: (HumanMessage | SystemMessage)[]
}

export class PublicApiRequester extends ModelRequester {
    constructor(
        ctx: Context,
        _configPool: ClientConfigPool<ClientConfig>,
        public _pluginConfig: Config,
        _plugin: ChatLunaPlugin
    ) {
        super(ctx, _configPool, _pluginConfig, _plugin)
    }

    async *completionStreamInternal(
        params: ModelRequestParams
    ): AsyncGenerator<ChatGenerationChunk> {
        const internalParams = params as InternalModelRequestParams

        logInfo('Receive params from chatluna', JSON.stringify(params, null, 2))

        const requestUrl = 'https://api.pearktrue.cn/api/aichat/'

        // Transform LangChain messages to the target API format
        const messages = internalParams.input.map((message) => {
            let role: string
            if (message instanceof HumanMessage) {
                role = 'user'
            } else if (message instanceof SystemMessage) {
                role = 'system'
            } else {
                role = 'assistant' // Default for other types like AIMessage
            }
            return {
                role,
                content: message.content
            }
        })

        const requestBody = {
            messages: messages,
            stream: false
        }

        let retries = 3
        while (retries > 0) {
            try {
                logInfo(
                    'Sending request to API:',
                    requestUrl,
                    JSON.stringify(requestBody, null, 2)
                )

                const response = await this.ctx.http.post(
                    requestUrl,
                    requestBody,
                    {
                        headers: { 'Content-Type': 'application/json' }
                    }
                )

                logInfo(
                    'Received response from API:',
                    JSON.stringify(response, null, 2)
                )

                if (response.code !== 200 || !response.content) {
                    throw new Error(
                        `API returned an error or unexpected response: ${JSON.stringify(response)}`
                    )
                }

                const responseText = response.content

                yield new ChatGenerationChunk({
                    text: responseText,
                    message: new AIMessageChunk({ content: responseText })
                })
                return // Success, exit retry loop
            } catch (error) {
                this.logger.error(
                    `Request failed, ${retries - 1} retries left.`,
                    error
                )
                retries--
                if (retries === 0) {
                    const errorText = `Failed to get response from API after several retries: ${error.message}`
                    yield new ChatGenerationChunk({
                        text: errorText,
                        message: new AIMessageChunk({ content: errorText })
                    })
                } else {
                    await sleep(1000) // Wait 1 second before retrying
                }
            }
        }
    }

    get logger() {
        return logger
    }
    public buildHeaders() {
        return {}
    }
}
