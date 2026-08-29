<!--
 * @FileDescription: 消息列表页面
 * @Author: Stapxs
 * @Date:
 *      2022/08/14
 *      2022/12/14
 * @Version:
 *      1.0 - 初始版本
 *      1.5 - 重构为 ts 版本，代码格式优化
-->

<template>
    <div class="friend-view">
        <div class="friend-list-container">
            <div id="message-list"
                :class="'friend-list' +
                    (uiStore.openSideBar ? ' open' : '') +
                    (showGroupAssist ? ' show' : '')">
                <div>
                    <div class="base only">
                        <span>{{ $t('消息') }}</span>
                        <div style="flex: 1" />
                        <font-awesome-icon
                            :icon="['fas', 'clock-rotate-left']"
                            @click="openHistory" />
                        <font-awesome-icon :icon="['fas', 'trash-can']" @click="cleanList" />
                    </div>
                    <div class="small">
                        <span>{{ $t('消息') }}</span>
                        <div v-if="showGroupAssist"
                            style="margin-right: -5px;margin-left: 5px;"
                            @click="showGroupAssist = !showGroupAssist">
                            <font-awesome-icon :icon="['fas', 'angle-left']" />
                        </div>
                        <div @click="openLeftBar">
                            <font-awesome-icon :icon="['fas', 'bars-staggered']" />
                        </div>
                    </div>
                </div>
                <div id="message-list-body" class="robot-accordion-list">
                    <div v-for="bot in satoriLogins" :key="'bot-' + bot.selfId"
                        :class="['robot-accordion', { expanded: bot.selfId === activeBotId }]">
                        <div class="robot-accordion-header" @click="toggleRobot(bot)">
                            <img :src="bot.avatar || '/img/icons/icon.svg'" :alt="bot.name" @error="avatarError">
                            <div>
                                <span :title="bot.name">{{ bot.name }}</span>
                                <small>{{ bot.platform }}</small>
                            </div>
                            <font-awesome-icon :icon="['fas', bot.selfId === activeBotId ? 'angle-up' : 'angle-down']" />
                        </div>
                        <div v-if="bot.selfId === activeBotId" class="robot-accordion-content">
                            <div v-if="!showGroupAssist &&
                                !contactStore.systemNoticesList &&
                                (!contactStore.groupAssistList || contactStore.groupAssistList.length === 0) &&
                                contactStore.onMsgList.length === 0"
                                class="empty-state">
                                {{ $t('空') }}
                            </div>
                            <TransitionGroup
                                name="onmsg"
                                tag="div"
                                :class="uiStore.openSideBar ? ' open' : ''"
                                style="overflow-x: hidden">
                                <!-- 系统信息 -->
                                <FriendBody v-if="!showGroupAssist &&
                                                contactStore.systemNoticesList &&
                                                Object.keys(contactStore.systemNoticesList).length > 0"
                                    key="inMessage--10000"
                                    :select="chat.show.id === -10000"
                                    :menu="menu.select && menu.select.user_id === -10000"
                                    :data="{
                                        user_id: -10000,
                                        always_top: true,
                                        nickname: $t('系统通知'),
                                        remark: $t('系统通知'),
                                        raw_msg: contactStore.systemNoticesList[0].comment
                                    }"
                                    @click="systemNoticeClick"
                                    @contextmenu.prevent="systemNoticeMenuShow($event)"
                                    @touchstart="systemNoticeMenuStart($event)"
                                    @touchmove="showMenuMove"
                                    @touchend="showMenuEnd" />
                                <!--- 群组消息 -->
                                <FriendBody
                                    v-if="contactStore.groupAssistList && contactStore.groupAssistList.length > 0"
                                    key="inMessage--10001"
                                    :select="chat.show.id === -10001"
                                    :data="{
                                        user_id: -10001,
                                        always_top: true,
                                        nickname: $t('群收纳盒'),
                                        remark: $t('群收纳盒'),
                                        time: contactStore.groupAssistList[0].time,
                                        raw_msg: contactStore.groupAssistList[0].group_name + ': ' +
                                            (contactStore.groupAssistList[0].raw_msg_base ?? '')
                                    }"
                                    @click="showGroupAssistCheck" />
                                <!-- 其他消息 -->
                                <FriendBody
                                    v-for="item in contactStore.onMsgList"
                                    :key="'inMessage-' + (item.user_id ? item.user_id : item.group_id)"
                                    :select="chat.show.id === item.user_id || (chat.show.id === item.group_id && chat.group_name != '')"
                                    :menu="menu.select && menu.select == item"
                                    :data="item"
                                    from="message"
                                    @contextmenu.prevent="listMenuShow($event, item)"
                                    @click="userClick(item)"
                                    @touchstart="showMenuStart($event, item)"
                                    @touchmove="showMenuMove"
                                    @touchend="showMenuEnd" />
                            </TransitionGroup>
                        </div>
                    </div>
                </div>
            </div>
            <div id="group-assist-message-list"
                :class="'friend-list group-assist-message-list' +
                    (uiStore.openSideBar ? ' open' : '') +
                    (showGroupAssist ? ' show' : '')">
                <div>
                    <div class="base only">
                        <span style="cursor: pointer;"
                            @click="showGroupAssist = !showGroupAssist">
                            <font-awesome-icon style="margin-right: 5px;" :icon="['fas', 'angle-left']" />
                            {{ $t('群收纳盒') }}
                        </span>
                        <a v-if="contactStore.newMsgCount > 0">{{ contactStore.newMsgCount }}</a>
                    </div>
                    <div class="small">
                        <span style="cursor: pointer;">
                            {{ $t('群收纳盒') }}
                            <a v-if="contactStore.newMsgCount > 0">{{ contactStore.newMsgCount }}</a>
                        </span>
                        <div v-if="showGroupAssist"
                            style="margin-right: -5px;margin-left: 5px;"
                            @click="showGroupAssist = !showGroupAssist">
                            <font-awesome-icon :icon="['fas', 'angle-left']" />
                        </div>
                        <div @click="openLeftBar">
                            <font-awesome-icon :icon="['fas', 'bars-staggered']" />
                        </div>
                    </div>
                </div>
                <TransitionGroup
                    id="group-assist-message-list-body"
                    name="onmsg"
                    tag="div"
                    :class="uiStore.openSideBar ? ' open' : ''"
                    style="overflow-x: hidden">
                    <!-- 其他消息 -->
                    <FriendBody
                        v-for="item in contactStore.groupAssistList"
                        :key="'inMessage-' + (item.user_id ? item.user_id : item.group_id)"
                        :select="chat.show.id === item.user_id || (chat.show.id === item.group_id && chat.group_name != '')"
                        :menu="menu.select && menu.select == item"
                        :data="item"
                        from="message"
                        @contextmenu.prevent="listMenuShow($event, item)"
                        @click="userClick(item)"
                        @touchstart="showMenuStart($event, item)"
                        @touchmove="showMenuMove"
                        @touchend="showMenuEnd" />
                </TransitionGroup>
            </div>
        </div>
        <BcMenu :data="listMenu" name="messages-menu"
            @close="listMenuClose">
            <ul>
                <li id="top" icon="fa-solid fa-thumbtack">
                    {{ $t('置顶') }}
                </li>
                <li id="canceltop" icon="fa-solid fa-grip-lines">
                    {{ $t('取消置顶') }}
                </li>
                <li id="remove" icon="fa-solid fa-trash-can">
                    {{ $t('删除') }}
                </li>
                <li id="readed" icon="fa-solid fa-check-to-slot">
                    {{ $t('标记已读') }}
                </li>
                <li id="read" icon="fa-solid fa-flag">
                    {{ $t('标记未读') }}
                </li>
                <li id="notice_open" icon="fa-solid fa-volume-high">
                    {{ $t('开启通知') }}
                </li>
                <li id="notice_close" icon="fa-solid fa-volume-xmark">
                    {{ $t('关闭通知') }}
                </li>
                <li id="clear_system_notice" icon="fa-solid fa-broom">
                    {{ $t('清空通知') }}
                </li>
            </ul>
        </BcMenu>
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
    import { computed, ref, onMounted, markRaw, watch, nextTick } from 'vue'
    import { i18n } from '../main'
    import FriendBody from '../components/FriendBody.vue'
    import BcMenu from 'vue3-bcui/packages/bc-menu'
    import Menu from 'vue3-bcui/packages/bc-menu/index'
    import Option from '../function/option'

    import { useSettingsStore } from '../state/settings'
    import {
        UserFriendElem,
        UserGroupElem,
    } from '../function/elements/information'
    import { changeGroupNotice } from '../function/utils/appUtil'
    import { PopInfo, PopType } from '../function/base'
    import { MenuStatue } from 'vue3-bcui/packages/dist/types'
    import { library } from '@fortawesome/fontawesome-svg-core'
    import { login as loginInfo } from '../function/connect'
    import { Connector, flushPendingBotEvents, loadContactsFromCache, restoreBotStateFromMessageCache } from '../function/connect'
    import { getActiveBot, getLogins, setActiveBot } from '../function/satori'
    import { canGroupNotice, getShowName, updateBaseOnMsgList } from '../function/utils/msgUtil'

    import {
        faThumbTack,
        faTrashCan,
        faCheckToSlot,
        faGripLines,
        faBroom,
    } from '@fortawesome/free-solid-svg-icons'
    import { Notify } from '../function/notify'
    import { refreshFavicon } from '../function/favicon'
    import { backend } from '../runtime/backend'
    import History from '../components/History.vue'
    import { normalizeSessionId } from '../function/utils/sessionUtil'
    import { avatarError } from '../function/utils/avatarUtil'
    import { useUIStore } from '../state/ui'
    import { useAuthStore } from '../state/auth'
    import { useContactStore } from '../state/contact'
    import { useChatStore } from '../state/chat'

    const $t = i18n.global.t

    defineOptions({ name: 'VueMessages' })

    const uiStore = useUIStore()
    const authStore = useAuthStore()
    const contactStore = useContactStore()
    const chatStore = useChatStore()
    const settingsStore = useSettingsStore()
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

    function backToRobots() {
        snapshotCurrentBot()
        activeBotId.value = ''
        chatStore.messageList = []
        chatStore.chatInfo.show.id = 0
    }

    function snapshotCurrentBot() {
        const id = activeBotId.value
        if (!id) return
        contactStore.botStates.set(id, {
            userList: [...contactStore.userList],
            baseList: Array.from(contactStore.baseOnMsgList.entries()),
            onMsgList: [...contactStore.onMsgList],
        })
    }

    function restoreBotStateUi(bot: { platform: string; selfId: string }) {
        const restored = contactStore.botStates.get(bot.selfId)
        if (!restored) return
        contactStore.baseOnMsgList.clear()
        for (const [key, value] of restored.baseList) {
            contactStore.baseOnMsgList.set(normalizeSessionId(key), value)
        }
        for (const item of restored.onMsgList) {
            const id = String(item.user_id ?? item.group_id ?? '')
            if (!id || id === '0') continue
            contactStore.baseOnMsgList.set(
                normalizeSessionId(id),
                item as UserFriendElem & UserGroupElem,
            )
        }
        contactStore.onMsgList = restored.onMsgList
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
            restoreBotStateFromMessageCache(bot.platform, bot.selfId)
            restoreBotStateUi(bot)
            flushPendingBotEvents(bot.platform, bot.selfId)
            updateBaseOnMsgList()
            void loadContactsFromCache()
        } else {
            contactStore.userList = []
            contactStore.baseOnMsgList.clear()
            contactStore.onMsgList = []
            chatStore.messageList = []
            chatStore.chatInfo.show.id = 0
            restoreBotStateFromMessageCache(bot.platform, bot.selfId)
            restoreBotStateUi(bot)
            flushPendingBotEvents(bot.platform, bot.selfId)
            updateBaseOnMsgList()
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
    const props = defineProps<{ chat: any }>()
    const emit = defineEmits<{
        userClick: [data: any]
        loadHistory: [data: any]
    }>()

    const trRead = ref(false)
    const listMenu = ref<MenuStatue>({
        show: false,
        point: { x: 0, y: 0 },
    })
    const menu = Menu.append
    const showMenu = ref(false)
    const showGroupAssist = ref(false)

    onMounted(() => {
        library.add(faCheckToSlot, faThumbTack, faTrashCan, faGripLines, faBroom)
        if (activeBotId.value && contactStore.userList.length === 0) {
            void loadContactsFromCache()
        }
    })

    /**
     * 联系人点击事件
     * @param data 联系人对象
     */
    function userClick(data: UserFriendElem & UserGroupElem) {
        const id = data.user_id ? data.user_id : data.group_id
        if (id === undefined || id === null || String(id) === '' || String(id) === '0') return
        if (!trRead.value && id != props.chat.show.id) {
            if (uiStore.openSideBar) {
                openLeftBar()
            }
            const back = {
                // 临时会话标志
                temp: data.group_name == '' ? data.group_id : undefined,
                type: data.user_id ? 'user' : 'group',
                id: id,
                name: getShowName(data.group_name || data.nickname, data.remark),
                avatar: data.avatar || '/img/icons/icon.svg',
                channel_id: data.channel_id ?? data.channelId,
                guild_id: data.guild_id ?? data.guildId,
            }
            if (props.chat.id != back.id) {
                // 更新聊天框
                emit('userClick', back)
                // 获取历史消息
                if(!uiStore.nowGetHistory) {
                    emit('loadHistory', back)
                }
            }
            // 清除新消息标记
            const item = contactStore.baseOnMsgList.get(normalizeSessionId(id))
            if(item) {
                if(item.new_msg) {
                    item.new_msg = false
                    contactStore.newMsgCount--
                }
                item.highlight = undefined
                contactStore.baseOnMsgList.set(normalizeSessionId(id), item)
                // 关闭所有通知
                new Notify().closeAll((item.group_id ?? item.user_id).toString())
            }
        }
    }

    /**
     * 显示系统通知菜单
     * @param event 鼠标事件
     */
    function systemNoticeMenuShow(event: Event) {
        const info = menu.set('messages-menu', event as MouseEvent)
        showMenu.value = false
        info.list = ['clear_system_notice']
        listMenu.value = info
        menu.select = { user_id: -10000 }
    }

    /**
     * 系统通知菜单长按开始
     */
    function systemNoticeMenuStart(event: TouchEvent) {
        showMenuStart(event, { user_id: -10000 } as any)
    }

    /**
     * 清空系统通知
     */
    function clearSystemNotices() {
        contactStore.systemNoticesList = []
        new PopInfo().add(
            PopType.INFO,
            $t('已清空系统通知'),
        )
    }

    /**
     * 系统通知点击事件
     */
    function systemNoticeClick() {
        if (uiStore.openSideBar) {
            openLeftBar()
        }
        const back = {
            type: 'user',
            id: -10000,
            name: '系统消息',
        }
        emit('userClick', back)
    }

    /**
     * 侧边栏操作
     */
    function openLeftBar() {
        uiStore.openSideBar = !uiStore.openSideBar
    }

    /**
     *  标记群组消息为已读
     */
    function readMsg(data: UserFriendElem & UserGroupElem) {
        const id = data.group_id ? data.group_id : data.user_id
        const item = contactStore.baseOnMsgList.get(normalizeSessionId(id))
        if(item) {
            if(item.new_msg) {
                item.new_msg = false
                contactStore.newMsgCount--
            }
            item.highlight = undefined
            contactStore.baseOnMsgList.set(normalizeSessionId(id), item)
        }
        // pop
        new PopInfo().add(
            PopType.INFO,
            $t('已标记为已读'),
        )
    }

    /**
     * 清空消息列表
     */
    function cleanList() {
        // 刷新置顶列表
        const info = settingsStore.sysConfig.top_info as {
            [key: string]: number[]
        } | null
        contactStore.baseOnMsgList.clear()
        contactStore.onMsgList = []
        contactStore.groupAssistList = []
        contactStore.systemNoticesList = undefined
        contactStore.newMsgCount = 0
        for (const state of contactStore.botStates.values()) {
            state.baseList = []
            state.onMsgList = []
        }
        if (info != null) {
            const topList = info[authStore.loginInfo.uin]
            if (topList !== undefined) {
                contactStore.userList.forEach((item) => {
                    const id = Number(
                        item.user_id ? item.user_id : item.group_id,
                    )
                    if (topList.indexOf(id) >= 0) {
                        item.always_top = true
                        contactStore.baseOnMsgList.set(normalizeSessionId(id), item)
                    }
                })
            }
        }
        // 刷新 favicon
        refreshFavicon()
    }

    /**
     * 列表菜单关闭事件
     * @param id 选择的菜单 ID
     */
    function listMenuClose(id: string) {
        const menuEl = document.getElementById(
            'msg-menu-view-messages-menu',
        )?.children[1] as HTMLDivElement
        if (menuEl) {
            setTimeout(() => {
                menuEl.style.transition = 'transform .1s'
            }, 200)
        }
        listMenu.value.show = false
        const item = menu.select
        if (id) {
            switch (id) {
                case 'read': {
                    if(!item.new_msg) {
                        item.new_msg = true
                        contactStore.newMsgCount++
                    }
                    break
                }
                case 'readed':
                    readMsg(item)
                    // 刷新 favicon
                    refreshFavicon()
                    break
                case 'remove': {
                    const id = item.user_id ? item.user_id : item.group_id
                    contactStore.baseOnMsgList.delete(normalizeSessionId(id))
                    refreshFavicon()
                    break
                }
                case 'top':
                    saveTop(item, true)
                    break
                case 'canceltop':
                    saveTop(item, false)
                    break
                case 'notice_open': {
                    changeGroupNotice(item.group_id, true)
                    break
                }
                case 'notice_close': {
                    changeGroupNotice(item.group_id, false)
                    break
                }
                case 'clear_system_notice': {
                    clearSystemNotices()
                    break
                }
            }
        }
        menu.select = undefined
    }

    /**
     * 保存置顶信息
     * @param item 菜单选中项
     * @param value 是否置顶
     */
    function saveTop(item: any, value: boolean) {
        const id = authStore.loginInfo.uin
        const upId = item.user_id ? item.user_id : item.group_id
        // 完整的设置 JSON
        let topInfo = settingsStore.sysConfig.top_info as {
            [key: string]: number[]
        }
        if (topInfo == null || typeof topInfo !== 'object') {
            topInfo = {}
        }
        // 本人的置顶信息
        let topList = topInfo[id]
        // 操作
        if (value) {
            if (topList) {
                if (topList.indexOf(props.chat.show.id) < 0) {
                    topList.push(upId)
                }
            } else {
                topList = [upId]
            }
        } else {
            if (topList) {
                topList.splice(topList.indexOf(upId), 1)
            }
        }
        // 刷新设置
        if (topList) {
            topInfo[id] = topList
            Option.save('top_info', topInfo)
        }
        // 为消息列表内的对象刷新置顶标志
        item.always_top = value
        // 刷新群收纳盒
        if(item.group_id && settingsStore.sysConfig.bubble_sort_user) {
            if(value) {
                showGroupAssist.value = false
            } else {
                showGroupAssist.value = true
            }
        }
    }

    /**
     * 显示列表菜单
     * @param item 菜单内容
     */
    function listMenuShow(event: Event, item: UserFriendElem & UserGroupElem) {
        const info = menu.set('messages-menu', event as MouseEvent)
        listMenuShowRun(info, item)
    }

    function listMenuShowRun(info: any, item: UserFriendElem & UserGroupElem) {
        // PS：这是触屏触发的标志，如果优先触发了 contextmenu 就不用触发触屏了
        showMenu.value = false
        info.list = ['top', 'remove']
        // 置顶的不显示移除
        if (item.always_top) {
            info.list = ['canceltop']
        }
        if (item.new_msg) {
            info.list.push('readed')
        } else {
            info.list.push('read')
        }
        // 是群的话显示通知设置
        if (item.group_id) {
            if (canGroupNotice(item.group_id)) {
                info.list.push('notice_close')
            } else {
                info.list.push('notice_open')
            }
        }
        listMenu.value = info
        menu.select = item
        // 出界处理
        // 菜单显示后再测量，避免固定延迟
        nextTick(() => {
            const menuEl = document.getElementById(
                'msg-menu-view-messages-menu',
            )?.children[1] as HTMLDivElement
            if (menuEl) {
                menuEl.style.transition = 'margin .2s, transform .1s'
                const hight = menuEl.clientHeight
                const top = menuEl.getBoundingClientRect().top
                const docHight = document.documentElement.clientHeight
                // 出界高度
                const dtHight = hight + top - docHight + 20
                if (dtHight > 0) {
                    menuEl.style.marginTop = docHight - hight - 30 + 'px'
                }
            }
        })
    }

    /**
     * 显示群收纳盒
     */
    function showGroupAssistCheck() {
        // 只展开收纳盒，不再默认选中第一个群
        showGroupAssist.value = !showGroupAssist.value
    }

    function showMenuStart(
        event: TouchEvent,
        item: UserFriendElem & UserGroupElem,
    ) {
        const info = {
            show: true,
            point: {
                x: event.targetTouches[0].pageX,
                y: event.targetTouches[0].pageY,
            },
        }
        showMenu.value = true
        setTimeout(() => {
            if (showMenu.value) {
                listMenuShowRun(info, item)
                showMenu.value = false
            }
        }, 500)
    }

    function showMenuMove() {
        showMenu.value = false
    }

    function showMenuEnd() {
        showMenu.value = false
    }

    function openHistory() {
        const popInfo = {
            template: markRaw(History),
            svg: 'clock-rotate-left',
            title: $t('历史记录')
        }
        uiStore.popBoxList.push(popInfo)
    }
</script>

<style>
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

    .friend-list-container {
        overflow: hidden;
        display: flex;
    }

    .onmsg-enter-active,
    .onmsg-leave-active,
    .onmsg-move {
        transition: transform 0.4s;
    }

    .menu div.item > a {
        font-size: 0.9rem !important;
    }
    .menu div.item > svg {
        margin: 3px 10px 3px 0 !important;
        font-size: 1rem !important;
    }

    .msg-menu-bg {
        background: transparent !important;
    }

    @media (max-width: 700px) {
        .friend-list-container {
            overflow: unset;
        }
        .menu {
            width: 140px !important;
        }
    }

    @media (max-width: 500px) {
        .friend-list-container {
            overflow: hidden;
        }
    }
</style>
