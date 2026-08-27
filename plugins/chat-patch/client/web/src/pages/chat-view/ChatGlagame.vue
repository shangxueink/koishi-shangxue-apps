<template>
    <div>
        <chat v-bind="$props">
            <template #main-input-button>
                <div style="cursor: pointer" @click="onRobotClick">
                    <font-awesome-icon v-if="!onChating" :icon="['fas', 'robot']" />
                    <font-awesome-icon v-else :icon="['fas', 'spinner']" spin />
                </div>
            </template>
            <template #chat-extra>
                <div v-if="onLoading || dataList.length > 0" id="chat-extra" class="chat-extra">
                    <template v-if="dataList.length == 0">
                        <div class="ss-card load">
                            <font-awesome-icon :icon="['fas', 'spinner']" spin />
                        </div>
                        <div v-if="debug" id="chatHistory" class="ss-card chat-history">
                            <span>{{ chatHistory }}</span>
                        </div>
                    </template>
                    <div v-else class="options">
                        <div v-for="(item, index) in dataList" :key="index"
                            @click="selectChoice(item)">
                            {{ item }}
                        </div>
                        <div class="controller">
                            <font-awesome-icon
                                :icon="['fas', 'xmark']"
                                @click="onLoading = false; dataList = []" />
                            <font-awesome-icon
                                :icon="['fas', 'rotate']"
                                @click="dataList = []; onRobotClick()" />
                        </div>
                        <div v-if="debug" id="chatHistory" class="ss-card chat-history chat-history-ex">
                            <span>{{ chatHistory }}</span>
                        </div>
                    </div>
                </div>
            </template>
        </chat>
    </div>
</template>

<script lang="ts" setup>
import z from 'zod'

import { v4 as uuid } from 'uuid'
import { streamText, tool } from 'ai'
import { ref, toRaw, watch, onMounted } from 'vue'
import { get, optDefault } from '@renderer/function/option'
import { Logger, LogType, PopInfo, PopType } from '@renderer/function/base'
import { getViewTime } from '@renderer/function/utils/systemUtil'
import { getMsgRawTxt } from '@renderer/function/utils/msgUtil'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { useAuthStore } from '@renderer/state/auth'
import { useChatStore } from '@renderer/state/chat'
import {
  registerExtraOptionCard,
  registerExtraOptionItem,
} from '@renderer/function/option'

import Chat from '../Chat.vue'

defineOptions({ name: 'ChatGlagame' })

const authStore = useAuthStore()
const chatStore = useChatStore()

const props = defineProps<{
    chat: any
    list: any[]
    imgView: any
}>()

const debug = import.meta.env.DEV
const onLoading = ref(false)
const onChating = ref(false)
const dataList = ref<string[]>([])
const chatHistory = ref('')

const sessionMessageList = ref<{[key: number]: { role: 'user' | 'assistant' | 'system', content: string }[] }>({})
const sessionTokenUsage = ref<{[key: number]: number}>({})

function getCurrentMessages() {
    const chatId = chatStore.chatInfo.show.id
    if (!sessionMessageList.value[chatId]) {
        sessionMessageList.value[chatId] = []
    }
    return sessionMessageList.value[chatId]
}

/**
 * 初始化会话消息，包括基础提示词、账号信息、会话信息和历史消息等；如果已经有消息了则不重复初始化。
 * 返回值表示是否进行了初始化（即是否发送了初始消息）。
 */
