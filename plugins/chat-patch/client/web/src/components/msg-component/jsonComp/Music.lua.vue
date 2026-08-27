<template>
    <div v-if="success" class="msg-json">
        <div class="music-data">
            <div @click="openLink(parsedContent.jumpUrl)">
                <p>{{ parsedContent.title }}</p>
                <span>{{ parsedContent.desc }}</span>
            </div>
            <img :src="parsedContent.img" alt="">
            <font-awesome-icon
                :icon="['fas', 'play']"
                :class="{ light: lightColor }"
                @click="sendPlay" />
        </div>
        <div class="bottom-bar">
            <img :src="parsedContent.icon" alt="">
            <span>{{ parsedContent.name }}</span>
        </div>
    </div>
    <span v-else class="msg-unknown">{{
        '( ' + $t('加载失败') + ': ' + id + ' )'
    }}</span>
</template>

<script setup lang="ts">
import * as z from 'zod'

import { ref } from 'vue'
import { addMusic } from '@renderer/components/MusicPlayer.vue'
import { Logger } from '@renderer/function/base'
import { openLink } from '@renderer/function/utils/appUtil'
import { getForegroundToneGridFromImageUrl } from '@renderer/function/utils/systemUtil'
import { backend } from '@renderer/runtime/backend'

const { data: jsonData, id } = defineProps<{
    data: string,
    id: string,
}>()

const music = z
    .object({
        app: z.literal('com.tencent.music.lua'),
        meta: z.object({
            music: z.object({
                title: z.string(),
                desc: z.string(),
                jumpUrl: z.string(),
                musicUrl: z.string(),
                preview: z.string(),
                tagIcon: z.string(),
                tag: z.string(),
            }),
        }),
    })
    .transform((o) => ({
        title: o.meta.music.title,
        desc: o.meta.music.desc,
        jumpUrl: o.meta.music.jumpUrl,
        musicUrl: o.meta.music.musicUrl,
        img: o.meta.music.preview,
        icon: o.meta.music.tagIcon,
        name: o.meta.music.tag,
    }))
const json = JSON.parse(jsonData)
const parsedData = music.safeParse(json)
const success = parsedData.success
const parsedContent = parsedData.data!
if (!success) {
    new Logger().error(parsedData.error, 'Card Parse Error')
}

const getType = () => {
    switch(parsedContent.name) {
        case '网易云音乐': return {
            type: 'music163',
            data: parsedContent.jumpUrl.match(/id=(\d+)/)?.[1]
        }
        default: return {
            type: 'default',
            data: undefined
        }
    }
}

const lightColor = ref(true)
 getForegroundToneGridFromImageUrl(backend.proxyUrl(parsedContent.img), 0.4).then(tone => {
    lightColor.value = tone[1][1] === 'light'
 })

const sendPlay = () => {
    const typeInfo = getType()
    addMusic({
        title: parsedContent.title,
        author: [parsedContent.desc],
        url: parsedContent.musicUrl,
        type: typeInfo.type as any,
        data: typeInfo.data,
        cover: parsedContent.img,
    }, 'current', true)
}
</script>

<style scoped>
.music-data {
    display: flex;
    align-items: center;
    margin-right: -60px;
}
.music-data img {
    width: 60px;
    height: 60px;
    border-radius: 7px;
    margin-left: 20px;
}
.music-data svg {
    --size: 20px;
    color: #545454;
    width: var(--size);
    height: var(--size);
    padding: calc(calc(60px - var(--size)) / 2);
    transform: translateX(-100%);
}
.music-data svg.light {
    color: #e5e5e5;
}
.music-data p {
    text-wrap: nowrap;
    font-weight: bold;
    margin: 0;
}
.music-data span {
    text-wrap: nowrap;
    font-size: 0.8rem;
    opacity: 0.7;
}
</style>
