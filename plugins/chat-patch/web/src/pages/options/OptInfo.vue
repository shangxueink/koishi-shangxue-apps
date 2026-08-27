<!--
 - @FileDescription: 设置页面（群/好友设置页面）
 - @Author: Stapxs
 - @Date: 2023/2/7
 - @Version: 1.0 - 初始版本
-->

<template>
    <div
        class="info-pan-set"
        style="padding: 0">
        <!-- 公用设置 -->
        <!-- 群设置 -->
        <template v-if="type == 'group'">
            <div v-if="chatStore.chatInfo.info.me_info.role == 'owner' ||
                     chatStore.chatInfo.info.me_info.role == 'admin'"
                class="opt-item">
                <font-awesome-icon :icon="['fas', 'pen']" />
                <div>
                    <label for="opt-info-group-name">{{ $t('群聊名称') }}</label>
                    <span>{{ $t('"你们真是害人不浅呐你们这个群"') }}</span>
                </div>
                <input id="opt-info-group-name" v-model="chatStore.chatInfo.show.name" class="ss-input"
                    style="width: 150px" type="text" @keyup="setGroupName">
            </div>
            <div class="opt-item">
                <font-awesome-icon :icon="['fas', 'note-sticky']" />
                <div>
                    <label for="opt-info-group-card">{{ $t('我的群昵称') }}</label>
                    <span>{{ $t('￡爺↘僞ηι慹著彡') }}</span>
                </div>
                <input id="opt-info-group-card" v-model="chatStore.chatInfo.info.me_info.card" class="ss-input"
                    style="width: 150px" type="text" @change="setGroupCard">
            </div>
            <div class="opt-item">
                <font-awesome-icon :icon="['fas', 'bell']" />
                <div>
                    <span>{{ $t('通知群消息') }}</span>
                    <span>{{ $t('快来水群快来水群！') }}</span>
                </div>
                <label class="ss-switch">
                    <input v-model="canGroupNotice" type="checkbox"
                        name="opt_dark" @change="setGroupNotice">
                    <div>
                        <div />
                    </div>
                </label>
            </div>

            <button class="ss-button"
                style="width: calc(100% - 60px); margin: 10px 30px 0 30px"
                @click="leaveGroup()">
                {{ $t('退出群聊') }}
            </button>
        </template>
    </div>
</template>

<script lang="ts" setup>
    import { useUIStore } from '@renderer/state/ui'
    import { useAuthStore } from '@renderer/state/auth'
    import { useContactStore } from '@renderer/state/contact'
    import { useChatStore } from '@renderer/state/chat'
    import { Connector } from '@renderer/function/connect'
    import { changeGroupNotice, reloadUsers } from '@renderer/function/utils/appUtil'
    import { canGroupNotice } from '@renderer/function/utils/msgUtil'
    import { i18n } from '@renderer/main'

    defineOptions({ name: 'ViewOptInfo' })

    const authStore = useAuthStore()
    const contactStore = useContactStore()
    const chatStore = useChatStore()
    const uiStore = useUIStore()
    const $t = i18n.global.t

    const props = defineProps<{
        type: string
        chat: any
    }>()

    const emit = defineEmits<{
        'update_mumber_card': [event: Event, info: any]
    }>()

    /**
     * 设置群消息通知
     * @param event 输入事件
     */
    function setGroupNotice(event: Event) {
        const status = (event.target as HTMLInputElement).checked
        changeGroupNotice(props.chat.show.id, status)
    }

    /**
     * 设置群名片
     * @param event 按键事件
     */
    function setGroupCard(event: Event) {
        emit('update_mumber_card', event, chatStore.chatInfo.info.me_info)
    }

    /**
     * 设置群名
     * @param event 按键事件
     */
    function setGroupName(event: KeyboardEvent) {
        if (
            event.key === 'Enter' &&
            chatStore.chatInfo.show.name != ''
        ) {
            Connector.send(
                'set_group_name',
                {
                    group_id: props.chat.show.id,
                    group_name: chatStore.chatInfo.show.name,
                },
                'setGroupName',
            )
        }
    }

    /**
     * 退出群聊
     */
    function leaveGroup() {
        const popInfo = {
            html: '<span>' + $t('确定要退出群聊吗？') + '</span>',
            button: [
                {
                    text: $t('确定'),
                    fun: () => {
                        if (authStore.jsonMap.leave_group?.name) {
                            Connector.send(authStore.jsonMap.leave_group?.name,
                                { group_id: props.chat.show.id },
                                'leaveGroup')
                        }
                        // 从消息列表中删除该群聊
                        contactStore.baseOnMsgList.delete(props.chat.show.id)
                        // 关闭群聊窗口
                        chatStore.chatInfo.show.id = 0
                        // 刷新好友/群列表
                        reloadUsers()
                        uiStore.popBoxList.shift()
                    },
                },
                {
                    text: $t('取消'),
                    master: true,
                    fun: () => {
                        uiStore.popBoxList.shift()
                    },
                },
            ],
        }
        uiStore.popBoxList.push(popInfo)
    }
</script>

<style scoped>
    .opt-item:hover input[type='text'] {
        background: var(--color-card-2);
        transition: background 0.2s;
    }
</style>