async function initChat() {
    if (getCurrentMessages().length == 0) {
        // 初始化基础提示词
        getCurrentMessages().push({
            role: 'system',
            content: get('glagame_prompt') || optDefault.glagame_prompt,
        })
        getCurrentMessages().push({
            role: 'system',
            content: `好感度功能：
- 你可以通过调用 updateFavorability 工具来更新其他用户对自己的好感度数值，数值范围 -100 ~ 100。
- 你可以通过调用 getFavorability 工具来获取其他用户对自己的好感度数值，数值范围 -100 ~ 100，可能为 null 表示没有相关数据。
- 好感度值可参与对话语气、关注度、选项内容等生成，但请避免过度依赖好感度数值进行生成，以免出现数值异常时的异常表现。
- 你可以随时更新好感度数值来记录其他用户对自己的态度变化，但请只在出现明确对话行为时调用工具进行更新，不要为了记录而频繁调用工具进行更新。`
        })
        getCurrentMessages().push({
            role: 'system',
            content: `最终规则：
- 在没有明确要求调用工具时，请尽量不要调用工具。
- 在需要提供选项时，请直接提供选项内容，而不是解释说明或建议内容。
- 在你不知道要如何提供选项时，宁可不调用工具，也不要编造内容进行调用。`,
        })
        // 获取账号信息
        getCurrentMessages().push({
            role: 'system',
            content: `当前账号信息：ID ${authStore.loginInfo.uin}，昵称 ${authStore.loginInfo.nickname}`,
        })
        // 获取会话信息
        getCurrentMessages().push({
            role: 'system',
            content: `当前会话基本信息：会话 ID ${chatStore.chatInfo.show.id}，会话名称 ${chatStore.chatInfo.show.name}，会话类型 ${chatStore.chatInfo.show.type}`,
        })
        if (props.list.length > 0) {
            // 获取 20 条历史消息
            const historyMessages = props.list.slice(-20)
            let msgStrs = ''
            historyMessages.forEach((msg: any) => {
                msgStrs += getMessageDetail(msg) + '\n'
            })
            getCurrentMessages().push({
                role: 'system',
                content: '当前会话历史消息（仅展示最近 20 条）:\n```json' + msgStrs + '\n```',
            })
        }

        const success = await sendMessage()

        if (!success) {
            new PopInfo().add(PopType.ERR, '初始消息分析失败，AI 功能可能无法正常工作')
        }

        return true
    }
    return false
}

// 粗略估算当前会话 token 数（按字符数近似）
function estimateTokens(messages: { role: 'user' | 'assistant' | 'system', content: string }[]) {
    const totalChars = messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0)
    // 这里使用简单近似：约 3 个字符 ≈ 1 token
    return Math.ceil(totalChars / 3)
}

// 根据 token 窗口进行会话压缩；优先使用实际 totalTokens，其次使用粗略估算
async function compactMessagesIfNeeded(messages: { role: 'user' | 'assistant' | 'system', content: string }[], actualTokens?: number) {
    const maxTokens = Number(get('glagame_max_tokens')) || 6000
    const estimatedTokens = estimateTokens(messages)
    const currentTokens = typeof actualTokens === 'number' && actualTokens > 0 ? actualTokens : estimatedTokens

    if (currentTokens <= maxTokens) return

    const chatId = chatStore.chatInfo.show.id

    const systemMessages = messages.filter(msg => msg.role === 'system')
    const otherMessages = messages.filter(msg => msg.role !== 'system')

    // 至少保留最近的一些对话消息，避免摘要过于粗糙
    const keepTailCount = 8
    if (otherMessages.length <= keepTailCount) return

    const tail = otherMessages.slice(-keepTailCount)
    const toSummarize = otherMessages.slice(0, otherMessages.length - keepTailCount)

    if (!toSummarize.length) return

    try {
        const summaryText = await summarizeMessages(toSummarize)
        const summaryMessage = {
            role: 'system' as const,
            content: '以下是此前对话的摘要，用于帮助你继续后续对话：\n' + summaryText,
        }

        sessionMessageList.value[chatId] = [
            ...systemMessages,
            summaryMessage,
            ...tail,
        ]

        new Logger().info('会话已根据 token 窗口进行摘要压缩')
    } catch (error) {
        new Logger().error(error as unknown as Error, '会话摘要压缩失败，暂不进行压缩')
    }
}

