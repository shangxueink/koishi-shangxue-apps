import { } from '@koishijs/plugin-console'

import { Schema, Logger, h, noop } from "koishi"

import fs from 'node:fs'
import { stat } from 'node:fs/promises'
import path from "node:path"

export const name = 'preview-help'
export const reusable = true

export const inject = {
    required: ['http'],
    optional: ['console', 'server']
}
export const logger = new Logger('preview-help')

export const usage = `
---

在注册侧边入口后，进入编辑菜单。

点击【截图下载】可得到渲染好的图片。

---

在浏览器里打开此图片，复制地址栏链接。

将链接填入配置项，并且选择image类型，即可触发指令后发送此图片。

---
`

export const Config = Schema.intersect([
    Schema.object({
        command: Schema.string().description('注册指令名称').default("helps"),
        commandH: Schema.union(['text', 'image', 'video', 'file']).description('内容类型').default("text"),
        commandContent: Schema.string().description('指令返回的内容').default("还没有设定指令内容哦~").role('textarea', { rows: [6, 6] }),
    }).description('指令配置'),

    Schema.object({
        addConsoleEntry: Schema.boolean().default(true).description('是否注册侧边入口')
    }).description('功能配置'),
])


export function apply(ctx, config) {
    ctx.on('ready', async () => {

        ctx
            .command(config.command)
            .action(async ({ session }) => {
                switch (config.commandH) {
                    case 'text':
                        return h.text(config.commandContent)
                    case 'image':
                        return h.image(config.commandContent)
                    case 'video':
                        return h.video(config.commandContent)
                    case 'file':
                        return h.file(config.commandContent)
                    default:
                        return h.text(config.commandContent)
                }
            })

        const helpRoot = path.resolve(__dirname, '../help');
        const helpPath = '/help';

        ctx.server.get(helpPath + '(.*)', async (ctx, next) => {
            const filename = path.resolve(helpRoot, ctx.path.slice(helpPath.length).replace(/^\/+/, ''));
            if (!filename.startsWith(helpRoot)) return next();
            const stats = await stat(filename).catch(noop);
            if (stats?.isFile()) {
                ctx.type = path.extname(filename);
                return ctx.body = fs.createReadStream(filename);
            }
            return next();
        });

        ctx.inject(['console'], (ctx) => {
            ctx.console.addEntry({
                dev: path.resolve(__dirname, './../client/index.ts'),
                prod: path.resolve(__dirname, './../dist'),
            })
        })

    })
}
