<!--
 * @FileDescription: 群 / 好友信息页面
 * @Author: Stapxs
 * @Date: missing
 * @Version: 1.0
-->

<template>
    <div v-if="tags.openChatInfo"
        class="chat-info-pan">
        <div class="ss-card chat-info">
            <header>
                <span v-if="chat.show.type === 'group'">{{ $t('群资料') }}</span>
                <span v-if="chat.show.type === 'user'">{{ $t('好友') }}</span>
                <font-awesome-icon :icon="['fas', 'xmark']" @click="closeChatInfoPan" />
            </header>
            <div class="chat-info-base user">
                <div>
                    <img :src="chat.show.avatar || '/img/icons/icon.svg'" @error="avatarError">
                    <div>
                        <a>{{ chat.show.name }}</a>
                        <span>{{ chat.show.id }}</span>
                    </div>
                    <div style="display: flex;align-items: center;justify-content: center;cursor: pointer;"
                        @click="copyText(chat.show.id)">
                        <font-awesome-icon :icon="['fas', 'copy']" />
                    </div>
                </div>
                <div v-if="chat.show.type === 'group'">
                    <header>
                        <span>{{ $t('群组 ID') }}</span>
                    </header>
                    <div class="info-copy">
                        <span>{{ chat.show.id }}</span>
                        <font-awesome-icon :icon="['fas', 'copy']" @click="copyText(chat.show.id)" />
                    </div>
                    <header>
                        <span>{{ $t('频道 ID') }}</span>
                    </header>
                    <div class="info-copy">
                        <span>{{ groupChannelId() }}</span>
                        <font-awesome-icon :icon="['fas', 'copy']" @click="copyText(groupChannelId())" />
                    </div>
                    <header>
                        <span>{{ $t('群头像') }}</span>
                    </header>
                    <div class="info-copy">
                        <span style="word-break: break-all;">{{ isDefaultAvatar(chat.show.avatar) ? $t('无') : chat.show.avatar }}</span>
                        <font-awesome-icon v-if="!isDefaultAvatar(chat.show.avatar)"
                            :icon="['fas', 'copy']" @click="copyText(chat.show.avatar)" />
                    </div>
                </div>
                <div v-if="chat.show.type === 'group'"
                    v-show="Object.keys(chat.info.group_info).length > 0">
                    <header>
                        <span>{{ $t('介绍') }}</span>
                    </header>
                    <span v-html=" chat.info.group_info.gIntro === undefined || chat.info.group_info.gIntro === '' ?
                        $t('群主很懒，还没有群介绍哦～') : chat.info.group_info.gIntro" />
                    <div class="tags">
                        <div v-for="item in chat.info.group_info.tags" :key="item.md">
                            {{ item.tag }}
                        </div>
                    </div>
                </div>
                <div v-else-if="chat.show.type === 'user'">
                    <header>
                        <span>{{ $t('用户 ID') }}</span>
                    </header>
                    <div class="info-copy">
                        <span>{{ chat.show.id }}</span>
                        <font-awesome-icon :icon="['fas', 'copy']" @click="copyText(chat.show.id)" />
                    </div>
                    <header>
                        <span>{{ $t('用户名称') }}</span>
                    </header>
                    <div class="info-copy">
                        <span>{{ chat.show.name }}</span>
                        <font-awesome-icon :icon="['fas', 'copy']" @click="copyText(chat.show.name)" />
                    </div>
                    <header>
                        <span>{{ $t('用户头像链接') }}</span>
                    </header>
                    <div class="info-copy">
                        <span style="word-break: break-all;">{{ isDefaultAvatar(chat.show.avatar) ? $t('无') : chat.show.avatar }}</span>
                        <font-awesome-icon v-if="!isDefaultAvatar(chat.show.avatar)"
                            :icon="['fas', 'copy']" @click="copyText(chat.show.avatar)" />
                    </div>
                    <header>
                        <span>{{ $t('频道 ID') }}</span>
                    </header>
                    <div class="info-copy">
                        <span>{{ userChannelId() }}</span>
                        <font-awesome-icon :icon="['fas', 'copy']" @click="copyText(userChannelId())" />
                    </div>
                </div>
            </div>
            <BcTab v-if="chat.show.type === 'group'"
                class="chat-info-tab">
                <div :name="$t('成员')">
                    <div class="search-view">
                        <label for="info-member-search" class="sr-only">{{ $t('搜索成员') }}</label>
                        <input id="info-member-search" :placeholder="$t('搜索 ……')" @input="searchList($event)">
                    </div>
                    <RecycleScroller
                        v-slot="{ item }"
                        class="member-scroller"
                        :items="memberSearch.trim() ? number_cache : chat.info.group_members"
                        :item-size="60"
                        key-field="user_id">
                        <div class="member-item edit">
                            <img alt="nk" loading="lazy"
                                :src="memberAvatar(item) || '/img/icons/icon.svg'">
                            <div>
                                <a @click="startChat(item)">{{
                                    memberName(item)
                                }}</a>
                                <font-awesome-icon v-if="memberRole(item) === 'owner'" :icon="['fas', 'crown']" />
                                <font-awesome-icon v-if="memberRole(item) === 'admin'" :icon="['fas', 'star']" />
                            </div>
                            <!-- 在手机端戳 id 就能触发 -->
                            <span @click="moreConfig(item)">{{ memberId(item) }}</span>
                            <font-awesome-icon v-if="canEditMember(memberRole(item))" :icon="['fas', 'wrench']" @click="moreConfig(item)" />
                            <font-awesome-icon v-else :icon="['fas', 'copy']" @click="copyText(memberId(item))" />
                        </div>
                    </RecycleScroller>
                </div>
            </BcTab>
            <div :class="'ss-card user-config' + (Object.keys(showUserConfig).length > 0 ? ' show' : '')">
                <div>
                    <img alt="nk" :src="showUserConfig.avatar || '/img/icons/icon.svg'">
                    <div>
                        <a>{{ showUserConfig.card != '' ? showUserConfig.card : showUserConfig.nickname }}</a>
                        <span>{{ showUserConfig.user_id }}</span>
                    </div>
                    <font-awesome-icon
                        style="margin-right: 20px;"
                        :icon="['fas', 'copy']"
                        @click="copyText(showUserConfig.user_id)" />
                    <font-awesome-icon :icon="['fas', 'angle-down']" @click="showUserConfig = {}" />
                </div>
                <div>
                    <header>{{ $t('成员信息') }}</header>
                    <div class="opt-item">
                        <font-awesome-icon :icon="['fas', 'clipboard-list']" />
                        <div>
                            <label for="info-member-card">{{ $t('成员昵称') }}</label>
                            <span>{{
                                $t('啊吧啊吧……')
                            }}</span>
                        </div>
                        <input id="info-member-card" v-model="showUserConfigRaw.card"
                            style="width: 50%"
                            class="ss-input"
                            type="text"
                            @change="updateMumberCard($event, showUserConfig)">
                    </div>
                    <div v-if="chat.info.me_info.role === 'owner'" class="opt-item">
                        <font-awesome-icon :icon="['fas', 'clipboard-list']" />
                        <div>
                            <label for="info-member-title">{{ $t('成员头衔') }}</label>
                            <span>{{
                                $t('猪咪猪咪')
                            }}</span>
                        </div>
                        <input id="info-member-title" v-model="showUserConfigRaw.title"
                            style="width: 50%"
                            class="ss-input"
                            type="text"
                            @change="updateMumberTitle($event, showUserConfig)">
                    </div>
                    <template v-if="(chat.info.me_info.role === 'owner' && showUserConfig.role != 'owner') || (chat.info.me_info.role === 'admin' && showUserConfig.role === 'member')">
                        <header>{{ $t('操作') }}</header>
                        <div class="opt-item">
                            <font-awesome-icon :icon="['fas', 'clipboard-list']" />
                            <div>
                                <label for="info-member-ban-min">{{ $t('禁言成员') }}</label>
                                <span>{{
                                    $t('要让小猫咪不许说话几分钟呢？')
                                }}</span>
                            </div>
                            <input id="info-member-ban-min" v-model="mumberInfo.banMin"
                                style="width: 50%"
                                class="ss-input"
                                type="text"
                                @input="checkNumber"
                                @change="banMumber($event, showUserConfig)">
                        </div>
                        <button class="ss-button"
                            @click="removeUser(showUserConfig.nickname, chat.show.id, showUserConfig.user_id)">
                            {{ $t('移出群聊') }}
                        </button>
                    </template>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import app, { i18n } from '@renderer/main'
