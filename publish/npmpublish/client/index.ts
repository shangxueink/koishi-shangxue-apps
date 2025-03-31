import { Context } from '@koishijs/client'
import { defineComponent, ref, h, resolveComponent, watch } from 'vue'
import './index.scss'
export default (ctx: Context) => {
    // 此 Context 非彼 Context
    // 我们只是在前端同样实现了一套插件逻辑
    ctx.page({
        name: '菜单编辑',
        path: '/preview-help',
        desc: "",
        // order:"",

        component: defineComponent({
            setup() {
                const iframe = ref<HTMLIFrameElement>()
                return () => h(resolveComponent('k-layout'), {}, {
                    default: () => h('iframe', { ref: iframe, src: "/help/index.html", class: 'layout-iframe' }),
                })
            },
        }),
    })
}