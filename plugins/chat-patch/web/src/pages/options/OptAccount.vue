<!--
 - @FileDescription: 设置页面（账号子页面）
 - @Author: Stapxs
 - @Date: 2022/9/29
          2022/12/9
 - @Version: 1.0 - 初始版本
             1.5 - 重构为 ts 版本，代码格式优化
-->

<template>
    <div ref="accountList" class="opt-page account-page">
        <div v-if="accounts.length > 3" class="account-scroll-controls">
            <font-awesome-icon :icon="['fas', 'angle-up']"
                :title="$t('向上滚动')"
                @click="scrollAccount(-1)" />
            <font-awesome-icon :icon="['fas', 'angle-down']"
                :title="$t('向下滚动')"
                @click="scrollAccount(1)" />
        </div>
        <template v-if="accounts.length > 0">
            <div v-for="account in accounts"
                :key="account.platform + ':' + account.selfId"
                :class="['ss-card', 'account-info', { active: isActive(account) }]">
                <img :src="account.avatar || '/img/icons/icon.svg'">
                <div>
                    <div>
                        <span>{{ account.name || account.selfId }}</span>
                        <span>{{ account.selfId }}</span>
                    </div>
                    <span class="platform">{{ account.platform }}</span>
                </div>
            </div>
        </template>
        <template v-else>
            <div class="ss-card account-not-login">
                <font-awesome-icon :icon="['fas', 'fish']" />
                <span>{{ $t('还没有连接到 Satori 耶') }}</span>
                <button class="ss-button" @click="goLogin">
                    {{ $t('去连接') }}
                </button>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { login as loginInfo } from '@renderer/function/connect'
import { getActiveBot } from '@renderer/function/satori'
import { useAuthStore } from '@renderer/state/auth'
import { i18n } from '@renderer/main'

defineOptions({ name: 'ViewOptAccount' })

const $t = i18n.global.t
const authStore = useAuthStore()
const accountList = ref<HTMLElement | null>(null)

interface SatoriAccount {
    platform: string
    selfId: string
    name?: string
    avatar?: string
    status?: number
    features?: string[]
}

const accounts = computed<SatoriAccount[]>(() => {
    const stored = loginInfo.satoriLogins ?? authStore.loginInfo.satoriLogins
    return Array.isArray(stored) ? stored as SatoriAccount[] : []
})

const activeBot = computed(() => {
    const current = getActiveBot()
    if (current?.platform && current.selfId) return current
    return {
        platform: String(authStore.loginInfo.platform ?? ''),
        selfId: String(authStore.loginInfo.uin ?? authStore.loginInfo.selectedSatoriBot ?? ''),
    }
})

function isActive(account: SatoriAccount) {
    return activeBot.value.platform === account.platform && activeBot.value.selfId === account.selfId
}

/** 账号过多时按屏滚动列表 */
function scrollAccount(direction: number) {
    const el = accountList.value
    if (!el) return
    const step = Math.max(el.clientHeight * 0.8, 120)
    el.scrollBy({ top: direction * step, behavior: 'smooth' })
}

function goLogin() {
    document.getElementById('bar-home')?.click()
}
</script>

<style scoped>
    .account-page {
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        padding-right: 7px;
        scrollbar-width: thin;
    }
    .account-scroll-controls {
        position: sticky;
        top: 0;
        z-index: 2;
        display: flex;
        justify-content: flex-end;
        gap: 6px;
        margin: 0 !important;
        padding: 6px 0 !important;
        background: var(--color-bg);
    }
    .account-scroll-controls > svg {
        cursor: pointer;
        opacity: 0.7;
        padding: 6px;
        border-radius: 7px;
        background: var(--color-card-2);
        color: var(--color-font);
    }
    .account-scroll-controls > svg:hover {
        opacity: 1;
    }
    .account-info {
        margin-bottom: 10px;
        border-left: 3px solid transparent;
    }
    .account-info.active {
        border-left-color: var(--color-main);
    }
    .account-info .platform {
        font-size: 0.75rem;
        opacity: 0.65;
    }
    .account-info > svg {
        cursor: pointer;
        opacity: 0.8;
    }
    .account-info > svg:hover {
        opacity: 1;
    }
</style>
