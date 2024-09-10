"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const koishi_1 = require("koishi");
const logger = new koishi_1.Logger('verse-match');
exports.name = 'verse-match';
exports.usage = 'verse-match <上联>';

async function apply(ctx) {
    ctx.command('verse-match <上联>')
        .alias('对对联')
        .action(async ({ session }, 上联) => {
            // 检查上联是否包含非中文字符
            if (!/^[\u4e00-\u9fa5\u3002\uff1f\uff01\uff0c\u3001\uff1b\uff1a\u201c\u201d\u2018\u2019\uff08\uff09\u300a\u300b]*$/.test(上联)) {
                await session.send('请不要输入英文或空格哦\~');
                return;
            }
            await session.send('正在对联中...');
            const primaryApiUrl = `https://ai-poet.com/?text=${encodeURIComponent(上联)}`;
            try {
                const response = await ctx.http.get(primaryApiUrl, { timeout: 30000 });           
                const 下联 = extractCouplet(response);
                if (下联) {
                    const responseText = `▲上联:${上联}\n================\n▼下联:${下联}\n`;
                    await session.send(responseText);
                } else {
                    await session.send('未能找到合适的下联。');
                }
            } catch (error) {
                await session.send('请求过程中发生错误，请稍后再试。');
                logger.error('请求过程中发生错误:', error);
            }
        });

    function extractCouplet(htmlContent) {
        const regex = /下联：(.+?)<\/p>/;
        const match = regex.exec(htmlContent);
        return match ? match[1].trim() : null;
    }
}

exports.apply = apply;
