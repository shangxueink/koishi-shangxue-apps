import { defineExtension } from '@koishijs/client'
import Help from './help.vue'

export default defineExtension((ctx, config) => {
  // 修改 client/index.js 中的 page 配置
  ctx.page({
    path: '/preview-help',
    name: '帮助预览',
    icon: 'save',
    component: Help,
    title: '帮助预览',
  })

});