"use strict";
const http = require('node:http');
const url = require('node:url');
const { Schema, Logger } = require("koishi");
const logger = new Logger('freexiaoxue-api');

exports.name = 'freexiaoxue-api';
exports.inject = {
    required: ['puppeteer']
};
exports.usage = `

本插件使用puppeteer对一些没有公开API的网页进行直接的请求。

本插件提供了一个指令和一个API来供其他插件调用AI进行对话。

默认端口为10721，接口为 http://127.0.0.1:10721?input=


---


目前感觉这个ai太笨了。。。不好玩
`;
exports.Config = Schema.object({
    port: Schema.number().default(10721).description("运行端口"),
    timeout: Schema.number().default(30).description("等待AI回复的超时时间"),
    Interface_Selection: Schema.union([
        Schema.const('geminiai4youtop').description('gemini'), // https://gemini.ai4you.top/  // 暂时只支持这一个模型
        //Schema.const('').description(''),
    ]).role('radio').description('选择使用的模型').default('geminiai4youtop'),
    loggerinfo: Schema.boolean().default(false).description("日志调试选项"),
}).description("基础设置");

function apply(ctx, config) {
    ctx.command('ai [text]', 'AI Chat')
        .example('ai Hello')
        .action(async ({ options, session }, text) => {
            if (!text) {
                return 'Please enter some text.';
            }
            const response = await getAIResponse(text);
            await session.send(response);
        });

    async function getAIResponse(input) {
        if (config.Interface_Selection === 'geminiai4youtop') {
            const page = await ctx.puppeteer.page();
            try {
                await page.goto('https://gemini.ai4you.top/', {
                    waitUntil: 'networkidle2'
                });
                await page.type('.gen-textarea', input);

                // 使用 page.evaluate 滚动到按钮
                await page.evaluate(() => {
                    const button = document.querySelector('button[gen-slate-btn=""]');
                    if (button) {
                        button.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                });

                // 检查按钮是否存在并可点击
                await page.waitForSelector('button[gen-slate-btn=""]', { visible: true });
                await page.click('button[gen-slate-btn=""]');

                await page.waitForSelector('.gpt-retry-btn span', { timeout: config.timeout * 1000 });

                const response = await page.evaluate(() => {
                    const responses = document.querySelectorAll('.message.prose.break-words.overflow-hidden');
                    return responses.length > 1 ? responses[1].innerText : '';
                });

                try {
                    await page.click('button[title="Clear"]');
                } catch (error) {
                    ctx.logger.error('Error during AI chat interaction:', error);
                }
                return response;
            } catch (error) {
                ctx.logger.error('Error during AI chat interaction:', error);
                return '';
            } finally {
                await page.close();
            }
        }
    }

    const server = http.createServer(async (req, res) => {
        const queryObject = url.parse(req.url, true).query;
        const input = queryObject.input;

        if (!input) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Please provide an input query parameter.');
            return;
        }

        try {
            const response = await getAIResponse(input);
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(response);
        } catch (error) {
            logger.error('Error processing request:', error);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
        }
    });

    server.listen(config.port, () => {
        console.log('Server running at http://127.0.0.1:10721/');
    });
}

exports.apply = apply;
