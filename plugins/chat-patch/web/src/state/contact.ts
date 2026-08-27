import { UserFriendElem, UserGroupElem } from '@renderer/function/elements/information'
import { defineStore } from 'pinia'
import { shallowRef, reactive, ref } from 'vue'

export const useContactStore = defineStore('contact', () => {
    const userList = shallowRef<(UserFriendElem & UserGroupElem)[]>([])
    const showList = shallowRef<(UserFriendElem & UserGroupElem)[]>([])
    const groupAssistList = shallowRef<(UserFriendElem & UserGroupElem)[]>([])
    const baseOnMsgList = reactive(new Map<number | string, UserFriendElem & UserGroupElem>())
    const onMsgList = shallowRef<(UserFriendElem & UserGroupElem)[]>([])
    const newMsgCount = ref(0)
    const systemNoticesList = shallowRef<Record<string, any> | undefined>(undefined)
    const friendLoading = ref(false)
    const friendLoadedCount = ref(0)
    const friendTotalCount = ref(0)

    return {
        userList,
        showList,
        groupAssistList,
        baseOnMsgList,
        onMsgList,
        newMsgCount,
        systemNoticesList,
        friendLoading,
        friendLoadedCount,
        friendTotalCount,
    }
})
