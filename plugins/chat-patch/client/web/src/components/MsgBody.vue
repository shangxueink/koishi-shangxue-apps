<!--
 * @FileDescription: 消息模板
 * @Author: Stapxs
 * @Date:
 *      2022/08/03
 *      2022/12/12
 * @Version:
 *      1.0 - 初始版本
 *      1.5 - 重构为 ts 版本，代码格式优化
-->

<template>
    <div :id="'chat-' + data.message_id"
        ref="msgMain"
        v-menu.prevent="event => $emit('showMenu', event, data)"
        :class="[
            'message', type ?? '',
            { 'revoke': data.revoke },
            { 'me': isMe && type != 'body' },
            { 'selected': props.selected },
            { 'selecting': selecting },
            { 'right': isMe && type != 'body' && settingsStore.sysConfig.opt_ind_message !== 'left' },
            { 'left': isMe && type != 'body' && settingsStore.sysConfig.opt_ind_message === 'left' },
            { 'body-only': type == 'body' }
        ]"
        :data-raw="getMsgRawTxt(data)"
        :data-sender="data.sender.user_id"
        :data-time="data.time"
        @mouseleave="hiddenUserInfo"
        @click="handleBodyClick">
        <template v-if="type != 'body'">
            <img v-menu.prevent="event => $emit('showMenu', event, data)"
                v-user-tooltip="() => getUserById(data.sender.user_id)"
                name="avatar"
                :src="data.sender.avatar || '/img/icons/icon.svg'"
                :alt="data.sender.card ? data.sender.card : data.sender.nickname"
                @dblclick="sendPoke">
            <div v-if="data.fake_msg == true"
                :class="'sending left' + (isMe ? ' me' : '')">
                <font-awesome-icon :icon="['fas', 'spinner']" />
            </div>
        </template>
        <div :class="msgBodyClass">
            <header v-if="type != 'body'">
                <template v-if="chatStore.chatInfo.show.type == 'group'">
                    <span v-if="senderInfo && isRobot(senderInfo.user_id)" class="robot">{{ $t('机器人') }}</span>
                    <span v-if="senderInfo?.role == 'owner'" class="owner">{{ $t('群主') }}</span>
                    <span v-else-if="senderInfo?.role == 'admin'" class="admin">{{ $t('管理员') }}</span>
                    <span v-if="senderInfo?.title && senderInfo?.title != ''">{{ senderInfo?.title.replace(/[\u202A-\u202E\u2066-\u2069]/g, '') }}</span>
                </template>
                <span v-if="isDev && data._from_local_db" class="dev-local-tag">
                    {{ $t('本地') }}
                </span>
                <span v-if="data.revoke" class="revoked-tag">
                    {{ $t('已撤回') }}
                </span>
                <a v-if="data.sender.card || data.sender.nickname">
                    {{ data.sender.card ? data.sender.card : data.sender.nickname }}
                </a>
                <a v-else>
                    {{ isMe ? authStore.loginInfo.nickname : chatStore.chatInfo.show.name }}
                </a>
                <a v-if="props.selected" class="time">
                    {{ Intl.DateTimeFormat(trueLang, {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: 'numeric',
                        minute: 'numeric',
                        second: 'numeric',
                    }).format(getViewTime(getViewTime(data.time))) }}
                </a>
            </header>
            <div v-move="moveOptions"
                @v-move-left.prevent="$emit('leftMove', data)"
                @v-move-right.prevent="$emit('rightMove', data)">
                <!-- 消息体 -->
                <template v-if="data.message.length === 0">
                    <span class="msg-text" style="opacity: 0.5">{{ $t('空消息') }}</span>
                </template>
                <!-- 超级表情 -->
                <template v-else-if="isSuperFaceMsg()">
                    <div class="msg-img face lottie-face alone">
                        <LazyLottie
                            :animation-link="Emoji.get(Number(data.message[0].id))!.superValue!"
                            :title="Emoji.get(Number(data.message[0].id))!.description" />
                    </div>
                </template>
                <template v-else-if="!hasCard()">
                    <div v-for="(item, index) in data.message"
                        :key="data.message_id + '-m-' + index"
                        :class="View.isMsgInline(item.type) ? 'msg-inline' : ''">
                        <div v-if="item.type === undefined" />
                        <span v-else-if="isDebugMsg" class="msg-text">{{ item }}</span>
                        <span v-else-if="item.type == 'i18n'" class="msg-text">{{ item.path ? $t(item.path, item.params ?? {}) : '[i18n]' }}</span>
                        <template v-else-if="item.type == 'text'">
                            <div v-if="hasMarkdown()" class="msg-md-title" />
                            <span v-else v-show="item.text !== ''"
                                class="msg-text" @click="textClick" v-html="textIndex[index]" />
                        </template>
                        <div v-else-if="item.type == 'markdown'" v-once
                            :id="getMdHTML(item.content, 'msg-md-' + data.message_id)"
                            class="msg-md" />
                        <img v-else-if="item.type == 'image' && item.file == 'marketface'"
                            :class=" imgStyle(data.message.length, Number(index), true) + ' msg-mface'"
                            :src="item.url"
                            :alt="item.summary"
                            @load="imageLoaded"
                            @error="imgLoadFail">
                        <img v-else-if="item.type == 'mface'"
                            :class=" imgStyle(data.message.length, Number(index), true) + ' msg-mface'"
                            :src="item.url"
                            :alt="item.summary"
                            @load="imageLoaded"
                            @error="imgLoadFail">
                        <template v-else-if="item.type == 'image'">
                            <div v-show="shouldShowImagePlaceholder(item, Number(index))"
                                :title="$t('点击加载图片')"
                                :class="imgStyle(data.message.length, Number(index), isFace(item)) + ' msg-img-placeholder'"
                                @click="loadImage(item, Number(index), $event)">
                                <font-awesome-icon
                                    :icon="['fas', imageLoading(getImageKey(Number(index), item.url)) ? 'spinner' : 'image']"
                                    :spin="imageLoading(getImageKey(Number(index), item.url))" />
                                <span>
                                    {{ imageLoading(getImageKey(Number(index), item.url)) ? $t('加载中') : $t('点击加载图片') }}
                                </span>
                            </div>
                            <img v-show="!shouldShowImagePlaceholder(item, Number(index))"
                                :title="(!item.summary || item.summary == '') ? $t('预览图片') : item.summary"
                                :alt="$t('图片')"
                                :class=" imgStyle(data.message.length, Number(index), isFace(item))"
                                :src="getImgSrc(item.url)"
                                data-type="image"
                                @load="imageLoaded"
                                @error="imgLoadFail"
                                @click="imgClick(item.url, $event)">
                        </template>
                        <template v-else-if="item.type == 'face'">
                            <EmojiFace :emoji="Emoji.get(Number(item.id))" class="msg-face" />
                        </template>
                        <span v-else-if="item.type == 'bface'"
                            style="font-style: italic; opacity: 0.7">
                            [ {{ $t('图片') }}：{{ item.text }} ]
                        </span>
                        <div v-else-if="item.type == 'at'"
                            :class="getAtClass(item.qq)">
                            <a v-user-tooltip="() => getAtMember(item.qq)"
                                :data-id="item.qq"
                                :data-group="data.group_id">
                                {{ getAtName(item) }}
                            </a>
                        </div>
                        <div
                            v-else-if="item.type == 'file'" :class="'msg-file' + (isMe ? ' me' : '')"
                            @click="selectMedia($event)">
                            <div>
                                <div>
                                    <a>
                                        <font-awesome-icon :icon="['fas', 'file']" />
                                        {{ chatStore.chatInfo.show.type == 'group' ? $t('群文件') : $t('离线文件') }}
                                    </a>
                                    <p>{{ loadFileBase( item, item.name ?? item.file_name, data.message_id) }}</p>
                                </div>
                                <i>{{ getSizeFromBytes(item.size ?? item.file_size) }}</i>
                            </div>
                            <div>
                                <font-awesome-icon
                                    :icon="['fas', 'angle-down']"
                                    @click.stop="fileActionClick($event, item, data.message_id)" />
                            </div>
                            <div v-if="data.fileView && Object.keys(data.fileView).length > 0"
                                class="file-view">
                                <img v-if="['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(data.fileView.ext)"
                                    :src="getMediaSrc(data.fileView.url)">
                                <video v-else-if="['mp4', 'avi', 'mkv', 'flv'].includes(data.fileView.ext)"
                                    playsinline controls muted
                                    autoplay>
                                    <source :src="getMediaSrc(data.fileView.url)"
                                        :type="'video/' + data.fileView.ext">
                                    现在还有不支持 video tag 的浏览器吗？
                                </video>
                                <span v-else-if="['txt', 'md'].includes(data.fileView.ext) && (item.size ?? item.file_size) < 2000000" class="txt">
                                    <a>&gt; {{ item.name }} - {{ $t('文件预览') }}</a>
                                    {{ getTxtUrl(data.fileView) }}{{ data.fileView.txt }}
                                </span>
                            </div>
                        </div>
                        <div v-else-if="item.type == 'video'"
                            class="msg-video"
                            @click="selectMedia($event)">
                            <video playsinline :controls="!props.selecting" muted
                                :autoplay="!props.selecting">
                                <source :src="getMediaSrc(item.url ?? item.file)"
                                    type="video/mp4">
                                现在还有不支持 video tag 的浏览器吗？
                            </video>
                        </div>
                        <template v-else-if="item.type == 'record'">
                            <VoiceMsg
                                :item="item"
                                :message-id="String(data.message_id)"
                                :is-me="isMe"
                                :selecting="props.selecting"
                                @select="selectMedia($event)" />
                        </template>
                        <template v-else-if="item.type == 'forward'">
                            <div class="msg-raw-forward"
                                @click="openMerge($event)">
                                <span>{{ $t('群聊的聊天记录') }}</span>
                                <div class="forward-msg">
                                    <template v-if="item.content && item.content.length > 0">
                                        <div v-for="(i, indexItem) in item.content.slice(0, 3)"
                                            :key="'raw-forward-' + indexItem">
                                            {{ i.sender?.nickname || i.sender?.name || $t('未知') }}:
                                            <span v-for="(msg, msgIndex) in i.message"
                                                :key="'raw-forward-item-' + msgIndex">
                                                <span v-if="msg.type == 'text'">
                                                    {{ msg.text }}
                                                </span>
                                                <span v-else-if="msg.type == 'image'">
                                                    [{{ $t('图片') }}]
                                                </span>
                                                <span v-else-if="msg.type == 'face' || msg.type == 'bface'">
                                                    [{{ $t('表情') }}]
                                                </span>
                                                <span v-else-if="msg.type == 'file'">
                                                    [{{ $t('文件') }}]{{ msg.data.file }}
                                                </span>
                                                <span v-else-if="msg.type == 'video'">
                                                    [{{ $t('视频') }}]
                                                </span>
                                                <span v-else-if="msg.type == 'record'">
                                                    [{{ $t('语音') }}]
                                                </span>
                                                <span v-else-if="msg.type == 'forward'">
                                                    [{{ $t('聊天记录') }}]
                                                </span>
                                                <span v-else-if="msg.type == 'reply'">
                                                    <!--原版QQ此处不做处理-->
                                                </span>
                                                <span v-else>
                                                    [{{ $t('不支持的消息') }}]
                                                </span>
                                            </span>
                                        </div>
                                    </template>
                                    <div v-else>
                                        {{ $t('无法加载内容') }}
                                    </div>
                                </div>
                                <div>
                                    <span v-if="item.content !== undefined">
                                        {{ $t('查看 {count} 条转发消息', { count: item.content.length }) }}
                                    </span>
                                    <span v-else>
                                        {{ $t('查看合并转发消息') }}
                                    </span>
                                </div>
                            </div>
                        </template>
                        <div v-else-if="item.type == 'reply'"
                            v-show="type != 'body'"
                            :class="isMe ? type == 'merge' ? 'msg-replay' : 'msg-replay me' : 'msg-replay'"
                            @click="scrollToMsg(item.id)">
                            <div>
                                <span>{{ getMsgInfo(item.id) }}</span>
                                <font-awesome-icon v-if="getMsgInfo(item.id) != ''" :icon="['fas', 'turn-up']" />
                            </div>
                            <MsgBody v-if="getMsg(item.id)"
                                :data="getMsg(item.id, true)"
                                :type="'body'"
                                :global-me="isMe ? 'Y' : ''" />
                            <a v-else class="msg-unknown">
                                {{ getMsgStr(item.id) != '' ? getMsgStr(item.id) : $t('（查看回复消息）') }}
                            </a>
                        </div>
                        <div v-else-if="item.type == 'poke'" v-once :class="showPock()">
                            <font-awesome-icon class="poke-hand" style="margin-right: 5px;" :icon="['fas', 'fa-hand-point-up']" />
                            {{ $t('戳了戳你') }}
                        </div>
                        <span v-else class="msg-unknown">{{ '( ' + $t('不支持的消息') + ': ' + item.type + ' )' }}</span>
                    </div>
                </template>
                <template v-else>
                    <JsonSegComp v-if="data.message.at(0)!.type === 'json'"
                        :data="data.message.at(0)!.data" />
                    <XmlSegComp v-else :id="data.message_id" :item="data.message.at(0)!.data" />
                </template>
                <!-- 链接预览框 -->
                <div v-if="!isDebugMsg && pageViewInfo && Object.keys(pageViewInfo).length > 0"
                    :class="'msg-link-view ' + linkViewStyle">
                    <template v-if="pageViewInfo.type == undefined">
                        <div :class="'bar' + (isMe ? ' me' : '')" />
                        <div>
                            <img v-if="pageViewInfo.img !== undefined"
                                :id="data.message_id + '-linkview-img'"
                                alt="预览图片"
                                title="查看图片"
                                :src="pageViewInfo.img"
                                @load="linkViewPicFin"
                                @error="linkViewPicErr"
                                @click="preImgClick(pageViewInfo.img)">
                            <div class="body">
                                <p v-show="pageViewInfo.site">
                                    {{ pageViewInfo.site }}
                                </p>
                                <span :href="pageViewInfo.url">{{
                                    pageViewInfo.title
                                }}</span>
                                <span>{{ pageViewInfo.desc }}</span>
                            </div>
                        </div>
                    </template>
                    <template v-else>
                        <!-- 特殊 URL 的预览 -->
                        <div v-if="pageViewInfo.type == 'bilibili'"
                            class="link-view-bilibili"
                            @click="openLink(pageViewInfo.url)">
                            <div class="user">
                                <img :src="backend.proxyUrl(pageViewInfo.data.owner.face)">
                                <span>{{ pageViewInfo.data.owner.name }}</span>
                                <a>{{ Intl.DateTimeFormat(trueLang, {
                                    year: 'numeric',
                                    month: 'numeric',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: 'numeric'
                                }).format(getViewTime(pageViewInfo.data.public)) }}</a>
                            </div>
                            <img :src="backend.proxyUrl(pageViewInfo.data.pic)">
                            <span>{{ pageViewInfo.data.title }}</span>
                            <a>{{ pageViewInfo.data.desc }}</a>
                            <div class="data">
                                <font-awesome-icon :icon="['fas', 'play']" />
                                {{ pageViewInfo.data.stat.view }}
                                <font-awesome-icon :icon="['fas', 'coins']" />
                                {{ pageViewInfo.data.stat.coin }}
                                <font-awesome-icon :icon="['fas', 'star']" />
                                {{ pageViewInfo.data.stat.favorite }}
                                <font-awesome-icon :icon="['fas', 'thumbs-up']" />
                                {{ pageViewInfo.data.stat.like }}
                            </div>
                        </div>
                        <div v-else-if="pageViewInfo.type == 'music163'" style="width: 100%;">
                            <div class="link-view-music163">
                                <div>
                                    <a>{{ pageViewInfo.data.info.name }}
                                        <a v-if="pageViewInfo.data.info.free != null">{{ $t('（试听）') }}</a>
                                    </a>
                                    <span>{{ pageViewInfo.data.info.author.join('/') }}</span>
                                </div>
                                <img :src="pageViewInfo.data.cover">
                                <font-awesome-icon
                                    :icon="['fas', 'play']"
                                    :class="{ light: pageViewInfo.data.cover_light }"
                                    @click="sendPlay({
                                        title: pageViewInfo.data.info.name,
                                        author: pageViewInfo.data.info.author,
                                        url: pageViewInfo.data.play_link,
                                        type: 'music163',
                                        cover: pageViewInfo.data.cover,
                                        free: pageViewInfo.data.info.free,
                                        time: pageViewInfo.data.info.time,
                                        data: pageViewInfo.data.id,
                                    })" />
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </div>
        <div v-if="data.fake_msg == true"
            :class="'sending right' + (isMe ? ' me' : '')">
            <font-awesome-icon :icon="['fas', 'spinner']" />
        </div>
        <div v-if="data.emoji_like"
            :class="'emoji-like' + (isMe ? ' me' : '')">
            <div class="emoji-like-body">
                <TransitionGroup name="emoji-like">
                    <template v-for="info, id in data.emojis" :key="'respond-' + data.message_id + '-' + id">
                        <div :class="{
                            'me-send': info.includes(authStore.loginInfo.uin),
                        }">
                            <EmojiFace :emoji="Emoji.get(Number(id))!" />
                            <span>{{ info.length }}</span>
                        </div>
                    </template>
                </TransitionGroup>
            </div>
        </div>
        <code style="display: none">{{ data.raw_message }}</code>
    </div>
