import { Context, Schema, Logger } from 'koishi';
import { GsuidCoreClient } from './client';
import { genToCoreMessage } from './message';
import { DataService } from '@koishijs/plugin-console';
import { createCustomFile } from './custom-file';
import { resolve } from 'path';
import { SessionEventManager, SessionEventManagerMap } from './event-manager';
import { timeout } from 'rxjs';

export const reusable = true; // 声明此插件可重用

export const inject = ['database'];

declare module '@koishijs/plugin-console' {
    namespace Console {
        interface Services {
            ['gscore-custom']: any;
        }
    }
}
export const name = 'gscore-adapter-null';
export const usage = `
---
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>早柚核心 GsCore</title>
<style>
.gs-core-content {
font-family: Arial, sans-serif;
line-height: 1.6;
margin: 20px;
color: #333;
}
.gs-core-content h1 {
color: #333;
font-size: 24px;
}
.gs-core-content p {
margin-bottom: 15px;
}
.gs-core-content details {
margin-bottom: 15px;
}
.gs-core-content summary {
cursor: pointer;
font-weight: bold;
color: #007BFF;
}
.gs-core-content pre {
background: #f4f4f4;
padding: 10px;
border: 1px solid #ddd;
border-radius: 5px;
white-space: pre-wrap;
word-wrap: break-word;
}
.gs-core-content a {
color: #007BFF;
text-decoration: none;
}
.gs-core-content a:hover {
text-decoration: underline;
}
</style>
</head>
<body>
<div class="gs-core-content">
<h1>🌟 早柚核心 GsCore 🌟</h1>
<p>将 <strong>早柚核心</strong> 机器人接入到你的 <strong>koishi</strong> 中，享受智能化的聊天体验！</p>
<hr>
<p>📚 文档参考：</p>
<ul>
<li><a href="https://docs.sayu-bot.com/" target="_blank">早柚核心 文档</a></li>
<li><a href="https://github.com/TimeRainStarSky/Yunzai" target="_blank">TRSS云崽 文档</a></li>
</ul>
<hr>
<p>接入不同的机器人需要不同的配置，请根据实际情况修改配置项中的【后端请求】部分。</p>
<p>以下是几个框架的示例配置：</p>

<details>
<summary>🔧 点击此处 —— 查看 <strong>早柚核心</strong> 配置</summary>
<pre>
botId: QQ号即可
host: 一般本地搭建即为 localhost
port: 早柚默认端口 8765
wsPath: ws
</pre>
</details>

<details>
<summary>🔧 点击此处 —— 查看 <strong>TRSS云崽</strong> 配置</summary>
<pre>
botId: QQ即可
host: 一般本地搭建即为 localhost
port: 早柚默认端口 2536
wsPath: GSUIDCore
</pre>
</details>
</div>
</body>
</html>

`;
export const logger = new Logger(name);
export interface Config {
    isconsole: any;
    isWss: boolean;
    isHttps: boolean;
    botId: string;
    host: string;
    port: number;
    wsPath: string;
    dev: boolean;
    figureSupport: boolean;
    httpPath: string;
    imgType: 'image' | 'img';
    passive: boolean;
}

export const Config: Schema<Config> = Schema.intersect([
    Schema.object({
        isWss: Schema.boolean().default(false).description('是否使用wss'),
        isHttps: Schema.boolean().default(false).description('是否使用https'),
    }).description('请求设置'),
    Schema.object({
        isconsole: Schema.boolean().default(false).description('是否注册活动栏【早柚核心】`尤其多开插件时，建议关闭`'),
        botId: Schema.string().default('114514').description('机器人ID'),
        host: Schema.string().default('localhost').description('后端主机地址'),
        port: Schema.number().default(8765).description('端口'),
        wsPath: Schema.string().default('ws').description('ws路径'),
    }).description('后端设置'),
    Schema.object({
        httpPath: Schema.string().default('genshinuid').description('http路径'),
        figureSupport: Schema.boolean()
            .description('兼容项：是否支持合并转发，如果当前适配器不支持，请切换为FALSE')
            .default(true),
        imgType: Schema.union(['image', 'img'])
            .description('兼容项：图片消息元素类型，新版本使用img，旧版本使用image')
            .default('img'),
        passive: Schema.boolean().description('兼容项：passive消息元素包裹，用于获取消息上下文').default(true),
    }).description('高级设置'),
    Schema.object({
        dev: Schema.boolean().description('调试输出').default(false),
    }).description('调试设置')
]);

export function apply(ctx: Context, config: Config) {
    class GSCOREProvider extends DataService<string[]> {
        constructor(ctx: Context) {
            super(ctx, 'gscore-custom');
        }

        async get() {
            return [config.host, config.port.toString(), config.isHttps ? 'https:' : 'http:', config.httpPath];
        }
    }
    ctx.plugin(GSCOREProvider);
    if (config.isconsole) {
        ctx.inject(['console'], (ctx) => {
            ctx.console.addEntry({
                dev: resolve(__dirname, '../client/index.ts'),
                prod: resolve(__dirname, '../dist'),
            });
        });
    }
    const client = new GsuidCoreClient();
    createCustomFile(ctx);
    ctx.on('ready', () => {
        client.createWs(ctx, config);
    });
    ctx.on('message', (session) => {
        if (config.dev) {
            session.elements.forEach(logger.info);
            //logger.info(session);
        }
        genToCoreMessage(session, ctx).then((message) => {
            client.ws.send(Buffer.from(JSON.stringify(message)));
            if (message.msg_id) {
                new SessionEventManager(session, message.msg_id, 120000, config);
            }
        });
    });
    ctx.on('dispose', () => {
        // 在插件停用时关闭端口
        client.isDispose = true;
        client.ws.close();
    });
}