async function summarizeMessages(messages: { role: 'user' | 'assistant' | 'system', content: string }[]) {
    const openaiCompatible = createOpenAICompatible({
        name: 'glagame summarize: ' + chatStore.chatInfo.show.name,
        baseURL: get('openai_api') || '',
        headers: {
            Authorization: `Bearer ${get('openai_token') || ''}`,
        },
    })

    const summaryMessages = [
        {
            role: 'system' as const,
            content: '你是一个会话总结助手，请在不丢失关键信息的前提下，尽量简短地用中文总结下面对话的核心内容、重要背景和未完成的任务。不要输出多余说明。',
        },
        ...messages,
    ]

    const response = streamText({
        model: openaiCompatible(get('openai_model') || 'gpt-4o'),
        messages: summaryMessages,
    } as any)

    let fullResponse = ''
    let jsonErrorMessage = ''

    for await (const part of response.fullStream as any) {
        const curPart = part as any
        if (curPart?.text) {
            fullResponse += curPart.text
        }
        if (!jsonErrorMessage && curPart?.error) {
            if (typeof curPart.error === 'string') {
                jsonErrorMessage = curPart.error
            } else {
                jsonErrorMessage = curPart.error?.message || JSON.stringify(curPart.error)
            }
        }
    }

    const responseText = fullResponse.trim()
    if (!jsonErrorMessage && responseText.startsWith('{')) {
        try {
            const jsonData = JSON.parse(responseText)
            if (jsonData?.error) {
                if (typeof jsonData.error === 'string') {
                    jsonErrorMessage = jsonData.error
                } else {
                    jsonErrorMessage = jsonData.error?.message || JSON.stringify(jsonData.error)
                }
            }
        } catch {
            // ignore JSON parse error, keep raw text
        }
    }

    if (jsonErrorMessage) {
        throw new Error(jsonErrorMessage)
    }

    return fullResponse.trim()
}

async function onRobotClick() {
    if(onLoading.value) {
        onLoading.value = false
        dataList.value = []
    } else {
        onLoading.value = true
        dataList.value = []
    }

    if(!await initChat()) {
        sendMessage().then(() => {
            onLoading.value = false
        })
    }
}

function getMessageDetail(chatMessage: any) {
    return JSON.stringify({
        id: chatMessage.messageId,
        time: getViewTime(chatMessage.time),
        sender: {
            id: chatMessage.sender.id,
            nickname: chatMessage.sender.nickname,
        },
        content: getMsgRawTxt(chatMessage),
        replyMessages: chatMessage.message?.map((msg: any) => {
            if(msg.type === 'reply') {
                return msg.id
            }
        }) || [],
        mentionUsers: chatMessage.message?.map((msg: any) => {
            if(msg.type === 'at') {
                return msg.qq
            }
        }) || [],
    })
}

