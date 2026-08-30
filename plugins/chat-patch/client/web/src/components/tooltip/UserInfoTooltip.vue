<!--
 * @FileDescription: 群成员消息悬浮窗
 * @Author: Mr.Lee
 * @Date: 2025/09/01
 *        2026/01/03
 * @Version: 1.0
 *           2.0 并入新式提示工具系统
-->
<template>
    <div v-if="userInfo" class="member-info ss-card"
        :class="{
            leave: typeof userInfo === 'number',
        }">
        <!-- 已退群 -->
        <template v-if="typeof userInfo === 'number'">
            <div>
                <img :src="'/img/icons/icon.svg'">
                <div>
                    <span name="id">{{ userInfo }}</span>
                    <div>
                        <a>{{ $t('已退群( {userId} )', { userId: userInfo }) }}</a>
                    </div>
                </div>
            </div>
        </template>
        <!-- 群成员 -->
        <template v-else>
            <div>
                <img data-avatar :src="userInfo.avatar || '/img/icons/icon.svg'">
                <div>
                    <span name="id">{{ userInfo.user_id }}</span>
                    <div>
                        <a>{{ userInfo.card || userInfo.nickname || userInfo.name || userInfo.user_id }}</a>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
type IUser = any

const { user: userProp } = defineProps<{
    user: IUser | number | (() => IUser | number)
}>()

let userInfo: IUser | number
if (typeof userProp === 'function') {
    userInfo = userProp()
} else {
    userInfo = userProp
}
</script>

<style scoped>
.tooltip-enter-active, .tooltip-leave-active {
    transition: opacity 0.2s, transform 0.2s;
    transform-origin: top;
}
.tooltip-enter-from, .tooltip-leave-to {
    opacity: 0;
    transform: scaleY(0) translate(-20px, calc(-100% - 0.8rem));
}
.tooltip-enter-to, .tooltip-leave-from {
    opacity: 1;
    transform: scaleY(1) translate(-20px, calc(-100% - 0.8rem));
}
</style>
