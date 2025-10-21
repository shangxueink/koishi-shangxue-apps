import { Context } from 'koishi'
import { PlatformModelAndEmbeddingsClient } from 'koishi-plugin-chatluna/llm-core/platform/client'
import {
    ChatLunaBaseEmbeddings,
    ChatLunaChatModel,
    ChatLunaEmbeddings
} from 'koishi-plugin-chatluna/llm-core/platform/model'
import {
    ModelCapabilities,
    ModelInfo,
    ModelType
} from 'koishi-plugin-chatluna/llm-core/platform/types'
import {
    ChatLunaError,
    ChatLunaErrorCode
} from 'koishi-plugin-chatluna/utils/error'
import { Config } from '.'
import { PublicApiRequester } from './public-api-requester'
import { ChatLunaPlugin } from 'koishi-plugin-chatluna/services/chat'
import {
    getModelMaxContextSize,
    isEmbeddingModel,
    isNonLLMModel,
    supportImageInput
} from '@chatluna/v1-shared-adapter'
import { RunnableConfig } from '@langchain/core/runnables'

export class PublicApiClient extends PlatformModelAndEmbeddingsClient {
    platform = 'another-public-api'

    private _requester: PublicApiRequester

    constructor(
        ctx: Context,
        private _config: Config,
        public plugin: ChatLunaPlugin
    ) {
        super(ctx, plugin.platformConfigPool)
        this.platform = _config.platform
        this._requester = new PublicApiRequester(
            ctx,
            plugin.platformConfigPool,
            _config,
            plugin
        )
    }

    async refreshModels(config?: RunnableConfig): Promise<ModelInfo[]> {
        return [
            {
                name: 'pearktrue',
                type: ModelType.llm,
                capabilities: [],
                maxTokens: 128000
            }
        ]
    }

    protected _createModel(model: string): ChatLunaChatModel {
        const info = this._modelInfos[model]

        if (info == null) {
            throw new ChatLunaError(
                ChatLunaErrorCode.MODEL_NOT_FOUND,
                new Error(
                    `The model ${model} is not found in the models: ${JSON.stringify(Object.keys(this._modelInfos))}`
                )
            )
        }

        if (info.type === ModelType.llm) {
            return new ChatLunaChatModel({
                modelInfo: info,
                requester: this._requester,
                model,
                maxTokenLimit: info.maxTokens,
                modelMaxContextSize: getModelMaxContextSize(info),
                timeout: this._config.timeout,
                maxRetries: this._config.maxRetries,
                llmType: 'openai',
                isThinkModel: false
            })
        }
    }
}
