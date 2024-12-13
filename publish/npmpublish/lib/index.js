"use strict";
const http = require('node:http');
const url = require('node:url');
const { Schema, Logger } = require("koishi");
const logger = new Logger('freexiaoxue-api');

exports.name = 'freexiaoxue-api';
exports.inject = {
    optional: ['puppeteer']
};
exports.usage = `
本插件提供了一个指令和一个API地址来供其他插件调用AI进行对话。

默认端口为10721，接口为 http://0.0.0.0:10721?input=

响应内容为纯文本

---

<h2>免责声明</h2>
<ol>
  <li>本插件所使用的 API 是由第三方免费无偿提供的，我们对该 API 的稳定性、可靠性和安全性不做任何保证。</li>
  <li>使用本插件过程中产生的任何问题（包括但不限于数据丢失、服务中断等），我们不承担任何责任。</li>
  <li>用户在使用本插件时，应自行评估和承担使用该 API 所带来的风险。</li>
  <li>---最终解释权归本插件作者所有---</li>
  <li>开启本插件后自动视为同意使用以上协议，如果您不同意，请立即关闭并卸载本插件。</li>
</ol>

---

<h2>开发理念</h2>
<p>本插件秉持为用户提供便捷、免费服务的理念而开发。若您在使用过程中发现免费服务不能满足您的需求，欢迎选择付费服务。</p>
<p>我们推荐访问 <a href="https://api.bailili.top/" target="_blank">https://api.bailili.top/</a>，并结合 <code><a href="/market?keyword=chatluna-openai-like-adapter">chatluna-openai-like-adapter</a></code> 进行使用，以获得更优质的体验。（该站点开发者在chatluna群，出问题可以拷打）</p>

`;

exports.Config = Schema.object({
    port: Schema.number().default(10721).description("运行端口<br>`修改后 需要重启koishi 以生效`"),
    timeout: Schema.number().default(30).description("等待AI回复的超时时间<br>单位：秒"),
    Interface_Selection: Schema.union([
        Schema.const('geminiai4youtop').description('gemini').hidden(),
        Schema.const('aiSiliconFlow').description('AI聊天模型 免费模型'),
        Schema.const('4.0Ultra').description('星火4.0Ultra'),
        Schema.const('MoonshotAi').description('Moonshot AI'),
        Schema.const('generalv3.5').description('星火Max'),
        Schema.const('chat').description('ChatGPT-4o-mini'),
    ]).role('radio').description('选择使用的模型').default('chat'),
    loggerinfo: Schema.boolean().default(false).description("日志调试选项"),
}).description("基础设置");

function apply(ctx, config) {
    ctx.command('chatai [text]', 'AI Chat')
        .example('chatai Hello')
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

        } else {

            const prompt = encodeURIComponent(input);
            let requestUrl;

            switch (config.Interface_Selection) {
                case 'aiSiliconFlow':
                    requestUrl = `https://api.qster.top/API/v1/aiSiliconFlow/?msg=${prompt}`;
                    break;
                case '4.0Ultra':
                    requestUrl = `https://api.qster.top/API/v1/4.0Ultra/?msg=${prompt}`;
                    break;
                case 'MoonshotAi':
                    requestUrl = `https://api.qster.top/API/v1/MoonshotAi/?msg=${prompt}`;
                    break;
                case 'generalv3.5':
                    requestUrl = `https://api.qster.top/API/v1/generalv3.5/?msg=${prompt}`;
                    break;
                case 'chat':
                default:
                    requestUrl = `https://api.qster.top/API/v1/chat/?msg=${prompt}`;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), config.timeout * 1000);

            try {
                const response = await fetch(requestUrl, {
                    method: "GET",
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.statusText}`);
                }

                const data = await response.json();
                return parseResponseData(data, config.Interface_Selection);
            } catch (error) {
                logger.error('Error fetching data from API:', error);
                throw error;
            }
        }

    }

    function parseResponseData(data, model) {
        switch (model) {
            case 'aiSiliconFlow':
            case '4.0Ultra':
            case 'generalv3.5':
                return data.answer || '';
            case 'MoonshotAi':
                return data.msg || '';
            case 'chat':
            default:
                return data.choices[0]?.message?.content || '';
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

    server.listen(config.port, '0.0.0.0', () => {
        ctx.logger.info(`Server running at http://0.0.0.0:${config.port}/`);
    });
}

exports.apply = apply;
