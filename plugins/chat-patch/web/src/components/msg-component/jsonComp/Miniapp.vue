<template>
    <div v-if="success" class="msg-json" @click="openLink(parsedContent.jumpUrl ?? '')">
        <p>{{ parsedContent.title }}</p>
        <img :src="parsedContent.img" alt="">
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
import { Logger } from '@renderer/function/base'
import { openLink } from '@renderer/function/utils/appUtil'
import * as z from 'zod'

const { data: jsonData, id } = defineProps<{
    data: string,
    id: string,
}>()

const detailSchema = z.object({
    title: z.string(),
    desc: z.string(),
    icon: z.string(),
    preview: z.string(),
    qqdocurl: z.string().optional(),
    url: z.string().optional(),
}).transform((o) => ({
    title: o.desc,
    name: o.title,
    icon: o.icon,
    img: o.preview,
    jumpUrl: o.qqdocurl ?? o.url,
}))

const invitationSchema = z.object({
    title: z.string(),
    name: z.string(),
    icon: z.string(),
    imageUrl: z.string(),
    path: z.string().optional(),
}).transform((o) => ({
    title: o.title,
    name: o.name,
    icon: o.icon,
    img: o.imageUrl,
    jumpUrl: o.path,
}))

const miniapp = z.object({
        app: z.literal('com.tencent.miniapp_01'),
        meta: z.union([
            z.object({ detail_1: detailSchema, }).transform(v => v.detail_1),
            z.object({ invitation_1: invitationSchema, }).transform(v => v.invitation_1),
        ]),
    }).transform(o => o.meta)

const json = JSON.parse(jsonData)
const parsedData = miniapp.safeParse(json)
const success = parsedData.success
const parsedContent = parsedData.data!
if (!success) {
    new Logger().error(parsedData.error, 'Card Parse Error')
}
</script>
