import { ChatInfoElem, MergeStackData } from '@renderer/function/elements/information'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useChatStore = defineStore('chat', () => {
    const chatInfo = ref<ChatInfoElem>({
        show: { type: '', id: 0, name: '', avatar: '' },
        info: {
            group_info: {},
            user_info: {},
            me_info: {},
            group_members: [],
            group_files: {},
            group_sub_files: {},
            jin_info: {
                list: [],
                pages: 0,
            },
        },
    })

    const messageList = ref<any[]>([])
    const mergeMsgStack = ref<MergeStackData[]>([])
    const mergeMessageList = ref<any[] | undefined>(undefined)
    const mergeMessageImgList = ref<any[] | undefined>(undefined)

    return {
        chatInfo,
        messageList,
        mergeMsgStack,
        mergeMessageList,
        mergeMessageImgList,
    }
})