</template>

<script setup lang="ts">
import Option from '../function/option'
import markdownit from 'markdown-it'

import { MsgBodyFuns as ViewFuns } from '../function/model/msg-body'
import { watch, onMounted, nextTick, provide, inject, useTemplateRef, ref, computed, toRaw } from 'vue'
import { Connector } from '../function/connect'
import { resolveForwardMessageContent } from '../function/msg'
import { parseSatoriMarkup } from '../function/satori-model'
import { useSettingsStore } from '../state/settings'
import { Logger, LogType, PopInfo, PopType } from '../function/base'
import { StringifyOptions } from 'querystring'
import { getLocalMediaUrl, getMsgRawTxt, pokeAnime } from '../function/utils/msgUtil'
import {
    isRobot,
    openLink,
    sendStatEvent,
	vMenu,
	vMove,
	VMoveOptions,
} from '../function/utils/appUtil'
import { vUserTooltip } from '../function/tooltip'
import {
    getForegroundToneGridFromImageUrl,
    getSizeFromBytes,
    getTimeConfig,
    getTrueLang,
    getViewTime } from '../function/utils/systemUtil'
import { linkView } from '../function/utils/linkViewUtil'
import { MenuEventData, MergeStackData } from '../function/elements/information'
import { backend } from '../runtime/backend'
import { i18n } from '../main'
import { useUIStore } from '../state/ui'
import { useAuthStore } from '../state/auth'
import { useContactStore } from '../state/contact'
import { useChatStore } from '../state/chat'

