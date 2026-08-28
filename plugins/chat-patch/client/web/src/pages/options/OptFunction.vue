<!--
 * @FileDescription: 设置页面（功能子页面）
 * @Author: Stapxs
 * @Date: 2022/11/07
 * @Version: 1.0
-->
<!-- eslint-disable max-len -->

<template>
    <div class="opt-page">
        <div class="ss-card">
            <header>{{ $t('会话选项') }}</header>
            <div class="opt-item">
                <div :class="checkDefault('bubble_sort_user')" />
                <font-awesome-icon :icon="['fas', 'box-open']" />
                <div>
                    <label for="opt-function-bubble-sort-user">{{ $t('群收纳盒') }}</label>
                    <span>{{ $t('全都放出来！全都放出来！') }}</span>
                </div>
                <label class="ss-switch">
                    <input id="opt-function-bubble-sort-user" v-model="settingsStore.sysConfig.bubble_sort_user"
                        type="checkbox" name="bubble_sort_user" @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
            <div class="opt-item">
                <div :class="checkDefault('session_display_mode')" />
                <font-awesome-icon :icon="['fas', 'address-book']" />
                <div>
                    <label for="opt-function-session-display-mode">{{ $t('会话显示') }}</label>
                    <span>{{ $t('关闭时仅显示最近会话，开启后显示全部会话') }}</span>
                </div>
                <label class="ss-switch">
                    <input id="opt-function-session-display-mode" :checked="settingsStore.sysConfig.session_display_mode === 'all'"
                        type="checkbox" name="session_display_mode" @change="toggleSessionDisplay">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
        </div>
        <div class="ss-card">
            <header>{{ $t('通知选项') }}</header>
            <div class="opt-item">
                <div :class="checkDefault('group_notice_type')" />
                <font-awesome-icon :icon="['fas', 'user-group']" />
                <div>
                    <label for="opt-function-group-notice-type">{{ $t('群消息通知方式') }}</label>
                    <span>{{ $t('重要消息将始终发起应用内通知和系统通知') }}</span>
                </div>
                <div class="select-wrapper">
                    <select id="opt-function-group-notice-type"
                        v-model="settingsStore.sysConfig.group_notice_type"
                        name="group_notice_type" title="group_notice_type" @change="save">
                        <option value="none">
                            {{ $t('不通知（默认）') }}
                        </option>
                        <option value="inner">
                            {{ $t('仅应用内通知') }}
                        </option>
                        <option value="all">
                            {{ $t('应用内通知和系统通知') }}
                        </option>
                    </select>
                </div>
            </div>
        </div>
        <div class="ss-card">
            <header>{{ $t('聊天选项') }}</header>
            <div class="opt-item">
                <div :class="checkDefault('opt_no_auto_load_image')" />
                <font-awesome-icon :icon="['fas', 'image']" />
                <div>
                    <label for="opt-function-no-auto-load-image">{{ $t('不自动加载图片') }}</label>
                    <span>{{ $t('图片消息默认显示占位符，点击后再加载') }}</span>
                </div>
                <label class="ss-switch">
                    <input id="opt-function-no-auto-load-image" v-model="settingsStore.sysConfig.opt_no_auto_load_image"
                        type="checkbox" name="opt_no_auto_load_image" @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
            <div class="opt-item">
                <div :class="checkDefault('send_key')" />
                <font-awesome-icon :icon="['fas', 'keyboard']" />
                <div>
                    <label for="opt-function-send-key">{{ $t('发送键') }}</label>
                    <span>{{ $t('你可以使用其他组合键来换行') }}</span>
                </div>
                <div class="select-wrapper">
                    <select v-if="backend.platform === 'darwin' || backend.platform === 'ios'" id="opt-function-send-key" v-model="settingsStore.sysConfig.send_key"
                        name="send_key" title="send_key" @change="save">
                        <option value="none">
                            Enter
                        </option>
                        <option value="shift">
                            Shift + Enter (⇧)
                        </option>
                        <option value="ctrl">
                            Control + Enter (⌃)
                        </option>
                        <option value="alt">
                            Option + Enter (⌥)
                        </option>
                        <option value="meta">
                            Command + Enter (⌘)
                        </option>
                    </select>
                    <select v-else id="opt-function-send-key" v-model="settingsStore.sysConfig.send_key"
                        name="send_key" title="send_key" @change="save">
                        <option value="none">
                            Enter
                        </option>
                        <option value="shift">
                            Shift + Enter
                        </option>
                        <option value="ctrl">
                            Ctrl + Enter
                        </option>
                        <option value="alt">
                            Alt + Enter
                        </option>
                        <option value="meta">
                            Meta + Enter
                        </option>
                    </select>
                </div>
            </div>
        </div>
        <div class="ss-card">
            <header>{{ $t('浏览选项') }}</header>
            <div v-if="backend.isDesktop()"
                class="opt-item">
                <div :class="checkDefault('opt_always_top')" />
                <font-awesome-icon :icon="['fas', 'angle-up']" />
                <div>
                    <label for="opt-function-always-top">{{ $t('置顶窗口') }}</label>
                    <span>{{
                        $t('你也不想想让 ta 知道你不在看消息吧 ~')
                    }}</span>
                </div>
                <label class="ss-switch">
                    <input id="opt-function-always-top" v-model="settingsStore.sysConfig.opt_always_top"
                        type="checkbox" name="opt_always_top" @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
        </div>
        <div v-if="backend.type === 'tauri'" class="ss-card">
            <header>{{ $t('消息存储') }}</header>
            <div
                class="opt-item"
                :style="{ 'background': settingsStore.sysConfig.enable_local_history ? 'var(--color-card-1)' : 'none' }">
                <div :class="checkDefault('enable_local_history')" />
                <font-awesome-icon :icon="['fas', 'database']" />
                <div>
                    <label for="opt-function-enable-local-history">{{ $t('启用消息存储') }}</label>
                    <span>{{ $t('保存消息记录何尝不是一种囤囤鼠') }}</span>
                </div>
                <label class="ss-switch">
                    <input id="opt-function-enable-local-history" v-model="settingsStore.sysConfig.enable_local_history"
                        type="checkbox" name="enable_local_history" @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
            <div v-if="settingsStore.sysConfig.enable_local_history" class="tip">
                {{
                    $t('Stapxs QQ Lite 支持将消息缓存至本地，消息将以加密数据库的方式安全的保存。')
                }}
            </div>
            <div v-if="settingsStore.sysConfig.enable_local_history" class="opt-item">
                <div :class="checkDefault('mixed_load_messages')" />
                <font-awesome-icon :icon="['fas', 'shuffle']" />
                <div>
                    <label for="opt-function-mixed-load-messages">{{ $t('混合加载消息（实验性）') }}</label>
                    <span>{{ $t('优先加载本地缓存的消息以取得更快的加载速度') }}</span>
                </div>
                <label class="ss-switch">
                    <input id="opt-function-mixed-load-messages" v-model="settingsStore.sysConfig.mixed_load_messages"
                        type="checkbox"
                        name="mixed_load_messages"
                        @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
            <div v-if="settingsStore.sysConfig.enable_local_history" class="opt-item">
                <div :class="checkDefault('disable_local_history_image_cache')" />
                <font-awesome-icon :icon="['fas', 'image']" />
                <div>
                    <label for="opt-function-disable-local-history-image-cache">{{ $t('不缓存图片') }}</label>
                    <span>{{ $t('开启后将删除已缓存图片，仅保留消息文本') }}</span>
                </div>
                <label class="ss-switch">
                    <input id="opt-function-disable-local-history-image-cache" v-model="settingsStore.sysConfig.disable_local_history_image_cache"
                        type="checkbox"
                        name="disable_local_history_image_cache"
                        @change="toggleLocalHistoryImageCache">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
            <div v-if="settingsStore.sysConfig.enable_local_history && dbStats != null" class="db-stats-cards">
                <div class="db-stat-card">
                    <font-awesome-icon :icon="['fas', 'message']" />
                    <span class="db-stat-value">{{ dbStats.totalMessages.toLocaleString() }}</span>
                    <span class="db-stat-label">{{ $t('已存消息') }}</span>
                </div>
                <div class="db-stat-card">
                    <font-awesome-icon :icon="['fas', 'database']" />
                    <span class="db-stat-value">{{ formatDbSize(dbStats.dbSizeBytes) }}</span>
                    <span class="db-stat-label">{{ $t('数据库大小') }}</span>
                </div>
                <div class="db-stat-card">
                    <font-awesome-icon :icon="['fas', 'image']" />
                    <span class="db-stat-value">{{ dbStats.imageCount > 0 ? formatDbSize(dbStats.imageCacheBytes) : '-' }}</span>
                    <span class="db-stat-label">{{ $t('图片缓存') }}{{ dbStats.imageCount > 0 ? '\u00a0(' + dbStats.imageCount.toLocaleString() + ')' : '' }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import { ref, watch } from 'vue'
    import { PopInfo, PopType } from '@renderer/function/base'
    import { runASWEvent as save, checkDefault, runAS } from '@renderer/function/option'
    import { i18n } from '@renderer/main'

    import { backend } from '@renderer/runtime/backend'
    import { dbClearImages, dbGetStats } from '@renderer/function/utils/localHistoryUtil'
    import { useSettingsStore } from '@renderer/state/settings'
    import { useAuthStore } from '@renderer/state/auth'
    import { useUIStore } from '@renderer/state/ui'

    const settingsStore = useSettingsStore()
    const authStore = useAuthStore()
    const uiStore = useUIStore()
    const $t = i18n.global.t

    defineOptions({ name: 'ViewOptFunction' })

    const dbStats = ref<{ totalMessages: number; imageCount: number; imageCacheBytes: number; dbSizeBytes: number } | null>(null)
    const clearImageProgressText = ref('')

    watch(() => authStore.loginInfo.uin, (uin) => {
        if (uin && settingsStore.sysConfig.enable_local_history) {
            loadDbStats()
        }
    }, { immediate: true })

    watch(() => settingsStore.sysConfig.enable_local_history, (enabled) => {
        if (enabled && authStore.loginInfo.uin) {
            loadDbStats()
        }
    }, { immediate: true })

    async function loadDbStats() {
        if (authStore.loginInfo?.uin) {
            dbStats.value = await dbGetStats(authStore.loginInfo.uin)
        }
    }

    function formatDbSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
    }

    function toggleSessionDisplay(event: Event) {
        const sender = event.target as HTMLInputElement
        runAS('session_display_mode', sender.checked ? 'all' : 'recent')
    }

    function toggleLocalHistoryImageCache(event: Event) {
        save(event)

        const sender = event.target as HTMLInputElement
        if (!sender.checked) return

        const selfId = authStore.loginInfo?.uin
        if (!selfId) {
            new PopInfo().add(PopType.INFO, $t('请连接后在进行操作'))
            return
        }

        const popInfo = {
            title: $t('提醒'),
            html: `<span>${$t('确认要关闭图片缓存吗？所有已缓存图片都将被清除！')}</span>`,
            button: [
                {
                    text: $t('确认'),
                    fun: async() =>  {
                        uiStore.popBoxList.shift()

                        const progressPop = {
                            title: $t('提醒'),
                            html: `<span>${$t('正在清理图片缓存 0/0（0%）')}</span>`,
                            allowClose: false
                        }

                        clearImageProgressText.value = $t('正在清理图片缓存 0/0（0%）')
                        uiStore.popBoxList.push(progressPop)

                        const result = await dbClearImages(selfId, (progress) => {
                            const text = $t('正在清理图片缓存 {deleted}/{total}（{percent}%）', {
                                deleted: progress.deleted,
                                total: progress.total,
                                percent: progress.progress.toFixed(1),
                            })
                            clearImageProgressText.value = text
                            progressPop.html = `<span>${text}</span>`
                        })

                        if (uiStore.popBoxList.length > 0) {
                            uiStore.popBoxList.shift()
                        }

                        new PopInfo().add(
                            PopType.INFO,
                            $t('图片缓存清理完成，共删除 {count} 项（{batches} 批）。', {
                                count: result.deleted,
                                batches: result.batches,
                            }),
                        )
                        clearImageProgressText.value = ''
                        loadDbStats()
                    },
                },
                {
                    text: $t('取消'),
                    master: true,
                    fun: () => {
                        runAS('disable_local_history_image_cache', false)
                        uiStore.popBoxList.shift()
                    },
                }
            ],
        }
        uiStore.popBoxList.push(popInfo)
    }
</script>
<style>
    .ss-switch input:checked ~ div {
        background: var(--color-main) !important;
    }

    .ga-share {
        background: var(--color-card-2);
        border-radius: 7px;
        align-items: center;
        margin-top: 10px;
        cursor: pointer;
        display: flex;
        padding: 10px 20px;
    }

    .ga-share > svg {
        fill: var(--color-font);
        margin-right: 10px;
        width: 20px;
    }

    .ga-share > a {
        text-decoration: underline;
        color: var(--color-font-1);
        font-size: 0.8rem;
    }

    .db-stats-cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin: 4px 0 8px;
    }

    .db-stat-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 12px 8px;
        border-radius: 7px;
        min-width: 0;
    }

    .db-stat-card > svg {
        width: 16px;
        height: 16px;
        opacity: 0.5;
        flex-shrink: 0;
    }

    .db-stat-value {
        font-size: 1rem;
        font-weight: 600;
        color: var(--color-font);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
    }

    .db-stat-label {
        font-size: 0.72rem;
        color: var(--color-font-2);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
    }
</style>
