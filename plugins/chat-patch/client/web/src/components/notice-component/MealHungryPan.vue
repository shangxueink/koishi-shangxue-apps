<!--
 * @FileDescription: 饿饿！饭饭！这是求赞助弹窗模板
 * @Author: Stapxs
 * @Date: 2025/09/24
 * @Version: 1.0
-->

<template>
    <div class="meal-hungry-pan">
        <span v-if="times">{{ $t('好耶！Stapxs QQ Lite 已经被打开 {times} 次了！', { times }) }}</span>
        <div>
            <div class="hun-text">
                <span>饿饿！饭饭！</span>
                <a>非常感谢使用本项目，并给予关注与支持；你的信任是我持续改进与维护的最大动力。</a>
                <a>本项目驱动自咖啡，如果你觉得这个项目帮到了你，欢迎赞助我一杯咖啡！</a>
                <a style="
                    font-size: 0.8rem;
                    text-align: center;
                    display: block;
                    margin-top: 15px;
                    color: var(--color-font-2);
                    ">-- 表情包：Copyright @ 鹰角网络 --</a>
                <br>
                <a style="
                    text-align: center;
                    font-size: 0.8rem;
                    text-wrap: nowrap;
                    color: var(--color-font-1);
                    font-family: meow, sans-serif;
                    ">戳下面戳下面，打开去看看嘛—— (｡•́︿•̀｡)</a>
            </div>
            <div>
                <div class="meme" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { i18n } from '@renderer/main'

defineOptions({ name: 'MealHungryPan' })

defineProps<{ times?: number | string }>()

const $t = i18n.global.t
</script>

<style>
@font-face {
  src: url('../../assets/font/方正喵呜体.ttf') format('truetype');
  font-family: 'meow';
  font-weight: normal;
  font-style: normal;
}

.meal-hungry-pan {
    background-image: url('../../assets/img/cakes.svg');
    padding: 50px 30px 20px 30px !important;
    margin: -45px -15px 0 -15px;
    border-radius: 7px 7px 0 0;
    background-size: 200%;
    z-index: -1;
}
.meal-hungry-pan > span {
    background: rgba(var(--color-card-1-rgb), 0.5);
    backdrop-filter: blur(10px);
    margin-bottom: 10px;
    border-radius: 7px;
    text-align: center;
    display: block;
    padding: 10px;
}
.meal-hungry-pan > div {
    flex-direction: row;
    display: flex;
}

.meal-hungry-pan > div > div:last-child {
    justify-content: center;
    align-items: center;
    display: flex;
}
.hun-text {
    color: var(--color-font);
    width: 40vw;
}
.hun-text > span {
    font-family: meow, sans-serif;
    font-weight: bold;
    font-size: 1.9rem;
    display: block;
}
.hun-text > a {
    margin-top: 10px;
    font-size: 0.9rem;
    display: block;
}

.meme {
    background-image: url('../../assets/img/期待.png');
    background-size: cover;
    width: 160px;
    height: 160px;
}

@media (max-width: 500px) {
    .meal-hungry-pan > div {
        flex-direction: column;
    }
    .meal-hungry-pan > div > div:last-child {
        justify-content: right;
        display: flex;
    }
    .hun-text {
        width: 100%;
    }
}
</style>
