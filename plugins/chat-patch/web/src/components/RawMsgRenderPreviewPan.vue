<template>
    <div class="raw-render-preview-pan">
        <div class="raw-render-preview-pane">
            <span v-if="rawRenderPreviewLoading" class="raw-render-preview-tip">
                {{ $t('正在处理原始消息……') }}
            </span>
            <span v-else-if="rawRenderPreviewError" class="raw-render-preview-error">
                {{ rawRenderPreviewError }}
            </span>
            <span v-else-if="rawRenderPreviewList.length === 0" class="raw-render-preview-tip">
                {{ $t('还没有可预览的消息') }}
            </span>
            <div v-else class="raw-render-preview-msg-list">
                <MsgBody
                    v-for="(item, index) in rawRenderPreviewList"
                    :key="item.message_id ?? `raw-render-preview-${index}`"
                    :data="item"
                    :type="'body'" />
            </div>
        </div>
        <div class="raw-render-preview-title">
            <label for="raw-render-preview-textarea">{{ $t('原始消息') }}</label>
        </div>
        <textarea
            id="raw-render-preview-textarea"
            v-model="rawRenderPreviewText"
            class="raw-render-preview-textarea ss-input"
            @keydown.ctrl.enter.prevent="renderRawPreview" />
    </div>
</template>

<script setup lang="ts">
    import { ref } from 'vue'

    import MsgBody from '@renderer/components/MsgBody.vue'
    import { normalizeMessagesForPreview } from '@renderer/function/msg'
    import { getMsgRawTxt } from '@renderer/function/utils/msgUtil'
    import { useAuthStore } from '@renderer/state/auth'
    import { i18n } from '@renderer/main'

    defineOptions({ name: 'RawMsgRenderPreviewPan' })

    const {
        data,
    } = defineProps<{
        data?: {
            text?: string
        }
    }>()

    const authStore = useAuthStore()
    const $t = i18n.global.t

    const rawRenderPreviewText = ref(data?.text ?? '')
    const rawRenderPreviewLoading = ref(false)
    const rawRenderPreviewError = ref('')
    const rawRenderPreviewList = ref<any[]>([])

    function buildRawRenderFallbackMessage(msg: any, index: number) {
        const previewMsg = { ...msg }
        const senderId = Number(
            previewMsg.sender?.user_id
            ?? previewMsg.user_id
            ?? authStore.loginInfo.uin
            ?? 0,
        )

        previewMsg.message_id ??= `raw-render-preview-${index}`
        previewMsg.time = Number(previewMsg.time ?? Math.floor(Date.now() / 1000))
        previewMsg.post_type ??= 'message'
        previewMsg.message = Array.isArray(previewMsg.message) ? previewMsg.message : []
        previewMsg.sender = {
            user_id: senderId,
            nickname: previewMsg.sender?.nickname
                ?? previewMsg.nickname
                ?? authStore.loginInfo.nickname
                ?? $t('预览消息'),
            card: previewMsg.sender?.card ?? '',
            ...previewMsg.sender,
        }
        previewMsg.raw_message ??= getMsgRawTxt(previewMsg)

        return previewMsg
    }

    async function renderRawPreview() {
        if (rawRenderPreviewText.value.trim() === '') {
            rawRenderPreviewList.value = []
            rawRenderPreviewError.value = ''
            return
        }

        rawRenderPreviewLoading.value = true
        rawRenderPreviewError.value = ''

        try {
            const raw = JSON.parse(rawRenderPreviewText.value)
            const list = (await normalizeMessagesForPreview(raw))
                .map((item, index) => buildRawRenderFallbackMessage(item, index))
                .filter((item) => Array.isArray(item.message))

            rawRenderPreviewList.value = list
            if (list.length === 0) {
                rawRenderPreviewError.value = $t('当前原始消息中没有可渲染的消息体')
            }
        } catch (error) {
            rawRenderPreviewList.value = []
            rawRenderPreviewError.value = error instanceof Error? error.message: $t('处理原始消息失败')
        } finally {
            rawRenderPreviewLoading.value = false
        }
    }

    if (rawRenderPreviewText.value !== '') {
        void renderRawPreview()
    }
</script>

<style scoped>
    .raw-render-preview-pan {
        display: flex;
        flex-direction: column;
        gap: 14px;
        width: calc(100% - 70px);
    height: calc(100vh - 90px);
    overflow-y: scroll;
    overflow-x: hidden;
    margin-top: 10px;
    padding: 0 50px 20px 20px !important;
    }

    .raw-render-preview-title {
        display: flex;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
        font-size: 0.9rem;
        font-weight: 700;
    }

    .raw-render-preview-title span:last-child {
        color: var(--color-font-2);
        font-size: 0.8rem;
        font-weight: 500;
    }

    .raw-render-preview-textarea,
    .raw-render-preview-pane {
        border: unset;
        border-radius: 7px;
    }

    .raw-render-preview-textarea {
        width: 100%;
        min-height: 260px;
        padding: 16px;
        background: var(--color-bg);
        color: var(--color-font);
        resize: vertical;
        font-family: monospace;
        font-size: 0.85rem;
        line-height: 1.6;
    }

    .raw-render-preview-pane {
        background: transparent;
    }

    .raw-render-preview-msg-list {
        display: flex;
        flex-direction: column;
        gap: 14px;
    }

    .raw-render-preview-tip,
    .raw-render-preview-error {
        display: block;
        font-size: 0.9rem;
        line-height: 1.6;
    }

    .raw-render-preview-tip {
        color: var(--color-font-2);
    }

    .raw-render-preview-error {
        color: var(--color-red);
        white-space: pre-wrap;
    }
</style>
