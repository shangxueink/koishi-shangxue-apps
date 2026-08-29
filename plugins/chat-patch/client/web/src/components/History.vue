<template>
    <div class="history-box">
        <div v-if="history.record.length === 0" class="space">
            <font-awesome-icon :icon="['fas', 'inbox']" />
            <span>{{ $t('空空如也') }}</span>
        </div>
        <div v-else class="main">
            <tiny-session-body
                v-for="session in history.record"
                :key="session.user_id ?? session.group_id"
                :session="session"
                @click="changeSession(session)" />
        </div>
    </div>
</template>


<script setup lang="ts">
import { Session } from '../function/elements/information';
import { useChatStore } from '../state/chat';
import { useSessionHistoryStore } from '../state/sessionHistory';
import { useContactStore } from '../state/contact';
import { nextTick } from 'vue';
import TinySessionBody from './TinySessionBody.vue';

const history = useSessionHistoryStore()
const contactStore = useContactStore()
const chatStore = useChatStore()

/**
 * 切换会话
 * @param session
 */
function changeSession(session: Session) {
    const id = session.user_id ?? session.group_id
    if (id === chatStore.chatInfo.show.id) return

    contactStore.baseOnMsgList.set(String(session.user_id ?? session.group_id), session)
    // 切换到这个聊天
    nextTick(() => {
        const item = document.getElementById(
            'user-' + (session.user_id ?? session.group_id),
        )
        if (item) {
            item.click()
        }
    })
}
</script>
