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
    // Map to store server-generated conversation_id for each user
    private conversationIdMap = new Map<string, string>()

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
        const lastMessage = internalParams.input.at(-1)

        logInfo('Receive params from chatluna', JSON.stringify(params, null, 2))

        if (!(lastMessage instanceof HumanMessage)) {
            this.logger.warn('The last message is not from a human.')
            return
        }

        const prompt = lastMessage.content as string
        const koishiUserId = lastMessage.id
        const requestUrl = 'https://api.ecylt.top/v1/free_gpt/chat_json.php'
        let apiConversationId = this.conversationIdMap.get(koishiUserId)

        // Handle history deletion
        if (prompt.trim() === '删除历史') {
            // ... (deletion logic remains the same)
            return
        }

        const system_prompt = internalParams.input
            .filter((m) => m instanceof SystemMessage)
            .map((m) => m.content)
            .join('\n\n')

        let retries = 3
        while (retries > 0) {
            try {
                let response: any

                // If it's a new conversation, we need to perform a two-step process
                if (!apiConversationId) {
                    logInfo('Creating new conversation...')
                    const newConvResponse = await this.ctx.http.post(
                        requestUrl,
                        { action: 'new', system_prompt: system_prompt || undefined },
                        { headers: { 'Content-Type': 'application/json' } }
                    )

                    if (!newConvResponse.conversation_id) {
                        throw new Error(
                            `Failed to create new conversation: ${JSON.stringify(newConvResponse)}`
                        )
                    }

                    apiConversationId = newConvResponse.conversation_id
                    this.conversationIdMap.set(koishiUserId, apiConversationId)

                    logInfo(`New conversation created with ID: ${apiConversationId}`)
                }

                const requestBody = {
                    action: 'continue',
                    message: prompt,
                    conversation_id: apiConversationId
                }

                logInfo('Sending request to API:', requestUrl, JSON.stringify(requestBody, null, 2))

                // For existing conversations, just continue
                response = await this.ctx.http.post(requestUrl, requestBody, {
                    headers: { 'Content-Type': 'application/json' }
                })
                
                logInfo('Received response from API:', JSON.stringify(response, null, 2))

                const responseText =
                    response?.messages?.at(-1)?.content ??
                    `Error or unexpected response: ${JSON.stringify(response)}`

                yield new ChatGenerationChunk({
                    text: responseText,
                    message: new AIMessageChunk({ content: responseText })
                })
                return // Success, exit retry loop
            } catch (error) {
                this.logger.error(`Request failed, ${retries - 1} retries left.`, error)
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