const uiStore = useUIStore()
const authStore = useAuthStore()
const contactStore = useContactStore()
const chatStore = useChatStore()
const settingsStore = useSettingsStore()
import Emoji from '../function/model/emoji'
import EmojiFace from './EmojiFace.vue'
import LazyLottie from './LazyLottie.vue'
import { Img } from '../function/model/img'
import { dbGetImage, hashUrl } from '../function/utils/localHistoryUtil'
import JsonSegComp from './msg-component/JsonSegComp.vue'
import XmlSegComp from './msg-component/XmlSegComp.vue'
import VoiceMsg from './VoiceMsg.vue'
import { addMusic, MusicInfo } from './MusicPlayer.vue'

type Msg = any
type IUser = any

defineOptions({ name: 'MsgBody' })

const $t = i18n.global.t

const props = defineProps<{
    data: any
    selected?: boolean
    type?: 'merge' | 'body'
    globalMe?: string
    imageListHeader?: Img | undefined
    selecting?: boolean
}>()
const {
    data,
    type,
    globalMe,
    imageListHeader,
} = props

provide('message-content', data)

const { viewer: viewerRef } = inject<{ viewer: any }>('viewer', { viewer: null })

const emit = defineEmits<{
    click: [event: MouseEvent, msg: Msg]
    scrollToMsg: [...args: any[]]
    imageLoaded: [...args: any[]]
    contentRendered: []
    sendPoke: [...args: any[]]
    leftMove: [msg: Msg]
    rightMove: [msg: Msg]
    showMenu: [event: MenuEventData, msg: Msg]
}>()

