<template>
    <div v-if="success" class="msg-json" @click="openLink(parsedContent.jumpUrl)">
        <p>{{ parsedContent.title }}</p>
        <span>
            <font-awesome-icon icon="eye" /> {{ parsedContent.view }}
            <font-awesome-icon icon="message" /> {{ parsedContent.comment }}
            <font-awesome-icon icon="thumbs-up" /> {{ parsedContent.prefer }}
        </span>
        <img v-if="parsedContent.img" :src="parsedContent.img" alt=""
            class="forum-img">
        <div class="bottom-bar">
            <img :src="parsedContent.icon" alt="">
            <span>{{ parsedContent.name }} ({{ $t('频道') }})</span>
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

const forum = z
    .object({
        app: z.literal('com.tencent.forum'),
        meta: z.object({
            detail: z.object({
                channel_info: z.object({
                    guild_icon: z.string(),
                    guild_name: z.string(),
                }),
                feed: z.object({
                    comment_count: z.number().optional(),
                    images: z
                        .array(
                            z.object({
                                pic_url: z.string(),
                                height: z.number(),
                                width: z.number(),
                            }),
                        )
                        .optional(),
                    prefer_count: z.number().optional(),
                    view_count: z.number().optional(),
                }),
                jump_url: z.string(),
            }),
        }),
        prompt: z.string(),
    })
    .transform((o) => ({
        title: o.prompt.replace('[频道帖子]', ''),
        view: o.meta.detail.feed.view_count ?? 0,
        comment: o.meta.detail.feed.comment_count ?? 0,
        prefer: o.meta.detail.feed.prefer_count ?? 0,
        jumpUrl: o.meta.detail.jump_url,
        img: o.meta.detail.feed.images?.[0]?.pic_url,
        icon: o.meta.detail.channel_info.guild_icon,
        name: o.meta.detail.channel_info.guild_name,
    }))
const json = JSON.parse(jsonData)
const parsedData = forum.safeParse(json)
const success = parsedData.success
const parsedContent = parsedData.data!
if (!success) {
    new Logger().error(parsedData.error, 'Card Parse Error')
}
</script>

<style lang="css" scoped>
.forum-img {
    max-width: 30vw;
    min-width: 240px;
    object-fit: cover;
}
</style>
