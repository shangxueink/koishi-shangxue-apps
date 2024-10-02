<template>
    <div style="text-align: center;position: absolute;width: calc(100% - 64px);height: calc(100% - 28px);left: 64px;">
        <div v-if="!iframeSupport">无法获取到配置信息，可能是由于复用组件导致的。</div>
        <iframe v-else ref="frame" frameborder="0" width="100%" height="100%" scrolling="no" :src="host"> </iframe>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { store } from '@koishijs/client';
export default defineComponent({
    setup() {
        const custom: string[] = store['gscore-custom'];
        if (!custom) return { host: '', iframeSupport: false };
        const [hostname, port, protocol, path] = custom;
        const host = `${protocol}//${hostname}:${port}/${path}`;
        return {
            host,
            iframeSupport: true
        }
    }
})
</script>