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
    <span v-else class="msg-unknown">{{
        '( ' + $t('不支持的卡片类型') + ': ' + id + ' )'
    }}</span>
</template>

<script setup lang="ts">
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
</script>
