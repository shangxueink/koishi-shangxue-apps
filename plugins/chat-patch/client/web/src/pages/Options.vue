<!--
 * @FileDescription: 设置页面
 * @Author: Stapxs
 * @Date: 2022/09/26
 * @Version: 1.0
-->
 <!-- eslint-disable max-len -->

<template>
    <div :class="['opt-main', { 'opt-fast-animation': settingsStore.sysConfig.opt_fast_animation === true }]">
        <!-- 保留占位元素，避免设置页右侧布局被原有左侧选择器样式影响 -->
        <div class="opt-side-placeholder" style="display: none" />
        <div>
            <BcTab v-show="show" :title="$t('设置')" class="opt-tab">
                <div :name="$t('账号')">
                    <OptAccount :config="config" />
                </div>
                <div :name="$t('界面')">
                    <OptView />
                </div>
                <div :name="$t('功能')">
                    <OptFunction :config="config" />
                </div>
                <div :name="$t('高级')">
                    <OptDev />
                </div>
                <div v-if="showAbout" :name="$t('关于')">
                    <AboutPan class="opt-about" show-u-i />
                </div>
            </BcTab>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { ref, watch, onMounted, nextTick } from 'vue'

    import { i18n } from '@renderer/main'
    import { useSettingsStore } from '@renderer/state/settings'

    import BcTab from 'vue3-bcui/packages/bc-tab'
    import OptAccount from './options/OptAccount.vue'
    import OptView from './options/OptView.vue'
    import OptDev from './options/OptDev.vue'
    import OptFunction from './options/OptFunction.vue'

    import AboutPan from '@renderer/components/AboutPan.vue'

    defineOptions({ name: 'ViewOption' })

    const $t = i18n.global.t
    const settingsStore = useSettingsStore()

    const props = defineProps({
        show: Boolean,
        config: {
            type: Object,
            default: () => ({} as
                { [key: string]: string | number | boolean }),
        },
    })

    const showAbout = ref(true)

    function updateShowAbout() {
        nextTick(() => {
            const width = window.innerWidth
            if (width < 700) {
                showAbout.value = true
            } else {
                showAbout.value = false
            }
        })
    }

    watch(
        () => props.show,
        (val) => {
            if (val) {
                updateShowAbout()
            }
        },
    )

    onMounted(() => {
        // 监听窗口大小变化
        window.addEventListener('resize', updateShowAbout)
    })
</script>
