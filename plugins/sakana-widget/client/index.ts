import { Context } from '@koishijs/client'
import SakanaWidget from './sakana-widget.vue'

export default (ctx: Context) => {
    ctx.slot({
        type: 'global',
        component: SakanaWidget
    })
}