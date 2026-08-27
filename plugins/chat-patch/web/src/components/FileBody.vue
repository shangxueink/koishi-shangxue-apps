<!--
 * @FileDescription: 群文件列表项模板
 * @Author: Stapxs
 * @Date: missing
 * @Version: 1.0
-->

<template>
    <div :class="(item.folder_id ? ' folder' : '') + (item.items && item.items.length > 0 ? ' open' : '')"
        @click="loadFileDir(item)">
        <font-awesome-icon v-if="item.folder_id" :icon="['fas', 'folder']" />
        <font-awesome-icon v-else :icon="['fas', 'file']" />
        <div class="main">
            <span>{{ toHtml(item.folder_name ?? item.file_name) }}</span>
            <div>
                <span>{{ toHtml(item.creater_name ?? item.uploader_name) }}</span>
                <span>{{
                    (item.create_time || item.upload_time) ? Intl.DateTimeFormat(trueLang, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                    }).format(new Date((item.create_time ?? item.upload_time) * 1000)) : '-'
                }}</span>
                <span v-if="!item.dead_time && item.dead_time">{{
                    item.dead_time - item.create_time / 86400 - 1 + $t('天后')
                }}</span>
                <span v-if="item.folder_id">{{
                    $t('共 {num} 个文件', { num: item.count })
                }}</span>
                <span v-else>{{ getSize(item.size) }}</span>
            </div>
        </div>
        <template v-if="item.file_id">
            <div class="download"
                @click="getFile(item)">
                <font-awesome-icon :icon="['fas', 'angle-down']" />
            </div>
        </template>
        <div v-show="item.show_items !== false && item.items !== undefined"
            :class="(item.items !== undefined ? 'sub_file ' : '') + 'group-files'">
            <div v-for="sub_item in item.items"
                :key="'sub_file-' + sub_item.file_id">
                <FileBody :chat="chat"
                    :item="(sub_item as GroupFileElem & GroupFileFolderElem)"
                    :parent="item.folder_id" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { i18n } from '@renderer/main'

    import {
        getTrueLang,
        escape2Html,
        getSizeFromBytes,
    } from '@renderer/function/utils/systemUtil'
    import {
        GroupFileElem,
        GroupFileFolderElem
    } from '@renderer/function/elements/information'
    import { Connector } from '@renderer/function/connect'
    import { useAuthStore } from '@renderer/state/auth'
    import { useChatStore } from '@renderer/state/chat'

    defineOptions({ name: 'FileBody' })

    const authStore = useAuthStore()
    const chatStore = useChatStore()
    const $t = i18n.global.t

    defineProps({
        item: {
            type: Object as () => GroupFileElem & GroupFileFolderElem,
            required: true,
        },
        chat: {
            type: Object,
            required: true,
        },
        parent: {
            type: String,
            required: false,
            default: undefined,
        },
    })

    const trueLang = getTrueLang()
    const getSize = getSizeFromBytes
    const toHtml = escape2Html

    /**
     * 下载文件（获取文件下载地址并下载）
     */
    function getFile(item: GroupFileElem) {
        const name = authStore.jsonMap.file_download?.name
        if(name) {
            Connector.send(
                name,
                {
                    group_id: chatStore.chatInfo.show.id,
                    file_id: item.file_id,
                },
                'downloadGroupFile_' + item.file_id + '_' + btoa(encodeURIComponent(item.file_name)),
            )
        }
    }

    /**
     * 加载子文件夹
     */
    function loadFileDir(item: GroupFileElem & GroupFileFolderElem) {
        const id = item.folder_id

        const name = authStore.jsonMap.group_folder_files?.name
        if(item.items !== undefined) {
            item.show_items = !item.show_items
            return
        }

        if (id && name) {
            Connector.send(name, {
                folder_id: id,
                group_id: chatStore.chatInfo.show.id,
            }, 'getGroupDirFiles_' + id)
        }
    }
</script>