async function sendMessage() {
    const sessionId = uuid()

    if(onChating.value) {
        new PopInfo().add(PopType.INFO, '正在分析消息，请稍候...')
        return false
    }
    onChating.value = true
    chatHistory.value = ''

    // 会话压缩（优先使用上一次请求的实际 token 统计）
    const chatId = chatStore.chatInfo.show.id
    const lastTokens = sessionTokenUsage.value[chatId]
    await compactMessagesIfNeeded(getCurrentMessages(), lastTokens)

    // 初始化 Provider
    const openaiCompatible = createOpenAICompatible({
        name: 'glagame chat: ' + chatStore.chatInfo.show.name,
        baseURL: get('openai_api') || '',
        headers: {
            Authorization: `Bearer ${get('openai_token') || ''}`,
        },
    })

    new Logger().add(LogType.DEBUG, '消息分析（' + sessionId + '）：', toRaw(getCurrentMessages()))

    try {
        const data = {
            model: openaiCompatible(get('openai_model') || 'gpt-4o'),
            messages: getCurrentMessages(),
            tools: {
                showChoices: tool({
                    description: 'Display reply options for interface display',
                    title: 'Display reply options',
                    inputSchema: z.object({
                        choices: z.array(z.string()).min(1).max(3).describe('选项列表，3 个'),
                    }),
                    execute: async (input) => {
                        const choices = input.choices
                        dataList.value = choices
                        onLoading.value = false
                        new Logger().add(LogType.DEBUG, '工具调用（' + sessionId + '）：showChoices', choices)
                    }
                }),
                updateFavorability: tool({
                    description: 'Update the favorability value of the corresponding user, with a range of -100 ~ 100',
                    title: 'Update Favorability',
                    inputSchema: z.object({
                        id: z.number().describe('User ID'),
                        source: z.number().describe('Session ID the user comes from'),
                        value: z.number().min(-100).max(100).describe('Favorability value, range -100 ~ 100'),
                    }),
                    execute: async (input) => {
                        const { id, source, value } = input
                        new Logger().add(LogType.DEBUG, '工具调用（' + sessionId + '）：updateFavorability', { id, source, value })

                        // TODO 好感存储相关功能
                    }
                }),
                getFavorability: tool({
                    description: 'Get the favorability value of the corresponding user, with a range of -100 ~ 100. May be null, indicating no related data.',
                    title: 'Get Favorability',
                    inputSchema: z.object({
                        id: z.number().describe('User ID'),
                        source: z.number().describe('Session ID the user comes from'),
                    }),
                    outputSchema: z.number().min(-100).max(100).nullable().describe('Favorability value, range -100 ~ 100, may be null'),
                    execute: async (input) => {
                        const { id, source } = input
                        new Logger().add(LogType.DEBUG, '工具调用（' + sessionId + '）：getFavorability', { id, source })

                        // TODO 好感存储相关功能，暂时返回 0
                        return 0
                    }
                })
            }
        } as any

        const response = streamText(data)
        let jsonErrorMessage = ''
        for await (const part of response.fullStream) {
            const curPart = part as any
            if(curPart) {
                switch(curPart.type) {
                    case 'reasoning-delta':
                    case 'text-delta':
                        chatHistory.value += curPart.text
                        if(debug) {
                            const chatHistoryEl = document.getElementById('chatHistory')
                            if(chatHistoryEl) {
                                chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight
                            }
                        }
                        break
                    case 'finish':
                        if (curPart.totalUsage?.totalTokens) {
                            sessionTokenUsage.value[chatId] = curPart.totalUsage.totalTokens
                            new Logger().info('消息分析（' + sessionId + '）完成，token 消耗：' +  curPart.totalUsage.totalTokens)
                        } else {
                            new Logger().info('消息分析（' + sessionId + '）完成，但未返回 token 统计')
                        }
                }
            }
            if(!jsonErrorMessage && curPart?.error) {
                if(typeof curPart.error === 'string') {
                    jsonErrorMessage = curPart.error
                } else {
                    jsonErrorMessage = curPart.error?.message || JSON.stringify(curPart.error)
                }
            }
        }

        onChating.value = false

        const responseText = chatHistory.value.trim()
        if(!jsonErrorMessage && responseText.startsWith('{')) {
            try {
                const jsonData = JSON.parse(responseText)
                if(jsonData?.error) {
                    if(typeof jsonData.error === 'string') {
                        jsonErrorMessage = jsonData.error
                    } else {
                        jsonErrorMessage = jsonData.error?.message || JSON.stringify(jsonData.error)
                    }
                }
            } catch {
                // do nothing, keep fullResponse as is
            }
        }

        if(jsonErrorMessage) {
            new Logger().error(new Error(jsonErrorMessage), '调用错误')
            new PopInfo().add(PopType.ERR, '调用失败：' + jsonErrorMessage)
            return false
        }

        if(chatHistory.value.trim().length > 0) {
            new Logger().add(LogType.INFO, '消息分析（' + sessionId + '）结果：', chatHistory.value.trim())
        }

        getCurrentMessages().push({
            role: 'assistant',
            content: chatHistory.value.trim(),
        })

        return true
    } catch (error) {
        onChating.value = false

        new Logger().error(error as unknown as Error, '调用错误')
        new PopInfo().add(PopType.ERR, '调用失败，请检查设置和网络连接')
        return false
    }
}

function selectChoice(item: string) {
    onLoading.value = false
    dataList.value = []

    const input = (document.getElementById( 'main-input') as HTMLTextAreaElement | HTMLInputElement) ??
            (document.getElementById( 'main-input-ex') as HTMLTextAreaElement | HTMLInputElement)
    if (input) {
        input.value = item
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.focus()
    }
}

