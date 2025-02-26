"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.usage = exports.inject = exports.name = void 0;
const { Schema, Logger, h } = require("koishi");
const fs = require('fs');
const path = require('path');
exports.name = "qq-markdown-button";
exports.reusable = true; // 声明此插件可重用
exports.inject = [];
exports.inject = {
    // required: [''],
    optional: ["database"]
};
exports.usage = `
---
本插件可帮助你自定义QQ官方机器人按钮菜单，支持以下三种类型的菜单配置：
1. **JSON 按钮**：可以发送带有交互按钮的JSON消息。
2. **被动模板 Markdown**：适用于发送自定义的Markdown模板消息。
3. **原生 Markdown**：支持发送更复杂的原生Markdown消息。

### 如何配置
- 在左侧活动栏找到【资源管理器】->【data】->【qq-markdown-button】->【按钮菜单配置1】目录，在该目录下，你会看到对应的文件夹下有\`.md\` 和 \`.json\` 文件。
- 根据你选择的菜单类型，编辑对应的 \`.md\` 和 \`.json\` 文件，修改你的菜单配置。

### 关于变量替换
在配置文件（例如 \`.json\`）中，你可能会看到一些变量占位符，如：
- \`\${session.messageId}\`：运行时会替换为当前会话的消息ID。
- \`\${markdown}\`：会被替换为从对应 \`.md\` 文件读取的Markdown内容。

无需手动修改这些变量，它们将在运行时自动替换为相应的真实值。

支持重用，你可以开多个这个插件，然后改成不同的指令名称/文件夹名称，以注册多个按钮菜单功能

本插件会自动使用对应的文件夹下的 json / markdown 文件来发送消息<br>使用多重配置时，你通常只需要修改 \`按钮菜单配置1\` 那一行

不要手动重命名 json/md文件！

---

赶快选择你需要的配置，开始自定义你的菜单吧！

`;

exports.Config = Schema.intersect([
    Schema.object({
        command_name: Schema.string().default('按钮菜单').description('注册的指令名称'),
        markdown_id: Schema.string().default('123456789_1234567890').description('markdown模板的ID'),
        json_button_id: Schema.string().default('123456789_1234567890').description('按钮模板的ID'),
    }).description('基础设置'),

    Schema.object({
        file_name: Schema.array(String).role('table').description('存储文件的文件夹名称<br>请依次填写 相对于`koishi根目录`的 **文件夹** 路径<br>本插件会自动使用对应的文件夹下的 json / markdown 文件来发送消息<br>使用多重配置时，你通常只需要修改 `按钮菜单配置1` 那一行')
            .default([
                "data",
                "qq-markdown-button",
                "按钮菜单配置1"
            ]),
        type_switch: Schema.union([
            Schema.const('json').description('json按钮（./json/json.json）'),
            Schema.const('markdown').description('被动md，模板md（./markdown/markdown.json）'),
            Schema.const('raw').description('原生md（./raw/raw_markdown.json 、 ./raw/raw_markdown.md）'),
        ]).role('radio').description('选择菜单发送方式。<br>即 使用的json文件'),
    }).description('发送设置'),

    Schema.object({
        Allow_INTERACTION_CREATE: Schema.boolean().default(false).description("是否自动执行所有回调按钮内容（通过`session.execute`）"),
    }).description('高级设置'),

    Schema.object({
        broadcast: Schema.boolean().default(false).description("是否遍历数据库qq平台的`群组` 以实现广播推送主动消息 `谨慎开启！`"),
        consoleinfo: Schema.boolean().default(false).description("日志调试模式`日常使用无需开启`"),
    }).description('调试设置'),
])

