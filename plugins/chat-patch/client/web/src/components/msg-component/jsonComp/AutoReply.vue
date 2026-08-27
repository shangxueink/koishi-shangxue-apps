<template>
    <div v-if="success" class="msg-json self-help">
        <p>{{ parsedContent.title }}</p>
        <span class="reply-buttons">
            <span
                v-for="(button, index) in parsedContent.button"
                :key="index"
                class="reply-button"
                @click="sendNotify(button.action_data)">
                {{ button.name }}
            </span>
        </span>
        <div class="bottom-bar">
            <font-awesome-icon icon="square-poll-horizontal" />
            <span>{{ $t('自助问答') }}</span>
        </div>
    </div>
    <span v-else class="msg-unknown">{{
        '( ' + $t('加载失败') + ': ' + id + ' )'
    }}</span>
</template>

<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { Logger } from '@renderer/function/base';
import { sendMsgRaw } from '@renderer/function/utils/msgUtil'
import { useChatStore } from '@renderer/state/chat'
import * as z from 'zod'

const { data: jsonData, id } = defineProps<{
    data: string,
    id: string,
}>()

const autoReply = z
    .object({
        app: z.literal('com.tencent.autoreply'),
        meta: z.object({
            metadata: z.object({
                buttons: z.array(
                    z.object({
                        action: z.literal('notify'),
                        action_data: z.string(),
                        name: z.string(),
                        slot: z.number(),
                    }),
                ),
                title: z.string(),
                type: z.string(),
            }),
        }),
    })
    .transform((o) => ({
        title: o.meta.metadata.title,
        button: o.meta.metadata.buttons.map((b) => ({
            name: b.name,
            action_data: b.action_data,
        })),
    }))
const json = JSON.parse(jsonData)
const parsedData = autoReply.safeParse(json)
const success = parsedData.success
const parsedContent = parsedData.data!
const chatStore = useChatStore()
if (!success) {
    new Logger().error(parsedData.error, 'Card Parse Error')
}

function sendNotify(data: string) {
    sendMsgRaw(
        String(chatStore.chatInfo.show.id),
        chatStore.chatInfo.show.type,
        [
            {
                type: 'at',
                qq: '2854196310'
            },
            {
                type: 'text',
                text: data,
            }
        ]
    )
}
</script>

<style lang="css" scoped>
.reply-buttons {
    display: flex;
    flex-direction: column;
    margin: 1ch 2ch;
}
.reply-button {
    text-decoration: underline;
    cursor: pointer;
}
</style>
