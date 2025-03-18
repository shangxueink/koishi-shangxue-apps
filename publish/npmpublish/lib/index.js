"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.usage = exports.inject = exports.name = void 0;
const { Schema, h } = require("koishi");

exports.reusable = true;
exports.inject = ["http"];
exports.usage = `

---

本项目可以实现官方机器人无前缀触发，实现 “伪主动” 效果

---

使用条件：
- 在当前实例下，同时使用 adapter-onebot 和 adapter-qq 接入机器人。

- 在开启本插件之前，两个机器人都必须可以各自响应消息，确保有响应。

- 两个机器人必须同时存在同一QQ群组。

---

此项目并不能帮助你的官方机器人增长DAU，任何交互都不会记作有效DAU

也不能让你的官方机器人绕过发送内容的限制，任何情况都不能发链接等内容

。。。


所以，只是，好玩而已

---



此项目具有时效性，如果你发现此项目无法使用了，那么说明已经玩不了咯~


使用的API来自： http://callback.elaina.vin

API 交流群：1033218561


`;
exports.name = "qq-onebot";
exports.Config = Schema.intersect([
    Schema.object({
        table2: Schema.array(Schema.object({
            qqappid: Schema.string().description('官方机器人的appid'),
            qqid: Schema.string().description('官方机器人的QQ号'),
            channelId: Schema.string().description('群组ID（QQ群号）'),
        })).role('table').description('应用的群组'),
    }).description('基础配置'),

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

    let cacheContent;
    let cache2Content;

    ctx.middleware(async (session, next) => {
        // logInfo(session);
        if (session.platform === "onebot") {
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
            session.content = ""; // 清空发送内容

            try {
                const callbackAPI = `http://callback.elaina.vin/?appid=${appConfig.qqappid}&group=${channelId}`;
                const data = await ctx.http.get(callbackAPI);

                // 检查 API 返回的字符串是否包含“执行结果：真”
                if (data.includes("执行结果：真")) {
                    //logInfo(`[API请求成功] 频道：${channelId} 内容准备发送：${cache2Content}`);
                } else {
                    ctx.logger.info(`[API请求失败] 频道：${channelId}`);
                }
            } catch (error) {
                ctx.logger.info(`[请求错误] 频道：${channelId} 错误：${error}`);
            }
        }
    });

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

    ctx.on("interaction/button", async session => {
        // 解码 HTML 实体
        cache2Content = decodeHTMLEntities(cache2Content);

        // 正则表达式匹配 <at id="字符串" name="用户昵称"/> 或 <at id="字符串"/>
        const atRegex = /<at id="(\d+)"(?: name="([^"]*)")?\s*\/>/g;

        // 替换成 @用户昵称 或 @id
        cache2Content = cache2Content.replace(atRegex, (match, id, name) => {
            return `@${name || id}`;
        });

        logInfo(cache2Content);

        if (cache2Content.trim().length > 0) {
            await session.send(cache2Content); // 发送缓存的内容
            cache2Content = "";
        }
    });


}

exports.apply = apply;
