<template>
  <k-layout>
    <iframe :src="htmlUrl" class="help-iframe" />
  </k-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const htmlUrl = ref('');

onMounted(() => {
  // 使用 import.meta.url 和 new URL 构建 HTML 文件的 URL
  const htmlPath = new URL('../help/index.html', import.meta.url).href;
  htmlUrl.value = htmlPath;
});
</script>

<style>
.help-iframe {
  width: 100%;
  height: calc(100vh - 60px); /* 假设控制台头部高度为 60px，可根据实际情况调整 */
  border: none;
}
</style>
