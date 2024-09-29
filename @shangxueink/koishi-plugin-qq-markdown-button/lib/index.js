"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.usage = exports.inject = exports.name = void 0;
const koishi_1 = require("koishi");
const fs = require('fs');
const path = require('path');

exports.name = 'qq-markdown-button';
exports.inject = [];
exports.usage = `
---
本插件可帮助你自定义QQ官方机器人按钮菜单，支持以下三种类型的菜单配置：
1. **JSON 按钮**：可以发送带有交互按钮的JSON消息。
2. **被动模板 Markdown**：适用于发送自定义的Markdown模板消息。
3. **原生 Markdown**：支持发送更复杂的原生Markdown消息。

### 如何配置
- 在左侧活动栏找到【资源管理器】->【data】->【qq-markdown-button】->【qq】目录，在该目录下，你会看到\`.md\` 和 \`.json\` 文件。
- 根据你选择的菜单类型，编辑对应的 \`.md\` 和 \`.json\` 文件，修改你的菜单配置。

### 关于变量替换
在配置文件（例如 \`.json\`）中，你可能会看到一些变量占位符，如：
- \`\${session.messageId}\`：运行时会替换为当前会话的消息ID。
- \`\${markdown}\`：会被替换为从对应 \`.md\` 文件读取的Markdown内容。

无需手动修改这些变量，它们将在运行时自动替换为相应的真实值。

---
赶快选择你需要的配置，开始自定义你的菜单吧！
`;

exports.Config = koishi_1.Schema.object({
    type_switch: koishi_1.Schema.union([
        koishi_1.Schema.const('json').description('json按钮'),
        koishi_1.Schema.const('markdown').description('被动md，模板md'),
        koishi_1.Schema.const('RAW_markdown').description('原生md'),
    ]).role('radio').description('选择菜单发送方式'),
    //------------------------------------json按钮配置项------------------------------------------------------
    json_setting: koishi_1.Schema.object({
        json_button_id: koishi_1.Schema.string().description('json模板的ID').pattern(/^\d+_\d+$/), // 102069859_1725953918
        json_json: koishi_1.Schema.path({
            filters: ['.json', '.JSON'],
        }).description('JSON JSON 文件路径').default(path.join(__dirname, 'qq/json.json')),
    }).collapse().description('json按钮菜单'),
    //------------------------------------被动md模板配置项------------------------------------------------------
    markdown_setting: koishi_1.Schema.object({
        markdown_id: koishi_1.Schema.string().description('MarkDown模板的ID').pattern(/^\d+_\d+$/),
        markdown_json: koishi_1.Schema.path({
            filters: ['.json', '.JSON'],
        }).description('Markdown JSON 文件路径').default(path.join(__dirname, 'qq/markdown.json')),
    }).collapse().description('被动模板md菜单'),
    //------------------------------------原生md配置项------------------------------------------------------
    RAW_MD_setting: koishi_1.Schema.object({
        RAW_markdown_json: koishi_1.Schema.path({
            filters: ['.json', '.JSON'],
        }).description('原生 Markdown JSON 文件路径').default(path.join(__dirname, 'qq/raw_markdown.json')),
        RAW_markdown_md: koishi_1.Schema.path({
            filters: ['.md', '.JSON'],
        }).description('原生 Markdown MD 文件路径').default(path.join(__dirname, 'qq/raw_markdown.md')),
    }).collapse().description('原生md菜单'),
    consoleinfo: koishi_1.Schema.boolean().default(false).description("日志调试模式`日常使用无需开启`"),
}).description('QQ官方bot设置');

function apply(ctx, config) {
    // 初始化时自动复制文件到 ctx.baseDir 下
    const baseDir = path.join(ctx.baseDir, 'data/qq-markdown-button/qq');
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }

    // 复制文件
    ['markdown.json', 'json.json', 'raw_markdown.json', 'raw_markdown.md'].forEach((file) => {
        const srcPath = path.join(__dirname, `qq/${file}`);
        const destPath = path.join(baseDir, file);
        if (!fs.existsSync(destPath)) {
            fs.copyFileSync(srcPath, destPath);
        }
    });

    // 定义命令
    ctx.command('markdown-button', '发送Markdown或JSON按钮菜单')
        .alias('按钮菜单')
        .action(async ({ session }) => {
            const type = config.type_switch;
            let Menu_message;

            try {
                if (type === 'json') {
                    Menu_message = processMarkdownCommand(path.join(baseDir, 'json.json'), null, session, config);
                } else if (type === 'markdown') {
                    Menu_message = processMarkdownCommand(path.join(baseDir, 'markdown.json'), null, session, config);
                } else {
                    Menu_message = processMarkdownCommand(path.join(baseDir, 'raw_markdown.json'), path.join(baseDir, 'raw_markdown.md'), session, config);
                }

                logInfomessage(Menu_message);
                await sendsomeMessage(Menu_message, session, ctx);

            } catch (error) {
                ctx.logger.error(`处理命令时出错: ${error}`);
            }

            async function sendsomeMessage(message, session, ctx) {
                try {
                    if (session.event.guild?.id) {
                        await session.qq.sendMessage(session.channelId, message);
                    } else {
                        await session.qq.sendPrivateMessage(session.event.user?.id, message);
                    }
                } catch (error) {
                    ctx.logger.error(`发送消息时出错: ${error}`);
                }
            }

            function logInfomessage(message) {
                if (config.consoleinfo) {
                    ctx.logger.info(message);
                }
            }

            function processMarkdownCommand(jsonFilePath, mdFilePath, session, config, variables = {}) {
                try {
                    const rawJsonData = fs.readFileSync(jsonFilePath, 'utf-8');
                    const markdownContent = mdFilePath ? fs.readFileSync(mdFilePath, 'utf-8').replace(/\n/g, '') : '';

                    const allVariables = {
                        ...variables,
                        session,
                        config,
                        markdown: markdownContent
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

                    const rawJsonObject = JSON.parse(rawJsonData);
                    const replacedJsonObject = replacePlaceholders(rawJsonObject);

                    return replacedJsonObject;
                } catch (error) {
                    ctx.logger.error(`读取或解析Markdown文件时出错: ${error}`);
                    return '处理Markdown时出错。';
                }
            }
        });
}
exports.apply = apply;
