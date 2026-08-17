import { defineComponent, h, resolveComponent } from 'vue'
import { Context, icons } from '@koishijs/client'
import Page from './page.vue'
import Activity from './icons/activity.vue'
import './index.scss'

icons.register('activity:vscode-blockly', Activity)

export default (ctx: Context) => {
  ctx.page({
    name: 'VSCode Blockly',
    path: '/vscode-blockly',
    icon: 'activity:vscode-blockly',
    authority: 4,
    component: defineComponent({
      setup() {
        return () => h(resolveComponent('k-layout'), { main: 'darker' }, {
          default: () => h(Page),
        })
      },
    }),
  })
}
