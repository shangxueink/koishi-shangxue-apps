"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = void 0;

const fs = require('node:fs');
const path = require('node:path');
const { Schema, Logger, h } = require("koishi");
exports.name = "tongue-twister-picker";
exports.usage = `
本插件只注册了一个指令 触发指令就会返回一个绕口令文本
`;
async function apply(ctx, config) {

    const filePath = path.join(__dirname, 'rao.json');
    let raoData;
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        raoData = JSON.parse(data);
    } catch (error) {
        ctx.logger.error('读取文件失败:', error);
        return;
    }

    const getRandomTongueTwister = (data) => data[Math.floor(Math.random() * data.length)];

    ctx.command('来个绕口令', '随机获取一条绕口令')
        .action(async ({ session }) => {
            const randomTongueTwister = getRandomTongueTwister(raoData);
            await session.send(h.text(`标题：${randomTongueTwister.title}\n内容：${randomTongueTwister.content}`))
            return;
        });

}

exports.apply = apply;
