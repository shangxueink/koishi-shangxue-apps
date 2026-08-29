<!--
 * @FileDescription: 关于模板
 * @Author: Stapxs
 * @Date: 2024/04/22
 * @Version: 1.0
-->
 <!-- eslint-disable max-len -->

<template>
    <div class="about-pan">
        <div id="logo-card" :class="'ss-card logo-card' + (showUI ? '' : ' hidd-sha')">
            <div>
                <span>{{ $t('Koishi Satori 聊天室') }}</span>
            </div>
            <div class="about-source">
                {{ $t('本页面魔改自') }}
                <a @click="openLink('https://github.com/Stapxs/Stapxs-QQ-Lite-2.0')">Stapxs QQ Lite 2.0</a>
                {{ $t('，感谢原项目的 UI 设计。') }}
            </div>
            <div v-if="sponsorList.length > 0 && showUI" class="contributors-card">
                <div />
                <span> {{ $t('赞助者') }} </span>
                <div class="contributors">
                    <div v-for="info in sponsorList.slice(0, 3)" :key="info.user.name">
                        <img lazy :src="info.user.avatar">
                        <div>
                            <span>{{ info.user.name }}</span>
                            <span>{{ Intl.DateTimeFormat(trueLang, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                            }).format(getViewTime(Number(info.last_pay_time))) }}</span>
                        </div>
                    </div>
                </div>
                <div v-if="sponsorList.length > 3">
                    <img v-for="info in sponsorList.slice(3)"
                        :key="info.user.name"
                        lazy
                        :src="info.user.avatar">
                </div>
            </div>
            <div v-if="constList.length > 0 && showUI" class="contributors-card">
                <div />
                <span>{{ $t('社区贡献者') }}</span>
                <div class="contributors">
                    <div v-for="(info, index) in constList.slice(1, 4)" :key="info.title"
                        :class="(info.isMe ? 'me' : '') + (info.isSuperThakns ? ' super-thanks' : '')"
                        @click="openLink(info.link)">
                        <img lazy :src="info.url">
                        <div>
                            <span>{{ info.title }}</span>
                            <span>{{ $t('{time} 次提交', { time: info.contributions }) }}</span>
                        </div>
                        #{{ index + 1 }}
                    </div>
                </div>
                <div>
                    <img v-for="info in constList.slice(4)"
                        :key="info.title"
                        lazy
                        :src="info.url"
                        @click="openLink(info.link)">
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import DepPan from './DepPan.vue'
import packageInfo from '../../package.json'

    import { markRaw, onMounted, ref } from 'vue'
    import { openLink, sendStatEvent, showReleaseHistory } from '../function/utils/appUtil'
    import { ContributorElem } from '../function/elements/system'

    import { getTrueLang, getViewTime } from '../function/utils/systemUtil'

    import { library } from '@fortawesome/fontawesome-svg-core'
    import { faClockRotateLeft } from '@fortawesome/free-solid-svg-icons'
    import { i18n } from '../main'
    import { useUIStore } from '../state/ui'

    defineOptions({ name: 'AboutPan' })

    const $t = i18n.global.t
    const uiStore = useUIStore()

    defineProps<{
        showUI: boolean
    }>()

    const trueLang = ref('zh-CN')
    const constList = ref<ContributorElem[]>([])
    const sponsorList = ref<{
        current_plan: string,
        last_pay_time: string,
        user: {
            name: string,
            avatar: string
        }
    }[]>([])

    function dependencies() {
        uiStore.popBoxList = []
        const popInfo = {
            title: $t('更多信息'),
            template: markRaw(DepPan)
        }
        uiStore.popBoxList.push(popInfo)
    }

    function goGithub() {
        const repoName = import.meta.env.VITE_APP_REPO_NAME
        openLink(`https://github.com/${repoName}`)
        sendStatEvent('click_statistics', { name: 'visit_github' })
    }

    onMounted(() => {
        library.add(faClockRotateLeft)
        window.onload = async () => {
            trueLang.value = getTrueLang()
        }
        const superThanks = ['doodlehuang']
        // 加载贡献者信息
        if(import.meta.env.VITE_APP_REPO_NAME) {
            fetch(`https://api.github.com/repos/${import.meta.env.VITE_APP_REPO_NAME}/contributors`)
                .then((response) => response.json())
                .then((data: { [key: string]: string }[]) => {
                    for (let i = 0; i < data.length; i++) {
                        constList.value.push({
                            url: data[i].avatar_url,
                            link: data[i].html_url,
                            title: data[i].login,
                            contributions: Number(data[i].contributions),
                            isMe: data[i].login == 'Stapxs',
                            isSuperThakns: superThanks.includes(data[i].login),
                        })
                    }
                })
        }
        // 加载赞助者信息
        if(import.meta.env.VITE_APP_SPONSORS_DATA_API) {
            fetch(import.meta.env.VITE_APP_SPONSORS_DATA_API)
                .then((response) => response.json())
                .then((data: { [key: string]: string }) => {
                    sponsorList.value = data.list as any
                })
        }
    })
</script>

<style>
    .hidd-sha {
        box-shadow: none !important;
    }
    .about-source {
        margin-top: 12px;
        font-size: 0.8rem;
        text-align: center;
        opacity: 0.75;
    }
    .about-source a {
        color: var(--color-main);
        cursor: pointer;
    }
</style>