import { avatarError } from '@renderer/function/utils/avatarUtil'
import BcTab from 'vue3-bcui/packages/bc-tab'
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

import { Connector, loadGroupMembersFromCache } from '@renderer/function/connect'
import { PopInfo, PopType } from '@renderer/function/base'
import { toRaw, ref, nextTick, watch } from 'vue'
import { delay } from '@renderer/function/utils/systemUtil'
import { useAuthStore } from '@renderer/state/auth'
import { useContactStore } from '@renderer/state/contact'
import { useChatStore } from '@renderer/state/chat'
import { useUIStore } from '@renderer/state/ui'
import {
    UserFriendElem,
    UserGroupElem,
} from '@renderer/function/elements/information'

defineOptions({ name: 'ViewInfo' })

const authStore = useAuthStore()
const contactStore = useContactStore()
const chatStore = useChatStore()
const uiStore = useUIStore()

const props = defineProps<{
    tags: any
    chat: any
}>()

const emit = defineEmits<{
    close: []
}>()

const { t: $t } = i18n.global

function isDefaultAvatar(value: unknown): boolean {
    const avatar = String(value ?? '')
    return !avatar || avatar === '/img/icons/icon.svg' || avatar.includes('/img/icons/icon.svg')
}

function userChannelId(): string {
    return String(
        props.chat.show.channel_id
        || props.chat.show.channelId
        || props.chat.info.user_info.channel_id
        || props.chat.info.user_info.channelId
        || `private:${props.chat.show.id}`,
    )
}

