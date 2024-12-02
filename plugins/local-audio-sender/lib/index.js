"use strict";
const { Schema, Logger, h } = require("koishi");
const fs = require("fs").promises;
const path = require("path");

exports.name = 'local-audio-sender';
exports.usage = `
通过指令进行语音发送

支持本地文件夹的搜索语音（基于文件名）

---

filepath 处可以填入的内容有：
- 文件夹绝对路径（该文件夹下有音频文件）
- 音频文件绝对路径
- TXT文件绝对路径（每一行都是网络URL 或者 本地音频文件的绝对路径（不带file:///））
- 网络URL（音频直链）

---
<code>

本插件默认提供了一些其他地址的音频内容

在此鸣谢 
- https://github.com/MIKUKANO/yunzai--js/tree/main/
- https://www.gamekee.com/ba/

</code>
`;

// 配置定义
exports.Config = Schema.intersect([
    Schema.object({
        Fcommand: Schema.string().description('父级指令').default("local-audio-sender"),
        table2: Schema.array(Schema.object({
            command: Schema.string().description('指令名称'),
            filepath: Schema.string().description('资源地址'),
        })).role('table').description('子指令注册表').default(
            [
                {
                    "command": "语音网络URL示例",
                    "filepath": "https://cdnimg-v2.gamekee.com/wiki2.0/images/w_0/h_0/829/43637/2022/6/16/69231.wav"
                },
                {
                    "command": "atri",
                    "filepath": path.join(__dirname, '../txt/atri.txt')
                },
                {
                    "command": "泉奈",
                    "filepath": path.join(__dirname, '../txt/泉奈.txt')
                },
            ]
        ),
    }).description('基础配置'),
    Schema.object({        
        recursiveSearch: Schema.boolean().default(false).description("本地文件夹递归搜索（搜索该文件夹下的所有子文件夹）").experimental(),
        fuzzyMatch: Schema.boolean().default(true).description("本地文件夹音频文件名称模糊匹配<br>若匹配到多个结果 会随机从中选一个").experimental(),
        enableLogging: Schema.boolean().default(false).description("日志调试模式"),
    }).description('调试设置'),
]);

// 递归获取文件
async function getFilesRecursively(dir) {
    let files = [];
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            files = files.concat(await getFilesRecursively(fullPath));
        } else {
            files.push(fullPath);
        }
    }
    return files;
}

// 获取文件列表
async function getFileList(filepath, recursiveSearch) {
    if (filepath.startsWith('http')) {
        // 如果是 URL，直接返回
        return [filepath];
    }
    const stats = await fs.stat(filepath);
    if (stats.isDirectory()) {
        return recursiveSearch ? await getFilesRecursively(filepath) : await fs.readdir(filepath).then(files => files.map(file => path.join(filepath, file)));
    }
    if (stats.isFile()) {
        const ext = path.extname(filepath).toLowerCase();
        if (ext === '.txt') {
            const content = await fs.readFile(filepath, 'utf-8');
            return content.split('\n').map(line => line.trim()).filter(line => line);
        } else {
            return [filepath];
        }
    }
    return [];
}

// 应用插件
function apply(ctx, config) {
    const loggerinfo = (message) => {
        if (config.enableLogging) {
            ctx.logger.info(message);
        }
    };

    ctx.command(`${config.Fcommand}`, '发送指定或随机音频文件');

    config.table2.forEach(entry => {
        ctx.command(`${config.Fcommand}/${entry.command} [filename]`, '发送指定或随机音频文件')
            .action(async ({ session }, filename) => {
                try {
                    const files = await getFileList(entry.filepath, config.recursiveSearch);
                    let targetFile;

                    if (filename) {
                        let matchedFiles;
                        if (config.fuzzyMatch) {
                            // 模糊匹配
                            matchedFiles = files.filter(file => path.basename(file, path.extname(file)).includes(filename));
                        } else {
                            // 精确匹配
                            matchedFiles = files.filter(file => path.basename(file, path.extname(file)) === filename);
                        }

                        if (matchedFiles.length > 0) {
                            targetFile = matchedFiles[Math.floor(Math.random() * matchedFiles.length)];
                        }
                    } else {
                        // 随机选择
                        targetFile = files[Math.floor(Math.random() * files.length)];
                    }

                    if (targetFile) {
                        if (targetFile.startsWith('http')) {
                            await session.send(h.audio(targetFile));
                        } else {
                            await session.send(h.audio(`file:///${targetFile}`));
                        }
                        loggerinfo(`发送文件: ${targetFile}`);
                    } else {
                        await session.send('未找到匹配的音频文件。');
                    }
                } catch (e) {
                    ctx.logger.warn("发送失败：" + e.stack);
                    await session.send('发送音频文件时出现错误。');
                }
            });
    });
}

exports.apply = apply;
