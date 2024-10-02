import { Context } from '@koishijs/client';
import Page from './page.vue';
import './icon';

export default (ctx: Context) => {
    ctx.page({
        name: '早柚核心',
        icon: 'gscore',
        path: '/gsuid-core',
        component: Page,
    });
};