const msgMain = useTemplateRef<HTMLDivElement>('msgMain')

const moveOptions: VMoveOptions<HTMLDivElement> = {
    moveHook: (_, move: number) => {
        const target = msgMain.value!
        target.style.transform = 'translateX(' + move + 'px)'
    },
    endHook: (_) => {
        const target = msgMain.value!

        target.style.transform = ''
        target.style.transition = 'all 0.3'
    },
    leftLimit: {
        value: uiStore.inch * 0.75,
        type: 'px'
    },
    rightLimit: {
        value: uiStore.inch * 0.75,
        type: 'px'
    },
    moveCondition: {
        minMove: {
            value: uiStore.inch * 0.5,
            type: 'px'
        }
    }
}

//#endregion

//#region == 响应式状态 ================================================================

const View = ViewFuns
const md = markdownit({ breaks: true })
const isMe = computed(() => {
    if (globalMe) return globalMe === 'Y'
    return String(authStore.loginInfo.uin) === String(data?.sender?.user_id ?? '')
})
const isDev = import.meta.env.DEV
const msgBodyClass = ref('message-body')
const isDebugMsg = Option.get('debug_msg')
const linkViewStyle = ref('')
const pageViewInfo = ref(undefined as { [key: string]: any } | undefined)
const gotLink = ref(false)
const senderInfo = ref(null as any)
const trueLang = getTrueLang()
const textIndex = ref({} as { [key: string]: number })
const resolvedImages = ref({} as Record<string, string>)
const manualImageLoads = ref({} as Record<string, boolean>)
const pendingImageLoads = ref({} as Record<string, boolean>)

//#endregion

//#region == 工具函数 ================================================================

function getAtMember(id: number): IUser | number {
    const re = getUserById(id) ?? id
    return re
}
function getUserById(id: number): IUser | undefined {
    if (chatStore.chatInfo.show.type === 'group') {
        if (!chatStore.chatInfo.info.group_members) return id
        const user = chatStore.chatInfo.info.group_members.find((item: IUser) => item.user_id == id)
        if (user) return user
        else return id
    }else {
        const user = contactStore.userList.find((item: IUser) => item.user_id === id)
        if (user) return user
        else return id
    }
}

//#endregion

//#region == 方法函数 ================================================================

async function loadCachedImages() {
    const selfId = authStore.loginInfo?.uin
    if (!selfId) return
    for (const seg of data.message) {
        if (seg.type !== 'image' || !seg.url) continue
        await loadCachedImage(seg.url)
    }
}

async function loadCachedImage(url: string) {
    if (resolvedImages.value[url]) return resolvedImages.value[url]

    const selfId = authStore.loginInfo?.uin
    if (!selfId || !url) return undefined

    const urlHash = await hashUrl(url)
    const cached = await dbGetImage(selfId, urlHash)
    if (cached) {
        resolvedImages.value[url] =
            `data:${cached.mimeType};base64,${cached.data}`
        return resolvedImages.value[url]
    }

    return undefined
}

function getImgSrc(url: string): string {
    if (url.startsWith('base64://')) {
        return `data:image/png;base64,${url.slice(9)}`
    }
    if (url.startsWith('/chat-patch/api/media')) return url
    const localUrl = getLocalMediaUrl(url)
    if (localUrl !== url) return localUrl
    return resolvedImages.value[url] ?? backend.proxyUrl(url)
}

