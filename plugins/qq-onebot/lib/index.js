"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.usage = exports.inject = exports.name = void 0;
const { Schema, h } = require("koishi");

exports.reusable = true;
exports.inject = ["http"];
exports.usage = `

---

本项目可以实现官方机器人无前缀触发，实现 “伪主动” 效果。

模式一，可由一个官方bot工作，广播消息。

模式二，需要官方+野生，实现监听触发+伪主动

---

使用条件：
<details>
<summary>模式一</summary>
    
- 在当前实例下，使用 adapter-qq 接入机器人。

- 在开启本插件之前，确保官方机器人已经可以各自响应消息，确保有响应。

- 配置table1配置项，并且触发指令<code>开始广播table</code>。
</details>

<details>
<summary>模式二</summary>
    
- 在当前实例下，同时使用 adapter-onebot 和 adapter-qq 接入机器人。

- 在开启本插件之前，两个机器人都必须可以各自响应消息，确保有响应。

- 两个机器人必须同时存在同一QQ群组。

- 配置table2配置项。
</details>

---

此项目并不能帮助你的官方机器人增长dau，任何交互都不会记作有效dau

也不能让你的官方机器人绕过发送内容的限制，任何情况都不能发链接等内容

。。。


所以，只是，好玩而已

---

此项目仅为个人爱好，仅供学习交流使用呢

此项目具有时效性，如果你发现此项目无法使用了，那么说明已经玩不了咯~


`;
exports.name = "qq-onebot";
exports.Config = Schema.intersect([

    Schema.object({
        enabletable: Schema.union([
            Schema.const('table1').description('模式 1 - 广播消息（触发指令后开始广播）'),
            Schema.const('table2').description('模式 2 - 伪主动'),
        ]).role('radio').description("工作模式选择。").default("table2"),
    }).description('基础配置'),
    Schema.union([
        Schema.object({
            enabletable: Schema.const("table1").required(),
            table1command: Schema.string().default("开始发广播").description("启动广播发消息的指令"),
            table1: Schema.array(Schema.object({
                qqappid: Schema.string().description('官方机器人appid'),
                channelId: Schema.string().description('群组ID（真实QQ群号）'),
            })).role('table').description('应用的群组'),
            broadcastcontent: Schema.string().description('广播内容 (元素消息)').role('textarea', { rows: [4, 4] }).default("你好  <img src=\"https://koishi.chat/logo.png\">"),
        }),
        Schema.object({
            enabletable: Schema.const("table2"),
            table2: Schema.array(Schema.object({
                qqappid: Schema.string().description('官方机器人appid'),
                qqid: Schema.string().description('官方机器人的QQ号'),
                channelId: Schema.string().description('群组ID（真实QQ群号）'),
            })).role('table').description('应用的群组'),
        }),
    ]),

    Schema.object({
        APIused: Schema.union([
            Schema.const('callback.elaina.vin').description('callback.elaina.vin'),
            Schema.const('tsyfun.eu.org').description('tsyfun.eu.org'),
            Schema.const('custom').description('自定义后端'),
        ]).role('radio').description("使用的API后端").default("tsyfun.eu.org"),
    }).description('API配置'),
    Schema.union([
        Schema.object({
            APIused: Schema.const("custom").required(),
            APIusedarea: Schema.string().role('textarea', { rows: [2, 4] }).description("自定义API地址<br>需要使用`${appConfig.qqappid}`和`${channelId}`变量替换，消息内容使用`${msg}`").default("http://callback.elaina.vin/?appid=${appConfig.qqappid}&group=${channelId}"),
        }),
        Schema.object({
        }),
    ]),

    Schema.object({
        enable_logger: Schema.boolean().default(false).description("日志调试模式"),
    }).description('调试设置'),
]);

