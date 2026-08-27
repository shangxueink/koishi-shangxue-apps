<!--
 * @FileDescription: 快速打开会话搜索栏
 * @Author: Mr.Lee
 * @Date:
 *      2025/08/19
 * @Version:
 *      1.0 - 初始版本
 * @Description:
 *      该组件用于在全局范围内快速搜索和选择会话。
 *      通过按下 Ctrl + E 快捷键打开搜索栏，用户可以输入关键词来过滤会话列表。
 *      支持上下键选择会话，回车键确认选择。
 *      被VSC的快捷键 Ctrl + E 激励创作的
-->
<template>
    <Teleport to="body">
        <Transition name="global-session-search-bar">
            <div v-if="show"
                class="mask-background"
                @click.stop.prevent="close">
                <div ref="content" class="global-session-search-bar ss-card">
                    <label for="global-session-search-input" class="sr-only">{{ $t('搜索会话') }}</label>
                    <input
                        id="global-session-search-input"
                        ref="input"
                        v-search="searchInfo"
                        class="ss-input"
                        :placeholder="$t('搜索 ……')"
                        @focusout="close">
                    <template v-if="showSessions.length > 0">
                        <hr>
                        <div ref="sessionList">
                            <div v-for="(session, key) in showSessions"
                                :key="session.user_id ?? session.group_id"
                                :class="{
                                    'session-item': true,
                                    'selected': selectId === key,
                                }"
                                @click="choiceSession(session)">
                                <TinySessionBody
                                    ref="sessionItems"
                                    :session="session"
                                    from="global-search" />
                                <span v-if="
                                    (session.group_id ?? session.user_id) === chatStore.chatInfo.show.id">
                                    {{ $t('当前会话') }}
                                </span>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import {
    ref,
    watchEffect,
    computed,
    shallowReactive,
    useTemplateRef,
    nextTick,
} from 'vue'
import TinySessionBody from './TinySessionBody.vue'
import { vSearch, useEventListener } from '@renderer/function/utils/appUtil'
import { UserFriendElem, UserGroupElem } from '@renderer/function/elements/information'
import { login } from '@renderer/function/connect'
import { backend } from '@renderer/runtime/backend'
import { matchPinyin } from '@renderer/function/utils/pinyin'
import { useUIStore } from '@renderer/state/ui'
import { useContactStore } from '@renderer/state/contact'
import { useChatStore } from '@renderer/state/chat'

//#region == 移植相关 ====================================================================
/**
 * 会话对象
 */
type Session = UserGroupElem & UserFriendElem
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
/**
 * 会话匹配算法
 * @param session
 * @param query
 */
function sessionSearchMatch(session: Session, query: string): boolean {
    const value = query.toLowerCase()
    const name = (
        session.user_id? session.nickname + session.remark: session.group_name
    ).toLowerCase()
    if (name.includes(value)) return true
    const id = session.user_id? session.user_id: session.group_id
    if (id.toString() === value) return true
    if (session.py_name && matchPinyin(session.py_name, value)) return true
    return false
}
/**
 * 判断有没有弹窗
 */
function hasPopBox() {
    return uiStore.popBoxList.length > 0
}
//#endregion

//#region == 常量声明 ====================================================================
const uiStore = useUIStore()
const contactStore = useContactStore()
const chatStore = useChatStore()
const show = ref<boolean>(false)
const input = useTemplateRef<HTMLInputElement>('input')
const sessionList = useTemplateRef<HTMLElement>('sessionList')
const sessionItems = useTemplateRef<InstanceType<typeof TinySessionBody>[]>('sessionItems')
const selectId = ref<number>(0)

const searchInfo = shallowReactive({
    originList: shallowReactive([] as Session[]),
    query: shallowReactive([] as Session[]),
    isSearch: false,
    match: sessionSearchMatch,
})

const showSessions = computed(() => {
    return searchInfo.isSearch ? searchInfo.query : searchInfo.originList
})
// 限制selectId的范围
watchEffect(()=>{
    if (selectId.value < 0)
        selectId.value = showSessions.value.length - 1
    if (selectId.value >= showSessions.value.length)
        selectId.value = 0

    // 出界滚动
    scrollToSelected()
})
//#endregion

//#region == 方法函数 ====================================================================
/**
 * 打开搜索栏
 */
function open() {
    init()
    show.value = true
    selectId.value = 0

    // 聚焦输入框
    nextTick(() => {
        input.value?.focus()
    })
}

/**
 * 关闭搜索栏
 */
function close() {
    show.value = false
    selectId.value = 0
}

/**
 * 初始化搜索框
 */
function init() {
    // 主要列表
    const mainList: Session[] = []
    for (const session of contactStore.userList) {
        if (contactStore.onMsgList.find(
            s => (
                s.user_id && s.user_id === session.user_id
            ) || (
                s.group_id && s.group_id === session.group_id
            )
        )) continue
        mainList.push(session)
    }

    searchInfo.originList = shallowReactive([...contactStore.onMsgList, ...mainList])

    searchInfo.query = shallowReactive([])
    searchInfo.isSearch = false
    selectId.value = 0
}

/**
 * 选择会话
 * @param session 被选择的会话
 */
function choiceSession(session: Session) {
    uiStore.openSideBar = false

    changeSession(session)
    close()
}

/**
 * 根据id选择会话
 * @param id
 */
function choiceSessionById(id: number) {
    if (id < 0 || id >= showSessions.value.length) return
    choiceSession(showSessions.value[id])
}

/**
 * 滚动到选中的会话项
 */
function scrollToSelected() {
    nextTick(() => {
        if (!sessionItems.value) return
        const selectedElement = sessionItems.value[selectId.value]
        const container = sessionList.value!

        if (selectedElement && container) {
            const containerRect = container.getBoundingClientRect()
            const elementRect = selectedElement.$el.getBoundingClientRect()

            // 计算相对于容器的位置
            const elementTop = elementRect.top - containerRect.top + container.scrollTop
            const elementBottom = elementTop + elementRect.height

            // 如果元素在可见区域上方
            if (elementTop < container.scrollTop) {
                container.scrollTop = elementTop
            }
            // 如果元素在可见区域下方
            else if (elementBottom > container.scrollTop + container.clientHeight) {
                container.scrollTop = elementBottom - container.clientHeight
            }
        }
    })
}

/**
 * 匹配到事件处理
 * 会组织事件冒泡和默认行为
 * @param e 事件
 */
function handleEvent(e: Event) {
    e.stopPropagation()
    e.preventDefault()
}
//#endregion

//#region == 开启关闭 ====================================================================
useEventListener(document, 'keydown', (e: KeyboardEvent) => {
    let isOpen = false;
    if(backend.platform === 'darwin') {
        // macOS 使用 Command + E
        isOpen = e.metaKey && e.key === 'e'
    } else {
        isOpen = e.ctrlKey && e.key === 'e'
    }
    if (isOpen) {
        //开启
        if (show.value) return
        if (!login.status) return
        if (hasPopBox()) return
        handleEvent(e)
        open()
    }else if (e.key === 'Escape') {
        // 关闭
        if (!show.value) return
        handleEvent(e)
        close()
    }else if (e.key === 'ArrowDown') {
        // 下
        if (!show.value) return
        handleEvent(e)
        selectId.value ++
    }else if (e.key === 'ArrowUp') {
        // 上
        if (!show.value) return
        handleEvent(e)
        selectId.value --
    }else if (e.key === 'Enter') {
        // 确认
        if (!show.value) return
        handleEvent(e)
        choiceSessionById(selectId.value)
    }
})
//#endregion
</script>
