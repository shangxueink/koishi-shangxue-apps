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
import { useUIStore } from '../state/ui';
import { nextTick } from 'vue';
import TinySessionBody from './TinySessionBody.vue';

const history = useSessionHistoryStore()
const contactStore = useContactStore()
const chatStore = useChatStore()
const uiStore = useUIStore()

/**
 * 切换会话
 * @param session
 */
function changeSession(session: Session) {
    // 选中历史会话后关闭弹窗，避免遮罩继续挡住侧栏和机器人折叠
    uiStore.popBoxList.shift()
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

<style scoped>
    .history-box {
        height: min(680px, calc(100vh - 160px));
        aspect-ratio: 9 / 16;
        max-width: calc(100vw - 80px);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .history-box > .space {
        flex: 1;
    }

    .history-box > .main {
        flex: 1;
        max-height: none;
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
    }
</style>