function apply(ctx, config) {

    function logInfo(message) {
        if (config.enable_logger) {
            ctx.logger.info(message);
        }
    }

    let cache2Content;

    if (config.enabletable === "table1") {
        const { table1, broadcastcontent } = config;
        let currentIndex = 0;
        let isBroadcastingCycleActive = false;
        let currentChannelId = null; // 当前正在处理的频道ID
        let isWaitingForResponse = false; // 是否在等待按钮响应

        // 构建API地址函数
        function buildAPIUrl(qqappid, channelId) {
            if (config.APIused === "callback.elaina.vin") {
                return `http://callback.elaina.vin/?appid=${qqappid}&group=${channelId}`;
            } else if (config.APIused === "tsyfun.eu.org") {
                return `https://tsyfun.eu.org/callback?appid=${qqappid}&group=${channelId}`;
            } else if (config.APIused === "custom") {
                return config.APIusedarea
                    .replace(/\${appConfig.qqappid}/g, qqappid)
                    .replace(/\${channelId}/g, channelId)
                    .replace(/\${msg}/g, '');
            }
        }

        async function sendBroadcastMessage(item) {
            const { qqappid, channelId } = item;

            try {
                logInfo(`[Table1] 准备发送到频道 ${channelId}`);
                const callbackAPI = buildAPIUrl(qqappid, channelId);
                logInfo(`[Table1] 发送API请求到频道 ${channelId}: ${callbackAPI}`);
                const data = await ctx.http.get(callbackAPI);
                logInfo(`[Table1] API 响应: ${data}`);

                if (data.includes("执行结果")) {
                    logInfo(`[Table1] API请求成功，等待消息发送: ${channelId}`);
                    currentChannelId = channelId;
                    isWaitingForResponse = true;
                    return true; // API 请求成功
                } else {
                    ctx.logger.error(`[Table1] API请求失败，频道: ${channelId}`);
                    return false;
                }
            } catch (error) {
                ctx.logger.error(`[Table1] 请求错误，频道: ${channelId}, 错误: ${error}`);
                return false;
            }
        }

        // 监听按钮交互事件
        ctx.on("interaction/button", async session => {

            logInfo("收到回调按钮消息！");

            try {
                // 确保 broadcastcontent 有值
                if (broadcastcontent) {
                    let contentToSend = broadcastcontent;

                    logInfo(`准备发送的内容：${contentToSend}`);

                    const messageIdsended = await session.send(contentToSend);
                    if (messageIdsended) {
                        logInfo(`[Table1] 消息发送成功到频道: ${session.channelId}`);
                    } else {
                        ctx.logger.error(`[Table1] 消息发送失败到频道: ${session.channelId}`);
                    }
                } else {
                    logInfo("[Table1] broadcastcontent 为空，无法发送消息。");
                }
            } catch (error) {
                ctx.logger.error(`[Table1] 消息发送异常: ${error}`);
            } finally {
                // 清理状态
                isWaitingForResponse = false;
                currentChannelId = null;

                // 继续下一个频道
                await processNextBroadcast();
            }
        });

        async function processNextBroadcast() {
            if (!isBroadcastingCycleActive || !table1?.length) return;

            if (currentIndex >= table1.length) {
                logInfo("[Table1] 完成一轮广播。");
                isBroadcastingCycleActive = false;
                return;
            }

            const item = table1[currentIndex];
            currentIndex++; // 先递增索引，避免重试时重复处理
            const success = await sendBroadcastMessage(item);

            if (!success) {
                logInfo(`[Table1] 向频道 ${item.channelId} 广播失败，继续下一个频道.`);
                if (table1.length <= 1) {
                    logInfo(`[Table1] 只有一个频道，广播流程结束.`);
                    isBroadcastingCycleActive = false;
                    return;
                }
                // 失败后继续下一个，不等待冷却
                await processNextBroadcast();
            }
            // 成功的会在按钮响应后继续
        }

        async function startBroadcasting() {
            if (isBroadcastingCycleActive) {
                logInfo("[Table1] 广播周期已在运行，请等待当前周期完成。");
                return;
            }
            if (!table1 || table1.length === 0) {
                logInfo("[Table1] 没有配置广播群组，无法启动广播。");
                return;
            }

            logInfo("[Table1] 开始广播周期...");
            isBroadcastingCycleActive = true;
            currentIndex = 0;
            isWaitingForResponse = false;
            currentChannelId = null;
            await processNextBroadcast();
        }

        ctx.command(`${config.table1command}`)
            .action(async ({ session }) => {
                await startBroadcasting();
                return '开始执行 Table1 广播流程。';
            });
    }

    if (config.enabletable === "table2") {
        let cacheContent;


        function decodeHTMLEntities(text) {
            const entities = {
                '&lt;': '<',
                '&gt;': '>',
                '&amp;': '&',
                '&quot;': '"',
                '&#39;': "'"
            };
            return text.replace(/&lt;|&gt;|&amp;|&quot;|&#39;/g, match => entities[match]);
        }


        ctx.middleware(async (session, next) => {
            // logInfo(session);
            if (session.platform === "onebot") {
                logInfo(session.content)
                const appConfig = config.table2.find(item => item.channelId === session.channelId);
                // 忽略来自配置中 qqid 的消息
                if (appConfig && session.userId === appConfig.qqid) {
                    return; // 屏蔽消息
                }
            } else if (session.platform === "qq") {
                return; // 屏蔽消息接收
            }
            return next(); // 正常通过
        }, true);

        ctx.before('send', async (session, options) => {
            const { channelId } = session;
            const appConfig = config.table2.find(item => item.channelId === channelId);

            if (!appConfig) {
                return; // 如果没有匹配的配置，直接返回
            }

            cacheContent = session.content.trim(); // 缓存内容
            if (cacheContent.length > 0) {
                //logInfo(`[收到消息] 频道：${channelId} 内容：${cacheContent}`);
                cache2Content = cacheContent;

                logInfo(`onebot想发送的内容：${session.content}`)
                session.content = ""; // 清空发送内容
                logInfo(`onebot想发送的内容(已经清空)：${session.content}`)
                let callbackAPI
                if (config.APIused === "callback.elaina.vin") {
                    callbackAPI = `http://callback.elaina.vin/?appid=${appConfig.qqappid}&group=${channelId}`;
                } else if (config.APIused === "tsyfun.eu.org") {
                    callbackAPI = `https://tsyfun.eu.org/callback?appid=${appConfig.qqappid}&group=${channelId}&msg=`;
                } else if (config.APIused === "custom") {
                    // 使用用户自定义的 API 地址，并替换变量
                    callbackAPI = config.APIusedarea
                        .replace(/\${appConfig.qqappid}/g, appConfig.qqappid)
                        .replace(/\${channelId}/g, channelId)
                        .replace(/\${msg}/g, encodeURIComponent(cacheContent)); // 消息内容需要进行URI编码
                }
                logInfo(`使用的API：${callbackAPI}`)
                try {
                    const data = await ctx.http.get(callbackAPI);
                    logInfo(data)
                    // 检查 API 返回的字符串是否包含“执行结果”
                    if (data.includes("执行结果")) {
                        logInfo(`[API请求成功] 频道：${channelId} 内容准备发送：${cache2Content}`);
                    } else {
                        ctx.logger.info(`[API请求失败] 频道：${channelId}`);
                    }
                } catch (error) {
                    ctx.logger.info(`[请求错误] 频道：${channelId} 错误：${error}`);
                }
            }
        });


        ctx.on("interaction/button", async session => {
            logInfo("收到回调按钮消息！");
            // 解码 HTML 实体
            cache2Content = decodeHTMLEntities(cache2Content);

            // 正则表达式匹配 <at id="字符串" name="用户昵称"/> 或 <at id="字符串"/>
            const atRegex = /<at id="(\d+)"(?: name="([^"]*)")?\s*\/>/g;

            if (cache2Content?.trim().length > 0) {
                // 替换成 @用户昵称 或 @id
                cache2Content = cache2Content.replace(atRegex, (match, id, name) => {
                    return `@${name || id}`;
                });
                cache2Content = cache2Content.replace("@@", "@")
                logInfo(`cache2Content内容为：${cache2Content}`);

                await session.send(cache2Content); // 发送缓存的内容
                cache2Content = "";
            }
        });
    }
}

exports.apply = apply;
