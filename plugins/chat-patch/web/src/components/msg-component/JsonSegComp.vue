<!--
 * @FileDescription: 卡片消息消息组件
 * @Author: Stapxs
 * @Date: 2023/05/23
 *        2026/02/13
 * @Version: 1.0 - 初始版本
 *           2.0 - 重构为单独组件
-->

<template>
    <template v-if="comp">
        <component :is="comp" :id="id" :data="data" />
    </template>
    <div v-else-if="genericCard" class="msg-json generic-card" @click="openGenericCard(genericCard.url)">
        <img v-if="genericCard.img" :src="genericCard.img" alt="">
        <div>
            <p>{{ genericCard.title }}</p>
            <span v-if="genericCard.desc">{{ genericCard.desc }}</span>
            <small v-if="genericCard.tag">{{ genericCard.tag }}</small>
        </div>
    </div>
    <span v-else class="msg-unknown">{{
        '( ' + $t('不支持的卡片类型') + ': ' + id + ' )'
    }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { openLink } from '@renderer/function/utils/appUtil'

const comps = import.meta.glob('./jsonComp/*.vue', {
    eager: true,
    import: 'default',
})

const cardComponentMap = {
    'com.tencent.tuwen.lua': comps['./jsonComp/Tuwen.lua.vue'],
    'com.tencent.mannounce': comps['./jsonComp/Mannounce.vue'],
    'com.tencent.miniapp.lua': comps['./jsonComp/Miniapp.lua.vue'],
    'com.tencent.miniapp_01': comps['./jsonComp/Miniapp.vue'],
    'com.tencent.music.lua': comps['./jsonComp/Music.lua.vue'],
    'com.tencent.contact.lua': comps['./jsonComp/Contact.lua.vue'],
    'com.tencent.map': comps['./jsonComp/Map.vue'],
    'com.tencent.forum': comps['./jsonComp/Forum.vue'],
    'com.tencent.autoreply': comps['./jsonComp/AutoReply.vue'],
    'com.tencent.feed.lua': comps['./jsonComp/Feed.lua.vue'],
}

const { data } = defineProps<{
    data: string,
}>()

let json: unknown
let id = ''

try {
    json = JSON.parse(data)
    if (json && typeof (json as any).app === 'string') {
        id = (json as any).app
    }
} catch {
    json = null
    id = ''
}

const comp = cardComponentMap[id]

function getString(value: unknown): string {
    return typeof value === 'string' ? value : ''
}

const genericCard = computed(() => {
    if (comp || !json || typeof json !== 'object' || Array.isArray(json)) return undefined
    const root = json as Record<string, unknown>
    const meta = root.meta
    if (typeof meta !== 'object' || meta === null) return undefined
    const metaList = Object.values(meta as Record<string, unknown>)
    for (const value of metaList) {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) continue
        const card = value as Record<string, unknown>
        const title = getString(card.title) || getString(card.name) || getString(card.nickname)
        const desc = getString(card.desc)
            || getString(card.summary)
            || getString(card.content)
            || getString(card.address)
        const img = getString(card.preview)
            || getString(card.avatar)
            || getString(card.cover)
            || getString(card.img)
        if (!title && !desc && !img) continue
        return {
            title,
            desc,
            img,
            tag: getString(card.tag) || getString(card.source) || getString(root.desc),
            url: getString(card.jumpUrl) || getString(card.url) || getString(card.qqdocurl),
        }
    }
    return undefined
})

function openGenericCard(url: string) {
    if (url) openLink(url)
}
</script>

<style scoped>
    .generic-card {
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
    }
    .generic-card img {
        width: 48px;
        height: 48px;
        border-radius: 7px;
        object-fit: cover;
        flex-shrink: 0;
    }
    .generic-card > div {
        min-width: 0;
    }
    .generic-card p {
        margin: 0;
        font-weight: bold;
    }
    .generic-card span,
    .generic-card small {
        display: block;
        margin-top: 4px;
        font-size: 0.8rem;
        opacity: 0.7;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
</style>