function getMediaSrc(url: string): string {
    if (!url) return ''
    if (url.startsWith('/chat-patch/api/media')) return url
    const localUrl = getLocalMediaUrl(url)
    return localUrl !== url ? localUrl : backend.proxyUrl(url)
}

function getImageKey(index: number, url: string) {
    return `${data.message_id}-${index}-${url}`
}

function imageLoading(key: string) {
    return pendingImageLoads.value[key] === true
}

function shouldShowImagePlaceholder(item: { type: string, url: string }, index: number) {
    if (item.type !== 'image') return false
    if (settingsStore.sysConfig.opt_no_auto_load_image !== true) return false

    return manualImageLoads.value[getImageKey(index, item.url)] !== true
}

function getAtClass(who: number | string) {
    let back = 'msg-at'
    if (isMe.value && type != 'merge') {
        back += ' me'
    }
    if (authStore.loginInfo.uin == who || who == 'all') {
        back += ' atme'
    }
    return back
}

function getAtName(item: { [key: string]: any }) {
    if (item.qq == 'all') {
        return '@' + $t('全体成员')
    }
    if (item.text != undefined) {
        const text = String(item.text)
        return text.startsWith('@') ? text : '@' + text
    } else {
        for (let i = 0; i < chatStore.chatInfo.info.group_members.length; i++) {
            const user = chatStore.chatInfo.info.group_members[i]
            if (user.user_id == Number(item.qq)) {
                return ('@' + (user.card != '' && user.card != null? user.card: user.nickname))
            }
        }
        return '@' + item.qq
    }
}

function scrollToMsg(id: string) {
    emit('scrollToMsg', 'chat-' + id)
}

function imgStyle(length: number, at: number, isFace: boolean) {
    let style = 'msg-img'
    if (type == 'body') {
        return style
    }
    if (isFace) {
        style += ' face'
    }
    if (length === 1) {
        return (style += ' alone')
    }
    if (at === 0) {
        return (style += ' top')
    }
    if (at === length - 1) {
        return (style += ' button')
    }
    return style
}

function handleBodyClick(event: MouseEvent) {
    if (props.selecting) emit('click', event, data)
}

function selectMedia(event: MouseEvent) {
    if (!props.selecting) return
    event.preventDefault()
    event.stopPropagation()
    emit('click', event, data)
}

function fileActionClick(event: MouseEvent, fileData: any, messageId: string) {
    if (props.selecting) {
        event.preventDefault()
        emit('click', event, data)
        return
    }
    downloadFile(fileData, messageId)
}

function imgClick(url: string, _event?: MouseEvent) {
    if (props.selecting) return
    if (!viewerRef?.value) return
    let header = imageListHeader
    if (!header || !header.getBySrc(url)) {
        header = buildMessageImageList() ?? header
    }
    if (header) {
        viewerRef.value.openBySrc(header, url)
    } else {
        viewerRef.value.open(new Img(url))
    }
}

function buildMessageImageList(): Img | undefined {
    const urls: string[] = []
    const collect = (msg: any) => {
        if (!Array.isArray(msg?.message)) return
        for (const item of msg.message) {
            if (item?.type === 'image' && item?.file !== 'marketface' && item?.url) {
                urls.push(String(item.url))
            }
        }
    }
    if (Array.isArray(chatStore.messageList)) {
        for (const msg of chatStore.messageList) collect(msg)
    }
    if (Array.isArray(data?.message)) collect(data)
    return Img.fromList([...new Set(urls)])
}

async function loadImage(item: { url: string }, index: number, _event?: MouseEvent) {
    if (props.selecting) return
    const key = getImageKey(index, item.url)
    if (manualImageLoads.value[key] || pendingImageLoads.value[key]) return

    pendingImageLoads.value[key] = true
    try {
        if (data._from_local_db) {
            await loadCachedImage(item.url)
        }
        manualImageLoads.value[key] = true
    } finally {
        pendingImageLoads.value[key] = false
    }
}

function preImgClick(img: string) {
    if (viewerRef?.value) {
        viewerRef.value.open(new Img(img))
    }
}

async function imageLoaded(event: Event) {
    const img = event.target as HTMLImageElement

    if(backend.isMobile() && img.src && !img.src.startsWith('data:')
        && img.dataset.type === 'image') {
        img.src = await backend.proxyImageUrl(img.src)
        return
    }

    const vh = document.documentElement.clientHeight || document.body.clientHeight
    const imgHeight = img.naturalHeight || img.height
    let imgWidth = img.naturalWidth || img.width

    const aspectRatio = imgHeight / imgWidth

    if (aspectRatio > 2.5) {
        img.classList.add('long-img')
        try {
            const picLight = ( await getForegroundToneGridFromImageUrl(backend.proxyUrl(img.src), 0.4))[1][1] === 'light'
            if(picLight) {
                img.classList.add('light')
            }
        } catch {
            // do nothing
        }
    } else {
        if (imgHeight > vh * 0.35)
            imgWidth = (imgWidth * (vh * 0.35)) / imgHeight
    }

    img.style.setProperty('--width', `${imgWidth}px`)
    emit('imageLoaded', img.offsetHeight)
}

function imgLoadFail(event: Event) {
    const sender = event.currentTarget as HTMLImageElement
    const parent = sender.parentNode as HTMLDivElement
    parent.removeAttribute('style')
    parent.innerText = `【${$t('图片加载失败')}】`
}

