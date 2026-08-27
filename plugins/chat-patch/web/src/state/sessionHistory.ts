import { Session } from '@renderer/function/elements/information'
import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

const MAX_LENGTH = 50

export const useSessionHistoryStore = defineStore('session-history', () => {
    const record = shallowRef<Session[]>([])

    function add(session: Session) {
        record.value = [
            session,
            ...record.value.filter((i) => (i.user_id !== session.user_id) || (i.group_id !== session.group_id)),
        ]
        if (record.value.length > MAX_LENGTH) {
            record.value.pop()
            record.value = [...record.value]
        }
    }

    return {
        record,
        add,
    }
})
