"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.usage = exports.Config = exports.name = void 0;
const { Schema, Logger, h } = require("koishi");
const fetch = require('node-fetch');

exports.name = "aivideo-bigmodel";
const logger = new Logger("aivideo-bigmodel");
exports.usage = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ai视频生成插件使用说明</title>
</head>
<body>
<h2>使用方法</h2>
<ol>
<li>启动 Koishi 机器人。</li>
<li>在聊天中输入命令 <code>生成视频 [prompt]</code>，例如 <code>生成视频 开心开心一家人</code>。</li>
<li>机器人会提示 <code>请发送图片：</code>。</li>
<li>用户发送图片。</li>
<li>机器人会在 3~5 分钟内生成视频并发送给用户。</li>
</ol>

---

<h3>示例</h3>
<pre>
用户： 生成视频 开心开心一家人

机器人：请发送图片：

用户：[图片消息]

机器人：[视频消息]
</pre>

---

<h2>注意事项</h2>
<ul>
<li>生成一个视频大约需要 5 分钟左右，一般情况下 3~4 分钟。</li>
<li>请确保你的 API Key 有效并且具有足够的调用额度。</li>
</ul>

<h2>Key获取</h2>
<p>前往 <a href="https://bigmodel.cn/usercenter/apikeys" target="_blank">GLM开放平台 获取 API Key：</a></p>
<ol>
<li>使用手机号注册账号。</li>
<li>生成多个 API Key。</li>
<li>将生成的 API Key 填入配置文件中。</li>
</ol>
</body>
</html>
`;

const defaultApiKeys = [
    'a574b3cb15e2243a5e3a9519badc11e5.gcVnihU8WHDcmZo7',
    'd9ec49ec739ef56a909b0d5145721547.HhNbp9d1qsAnz9Jg',
    'a221d0fb8ae49cca6d4602efed10ac8c.dewjU1DX7V0QMrId',
];

exports.Config = Schema.object({
    apiKeys: Schema.array(String).role('table').default(defaultApiKeys),
    waitTime: Schema.number().role('slider').min(1).max(15).step(1).default(3).description('上传图片的最大时限（单位：分钟）'),
    loggerInfo: Schema.boolean().default(false).description('日志调试模式`用不了的时候可以开启看看`')
}).description('调试设置');

function apply(ctx, config) {
    const apiKeys = config.apiKeys;

    function logInfo(message) {
        if (config.loggerInfo) {
            logger.info(message);
        }
    }

    ctx.command('生成视频 [prompt:text]')
        .action(async ({ session }, prompt) => {
            if (!prompt) {
                await session.send('请输入预设词。例如【生成视频 开心开心】');
                return;
            }

            await session.send('请发送图片：');
            const timeout = config.waitTime * 60000; // 转换为毫秒
            const reply = await session.prompt(timeout);

            if (!reply) {
                await session.send('未收到图片，操作已取消。');
                return;
            }

            const elements = h.parse(reply);
            const imgElement = elements.find(element => element.type === 'image' || element.type === 'img');

            if (!imgElement) {
                await session.send('发送的不是图片。已取消操作。');
                return;
            }

            const imgUrl = imgElement.attrs.url || imgElement.attrs.src;
            logInfo(`收到的图片链接: ${imgUrl}`);
            await session.send("已经收到图片，请稍等5分钟~");
            try {
                const videoUrl = await generateVideo(prompt, imgUrl, apiKeys);
                await session.send(h.video(videoUrl));
            } catch (error) {
                logger.error("视频生成失败", error);
                await session.send("视频生成失败，请稍后再试。");
            }
        });

    function getNextApiKey(apiKeys) {
        const randomIndex = Math.floor(Math.random() * apiKeys.length);
        const apiKey = apiKeys[randomIndex];
        logInfo('负载均衡-散列-使用API key: ' + apiKey);
        return apiKey;
    }

    async function generateVideo(prompt, img, apiKeys) {
        const apiUrl = 'https://open.bigmodel.cn/api/paas/v4/videos/generations';
        logInfo(`传入的 prompt: ${prompt}`);
        logInfo(`传入的 img: ${img}`);

        const requestData = {
            model: 'cogvideox',
            prompt: prompt,
            image_url: img,
        };

        const apiKey = getNextApiKey(apiKeys);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestData)
        });

        const data = await response.json();
        logInfo('API 返回的数据: ' + JSON.stringify(data));

        if (!data || !data.id) {
            throw new Error('API 返回的数据格式不正确');
        }

        const taskId = data.id;
        const resultUrl = `https://open.bigmodel.cn/api/paas/v4/async-result/${taskId}`;

        logInfo(`使用 key: ${apiKey}`);
        logInfo(`视频 ${taskId} 渲染中`);

        return new Promise((resolve, reject) => {
            const interval = setInterval(async () => {
                try {
                    const resultResponse = await fetch(resultUrl, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    const resultData = await resultResponse.json();

                    if (resultData.task_status === 'SUCCESS') {
                        clearInterval(interval);
                        const videoResult = resultData.video_result[0];
                        logInfo('视频生成成功: ' + videoResult.url);
                        resolve(videoResult.url);
                    } else if (resultData.task_status === 'FAIL') {
                        clearInterval(interval);
                        reject('视频生成失败');
                    }
                } catch (error) {
                    clearInterval(interval);
                    reject(`查询失败: ${error}`);
                }
            }, 5000); // 轮询间隔
        });
    }
}

exports.apply = apply;