onMounted(async () => {
    registerExtraOptionCard({
        id: 'ai',
        title: 'AI 基础设置',
    })
    registerExtraOptionCard({
        id: 'glagame',
        title: '"Glagame" 聊天辅助',
    })
    registerExtraOptionItem('ai', {
        id: 'openai_api',
        icon: 'link',
        label: 'OpenAI API 地址',
        description: '只需要填写到 v1 即可，例如 https://openrouter.ai/api/v1',
        type: 'input',
        optionKey: 'openai_api',
        defaultValue: '',
    })
    registerExtraOptionItem('ai', {
        id: 'openai_token',
        icon: 'key',
        label: 'OpenAI Token',
        description: '秘钥，明文存储请注意',
        type: 'password',
        optionKey: 'openai_token',
        defaultValue: '',
    })
    registerExtraOptionItem('ai', {
        id: 'openai_model',
        icon: 'robot',
        label: 'OpenAI 模型名称',
        description: '模型名称，需支持工具调用和流式输出',
        type: 'input',
        optionKey: 'openai_model',
        defaultValue: 'gpt-4o',
    })
    registerExtraOptionItem('glagame', {
        id: 'glagame_max_tokens',
        icon: 'cubes',
        label: '上下文窗口（token）',
        description: '超过时会自动进行摘要压缩',
        type: 'input',
        optionKey: 'glagame_max_tokens',
        defaultValue: 2000,
    })
    registerExtraOptionItem('glagame', {
        id: 'glagame_prompt',
        icon: 'book',
        label: '基础提示词',
        description: 'AI 消息分析时的基础提示词',
        type: 'input',
        optionKey: 'glagame_prompt',
        defaultValue: `你是一个对话辅助助手，你将根据历史的对话内容生成可供玩家可以选择用来直接回复的内容。

- 玩家默认是温和、体贴、日常向、有点小俏皮。
- **不要**为玩家本人的消息生成回复，玩家本人的消息仅供上下文参考。
- 若对话之间时间相隔较久，可自然应对（如"刚看到消息"）。
- 避免引入与对话无关的新背景。

对话记录中含有玩家本人的消息，请根据提供的当前账号信息自行区分，可以适当模仿玩家的语言风格。`,
    })
    registerExtraOptionItem('glagame', {
        id: 'glagame_favorability',
        icon: 'heart',
        label: '好感度功能',
        description: '允许 AI 为聊天记录生成好感度数值',
        type: 'switch',
        optionKey: 'glagame_favorability',
        defaultValue: false,
    })

    watch(() => props.list.length, async (newVal, oldVal) => {
        if (newVal - oldVal == 1) {
            getCurrentMessages().push({
                role: 'user',
                content: '```json\n' + getMessageDetail(
                    props.list[props.list.length - 1]) + '\n```',
            })
        }
    })
})
</script>

<style scoped>
.chat-extra {
    padding-top: 20px;
    position: absolute;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: all;
    background: rgba(var(--color-card-rgb), 0.7);
}
.chat-extra .load {
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 5px var(--color-shader);
}
.chat-extra .chat-history {
    max-height: 35vh;
    overflow: scroll;
    width: 60%;
    white-space: pre-line;
    font-size: 0.75rem !important;
    color: var(--color-font-2);
    margin-top: 20px;
}
.chat-extra .chat-history::-webkit-scrollbar {
    display: none;
}
.chat-extra .chat-history-ex {
    margin-top: -130px;
    max-height: 20vh;
    text-align: left !important;
    line-height: unset !important;
}
.chat-extra .options {
    flex-direction: column;
    width: 100%;
    align-items: center;
    display: flex;
    gap: 20px;
}
.chat-extra .options > div {
    cursor: pointer;
    border-radius: 7px;
    box-shadow: 0 0 5px var(--color-shader);
    background: var(--color-card);
    padding: 10px;
    width: 70%;
    text-align: center;
    line-height: 25px;
    font-size: 0.8rem;
}
.chat-extra .options > div.controller {
    background: unset;
    box-shadow: unset;
}
.chat-extra .options svg {
    margin: 10px;
    cursor: pointer;
    width: 15px;
    height: 15px;
    box-shadow: 0 0 5px var(--color-shader);
    background: var(--color-card);
    padding: 15px;
    border-radius: 100%;
    margin-top: 30px;
}
</style>
<style>
.glagame-api-config {
    width: calc(100% - 10px);
    max-height: 55vh;
    overflow-y: scroll;
    overflow-x: hidden;
    padding-right: 10px;
}
.glagame-api-config label {
    line-height: 25px;
}
.glagame-api-config input,
.glagame-api-config textarea {
    color: var(--color-font);
    width: calc(100% - 20px);
    background: var(--color-card-1);
    border: unset;
    padding: 10px;
    margin: 5px 0 10px 0;
    border-radius: 7px;
}
</style>
