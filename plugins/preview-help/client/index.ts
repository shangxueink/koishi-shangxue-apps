import { Context } from '@koishijs/client'
import { defineComponent, ref, h, resolveComponent, watch } from 'vue'
import './index.scss'
export default (ctx: Context) => {
    ctx.page({
        name: '菜单编辑',
        path: '/preview-help',
        desc: "",
        authority: 4,
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