function apply(ctx, config) {
    ctx.on('ready', () => {

        // 使用配置项中的 file_name 数组构建 baseDir 路径
        const baseDirArray = [ctx.baseDir].concat(config.file_name);
        const baseDir = path.join(...baseDirArray);

        // 确保目录存在，如果不存在则创建 (包括子目录)
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }

        const filesToCopy = {
            json: ['json.json'],
            markdown: ['markdown.json'],
            raw: ['raw_markdown.json', 'raw_markdown.md'],
        };

        // 复制文件到配置的目录下，并按照新的子目录结构存放
        for (const type in filesToCopy) {
            filesToCopy[type].forEach(file => {
                const srcPath = path.join(__dirname, 'qq', type, file); // 源文件路径，根据新的目录结构调整
                const destPath = path.join(baseDir, type, file);       // 目标文件路径，保持新的目录结构

                // 确保目标目录存在
                const destDir = path.dirname(destPath);
                if (!fs.existsSync(destDir)) {
                    fs.mkdirSync(destDir, { recursive: true });
                }
                if (!fs.existsSync(destPath)) {
                    fs.copyFileSync(srcPath, destPath);
                }
            });
        }

        if (config.Allow_INTERACTION_CREATE) {
            ctx.on("interaction/button", async session => {
                const buttoncontent = session?.event?.button['data'];
                if (buttoncontent) {
                    logInfo(`接收到回调按钮内容：---------------------------------------------------------------------------------------------------------------\n${buttoncontent}`)
                    logInfo(session?.event)
                    logInfo("----------------------------------------------------------------------------------------------------------------")
                    await session.execute(`${buttoncontent}`)
                    return
                }
            })
        }

        ctx.command(`${config.command_name}`, '发送按钮菜单')
            .action(async ({ session }) => {
                logInfo(session.platform)
                if (!(session.platform === "qq" || session.platform === "qqguild")) {
                    await session.send(`仅支持QQ官方平台使用本指令。`)
                    return;
                }
                const type = config.type_switch;
                let INTERACTION_CREATE = session.event._data.id
                let Menu_message;
                try {
                    let jsonFilePath, mdFilePath;

                    if (type === 'json') {
                        jsonFilePath = path.join(baseDir, 'json', 'json.json');
                        mdFilePath = null; // json 类型不需要 md 文件
                    } else if (type === 'markdown') {
                        jsonFilePath = path.join(baseDir, 'markdown', 'markdown.json');
                        mdFilePath = null; // 被动模板 md 类型也不需要额外的 md 文件，内容在 json 中
                    } else if (type === 'raw') {
                        jsonFilePath = path.join(baseDir, 'raw', 'raw_markdown.json');
                        mdFilePath = path.join(baseDir, 'raw', 'raw_markdown.md');
                    }

                    Menu_message = await processMarkdownCommand(jsonFilePath, mdFilePath, session, config, { INTERACTION_CREATE: INTERACTION_CREATE });

                    logInfo("完整的 Menu_message 内容为：");
                    logInfo(Menu_message);
                    if (!config.broadcast) {
                        await sendsomeMessage(Menu_message, session);
                    } else {
                        await sendbroadcastMessage(Menu_message, session);
                    }
                    if (INTERACTION_CREATE && config.Allow_INTERACTION_CREATE) {
                        logInfo(`正在执行 acknowledgeInteraction： ${INTERACTION_CREATE} `);
                        try {
                            await session.qq.acknowledgeInteraction(INTERACTION_CREATE);
                        } catch (error) {
                            ctx.logger.error(`执行 acknowledgeInteraction 时出错:`, error);
                        }
                    }
                } catch (error) {
                    ctx.logger.error(`处理命令时出错: ${error}`);
                }
            });

        function logInfo(message) {
            if (config.consoleinfo) {
                ctx.logger.info(message);
            }
        }

        async function sendbroadcastMessage(message, session) {
            try {
                // 获取所有 QQ 平台的群组列表
                const channels = await ctx.database.get('channel', {
                    platform: "qq",
                });

                if (!channels || channels.length === 0) {
                    logInfo("没有找到任何 QQ 群组频道，广播消息已取消。");
                    return;
                }

                logInfo(`开始向 ${channels.length} 个 QQ 群组频道广播消息...`);

                // 遍历群组列表并发送消息
                for (const channel of channels) {
                    try {
                        const channelId = channel.id; // 从数据库记录中获取 channelId
                        if (channelId) {
                            logInfo(`正在向群组频道 ${channelId} 发送广播消息...`);
                            if (session.qq) {
                                await session.qq.sendMessage(channelId, message);
                            } else if (session.qqguild) {
                                await session.qqguild.sendMessage(channelId, message); // 理论上广播到群组应该用 session.qq
                            }
                            logInfo(`已向群组频道 ${channelId} 发送广播消息。`);
                        } else {
                            logInfo(`群组频道记录 ${channel} 缺少 channelId，跳过发送。`);
                        }
                    } catch (error) {
                        ctx.logger.error(`向群组频道 ${channel.id} 广播消息时出错:`, error);
                        // 出错了也继续广播
                    }
                }

                logInfo("QQ 群组频道广播消息发送完成。");

            } catch (error) {
                ctx.logger.error(`获取 QQ 群组频道列表或广播消息时出错:`, error);
            }
        }



        async function sendsomeMessage(message, session) {
            try {
                const { guild, user } = session.event;
                const { qq, qqguild, channelId } = session;

                if (guild?.id) {
                    if (qq) {
                        await qq.sendMessage(channelId, message);
                    } else if (qqguild) {
                        await qqguild.sendMessage(channelId, message);
                    }
                } else if (user?.id && qq) {
                    await qq.sendPrivateMessage(user.id, message);
                }
            } catch (error) {
                ctx.logger.error(`发送markdown消息时出错:`, error);
            }
        }

        function processMarkdownCommand(jsonFilePath, mdFilePath, session, config, variables = {}) {
            try {
                const rawJsonData = fs.readFileSync(jsonFilePath, 'utf-8');
                let markdownContent = mdFilePath ? fs.readFileSync(mdFilePath, 'utf-8') : '';

                const allVariables = {
                    ...variables,
                    session,
                    config
                };
                const replacePlaceholders = (data) => {
                    if (typeof data === 'string') {
                        return data.replace(/\$\{([^}]+)\}/g, (_, key) => {
                            const keys = key.split('.').reduce((prev, curr) => prev && prev[curr], allVariables);
                            return keys !== undefined ? keys : `$\{${key}\}`;
                        });
                    } else if (Array.isArray(data)) {
                        return data.map(replacePlaceholders);
                    } else if (typeof data === 'object' && data !== null) {
                        return Object.fromEntries(
                            Object.entries(data).map(([k, v]) => [k, replacePlaceholders(v)])
                        );
                    }
                    return data;
                };

                markdownContent = replacePlaceholders(markdownContent).replace(/\n/g, '');

                allVariables.markdown = markdownContent;

                const rawJsonObject = JSON.parse(rawJsonData);
                const replacedJsonObject = replacePlaceholders(rawJsonObject);
                // 根据 session.messageId 是否存在，动态删除 JSON 对象中不需要的 ID 字段 
                if (session.messageId) {
                    if (replacedJsonObject.msg_id) { // 检查 msg_id 字段是否存在
                        // session.messageId 存在，删除 event_id
                        delete replacedJsonObject.event_id;
                    }
                } else {
                    if (replacedJsonObject.event_id) { // 检查 event_id 字段是否存在
                        // session.messageId 不存在，删除 msg_id
                        delete replacedJsonObject.msg_id;
                    }
                }
                return replacedJsonObject;
            } catch (error) {
                ctx.logger.error(`读取或解析文件时出错:`, error);
                return '处理文件时出错。';
            }
        }
    });
}
exports.apply = apply;