async function parseText(index: number) {

    let text = data.message[index].text

    const logger = new Logger()
    if (/(?:<(?:\/?)(?:p|br|i18n|a|text|sharp)(?:\s|\/|>))/i.test(text)) {
        text = renderSatoriMarkupText(text)
    } else {
        text = ViewFuns.parseText(text)
    }
    const filtedText = text.replace(/(.)(\1{10,})/g, '$1<span style="opacity:0.7;margin-right:10px;">...</span>')
    if(filtedText != text) {
        const style = 'display:block;margin-top:10px;opacity:0.7;cursor:pointer;'
        text = filtedText + '<a style="' + style +'" data-raw="' + text + '" onclick="this.parentNode.innerText = this.dataset.raw;return false;">' + $t('显示原始消息') + '</a>'
    }

    if(type == 'body') {
        textIndex.value[index] = text
        return
    }

    const reg = /(http|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-.,@?^=%&:/~+#]*[\w\-@?^=%&/~+#])?/gi
    text = text.replaceAll(reg, '<a href="" data-link="$&" onclick="return false">$&</a>')
    const linkList = text.match(reg)
    if (linkList !== null && !gotLink.value && !isDebugMsg) {
        queueMicrotask(async() => {
            gotLink.value = true
            const fistLink = linkList[0]
            let protocol = ''
            let domain = ''
            try {
                protocol = new URL(fistLink).protocol + '//'
                domain = new URL(fistLink).hostname
            } catch (ignore) {
                // ignore
            }
            sendStatEvent('link_view', { domain: domain })

            let linkData = null as any
            let finaLink = fistLink
            try {
                finaLink = await backend.call('Onebot', 'sys:getFinalRedirectUrl', true, fistLink)
                if(!finaLink) {
                    finaLink = fistLink
                }
            } catch(_) { /**/ }
            const showLinkList = {
                bilibili: ['bilibili.com', 'b23.tv', 'bili2233.cn', 'acg.tv'],
                music163: ['music.163.com', '163cn.tv'],
            }
            for (const key in showLinkList) {
                if (showLinkList[key].some((item: string) => finaLink.includes(item))) {
                    linkData = await linkView[key](finaLink)
                }
            }
            if(!linkData) {
                if (!backend.isWeb()) {
                    let html = await backend.call('Onebot', 'sys:getHtml', true, finaLink)
                    if(html) {
                        const headEnd = html.indexOf('</head>')
                        html = html.slice(0, headEnd)
                        const ogRegex = /<meta\s+property="og:([^"]+)"\s+content="([^"]+)"\s*\/?>/g
                        const ogTags = {} as {[key: string]: string}
                        let match: string[] | null
                        while ((match = ogRegex.exec(html)) !== null) {
                            ogTags[`og:${match[1]}`] = match[2]
                        }
                        linkData = ogTags
                    }
                } else {
                    const response = await fetch(`${import.meta.env.VITE_APP_LINK_VIEW}/${encodeURIComponent(fistLink)}`)
                    if(response.ok) {
                        const res = await response.json()
                        if (res.status === undefined && Object.keys(res).length > 0) {
                            linkData = res
                        }
                    }
                }
            }

            logger.add(LogType.DEBUG, 'Link View: ', linkData)
            if(linkData) {
                loadLinkPreview(protocol + domain, linkData)
            }
        })
    }
    textIndex.value[index] = text
}

function loadLinkPreview(domain: string, res: any) {
    const logger = new Logger()
    logger.debug('获取链接预览成功: ' + res['og:title'])
    if(res != undefined) {
        if (res.type == undefined) {
            if(Object.keys(res).length > 0) {
                let imgUrl = res['og:image']
                if (imgUrl && !imgUrl.startsWith('http') && !imgUrl.startsWith('www')) {
                    imgUrl = new URL(imgUrl.startsWith('/') ? imgUrl : '/' + imgUrl, domain).toString()
                }
                const pageData = {
                    site: res['og:site_name'] === undefined ? '' : res['og:site_name'],
                    title: res['og:title'] === undefined ? '' : res['og:title'],
                    desc: res['og:description'] === undefined ? '' : res['og:description'],
                    img: imgUrl,
                    link: res['og:url'],
                }
                pageViewInfo.value = pageData
            }
        } else {
            pageViewInfo.value = res
        }
    }
}

function escapeHtmlText(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function renderSatoriMarkupText(source: string): string {
    return parseSatoriMarkup(source).map((segment) => {
        if (segment.type === 'i18n') {
            const path = String(segment.path || '[i18n]')
            const params = typeof segment.params === 'object' && segment.params !== null
                ? segment.params as Record<string, unknown>
                : {}
            return escapeHtmlText($t(path, params))
        }
        if (segment.type === 'text') {
            return escapeHtmlText(String(segment.text)).replace(/\n/g, '<br>')
        }
        return escapeHtmlText(String(segment.text || segment.path || ''))
    }).join('')
}

function linkViewPicFin() {
    const img = document.getElementById(
        data.message_id + '-linkview-img',
    ) as HTMLImageElement
    if (img !== null) {
        const w = img.naturalWidth
        const h = img.naturalHeight
        if (w > h) {
            linkViewStyle.value = 'large'
        }
    }
}
function linkViewPicErr() {
    if(pageViewInfo.value)
        pageViewInfo.value.img = undefined
}

function hiddenUserInfo() {
    if (chatStore.chatInfo.info.now_member_info !== undefined) {
        chatStore.chatInfo.info.now_member_info = undefined
    }
}

function getMsgInfo(message_id: string) {
    const list = chatStore.messageList.filter((item) => {
        return item.message_id == message_id
    })
    if (list.length === 1 && list[0].message.length > 0) {
        const time = Intl.DateTimeFormat(trueLang,
                getTimeConfig(new Date(getViewTime(list[0].time))))
            .format(getViewTime(getViewTime(list[0].time)))
        return (list[0].sender.nickname + ' ' + time)
    }
    else return ''

}

function getMsgStr(message_id: string) {
    const list = chatStore.messageList.filter((item) => {
        return item.message_id == message_id
    })
    if (list.length === 1) {
        return getMsgRawTxt(list[0])
    }
    return ''
}

function getMsg(message_id: string, filter: boolean = false) {
    const list = chatStore.messageList.filter((item) => {
        return item.message_id == message_id
    })
    if (list.length === 1) {
        const msg = toRaw(list[0])
        const textFallbackTypes = new Set([
            'video',
            'record',
            'file',
            'json',
            'xml',
            'forward'
        ])
        const needTextFallback = (msg.message ?? []).some((seg: any) => textFallbackTypes.has(seg?.type))
        if (needTextFallback) {
            return filter ? null : false
        }
        if(filter) {
            const mediaTypes = new Set([
                'image',
                'mface',
                'forward',
            ])
            let hasMedia = false
            const message = (msg.message ?? []).filter((seg: any) => {
                if (!mediaTypes.has(seg?.type)) {
                    return true
                }
                if (hasMedia) {
                    return false
                }
                hasMedia = true
                return true
            })
            return {
                ...msg,
                message,
            }
        } else {
            return list[0]
        }
    }
    return null
}

function downloadFile(fileData: any, message_id: string) {
    let name = authStore.jsonMap.file_download?.private_name
    if(chatStore.chatInfo.show.type == 'group') {
        name = authStore.jsonMap.file_download?.name
    }
    Connector.send(name, {
        file_id: fileData.file_id,
        group_id: chatStore.chatInfo.show.type == 'group' ? chatStore.chatInfo.show.id : undefined,
    },
        'downloadFile_' + message_id + '_' + btoa(encodeURIComponent(fileData.name ?? fileData.file_name)),
    )
}

function textClick(event: Event) {
    const target = event.target as HTMLElement
    if (target.dataset.link) {
        const link = target.dataset.link
        openLink(link)
    }
}

function loadFileBase(
    fileData: any,
    name: string,
    message_id: StringifyOptions,
) {
    const ext = name.split('.').pop()
    const msg = chatStore.messageList.find(
        (item) => item.message_id === message_id,
    )
    if (ext && msg?.fileView == undefined) {
        const list = [
            'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp',
            'mp4', 'avi', 'mkv', 'flv',
            'txt', 'md',
        ]
        if (list.includes(ext)) {
            msg.fileView = {}
            let dlName = authStore.jsonMap.file_download?.private_name
            if(chatStore.chatInfo.show.type == 'group') {
                dlName = authStore.jsonMap.file_download?.name
            }
            if(dlName) {
                Connector.send(dlName, {
                    file_id: fileData.file_id,
                    group_id: chatStore.chatInfo.show.type == 'group' ? chatStore.chatInfo.show.id : undefined,
                },
                    'loadFileBase_' + data.message_id + '_' + ext,
                )
            }
        }
    }
    return name
}

function getTxtUrl(view: any) {
    const url = view.url
    fetch(url)
        .then((r) => r.blob())
        .then((blob) => {
            const reader = new FileReader()
            reader.readAsText(blob, 'utf-8')
            reader.onload = function () {
                const txt = reader.result as string
                view.txt = txt.length > 300? txt.slice(0, 300) + '…': txt
            }
        })
}

function hasCard() {
    let hasCard = false
    data.message.forEach((item: any) => {
        if (item.type === 'json' || item.type === 'xml') {
            hasCard = true
        }
    })
    return hasCard
}

function hasMarkdown() {
    let hasMarkdown = false
    data.message.forEach((item: any) => {
        if (item.type === 'markdown') {
            hasMarkdown = true
        }
    })
    return hasMarkdown
}

function sendPoke() {
    emit('sendPoke', data.sender.user_id)
}

async function showPock() {
    if (data.message_id ==
        chatStore.messageList[chatStore.messageList.length - 1].message_id &&
        (new Date().getTime() - getViewTime(data.time)) / 1000 < 5) {
        let windowInfo = null as {
            x: number
            y: number
            width: number
            height: number
        } | null
        if (backend.isDesktop()) {
            windowInfo = await backend.call('Onebot', 'win:getWindowInfo', true)
        }
        const message = document.getElementById('chat-' + data.message_id)
        let item = document.getElementById('app')
        if (backend.isDesktop()) {
            item = message?.getElementsByClassName('poke-hand')[0] as HTMLImageElement
        }
        nextTick(() => {
            pokeAnime(item, windowInfo)
        })
    }
}

function isSuperFaceMsg() {
    if (settingsStore.sysConfig.use_super_face === false) return false
    if (data.message.length !== 1) return false
    const seg = data.message.at(0)
    if (seg.type !== 'face') return
    return Emoji.allSuperList.has(Number(seg.id))
}

function getMdHTML(str: string, id: string) {
    const html = md.render(str)
    const div = document.createElement('div')
    div.innerHTML = html
    const imgs = div.getElementsByTagName('img')
    for(let i=0; i<imgs.length; i++) {
        const img = imgs[i]
        const alt = img.getAttribute('alt')
        if(alt) {
            const size = alt.split('#')
            if(size.length == 3) {
                const width = Number.parseFloat(size[1])
                const height = Number.parseFloat(size[2])
                if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
                    img.style.aspectRatio = `${width} / ${height}`
                    img.style.width = 'auto'
                    img.style.height = 'auto'
                }
            }
        }
    }
    const links = div.getElementsByTagName('a')
    for(let i=0; i<links.length; i++) {
        const link = links[i]
        const href = link.getAttribute('href')
        if(href) {
            link.setAttribute('data-link', href)
            link.setAttribute('href', '')
            link.onclick = (e) => {
                e.preventDefault()
                openLink(href)
            }
        }
    }

    // Markdown 必须在 DOM 挂载后再插入，插入后通知聊天区重新贴底
    nextTick(() => {
        const body = document.getElementById(id)
        if(body) {
            body.innerHTML = ''
            body.appendChild(div)
            emit('contentRendered')
        }
    })

    return id
}

function sendPlay(info: MusicInfo) {
    addMusic(info, 'current', true)
}

async function openMerge(event?: MouseEvent) {
    if (props.selecting) {
        if (event) {
            event.preventDefault()
            event.stopPropagation()
            emit('click', event, data)
        }
        return
    }
    const seg = data.message[0]
    if (!seg) {
        new PopInfo().add(PopType.ERR, $t('无法获取合并转发内容'))
        return
    }
    if (!Array.isArray(seg.content) || seg.content.length === 0) {
        if (!seg?.id) {
            new PopInfo().add(PopType.ERR, $t('无法获取合并转发内容'))
            return
        }
        const resolved = await resolveForwardMessageContent(seg, {
            platform: String(data.platform ?? ''),
            selfId: String(data.self_id ?? ''),
            channelId: String(data.channel_id ?? data.channelId ?? ''),
        }).catch(() => undefined)
        if (!resolved || resolved.length === 0) {
            new PopInfo().add(PopType.ERR, $t('无法获取合并转发内容'))
            return
        }
        seg.content = resolved
    }

    const mergeData: MergeStackData = {
        messageList: [],
        imageList: [],
        placeCache: 0,
        forwardMsg: data
    }

    mergeData.messageList = seg.content
    const imgList = [] as {
        index: number
        message_id: string
        img_url: string
    }[]
    let index = 0
    mergeData.messageList.forEach((item) => {
        item.message.forEach((msg) => {
            if (msg.type == 'image') {
                imgList.push({
                    index: index,
                    message_id: item.message_id,
                    img_url: msg.url,
                })
                index++
            }
        })
    })
    mergeData.imageList = imgList

    chatStore.mergeMsgStack.push(mergeData)
}

function isFace(item: any) {
    if (item.asface) return true
    else if (item.subType == 7) return true
    else if (item.subType == 1) return true
    else if (item.sub_type == 7) return true
    else if (item.sub_type == 1) return true
    return false
}

//#endregion

//#region == 生命周期 ================================================================

onMounted(() => {
    watch(
        () => chatStore.chatInfo.info.group_members.length,
        () => {
            senderInfo.value =
                chatStore.chatInfo.info.group_members.filter(
                    (item: any) => {
                        return item.user_id == data.sender.user_id
                    },
                )[0]
        },
    )
    senderInfo.value = chatStore.chatInfo.info.group_members.filter(
        (item: any) => {
            return item.user_id == data.sender.user_id
        },
    )[0]
    for (let i = 0; i < data.message.length; i++) {
        const item = data.message[i]
        if(item.type == 'text') {
            parseText(i)
        }
    }
    if (data._from_local_db && settingsStore.sysConfig.opt_no_auto_load_image !== true) {
        loadCachedImages()
    }
    if(isSuperFaceMsg()) {
        msgBodyClass.value += ' super-face'
    }
    if(type != 'body') {
        if(isMe.value && type != 'merge') {
            msgBodyClass.value += ' me'
        }
        if(settingsStore.sysConfig.opt_ind_message === 'left') {
            msgBodyClass.value += ' left'
        } else {
            msgBodyClass.value += ' right'
        }
    }
})

//#endregion
</script>
<style>
    .message.revoke {
        display: flex;
        opacity: 1;
        border: 2px solid var(--color-red);
        border-radius: 7px;
        background: rgba(255, 80, 80, 0.08);
    }
    .message.revoke .message-body > div {
        background: transparent;
    }
    .revoked-tag {
        color: var(--color-red);
        font-size: 0.75rem;
        margin-left: 6px;
    }
    .dev-local-tag {
        display: inline-block;
        padding: 1px 7px !important;
        background: var(--color-card) !important;
        color: var(--color-font-2) !important;
    }
    .emoji-like {
        flex-direction: row;
        display: flex;
        width: 100%;
    }
    .emoji-like-body {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        max-width: 30%;
        margin-left: 50px;
        margin-top: 10px;
    }
    .emoji-like-body div {
        background: var(--color-card-1);
        border-radius: 7px;
        margin-right: 5px;
        padding: 5px 15px;
        margin-bottom: 5px;
    }
    .emoji-like-body img {
        width: 15px;
        height: 15px;
    }
    .emoji-like-body span {
        color: var(--color-font-2);
        margin-left: 10px;
        font-size: 0.8rem;
    }
    .emoji-like-body .emoji {
        width: 20px;
        height: 20px;
        font-size: 1rem;
        margin: 0;
    }
    .emoji-like-body div.me-send{
        background-color: var(--color-main);
    }
    .emoji-like-body div.me-send:hover {
        background: var(--color-font);
    }
    .emoji-like-body > div.me-send span {
        color: var(--color-font-r);
    }

    @media (min-width: 992px) {
        .emoji-like.me {
            flex-direction: row-reverse;
        }
        .emoji-like.me > div.emoji-like-body {
            flex-direction: row-reverse;
            margin-right: -5px;
        }
    }

    .link-view-bilibili {
        flex-direction: column;
        cursor: pointer;
        width: 100%;
    }
    .link-view-bilibili > div.user {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
    }
    .link-view-bilibili > div.user > img {
        width: 20px;
        border-radius: 100%;
        border: 2px solid transparent;
        outline: 2px solid var(--color-card);
    }
    .link-view-bilibili > div.user > span {
        flex: 1;
        margin-left: 10px;
        margin-right: 40px;
    }
    .link-view-bilibili > div.user > a {
        color: var(--color-font-2);
        font-size: 0.8rem;
    }
    .link-view-bilibili > img {
        margin-bottom: 10px;
        max-width: 100% !important;
        max-height: 30vh !important;
        width: fit-content;
        object-fit: contain;
    }
    .link-view-bilibili > a {
        color: var(--color-font-2) !important;
        font-size: 0.8rem;
        max-height: 4rem;
        overflow-y: scroll;
    }
    .link-view-bilibili > a::-webkit-scrollbar {
        background: transparent;
    }
    .link-view-bilibili > div.data {
        display: flex;
        flex-direction: row;
        align-items: center;
        font-size: 0.8rem;
        margin-top: 10px;
        justify-content: space-around;
        opacity: 0.7;
    }

    .link-view-music163 {
        width: calc(100% + 60px);
        margin-right: -60px;
        display: flex;
    }
    .link-view-music163 div {
        display: flex;
        flex-direction: column;
        flex: 1;
    }
    .link-view-music163 img {
        width: 60px;
        height: 60px;
        border-radius: 7px;
        margin-left: 20px;
    }
    .link-view-music163 a {
        text-wrap: nowrap;
        font-weight: bold;
        margin: 0;
    }
    .link-view-music163 span {
        text-wrap: nowrap;
        font-size: 0.8rem;
        opacity: 0.7;
    }
    .link-view-music163 svg {
        --size: 20px;
        color: #545454;
        width: var(--size);
        height: var(--size);
        padding: calc(calc(60px - var(--size)) / 2);
        transform: translateX(-100%);
    }
    .link-view-music163 svg.light {
        color: #e5e5e5;
    }
</style>
