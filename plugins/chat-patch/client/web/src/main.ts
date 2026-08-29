import VueClipboard from 'vue-clipboard2'
import packageInfo from '../package.json'

import App from './App.vue'
import { isDebugMode } from './function/debug'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'

import { faSquare, faHeart } from '@fortawesome/free-regular-svg-icons'

import './assets/css/view.css'
import './assets/css/chat.css'
import './assets/css/msg.css'
import './assets/css/options.css'
import './assets/css/sys_notice.css'

import { getPortableFileLang } from './function/utils/systemUtil'
import { preloadPinyin } from './function/utils/pinyin'

// 媒体资源由 <img>/<audio> 等元素加载时，失败事件只在前端控制台输出
window.addEventListener('error', (event) => {
  const target = event.target
  if (!(target instanceof HTMLImageElement) && !(target instanceof HTMLMediaElement)) return
  const source = target.currentSrc || target.src
  if (source.includes('/chat-patch/web/media') || source.includes('/chat-patch/api/media')) {
    console.warn('[chat-patch] 媒体下载失败:', source)
  }
}, true)

/* eslint-disable no-console */
const zh = getPortableFileLang('zh-CN')

// 载入 l10n
const messages = { 'zh-CN': zh }
// 初始化 i18n
export const i18n = createI18n({
    legacy: false,
    locale: 'zh-CN',
    fallbackLocale: 'zh-CN',
    missingWarn: false,
    silentFallbackWarn: true,
    messages,
})

// 创建 App
const app = createApp(App)
app.use(i18n)
app.use(createPinia())
app.use(VueClipboard)

library.add(fas)
library.add(faSquare, faHeart)
app.component('FontAwesomeIcon', FontAwesomeIcon)

app.mount('#app')
export default app
export const uptime = new Date().getTime()

preloadPinyin()

const strList = ['VERSION', 'WELCOME', 'HELLO']
const colorList = [
    '50534f',
    'f9a633',
    '8076a3',
    '92aa8a',
    '606e7a',
    '7abb7e',
    'b573f7',
    'ff5370',
    '99b3db',
    '677480',
]
const color = colorList[Math.floor(Math.random() * colorList.length)]
const str = strList[Math.floor(Math.random() * strList.length)]
if (isDebugMode()) {
    console.log(
        `%c${str}%c Koishi Satori Chat - ${packageInfo.version} ( ${import.meta.env.DEV ? 'development' : 'production'} ) `,
        `font-weight:bold;background:#${color};color:#fff;border-radius:7px 0 0 7px;padding:7px 14px;margin:7px 0 7px 7px;`,
        'background:#e3e8ec;color:#000;border-radius:0 7px 7px 0;display:inline-block;padding:7px 14px;margin:7px 7px 7px 0;',
    )
    if (import.meta.env.DEV) {
        console.log('[ SSystem Bootloader Loading …… core/sardos-core ]')
    }
    console.log('[ SSystem Bootloader Loading …… core/ssqq-core ]')
}
