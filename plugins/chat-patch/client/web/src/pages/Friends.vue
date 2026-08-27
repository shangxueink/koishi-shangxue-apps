<!--
 * @FileDescription: 联系人列表页面
 * @Author: Stapxs
 * @Date:
 *      2022/08/14
 *      2022/12/12
 * @Version:
 *      1.0 - 初始版本
 *      1.5 - 重构为 ts 版本，代码格式优化
-->

<template>
    <div class="friend-view">
        <div id="friend-list" :class="'friend-list' + (uiStore.openSideBar ? ' open' : '')">
            <div>
                <div class="base">
                    <span>{{ $t('列表') }}</span>
                    <div style="flex: 1" />
                    <font-awesome-icon :icon="['fas', 'rotate-right']" @click="reloadUser" />
                </div>
                <div id="friend-small-search" class="small">
                    <label>
                        <input
                            id="friend-search-small"
                            v-model="searchInfo"
                            v-auto-focus type="text"
                            :placeholder="$t('搜索 ……')" @input="search">
                        <font-awesome-icon :icon="['fas', 'magnifying-glass']" />
                    </label>
                    <div class="reload" @click="reloadUser">
                        <font-awesome-icon :icon="['fas', 'rotate-right']" />
                    </div>
                    <div @click="openLeftBar">
                        <font-awesome-icon :icon="['fas', 'bars-staggered']" />
                    </div>
                </div>
                <label>
                    <input
                        id="friend-search"
                        v-model="searchInfo"
                        v-auto-focus
                        type="text"
                        :placeholder="$t('搜索 ……')" @input="search">
                    <font-awesome-icon :icon="['fas', 'magnifying-glass']" />
                </label>
            </div>
            <div class="robot-accordion-list">
                <div v-if="isSearch" class="search-result-list">
                    <div v-if="contactStore.showList.length === 0" class="empty-state">
                        {{ $t('空') }}
                    </div>
                    <FriendBody v-for="item in contactStore.showList"
                        :key="'search-' + item.user_id + '-' + item.group_id"
                        :data="item"
                        from="friend"
                        @click="userClick(item, $event)" />
                </div>
                <template v-else>
                    <div v-for="bot in satoriLogins" :key="'bot-' + bot.selfId"
                        :class="['robot-accordion', { expanded: bot.selfId === activeBotId }]">
                        <div class="robot-accordion-header" @click="toggleRobot(bot)">
                            <img :src="bot.avatar || '/img/icons/icon.svg'" :alt="bot.name">
                            <div>
                                <span :title="bot.name">{{ bot.name }}</span>
                                <small>{{ bot.platform }}</small>
                            </div>
                            <font-awesome-icon :icon="['fas', bot.selfId === activeBotId ? 'angle-up' : 'angle-down']" />
                        </div>
                        <div v-if="bot.selfId === activeBotId" class="robot-accordion-content">
                            <div v-if="!contactStore.friendLoading && contactStore.userList.length === 0"
                                class="empty-state">
                                {{ $t('空') }}
                            </div>
                            <div v-else :class="uiStore.openSideBar ? 'open' : ''">
                            <template v-if="contactStore.showList.length <= 0">
                                <template v-if="settingsStore.classes.length > 0">
                                    <template v-for="info in settingsStore.classes"
                                        :key="'class-' + info.class_id">
                                        <div :class=" 'list exp-body' +
                                            (classStatus[info.class_id] == true ? ' open' : '')">
                                            <header :title="info.class_name"
                                                :class="'exp-header' +
                                                    (uiStore.openSideBar ? ' open' : '')"
                                                @click="classClick(info.class_id)">
                                                <div />
                                                <span>{{ info.class_name }}</span>
                                                <a v-if="contactStore.friendLoading && info.class_id == 0">{{
                                                    contactStore.friendLoadedCount
                                                }} / {{ contactStore.friendTotalCount }}</a>
                                                <a v-else>{{
                                                    info.user_count ??
                                                        contactStore.userList.filter((get) => {
                                                            return get.class_id == info.class_id
                                                        }).length
                                                }}</a>
                                            </header>
                                            <div :id="'class-' + info.class_id">
                                                <FriendBody v-for="item in contactStore.userList.filter(
                                                                (get) => {
                                                                    return ( get.class_id == info.class_id )
                                                                },
                                                            )"
                                                    :key=" 'fb-' + (item.user_id ? item.user_id : item.group_id) "
                                                    :data="item" from="friend"
                                                    @click="userClick(item, $event)" />
                                            </div>
                                        </div>
                                    </template>
                                    <div :class="'list exp-body' + (classStatus['-1'] == true ? ' open' : '')">
                                        <header :title="$t('群组')"
                                            :class="'exp-header' +
                                                (uiStore.openSideBar ? ' open' : '') "
                                            @click="classClick('-1')">
                                            <div />
                                            <span>{{ $t('群组') }}</span>
                                            <a>{{
                                                contactStore.userList.filter((get) => {
                                                    return get.class_id == undefined
                                                }).length
                                            }}</a>
                                        </header>
                                        <div>
                                            <FriendBody v-for="item in contactStore.userList.filter(
                                                            (get) => {
                                                                return get.class_id == undefined
                                                            },
                                                        )"
                                                :key="'fb-' + (item.user_id ? item.user_id : item.group_id)"
                                                :data="item"
                                                from="friend"
                                                @click="userClick(item, $event)" />
                                        </div>
                                    </div>
                                </template>
                                <template v-else>
                                    <FriendBody v-for="item in contactStore.userList"
                                        :key="'fb-' + (item.user_id ? item.user_id : item.group_id)"
                                        :data="item"
                                        from="friend"
                                        @click="userClick(item, $event)" />
                                </template>
                            </template>
                            <!-- 搜索用的 -->
                            <div v-else class="list">
                                <div>
                                    <FriendBody v-for="item in contactStore.showList"
                                        :key="'fb-' + (item.user_id ? item.user_id : item.group_id)"
                                        :data="item" from="friend"
                                        @click="userClick(item, $event)" />
                                </div>
                            </div>
                            </div>
                        </div>
                    </div>
                </template>
            </div>
        </div>
        <div :class="'friend-list-space' + (uiStore.openSideBar ? ' open' : '')">
            <div v-if="!loginInfo.status || chatStore.chatInfo.show.id == 0" class="ss-card">
                <font-awesome-icon :icon="['fas', 'inbox']" />
                <span>{{ $t('选择联系人开始聊天') }}</span>
            </div>
            <div v-else-if="chatStore.messageList.length > 0" class="ss-card cd">
                <font-awesome-icon :icon="['fas', 'angles-right']" />
                <span>(っ≧ω≦)っ</span>
                <span>{{ $t('别划了别划了被看见了啦') }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { computed, ref, onMounted, watch } from 'vue'
    import { vAutoFocus } from '@renderer/function/utils/appUtil'

    import FriendBody from '@renderer/components/FriendBody.vue'

    import {
        BaseChatInfoElem,
        UserFriendElem,
        UserGroupElem,
    } from '@renderer/function/elements/information'

    import { reloadUsers } from '@renderer/function/utils/appUtil'
    import { Connector, flushPendingBotEvents, loadContactsFromCache, login as loginInfo } from '@renderer/function/connect'
    import { getActiveBot, getLogins, setActiveBot } from '@renderer/function/satori'
    import { normalizeSessionId } from '@renderer/function/utils/sessionUtil'
    import { backend } from '@renderer/runtime/backend'
    import { matchPinyin } from '@renderer/function/utils/pinyin'
    import { useUIStore } from '@renderer/state/ui'
    import { useSettingsStore } from '@renderer/state/settings'
    import { useContactStore } from '@renderer/state/contact'
    import { useChatStore } from '@renderer/state/chat'
    import { useAuthStore } from '@renderer/state/auth'

    defineOptions({ name: 'ViewFriends' })

    const uiStore = useUIStore()
    const settingsStore = useSettingsStore()
    const contactStore = useContactStore()
    const chatStore = useChatStore()
    const authStore = useAuthStore()
    const { list } = defineProps<{ list: (UserFriendElem & UserGroupElem)[] }>()
    const emit = defineEmits<{
        userClick: [data: BaseChatInfoElem]
        loadHistory: [data: BaseChatInfoElem]
    }>()

    type ContactWithBot = UserFriendElem & UserGroupElem & {
        _bot?: {
            platform: string
            selfId: string
            name: string
            avatar?: string
        }
    }

    const isSearch = ref(false)
    const searchInfo = ref('')
    const classStatus = ref<{ [key: string]: boolean }>({})
    const satoriLogins = ref<Array<{ platform: string; selfId: string; name: string; avatar?: string; status?: number; features?: string[] }>>(getLogins())
    const activeBotId = ref(getActiveBot()?.selfId ?? loginInfo.selectedSatoriBot ?? '')

    watch(() => loginInfo.satoriLogins, (list) => {
        satoriLogins.value = list ?? []
        if (activeBotId.value && contactStore.userList.length === 0) {
            void loadContactsFromCache()
        }
    }, { immediate: true })

    const currentBotName = computed(() => {
        return satoriLogins.value.find((item) => item.selfId === activeBotId.value)?.name ?? ''
    })

    const allContacts = computed<ContactWithBot[]>(() => {
        const map = new Map<string, ContactWithBot>()
        const addContacts = (
            items: (UserFriendElem & UserGroupElem)[],
            bot?: ContactWithBot['_bot'],
        ) => {
            for (const item of items) {
                const id = String(item.user_id ?? item.group_id ?? '')
                const key = `${bot?.platform ?? ''}:${bot?.selfId ?? ''}:${id}`
                map.set(key, { ...item, _bot: bot })
            }
        }
        const currentBot = satoriLogins.value.find((item) => item.selfId === activeBotId.value)
        addContacts(contactStore.userList, currentBot)
        for (const [selfId, state] of contactStore.botStates) {
            const bot = satoriLogins.value.find((item) => item.selfId === selfId)
            addContacts(state.userList, bot)
        }
        return [...map.values()]
    })

    function snapshotCurrentBot() {
        const id = activeBotId.value
        if (!id) return
        contactStore.botStates.set(id, {
            userList: [...contactStore.userList],
            baseList: Array.from(contactStore.baseOnMsgList.entries()),
            onMsgList: [...contactStore.onMsgList],
        })
    }

    function backToRobots() {
        snapshotCurrentBot()
        activeBotId.value = ''
        chatStore.messageList = []
        chatStore.chatInfo.show.id = 0
    }

    function selectRobot(bot: { platform: string; selfId: string; name: string; avatar?: string; features?: string[] }) {
        if (bot.selfId === activeBotId.value) return
        snapshotCurrentBot()
        activeBotId.value = bot.selfId
        setActiveBot(bot.platform, bot.selfId)
        loginInfo.uin = bot.selfId
        loginInfo.nickname = bot.name
        loginInfo.platform = bot.platform
        authStore.loginInfo = {
            ...authStore.loginInfo,
            uin: bot.selfId,
            user_id: bot.selfId,
            nickname: bot.name,
            platform: bot.platform,
            avatar: bot.avatar,
            satoriLogins: satoriLogins.value,
            selectedSatoriBot: bot.selfId,
        }
        const saved = contactStore.botStates.get(bot.selfId)
        if (saved) {
            contactStore.userList = saved.userList
            contactStore.baseOnMsgList.clear()
            for (const [key, value] of saved.baseList) {
                contactStore.baseOnMsgList.set(normalizeSessionId(key), value)
            }
            contactStore.onMsgList = saved.onMsgList
            flushPendingBotEvents(bot.platform, bot.selfId)
        } else {
            contactStore.userList = []
            contactStore.baseOnMsgList.clear()
            contactStore.onMsgList = []
            chatStore.messageList = []
            chatStore.chatInfo.show.id = 0
            flushPendingBotEvents(bot.platform, bot.selfId)
            void loadContactsFromCache()
        }
    }

    function toggleRobot(bot: { platform: string; selfId: string; name: string; avatar?: string; features?: string[] }) {
        if (activeBotId.value === bot.selfId) {
            backToRobots()
        } else {
            selectRobot(bot)
        }
    }

    onMounted(() => {
        if (activeBotId.value && contactStore.userList.length === 0) {
            void loadContactsFromCache()
        }
        // 判断 friend-small-search 是否 display none
        const smallSearch = document.getElementById('friend-small-search')
        if(smallSearch) {
            const style = window.getComputedStyle(smallSearch)
            let name = 'friend-search'
            if(style.display != 'none') {
                name = 'friend-search-small'
            }
            // 将焦点移动到搜索框
            if(backend.isDesktop()) {
                const search = document.getElementById(name)
                if(search) {
                    search.focus()
                }
            }
        }
    })

    function getShowName(data: UserFriendElem & UserGroupElem) {
        const group = data.group_name
        const remark = data.remark
        const nickname = data.nickname
        if (group) return group
        else {
            if (!remark || remark == nickname) {
                return nickname
            } else {
                return remark + '（' + nickname + '）'
            }
        }
    }

    function openLeftBar() {
        uiStore.openSideBar = !uiStore.openSideBar
    }

    function classClick(id: string) {
        if (classStatus.value[id]) {
            classStatus.value[id] = !classStatus.value[id]
        } else {
            classStatus.value[id] = true
        }
    }

    function userClick(data: ContactWithBot, event: Event) {
        if (data._bot && data._bot.selfId !== activeBotId.value) {
            selectRobot(data._bot)
        }
        const sender = event.currentTarget as HTMLDivElement
        if (uiStore.openSideBar) {
            openLeftBar()
        }
        isSearch.value = false
        searchInfo.value = ''
        contactStore.showList = [] as any[]

        const back = {
            type: data.user_id ? 'user' : 'group',
            id: data.user_id ? data.user_id : data.group_id,
            name: getShowName(data),
            avatar: data.avatar || '/img/icons/icon.svg',
            jump: sender.dataset.jump,
            channel_id: data.channel_id,
            guild_id: data.guild_id,
        } as BaseChatInfoElem
        if (back.id === undefined || back.id === null || String(back.id) === '' || String(back.id) === '0') return
        // 更新聊天框
        emit('userClick', back)
        contactStore.baseOnMsgList.set(normalizeSessionId(back.id), data)
        // 获取历史消息
        if(!uiStore.nowGetHistory) {
            emit('loadHistory', back)
        }
        // 切换标签卡
        const barMsg = document.getElementById('bar-msg')
        if (barMsg !== null) {
            barMsg.click()
        }
    }

    function search(event: Event) {
        const value = (event.target as HTMLInputElement).value.toLocaleLowerCase()
        if (value !== '') {
            isSearch.value = true
            contactStore.showList = allContacts.value.filter(
                (item: ContactWithBot) => {
                    const name = (
                        item.user_id? item.nickname + item.remark: item.group_name
                    ).toLowerCase()
                    if (name.includes(value)) return true
                    const id = item.user_id? item.user_id: item.group_id
                    if (id.toString() === value) return true
                    if (item.py_name && matchPinyin(item.py_name, value)) return true
                    return false
                },
            )
        } else {
            isSearch.value = false
            contactStore.showList = [] as any[]
        }
        // macOS: 刷新 TouchBar
        if(backend.isDesktop()) {
            // list 只需要 id 和 name
            backend.call(undefined, 'sys:flushFriendSearch', false,
                contactStore.showList.map((item) => {
                    return {
                        id: item.user_id ? item.user_id : item.group_id,
                        name: getShowName(item)
                    }
                }))
        }
    }

    function reloadUser() {
        reloadUsers()
    }
</script>

<style scoped>
    .robot-list-body {
        padding: 4px 0;
    }

    .robot-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        cursor: pointer;
        border-left: 3px solid transparent;
    }

    .robot-item:hover {
        background: var(--color-hover-bg, rgba(0, 0, 0, 0.04));
    }

    .robot-item.active {
        border-left-color: var(--color-main, #3b82f6);
        background: var(--color-active-bg, rgba(59, 130, 246, 0.08));
    }

    .robot-item img {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        object-fit: cover;
    }

    .robot-item div {
        display: flex;
        flex-direction: column;
        min-width: 0;
        flex: 1;
        overflow: hidden;
    }

    .robot-item span {
        display: block;
        font-size: 13px;
        font-weight: 600;
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        -webkit-mask-image: linear-gradient(to right, black 0%, black 70%, transparent 100%);
        mask-image: linear-gradient(to right, black 0%, black 70%, transparent 100%);
    }

    .robot-item small {
        font-size: 11px;
        opacity: 0.6;
    }

    .robot-accordion-list {
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
    }
    .robot-accordion {
        border-bottom: 1px solid var(--color-card-2, rgba(0, 0, 0, 0.08));
    }
    .robot-accordion-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        cursor: pointer;
    }
    .robot-accordion-header:hover {
        background: var(--color-hover-bg, rgba(0, 0, 0, 0.04));
    }
    .robot-accordion.expanded > .robot-accordion-header {
        background: var(--color-active-bg, rgba(59, 130, 246, 0.08));
    }
    .robot-accordion-header img {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
    }
    .robot-accordion-header > div {
        display: flex;
        flex-direction: column;
        min-width: 0;
        flex: 1;
        overflow: hidden;
    }
    .robot-accordion-header span {
        display: block;
        font-size: 13px;
        font-weight: 600;
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .robot-accordion-header small {
        font-size: 11px;
        opacity: 0.6;
    }
    .robot-accordion-header > svg {
        opacity: 0.7;
        flex-shrink: 0;
    }
    .robot-accordion-content {
        padding: 2px 0 6px;
    }
    .search-result-list {
        padding: 4px 0;
    }
    .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px 0;
        color: var(--color-font-2, #888);
        opacity: 0.65;
    }

    .friend-list > div:first-child > div.base > span {
        min-width: 0;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: clip;
        -webkit-mask-image: linear-gradient(to right, black 0%, black 65%, transparent 100%);
        mask-image: linear-gradient(to right, black 0%, black 65%, transparent 100%);
    }

    .exp-body > div {
        /* transition: transform .3s;
    transform-origin: top; */
        transform: scaleY(0);
        height: 0;
    }
    .exp-body.open > div {
        transform: scaleY(1);
        height: unset;
    }
    .exp-body > header > div {
        transition:
            margin-right 0.3s,
            transform 0.3s;
        transform: scaleY(0);
        margin-right: 0;
        width: 0;
    }
    .exp-body.open > header > div {
        transform: scaleY(1);
        margin-right: 10px;
        width: 5px;
    }

    .exp-header {
        color: var(--color-font);
        align-items: center;
        border-radius: 7px;
        cursor: pointer;
        margin: 0 10px;
        padding: 10px;
        display: flex;
    }
    .exp-header:hover {
        background: var(--color-card-2);
    }
    .exp-header > div {
        background: var(--color-main);
        margin-right: 10px;
        border-radius: 7px;
        height: 1rem;
        width: 5px;
    }
    .exp-header > span {
        flex: 1;
    }
    .exp-header > a {
        color: var(--color-font-2);
        font-size: 0.9rem;
    }

    @media (max-width: 700px) {
        .exp-header:not(.open) {
            display: none;
        }
    }
    @media (max-width: 500px) {
        .exp-header > span {
            display: block !important;
        }
    }
</style>
