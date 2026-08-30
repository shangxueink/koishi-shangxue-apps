<!--
 * @FileDescription: 设置页面（开发者子页面）
 * @Author: Stapxs
 * @Date: 2022/09/28
 * @Version: 1.0
-->

<template>
    <div class="opt-page">
        <div class="ss-card">
            <header>{{ $t('开发者选项') }}</header>
            <div class="opt-item">
                <div :class="checkDefault('log_level')" />
                <font-awesome-icon :icon="['fas', 'book']" />
                <div>
                    <label for="opt-dev-log-level">{{ $t('日志等级') }}</label>
                    <span>{{ $t('ReferenceError: moYu is not defined') }}</span>
                </div>
                <div class="select-wrapper">
                    <select id="opt-dev-log-level" v-model="settingsStore.sysConfig.log_level"
                        name="log_level" title="log_level" @change="save">
                        <option value="err">
                            {{ $t('错误模式') }}
                        </option>
                        <option value="debug">
                            {{ $t('调试模式') }}
                        </option>
                    </select>
                </div>
            </div>
            <div class="opt-item">
                <div :class="checkDefault('debug_msg')" />
                <font-awesome-icon :icon="['fas', 'robot']" />
                <div>
                    <label for="opt-dev-debug-msg">{{ $t('禁用消息渲染') }}</label>
                    <span>
                        <a style="cursor: pointer" @click="sendAbab">{{ $t('点击进行 CAPTCHA 验证') }}</a>
                    </span>
                </div>
                <label class="ss-switch">
                    <input id="opt-dev-debug-msg" v-model="settingsStore.sysConfig.debug_msg"
                        type="checkbox" name="debug_msg" @change="save">
                    <div>
                        <div />
                    </div>
                </label>
            </div>
            <div class="opt-item">
                <font-awesome-icon :icon="['fas', 'rotate-left']" />
                <div>
                    <span>{{ $t('恢复 WebUI 所有默认配置项') }}</span>
                    <span>{{ $t('将所有 WebUI 配置恢复为默认值') }}</span>
                </div>
                <button
                    class="ss-button"
                    style="width: 100px; font-size: 0.8rem; background: var(--color-red); border-color: var(--color-red); color: #fff"
                    @click="resetDefaults">
                    {{ $t('恢复') }}
                </button>
            </div>
            <div class="opt-item">
                <font-awesome-icon :icon="['fas', 'trash-can']" />
                <div>
                    <span>{{ $t('删除数据库全部缓存') }}</span>
                    <span>{{ $t('清空媒体缓存、内容缓存和数据库历史记录') }}</span>
                </div>
                <button
                    style="width: 100px; font-size: 0.8rem; background: var(--color-red); border-color: var(--color-red); color: #fff"
                    class="ss-button"
                    @click="deleteAllCache">
                    {{ $t('全部删除') }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import app from '../../main'
    import { i18n } from '../../main'
import packageInfo from '../../../package.json'

    import { ref, onMounted, watch, useTemplateRef, markRaw } from 'vue'
    import {
        runASWEvent as save,
        saveAll,
        checkDefault,
        optDefault,
        runAS,
        get,
        getRaw,
    } from '../../function/option'
    import { clearAllCache, Connector } from '../../function/connect'
    import { PopInfo, PopType } from '../../function/base'
    import { isDebugMode } from '../../function/debug'
    import { dispatch } from '../../function/msg'
    import { BrowserInfo, detect } from 'detect-browser'
    import { BotMsgType } from '../../function/elements/information'
    import { uptime } from '../../main'
    import { loadJsonMap } from '../../function/utils/appUtil'
    import { backend } from '../../runtime/backend'
    import RawMsgRenderPreviewPan from '../../components/RawMsgRenderPreviewPan.vue'
    import { useSettingsStore } from '../../state/settings'
    import { useAuthStore } from '../../state/auth'
    import { useUIStore } from '../../state/ui'

    const settingsStore = useSettingsStore()
    const authStore = useAuthStore()
    const uiStore = useUIStore()
    const botTypeOptions = Object.values(BotMsgType).filter((value): value is BotMsgType => typeof value === 'number')

    defineOptions({ name: 'ViewOptDev' })

    const $t = i18n.global.t

    const napcat = import.meta.env.VITE_NAPCAT
    const dev = import.meta.env.DEV

    const jsonMapName = ref(authStore.jsonMap?.name ?? '')
    const ws_text = ref('')
    const parse_text = ref('')
    const appmsg_text = ref('')
    const customCssLoaded = ref(false)
    const customCssSize = ref('')
    const cssFileInput = useTemplateRef<HTMLInputElement>('cssFileInput')

    watch(
        () => authStore.jsonMap?.name,
        () => { jsonMapName.value = authStore.jsonMap?.name ?? '' },
    )

    onMounted(() => {
        // 检查是否已加载自定义 CSS
        updateCustomCssStatus()
    })

    function resetDefaults() {
        const popInfo = {
            title: $t('提醒'),
            html: `<span>${$t('确认要将 WebUI 所有配置恢复为默认值吗？')}</span>`,
            button: [
                {
                    text: $t('确认'),
                    fun: () => {
                        uiStore.popBoxList.shift()
                        settingsStore.sysConfig = JSON.parse(JSON.stringify(optDefault))
                        saveAll(settingsStore.sysConfig)
                        if (backend.isDesktop()) {
                            backend.call(undefined, 'win:relaunch', false)
                        } else {
                            location.reload()
                        }
                    },
                },
                {
                    text: $t('取消'),
                    master: true,
                    fun: () => {
                        uiStore.popBoxList.shift()
                    },
                },
            ],
        }
        uiStore.popBoxList.push(popInfo)
    }

    function deleteAllCache() {
        const popInfo = {
            title: $t('删除数据库全部缓存'),
            html: `<span>${$t('确认要删除全部缓存吗？删除后媒体图片、消息内容和数据库历史记录都会被清空。')}</span>`,
            button: [
                {
                    text: $t('确认'),
                    fun: async () => {
                        uiStore.popBoxList.shift()
                        const ok = await clearAllCache()
                        if (ok) {
                            new PopInfo().add(PopType.INFO, $t('缓存已全部删除'))
                            location.reload()
                        } else {
                            new PopInfo().add(PopType.ERR, $t('删除缓存失败'))
                        }
                    },
                },
                {
                    text: $t('取消'),
                    master: true,
                    fun: () => {
                        uiStore.popBoxList.shift()
                    },
                },
            ],
        }
        uiStore.popBoxList.push(popInfo)
    }

    function sendTestWs(event: KeyboardEvent) {
        // 发送测试 WS 消息
        if (event.keyCode === 13 && ws_text.value !== '') {
            const info = JSON.parse(ws_text.value)
            ws_text.value = ''
            // 修改 echo 防止被消息处理机处理
            info.echo = 'websocketTest'
            Connector.sendRawJson(JSON.stringify(info))
        }
    }

    function sendTestParse(event: KeyboardEvent) {
        // 发送测试解析消息
        if (event.keyCode === 13 && parse_text.value !== '') {
            const text = JSON.parse(parse_text.value)
            setTimeout(() => {
                dispatch(text)
            }, 5000)
            parse_text.value = ''
        }
    }

    function sendTestAppmsg(event: KeyboardEvent) {
        if (event.keyCode === 13 && appmsg_text.value !== '') {
            new PopInfo().add(PopType.INFO, appmsg_text.value, false)
            appmsg_text.value = ''
        }
    }

    function openRawRenderPreview() {
        uiStore.popBoxList.push({
            title: $t('消息渲染器'),
            template: markRaw(RawMsgRenderPreviewPan),
            data: {
                text: parse_text.value,
            },
            full: true,
        })
    }

    function sendAbab() {
        new PopInfo().add(
            PopType.INFO,
            $t('你不是人（逃'),
        )
    }

    function printRuntime() {
        if(backend.isMobile()) {
            const switcher = document.getElementById('__vconsole')?.getElementsByClassName('vc-switch')[0]
            if (switcher) {
                (switcher as HTMLDivElement).click()
            // safeArea
            backend.call('SafeArea', 'getSafeArea', true).then((safeArea) => {
                if (safeArea) {
                    const vcPanel = document.getElementById('__vconsole')?.getElementsByClassName('vc-panel')[0]
                    if (vcPanel) {
                        // vc-content、vc-toolbar
                        const vcContent = vcPanel.getElementsByClassName('vc-content')[0] as HTMLDivElement
                        const vcToolbar = vcPanel.getElementsByClassName('vc-toolbar')[0] as HTMLDivElement
                        if (vcContent && vcToolbar) {
                            vcContent.style.marginBottom = safeArea.bottom + 'px'
                            vcToolbar.style.marginBottom = safeArea.bottom + 'px'
                        }
                    }
                }
            })
            }
        }
        /* eslint-disable no-console */
        if (isDebugMode()) {
            console.log('=========================')
            console.log('settingsStore:', settingsStore.$state)
            console.log('authStore:', authStore.$state)
            console.log('uiStore:', uiStore.$state)
            console.log('=========================')
        }
        /* eslint-enable no-console */
        if(!backend.isMobile()) {
            backend.call(undefined, 'win:openDevTools', false)
        }
    }

    async function printVersionInfo() {
        new PopInfo().add(
            PopType.INFO,
            $t('正在收集调试消息……'),
        )

        // 索要框架信息
        const addInfo = await backend.call('Onebot', 'opt:getSystemInfo', true)
        if(backend.isMobile() && backend.function && 'vConsole' in backend.function && backend.function.vConsole) {
            addInfo.vconsole = ['vConsole Version', backend.function.vConsole.version ?? 'Not loaded']
        }

        const browser = detect() as BrowserInfo
        let info = '```\n'
        info +=
            'Debug Info - ' +
            new Date().toLocaleString() +
            '\n================================\n'
        info += 'System Info:\n'
        info += `    OS Name           -> ${browser.os}\n`
        info += `    Browser Name      -> ${browser.name}\n`
        info += `    Browser Version   -> ${browser.version}\n`
        if (addInfo) {
            const get = addInfo as { [key: string]: [string, string] }
            Object.keys(get).forEach((name: string) => {
                info += `    ${get[name][0]}  -> ${get[name][1]}\n`
            })
        }
        // 获取安装信息，这儿主要判断几种已提交的包管理安装方式
        if (backend.isDesktop() && backend.release) {
            const process = window.electron?.process
            switch (process && process.platform) {
                case 'linux': {
                    // archlinux
                    if (backend.release.toLowerCase().indexOf('arch') > 0) {
                        let pacmanInfo =
                            await backend.call(undefined, 'sys:runCommand', true,
                                'pacman -Q stapxs-qq-lite-bin',
                            )
                        if (pacmanInfo.success) {
                            info += '    Install Type      -> aur\n'
                        } else if(backend.function && 'invoke' in backend.function) {
                            // 也有可能是 stapxs-qq-lite，这是我自己打的原生包
                            pacmanInfo = await backend.function.invoke(
                                    'sys:runCommand',
                                    'pacman -Q stapxs-qq-lite',
                                )
                            if (pacmanInfo.success) {
                                info += '    Install Type      -> pacman\n'
                            }
                        }
                    }
                    break
                }
            }
        }

        info += 'Application Info:\n'
        info += `    Uptime            -> ${Math.floor(((new Date().getTime() - uptime) / 1000) * 100) / 100} s\n`
        info += `    Package Version   -> ${packageInfo.version}\n`
        info += `    Service Work      -> ${navigator.serviceWorker?.controller ? 'active' : 'none'}\n`

        info += 'Backend Info:\n'
        info += `    Bot Info Name     -> ${authStore.botInfo.app_name}\n`
        info += `    Bot Info Version  -> ${authStore.botInfo.app_version !== undefined ? authStore.botInfo.app_version : authStore.botInfo.version}\n`
        info += `    Loaded Config     -> ${authStore.jsonMap?.name}\n`

        info += 'View Info:\n'
        info += `    Doc Width         -> ${document.getElementById('app')?.offsetWidth} px\n`

        // capactior：索要 safeArea
        if (backend.isMobile()) {
            const safeArea = await backend.call('SafeArea', 'getSafeArea', true)
            if (safeArea) {
                // 按照前端习惯，这儿的 safeArea 顺序是 top, right, bottom, left
                const safeAreaStr = safeArea.top + ', ' + safeArea.right + ', ' + safeArea.bottom + ', ' + safeArea.left
                info += `    Safe Area         -> ${safeAreaStr}\n`
            }
        }

        info += 'Network Info:\n'
        info += '    local only\n'
        info += '```'
        // 构建 popBox 内容
        const popInfo = {
            svg: 'screwdriver-wrench',
            html:
                '<textarea class="debug-info">' + info + '</textarea>',
            title: $t('调试信息'),
            button: [
                {
                    text: $t('复制'),
                    fun: () => {
                        app.config.globalProperties.$copyText(info)
                        new PopInfo().add(
                            PopType.INFO,
                            $t('复制成功'),
                        )
                    },
                },
                {
                    text: $t('确定'),
                    master: true,
                    fun: () => {
                        uiStore.popBoxList.shift()
                    },
                },
            ],
        }
        uiStore.popBoxList.push(popInfo)
    }

    function printSetUpInfo() {
        const json = JSON.stringify(settingsStore.sysConfig)
        const popInfo = {
            svg: 'upload',
            html:
                '<textarea style="width: calc(100% - 40px);min-height: 90px;background: var(--color-card-1);color: var(--color-font);border: 0;padding: 20px;border-radius: 7px;margin-top: -10px;">' +
                json +
                '</textarea>',
            title: $t('导出设置项'),
            button: [
                {
                    text: $t('复制'),
                    fun: () => {
                        app.config.globalProperties.$copyText(json)
                        new PopInfo().add(
                            PopType.INFO,
                            $t('复制成功'),
                        )
                    },
                },
                {
                    text: $t('确定'),
                    master: true,
                    fun: () => {
                        uiStore.popBoxList.shift()
                    },
                },
            ],
        }
        uiStore.popBoxList.push(popInfo)
    }

    function importSetUpInfo() {
        const popInfo = {
            svg: 'download',
            html: '<textarea id="importSetUpInfoTextArea" style="width: calc(100% - 40px);min-height: 90px;background: var(--color-card-1);color: var(--color-font);border: 0;padding: 20px;border-radius: 7px;margin-top: -10px;"></textarea>',
            title: $t('导入设置项'),
            button: [
                {
                    text: $t('取消'),
                    fun: () => {
                        uiStore.popBoxList.shift()
                    },
                },
                {
                    text: $t('确定'),
                    master: true,
                    fun: () => {
                        const input = document.getElementById(
                            'importSetUpInfoTextArea',
                        ) as HTMLTextAreaElement
                        if (input) {
                            try {
                                const json = JSON.parse(input.value)
                                settingsStore.sysConfig = json
                                saveAll(json)
                                location.reload()
                            } catch (e) {
                                new PopInfo().add(
                                    PopType.ERR,
                                    $t(
                                        '导入设置项失败',
                                    ),
                                )
                            }
                        }
                    },
                },
            ],
        }
        uiStore.popBoxList.push(popInfo)
    }

    function resetApp() {
        const popInfo = {
            svg: 'trash-arrow-up',
            html:
                '<span>' +
                $t(
                    '确认要重置应用吗，重置应用将会失去所有设置内容（包括设置的置顶群组），但是可能可以解决一些因为浏览器缓存导致的奇怪问题。',
                ) +
                '</span>',
            title: $t('重置应用'),
            button: [
                {
                    text: $t('确定'),
                    fun: () => {
                        localStorage.clear()
                        document.cookie.split(';').forEach((c) => {
                            document.cookie = c.replace(/^ +/, '')
                                .replace(/=.*/,'=;expires=' + new Date().toUTCString() + ';path=/')
                        })
                        backend.call(undefined, 'opt:clearAll', false)
                        location.reload()
                    },
                },
                {
                    text: $t('取消'),
                    master: true,
                    fun: () => {
                        uiStore.popBoxList.shift()
                    },
                },
            ],
        }
        uiStore.popBoxList.push(popInfo)
    }

    function restartapp() {
        backend.call(undefined, 'win:relaunch', false)
    }

    function getBotTypeName(index: BotMsgType) {
        switch (index) {
            case BotMsgType.CQCode:
                return $t('CQ 码')
            case BotMsgType.Array:
                return $t('Array 数组')
        }
    }

    function getPathMapList() {
        const pathMap = import.meta.glob('../../assets/pathMap/*.yaml')
        const pathMapList: string[] = []
        Object.keys(pathMap).forEach((key: string) => {
            const name = key.split('/').pop()?.replace('.yaml', '')
            if (name) pathMapList.push(name)
        })
        return pathMapList
    }

    function changeJsonMap() {
        const getPath = loadJsonMap(jsonMapName.value)
        if (getPath) authStore.jsonMap = getPath
    }

    // 查看配置文件
    function rmNeedlessOption() {
        const needless: string[] = []
        for (const key of Object.keys(settingsStore.sysConfig)) {
            if (optDefault[key] === undefined) {
                needless.push(key)
            }
        }
        if (needless.length === 0) {
            new PopInfo().add(
                PopType.INFO,
                $t('没有需要删除的配置项'),
            )
            return
        }
        const popInfo = {
            title: $t('转发消息'),
            html: `
                <header>以下配置将被删除</header>
                <div style="color: var(--color-red);font-weight: 700;">
            ` + needless.join('<br>') + '</div>',
            button: [{
                    text: $t('确定'),
                    fun: () => {
                        for (const key of needless) {
                            delete settingsStore.sysConfig[key]
                        }
                        saveAll(settingsStore.sysConfig)
                        uiStore.popBoxList.shift()
                    },
                },
                {
                    text: $t('取消'),
                    master: true,
                    fun: () => {
                        uiStore.popBoxList.shift()
                    },
                },
            ],
        }
        uiStore.popBoxList.push(popInfo)
    }

    // 自定义 CSS 相关方法
    async function updateCustomCssStatus() {
        const customCss = await getRaw('custom_css')
        customCssLoaded.value = customCss && customCss.trim().indexOf('null') < 0
        if (customCssLoaded.value) {
            // 计算 CSS 大小
            const sizeInBytes = new Blob([customCss]).size
            if (sizeInBytes < 1024) {
                customCssSize.value = sizeInBytes + ' B'
            } else if (sizeInBytes < 1024 * 1024) {
                customCssSize.value = (sizeInBytes / 1024).toFixed(2) + ' KB'
            } else {
                customCssSize.value = (sizeInBytes / (1024 * 1024)).toFixed(2) + ' MB'
            }
        }
    }

    function selectCssFile() {
        // 触发文件选择
        if (cssFileInput.value) {
            cssFileInput.value.click()
        }
    }

    function handleCssFileUpload(event: Event) {
        const target = event.target as HTMLInputElement
        const file = target.files?.[0]

        if (!file) return

        // 检查文件类型
        if (!file.name.endsWith('.css')) {
            new PopInfo().add(
                PopType.ERR,
                $t('请选择 CSS 文件'),
            )
            return
        }

        // 检查文件大小（限制为 1MB）
        if (file.size > 1024 * 1024) {
            new PopInfo().add(
                PopType.ERR,
                $t('CSS 文件大小不能超过 1MB'),
            )
            return
        }

        // 显示风险警告弹窗
        const popInfo = {
            svg: 'triangle-exclamation',
            html: '<div style="text-align: left;"><p>' +
                $t('注意：自定义样式功能具有一定风险，请确保您了解以下事项：') +
                '</p><ul style="margin: 10px 0; padding-left: 20px;">' +
                '<li>' + $t('错误的 CSS 代码可能导致界面显示异常') + '</li>' +
                '<li>' + $t('某些样式可能会隐藏或覆盖重要的界面元素') + '</li>' +
                '<li>' + $t('如果出现严重问题，可能会导致完全无法重置此设置') + '</li>' +
                '</ul><p>' + $t('确认要继续上传并加载此 CSS 文件吗？') + '</p></div>',
            title: $t('自定义样式风险提醒'),
            button: [
                {
                    text: $t('确认上传'),
                    fun: () => {
                        uiStore.popBoxList.shift()
                        // 读取文件内容
                        const reader = new FileReader()
                        reader.onload = (e) => {
                            const cssContent = e.target?.result as string
                            if (cssContent) {
                                // 保存并注入 CSS
                                runAS('custom_css', cssContent)
                                updateCustomCssStatus()
                                new PopInfo().add(
                                    PopType.INFO,
                                    $t('自定义样式已加载'),
                                )
                            }
                        }
                        reader.onerror = () => {
                            new PopInfo().add(
                                PopType.ERR,
                                $t('读取文件失败'),
                            )
                        }
                        reader.readAsText(file)
                        // 清空 input 值，允许重复选择同一文件
                        target.value = ''
                    },
                },
                {
                    text: $t('取消'),
                    master: true,
                    fun: () => {
                        uiStore.popBoxList.shift()
                        // 清空 input 值
                        target.value = ''
                    },
                },
            ],
        }
        uiStore.popBoxList.push(popInfo)
    }

    function viewCustomCss() {
        const customCss = get('custom_css')
        const popInfo = {
            svg: 'eye',
            html: '<textarea style="width: calc(100% - 40px);min-height: 300px;background: var(--color-card-1);color: var(--color-font);border: 0;padding: 20px;border-radius: 7px;margin-top: -10px;font-family: monospace;font-size: 0.9rem;" readonly>' +
                (customCss || '') +
                '</textarea>',
            title: $t('查看自定义样式'),
            button: [
                {
                    text: $t('复制'),
                    fun: () => {
                        app.config.globalProperties.$copyText(customCss)
                        new PopInfo().add(
                            PopType.INFO,
                            $t('复制成功'),
                        )
                    },
                },
                {
                    text: $t('确定'),
                    master: true,
                    fun: () => {
                        uiStore.popBoxList.shift()
                    },
                },
            ],
        }
        uiStore.popBoxList.push(popInfo)
    }

    function clearCustomCss() {
        const popInfo = {
            svg: 'trash',
            html: '<span>' + $t('确认要清除自定义样式吗？') + '</span>',
            title: $t('清除自定义样式'),
            button: [
                {
                    text: $t('确定'),
                    fun: () => {
                        runAS('custom_css', null)
                        updateCustomCssStatus()
                        new PopInfo().add(
                            PopType.INFO,
                            $t('已清除自定义样式'),
                        )
                        uiStore.popBoxList.shift()
                    },
                },
                {
                    text: $t('取消'),
                    master: true,
                    fun: () => {
                        uiStore.popBoxList.shift()
                    },
                },
            ],
        }
        uiStore.popBoxList.push(popInfo)
    }
</script>