function groupChannelId(): string {
    return String(
        props.chat.show.channel_id
        || props.chat.show.channelId
        || props.chat.info.group_info.channel_id
        || props.chat.info.group_info.channelId
        || `group:${props.chat.show.id}`,
    )
}

// Reactive state
const number_cache = ref<any[]>([])
const memberSearch = ref('')
const showUserConfig = ref<any>({})
const showUserConfigRaw = ref<any>({})

interface MemberLike {
  user_id?: unknown
  card?: unknown
  nickname?: unknown
  name?: unknown
  avatar?: unknown
  role?: unknown
}

function asMember(value: unknown): MemberLike {
  if (typeof value !== 'object' || value === null) return {}
  return value as MemberLike
}

function memberId(value: unknown): string {
  return String(asMember(value).user_id ?? '')
}

function memberName(value: unknown): string {
  const member = asMember(value)
  return String(member.card || member.nickname || member.name || memberId(value))
}

function memberAvatar(value: unknown): string {
  return String(asMember(value).avatar ?? '')
}

function memberRole(value: unknown): string {
  return String(asMember(value).role ?? '')
}

const mumberInfo = ref({
    banMin: 0,
})

/**
 * 移出群聊
 */
function removeUser(nickname: string, group_id: number, user_id: number) {
    const popInfo = {
        title: $t('提醒'),
        html: `<span>${$t('真的要将 {user} 移出群聊吗', { user: nickname })}</span>`,
        button: [
            {
                text: $t('确定'),
                fun: () => {
                    Connector.send(
                        'set_group_kick',
                        {
                            group_id: group_id,
                            user_id: user_id,
                        },
                        'setGroupKick',
                    )
                    uiStore.popBoxList.shift()
                    showUserConfig.value = {}
                    const popInfo = {
                        title: $t('操作'),
                        html: `<span>${$t('正在确认操作……')}</span>`
                    }
                    uiStore.popBoxList.push(popInfo)
                    // 稍微等一下再刷新成员列表
                    delay(1000).then(() => {
                        void loadGroupMembersFromCache(String(chatStore.chatInfo.show.id))
                        return delay(1000)
                    }).then(() => {
                        void loadGroupMembersFromCache(String(chatStore.chatInfo.show.id))
                        uiStore.popBoxList.shift()
                    })
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

function copyText(text: any) {
    const popInfo = new PopInfo()
    app.config.globalProperties.$copyText(String(text)).then(
        () => {
            popInfo.add(PopType.INFO, $t('复制成功'), true)
        },
        () => {
            popInfo.add(PopType.ERR, $t('复制失败'), true)
        },
    )
}

function banMumber(event: Event, info: any) {
    const value = (event.target as HTMLInputElement).value
    if (value !== '') {
        const num = parseInt(value)
        if (num > 0) {
            const popInfo = {
                title: $t('操作'),
                html: `<span>${$t('确认禁言？')}</span>`,
                button: [
                    {
                        text: $t('确认'),
                        fun: () => {
                            const name = authStore.jsonMap.ban_mumber?.name
                            if (name)
                                Connector.send(name, {
                                    group_id: chatStore.chatInfo.show.id,
                                    user_id: info.user_id,
                                    duration: num * 60,
                                }, 'banMumber')
                            uiStore.popBoxList.shift()
                            closeChatInfoPan()
                        },
                    },
                    {
                        text: $t('取消'),
                        master: true,
                        fun: () => {
                            showUserConfigRaw.value = JSON.parse(JSON.stringify(info))
                            uiStore.popBoxList.shift()
                        },
                    },
                ],
            }
            uiStore.popBoxList.push(popInfo)
        }
    }
}

function updateMumberCard(event: Event, info: any) {
    const value = (event.target as HTMLInputElement).value
    if (showUserConfig.value.card !== value) {
        const popInfo = {
            title: $t('操作'),
            html: `<span>${$t('确认修改昵称？')}</span>`,
            button: [
                {
                    text: $t('确认'),
                    fun: () => {
                        const name = authStore.jsonMap.set_group_nickname?.name
                        if(name)
                            Connector.send(name, {
                                group_id: chatStore.chatInfo.show.id,
                                user_id: info.user_id,
                                card: value,
                            }, 'updateGroupMemberInfo')
                        uiStore.popBoxList.shift()
                        closeChatInfoPan()
                    },
                },
                {
                    text: $t('取消'),
                    master: true,
                    fun: () => {
                        showUserConfigRaw.value = JSON.parse(JSON.stringify(info))
                        uiStore.popBoxList.shift()
                    },
                },
            ],
        }
        uiStore.popBoxList.push(popInfo)
    }
}

function updateMumberTitle(event: Event, info: any) {
    const value = (event.target as HTMLInputElement).value
    if (showUserConfig.value.card !== value) {
        const popInfo = {
            title: $t('操作'),
            html: `<span>${$t('确认修改头衔？')}</span>`,
            button: [
                {
                    text: $t('确认'),
                    fun: () => {
                        const name = authStore.jsonMap.set_group_title?.name
                        if(name)
                            Connector.send(name, {
                                group_id: chatStore.chatInfo.show.id,
                                user_id: info.user_id,
                                special_title: value,
                            }, 'updateGroupMemberInfo')
                        uiStore.popBoxList.shift()
                        closeChatInfoPan()
                    },
                },
                {
                    text: $t('取消'),
                    master: true,
                    fun: () => {
                        showUserConfigRaw.value = JSON.parse(JSON.stringify(info))
                        uiStore.popBoxList.shift()
                    },
                },
            ],
        }
        uiStore.popBoxList.push(popInfo)
    }
}

function getBanTimeMin(endTime: number) {
    // endTime 可能是精确到秒的时间戳
    if(endTime < 10000000000) {
        endTime *= 1000
    }
    const now = new Date().getTime()
    const time = endTime - now
    if (time > 0) {
        return Math.floor(time / 1000 / 60)
    } else {
        return 0
    }
}

function checkNumber(event: Event) {
    const value = (event.target as HTMLInputElement).value
    if (value !== '') {
        const num = parseInt(value)
        if (isNaN(num)) {
            (event.target as HTMLInputElement).value = ''
        } else if (num < 0) {
            (event.target as HTMLInputElement).value = '0'
        }
    }
}

/**
 * 关闭面板
 */
function closeChatInfoPan() {
    showUserConfig.value = {}
    emit('close')
}

/**
 * 发起聊天
 */
function startChat(info: any) {
    // 如果是自己的话就忽略
    if (info.user_id != authStore.loginInfo.uin) {

        // 检查这个人是不是好友
        let chat = contactStore.userList.find(
            (item: UserFriendElem & UserGroupElem) => {
                return item.user_id == info.user_id
            },
        )
        if (!chat) {
            // 创建一个临时聊天
            const user = {
                user_id: info.user_id,
                // 因为临时消息没有返回昵称
                nickname:
                    $t('临时会话'),
                remark: info.user_id,
                group_id: info.group_id,
                group_name: '',
            } as UserFriendElem & UserGroupElem
            chat = user
        }
        contactStore.baseOnMsgList.set(String(info.user_id), chat)
        // 切换到这个聊天
        nextTick(() => {
            if (chat) {
                const item = document.getElementById(
                    'user-' + chat.user_id,
                )
                if (item) {
                    item.click()
                }
            }
        })
    }
}

function moreConfig(info: any) {
    if(canEditMember(info.role)) {
        showUserConfig.value = info
        showUserConfigRaw.value = JSON.parse(JSON.stringify(info))
        // 初始化一些内容
        mumberInfo.value.banMin = getBanTimeMin(info.shut_up_timestamp)
    } else {
        copyText(info.user_id)
    }
}

function searchList(event?: Event) {
    if (event) {
        memberSearch.value = (event.target as HTMLInputElement).value
    }
    const keyword = memberSearch.value.trim()
    if (!keyword) {
        number_cache.value = [] as any[]
        return
    }
    const lower = keyword.toLowerCase()
    const source = Array.isArray(props.chat.info.group_members)
        ? props.chat.info.group_members
        : []
    number_cache.value = toRaw(source).filter((item: any) => {
        const name = memberName(item).toLowerCase()
        const id = memberId(item)
        return name.includes(lower) || id.includes(keyword) || id.toLowerCase().includes(lower)
    })
}

watch(() => props.chat.info.group_members, () => {
    if (memberSearch.value.trim()) searchList()
}, { deep: true })

function canEditMember(role: string) {
    return (
        props.chat.info.me_info.role === 'owner' ||
        (props.chat.info.me_info.role === 'admin'
         && role !== 'owner') // 管理员不能编辑群主
    )
}
</script>

<style scoped>
    .search-view {
        background: transparent !important;
        padding: 0 20px;
        margin-bottom: 10px;
    }
    .search-view > input {
        background: var(--color-card-1);
        border-radius: 7px;
        padding: 0 10px;
        height: 35px;
        width: 100%;
        border: 0;
    }

    div[name="成员"] {
        overflow: hidden;
    }
    /* 虚拟滚动容器样式 */
    .member-scroller {
        flex: 1;
        height: calc(100vh - 330px);
        min-height: 210px;
    }

    /* 成员项样式 */
    .member-item {
        transition: background 0.3s;
        margin: 0 20px -10px 20px;
        align-items: center;
        border-radius: 7px;
        cursor: pointer;
        display: flex;
        padding: 10px;
    }

    .member-item:hover {
        background: var(--color-card-1);
    }

    .member-item > img {
        border-radius: 100%;
        margin-right: 10px;
        height: 30px;
        width: 30px;
    }

    .member-item > div {
        overflow: hidden;
        align-items: center;
        display: flex;
        flex: 1;
    }

    .member-item > div > a {
        color: var(--color-font);
        white-space: nowrap;
        text-overflow: ellipsis;
        max-width: 80%;
        overflow: hidden;
        cursor: pointer;
    }

    .member-item > div > svg {
        color: var(--color-main);
        margin-left: 5px;
        height: 0.8rem;
    }

    .member-item > span {
        color: var(--color-font-2);
        transition: all .2s;
        opacity: 1;
    }

    .member-item.edit:hover > span {
        transform: translateX(-10px);
        opacity: 0;
    }

    .member-item > svg {
        color: var(--color-font-2);
        transition: all .2s;
        margin-right: -25px;
        margin-left: 10px;
        width: 15px;
        opacity: 0;
    }

    .member-item > svg:hover {
        color: var(--color-main);
    }

    .member-item.edit:hover > svg {
        margin-right: 5px;
        display: block;
        opacity: 1;
    }

    .info-copy {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .info-copy > span {
        flex: 1;
        min-width: 0;
    }
    .info-copy > svg {
        color: var(--color-font-2);
        cursor: pointer;
    }
    .info-copy > svg:hover {
        color: var(--color-main);
    }
</style>
<style>
    .tab-body {
        overflow: hidden !important;
        flex-direction: column;
        display: flex;
    }
    .tab-body > div {
        overflow: scroll;
        flex: 1;
    }
</style>
