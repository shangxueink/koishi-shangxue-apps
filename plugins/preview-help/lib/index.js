"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.usage = exports.inject = exports.name = void 0;
const fs = require('node:fs');
const url = require("node:url");
const path = require("node:path");
const { stat } = require('fs/promises');
const { Schema, Logger, h, noop } = require("koishi");

exports.reusable = true; // 声明此插件可重用
const name = 'preview-help';
const inject = {
    required: ['http', "i18n"],
    optional: ['console', "puppeteer", 'server'] // 增加 server
};
const logger = new Logger('preview-help');

const htmlPath = path.join(__dirname, '../help/index.html');
const usage = `
<h3>使用指南</h3>
<p><strong>推荐使用【渲染图片菜单】模式，

特别是【返回渲染图片菜单（自定义json配置）】模式，以获得最佳的展示效果和自定义能力。</strong></p>

<h4>🚀快速开始</h4>
<ol>
<li><strong>编辑菜单模板：</strong> 您可以在活动栏【帮助预览】页面编辑 HTML 模板，自定义菜单的样式和布局并且导出JSON配置文件以供本插件使用。</li>
<li><strong>配置插件：</strong> 在 Koishi 控制面板中配置 <code>preview-help</code> 插件，选择合适的菜单模式并根据需要进行其他配置。</li>
<li><strong>使用指令：</strong> 在 Koishi 中使用您配置的指令名称 (默认为 "帮助菜单") 即可查看预览的帮助菜单。</li>
</ol>

---

<p>推荐使用webUI交互生成你喜欢的菜单图片，并且导出JSON配置，用于配置本插件。</p>
<p>当然也可以把渲染好的菜单图片保存，使用本插件的图片返回功能等</p>

webUI 交互 请见 ➤ <a href="/help/index.html" target="_blank">/help/index.html</a>


---

<h4>⚙️高级设置</h4>
<p><strong>字体设置：</strong> 您可以在插件配置中启用自定义字体，并指定字体 URL。启用后，插件在渲染菜单时会尝试加载您提供的字体。</p>
<p><strong>缓存设置：</strong> 开启缓存功能后，对于配置和 help 菜单内容不变的情况，插件会直接使用缓存的 PNG 图片，提高响应速度。关闭缓存则每次调用都会重新渲染。</p>
<p><strong>调试日志：</strong> 开启日志调试开关后，插件会在控制台输出更详细的日志信息，用于问题排查。</p>


---

## <a href="/help/index.html" target="_blank">菜单 webUI 交互 请点击这里 ➤ /help/index.html</a>

或者本地文件地址：
<p>
  <a href="${htmlPath.replace(/\\/g, '/')} " target="_blank">${htmlPath.replace(/\\/g, '/')} </a>
</p>

<p>
  <button onclick="navigator.clipboard.writeText('${htmlPath.replace(/\\/g, '/')}')">点我复制文件地址</button>
</p>

`;

const Config = Schema.intersect([
    Schema.object({
        command: Schema.string().description('注册指令名称').default("帮助菜单"),
        rendering: Schema.union([
            Schema.const().description('unset').description("不返回提示语"),
            Schema.string().description('string').description("请在右侧修改提示语").default("正在生成帮助菜单，请稍候..."),
        ]).description("`菜单渲染中`提示语"),
        helpmode: Schema.union([
            Schema.const('1.1').description('返回文字菜单'),
            Schema.const('1.2').description('返回图片菜单'),
            Schema.const('2.1').description('返回渲染图片菜单（自动从help指令获取）'),
            Schema.const('2.2').description('返回渲染图片菜单（手动输入help文字菜单）'),
            Schema.const('3').description('返回渲染图片菜单（自定义json配置） '),
        ]).role('radio').default('2.1').description('菜单返回模式<br>`自动获取的help菜单可能会与预设模版不吻合`<br>推荐前往webUI手动编辑后导出json文件使用'),
    }).description('基础配置'),
    Schema.union([
        Schema.object({
            helpmode: Schema.const("1.1").required(),
            help_text: Schema.string().default("当前可用的指令有：\n    /chatluna  ChatLuna 相关指令。\n    /glot  运行代码\n    /group-manage  群组管理\n    /help  显示帮助信息\n    /inspect  查看用户、频道或消息的详细信息\n    /lunavits  lunavits 语音合成\n    /market  插件市场信息\n    /musicjs  用 JavaScript 代码演奏旋律\n    /osu-funny  一些有趣的 osu! 功能\n    /ping  ping指定的ip或域名\n    /plugin  插件管理\n    /propose  向群友求婚\n    /rryth-test  人人有图画测试服 v0.0.7\n    /sayo-roll  随机选择\n    /shot  网页截图\n    /status  查看运行状态\n    /status-image  查看运行状态\n    /timer  定时器信息\n    /translate  文本翻译\n    /usage  调用次数信息\n    /waifu  娶群友\n    /wh-sub  订阅Github事件推送\n    /wh-unsub  取消Github事件推送\n    /钓鱼  \n    /鹿管签到  鹿管签到\n输入“/help 指令名”查看特定指令的语法和使用示例。")
                .role('textarea', { rows: [8, 8] }).description('返回的文字菜单内容<br>每行格式: `指令名称  指令描述  指令分类`<br>其中`指令分类`为导入添加标记所用，help文字菜单并不自带，需手动指定'),
        }),
        Schema.object({
            helpmode: Schema.const("1.2").required(),
            help_URL: Schema.string().role('link').default('https://i0.hdslb.com/bfs/article/a6154de573f73246ea4355a614f0b7b94eff8f20.jpg').description('图片菜单的网络URL地址'),
        }),
        Schema.object({
            helpmode: Schema.const("2.1"),
            background_URL: Schema.string().role('textarea', { rows: [8, 8] }).description('渲染使用的背景图地址<br>一行一个网络URL地址').default("https://i0.hdslb.com/bfs/article/3f79c64129020b522a516480c1066ea2f563964b.jpg\nhttps://i0.hdslb.com/bfs/article/28c76b561eadbbb826c2c902088c87a1a7e92f25.jpg\nhttps://i0.hdslb.com/bfs/article/806202a9b867a0b1d2d3399f1a183fc556ec258d.jpg\nhttps://i0.hdslb.com/bfs/article/796ae5ab9ef1f2e7db2c6a6020f5cbb718c9d953.jpg\nhttps://i0.hdslb.com/bfs/article/60e1532cf0a59828fbdd86c1b4e5740ca551f5b2.jpg\nhttps://i0.hdslb.com/bfs/article/9c7e7d66913155a32cad1591472a77374f0caf54.jpg\nhttps://i0.hdslb.com/bfs/article/a6154de573f73246ea4355a614f0b7b94eff8f20.jpg"),
        }),
        Schema.object({
            helpmode: Schema.const("2.2").required(),
            background_URL: Schema.string().role('textarea', { rows: [8, 8] }).description('渲染使用的背景图地址<br>一行一个网络URL地址').default("https://i0.hdslb.com/bfs/article/3f79c64129020b522a516480c1066ea2f563964b.jpg\nhttps://i0.hdslb.com/bfs/article/28c76b561eadbbb826c2c902088c87a1a7e92f25.jpg\nhttps://i0.hdslb.com/bfs/article/806202a9b867a0b1d2d3399f1a183fc556ec258d.jpg\nhttps://i0.hdslb.com/bfs/article/796ae5ab9ef1f2e7db2c6a6020f5cbb718c9d953.jpg\nhttps://i0.hdslb.com/bfs/article/60e1532cf0a59828fbdd86c1b4e5740ca551f5b2.jpg\nhttps://i0.hdslb.com/bfs/article/9c7e7d66913155a32cad1591472a77374f0caf54.jpg\nhttps://i0.hdslb.com/bfs/article/a6154de573f73246ea4355a614f0b7b94eff8f20.jpg"),
            help_text: Schema.string().default("当前可用的指令有：\n    /chatluna  ChatLuna 相关指令。\n    /glot  运行代码\n    /group-manage  群组管理\n    /help  显示帮助信息\n    /inspect  查看用户、频道或消息的详细信息\n    /lunavits  lunavits 语音合成\n    /market  插件市场信息\n    /musicjs  用 JavaScript 代码演奏旋律\n    /osu-funny  一些有趣的 osu! 功能\n    /ping  ping指定的ip或域名\n    /plugin  插件管理\n    /propose  向群友求婚\n    /rryth-test  人人有图画测试服 v0.0.7\n    /sayo-roll  随机选择\n    /shot  网页截图\n    /status  查看运行状态\n    /status-image  查看运行状态\n    /timer  定时器信息\n    /translate  文本翻译\n    /usage  调用次数信息\n    /waifu  娶群友\n    /wh-sub  订阅Github事件推送\n    /wh-unsub  取消Github事件推送\n    /钓鱼  \n    /鹿管签到  鹿管签到\n输入“/help 指令名”查看特定指令的语法和使用示例。")
                .role('textarea', { rows: [8, 8] }).description('返回的文字菜单内容<br>每行格式: `指令名称  指令描述  指令分类`<br>其中`指令分类`为导入添加标记所用，help文字菜单并不自带，需手动指定'),
        }),
        Schema.object({
            helpmode: Schema.const("3").required(),
            background_URL: Schema.string().role('textarea', { rows: [8, 8] }).description('渲染使用的背景图地址<br>一行一个网络URL地址').default("https://i0.hdslb.com/bfs/article/3f79c64129020b522a516480c1066ea2f563964b.jpg\nhttps://i0.hdslb.com/bfs/article/28c76b561eadbbb826c2c902088c87a1a7e92f25.jpg\nhttps://i0.hdslb.com/bfs/article/806202a9b867a0b1d2d3399f1a183fc556ec258d.jpg\nhttps://i0.hdslb.com/bfs/article/796ae5ab9ef1f2e7db2c6a6020f5cbb718c9d953.jpg\nhttps://i0.hdslb.com/bfs/article/60e1532cf0a59828fbdd86c1b4e5740ca551f5b2.jpg\nhttps://i0.hdslb.com/bfs/article/9c7e7d66913155a32cad1591472a77374f0caf54.jpg\nhttps://i0.hdslb.com/bfs/article/a6154de573f73246ea4355a614f0b7b94eff8f20.jpg"),
            help_json: Schema.boolean().default(false).description('开启后，使用配置项填入的 json<br>关闭时，使用本地文件的 json文件：`./data/preview-help/menu-config.json`<br> -> 推荐关闭此配置项，并且前往【资源管理器】编辑json（初次需重启koishi才看得见）<br>json文件中可以使用 `${background_URL}` 代表随机背景图（示例见初始化的json文件）').experimental(),
        }),
        Schema.object({
        }),
    ]),
    Schema.union([
        Schema.object({
            help_json: Schema.const(true).required(),
            help_text_json: Schema.string().role('textarea', { rows: [8, 8] }).description('导入配置使用的JSON内容'),
        }),
        Schema.object({

        }),
    ]),


    Schema.object({
        fontEnabled: Schema.boolean().description('启用自定义字体').default(false),
        fontURL: Schema.string().description("字体 URL (.ttf)<br>注意：需填入本地绝对路径的URL编码地址<br>默认内容 即为使用`jrys-prpr字体`的URL示例写法").default(url.pathToFileURL(path.join(__dirname, '../../jrys-prpr/font/千图马克手写体.ttf')).href),
    }).description('高级设置'),

    Schema.object({
        staticHelp: Schema.boolean().default(true).description('是否静态部署 help 目录到 /help<br>关闭后将没有 webUI，仅能使用本地HTML文件交互'), // 新增配置项
    }).description('交互功能设置'),

    Schema.object({
        screenshotquality: Schema.number().role('slider').min(0).max(100).step(1).default(60).description('设置图片压缩质量（%）'),
        tempPNG: Schema.boolean().description('打开后，开启缓存功能。<br>在`输入配置不变`/`help菜单不变`的情况下，使用缓存的PNG菜单图片（同一张图）。<br>关闭后，每次调用均使用puppeteer渲染').default(true),
        loggerinfo: Schema.boolean().default(false).description('日志调试开关'),
    }).description('调试模式'),
]);

// 存储上一次的 generateCacheKey
let lastCacheKey = null;


function apply(ctx, config) {
    function logInfo(message) {
        if (config.loggerinfo) {
            logger.info(message);
        }
    }

    ctx.on('ready', async () => {
        // 静态资源部署
        if (config.staticHelp && ctx.server) {
            const helpRoot = path.resolve(__dirname, '../help');
            const helpPath = '/help';

            ctx.server.get(helpPath + '(.*)', async (ctx, next) => {
                const filename = path.resolve(helpRoot, ctx.path.slice(helpPath.length).replace(/^\/+/, ''));
                if (!filename.startsWith(helpRoot)) return next();
                const stats = await stat(filename).catch(noop);
                if (stats?.isFile()) {
                    ctx.type = path.extname(filename);
                    return ctx.body = fs.createReadStream(filename);
                }
                return next();
            });

            logInfo(`静态资源部署：help 目录部署到 http://127.0.0.1:${ctx.server.config.port}${helpPath}`);
        }
    });



    ctx.on('ready', async () => {
        const root = path.join(ctx.baseDir, 'data', 'preview-help');
        const jsonFilePath = path.join(root, 'menu-config.json');
        const temp_helpFilePath = path.join(root, 'temp_help.png');


        if (!fs.existsSync(root)) {
            fs.mkdirSync(root, { recursive: true });
        }
        // 检查并创建 JSON 文件
        if (!fs.existsSync(jsonFilePath)) {
            fs.writeFileSync(jsonFilePath, JSON.stringify({
            }));
        }


        ctx.i18n.define("zh-CN", {
            commands: {
                [config.command]: {
                    description: `返回帮助菜单`,
                    messages: {
                        "nopuppeteer": "需要安装puppeteer插件才能使用此功能",
                        "rendering": "正在生成帮助菜单，请稍候...",
                        "element.notfound": "页面元素未找到：{0}",
                        "import.failed": "配置导入失败",
                        "json.parse.error": "JSON解析失败，请检查格式",
                        "file.read.error": "配置文件读取失败",
                        "file.write.error": "配置文件写入失败",
                        "screenshot.failed": "截图失败",
                        "background.invalid": "无效的背景图URL",
                        "mode.notsupport": "不支持的帮助模式",
                        "somerror": "生成帮助时发生错误",
                        "image.load.error": "图片加载失败: {0}",
                        "cache.hit": "命中缓存，使用缓存图片",
                        "font.load.start": "开始加载字体: {0}",
                        "font.load.success": "字体加载成功: {0}",
                        "font.load.fail": "字体加载失败: {0}",
                    }
                },
            }
        });

        ctx.command(`${config.command} <help_text:text>`)
            .option('backgroung', '-b <backgroung:string> 指定背景URL')
            .example("帮助菜单 -b https://i0.hdslb.com/bfs/article/a6154de573f73246ea4355a614f0b7b94eff8f20.jpg   当前可用的指令有：\necho  发送消息\nstatus  查看运行状态\ntimer  定时器信息\nusage  调用次数信息\n输入“help 指令名”查看特定指令的语法和使用示例。")
            .action(async ({ session, options }, help_text) => {
                if (!ctx.puppeteer) {
                    await session.send(h.text(session.text(`.nopuppeteer`)));
                    return;
                }


                // 生成缓存Key
                const generateCacheKey = (helpmode, helpContent, screenshotquality) => {
                    return `${helpmode}-${helpContent}-${screenshotquality}`;
                };


                let currentHelpContent = '';
                let currentBackgroundURL = '';
                let useCache = false;

                switch (config.helpmode) {
                    case '2.1': {
                        logInfo(`正在获取系统帮助内容...`);
                        const koishihelptext = await session.execute("help", true);
                        if (koishihelptext && Array.isArray(koishihelptext) && koishihelptext.length > 0) {
                            currentHelpContent = help_text || koishihelptext[0].attrs.content; // 获取纯文本内容
                        } else {
                            currentHelpContent = help_text || ''; // 容错处理，防止 koishihelptext 为空或格式不正确
                        }
                        logInfo(`获取到帮助内容长度：${currentHelpContent?.length || 0}`);
                        break;
                    }
                    case '2.2': {
                        currentHelpContent = help_text || config.help_text;
                        logInfo(`使用手动输入内容，长度：${currentHelpContent?.length || 0}`);
                        break;
                    }
                    case '3': {
                        logInfo(`正在读取JSON配置...`);
                        if (config.help_json) {
                            currentHelpContent = config.help_text_json;
                            logInfo(`使用配置项JSON，长度：${currentHelpContent?.length || 0}`);
                        } else {
                            try {
                                currentHelpContent = fs.readFileSync(jsonFilePath, 'utf-8');
                                logInfo(`从文件读取JSON成功，长度：${currentHelpContent?.length || 0}`);
                            } catch (error) {
                                logger.error(`文件读取失败：`, error);
                                await session.send(h.text(session.text('.file.read.error')));
                                return;
                            }
                        }
                        // 验证JSON格式
                        try {
                            JSON.parse(currentHelpContent);
                        } catch (error) {
                            logger.error(`JSON解析失败：`, error);
                            await session.send(h.text(session.text('.json.parse.error')));
                            return;
                        }
                        break;
                    }
                }

                // 随机背景图处理
                if (config.background_URL) {
                    const bgList = config.background_URL.split('\n').filter(url => url.trim());
                    if (bgList.length > 0) {
                        currentBackgroundURL = bgList[Math.floor(Math.random() * bgList.length)];
                        logInfo(`选择随机背景图：${currentBackgroundURL}`);
                    }
                }

                const cacheKey = generateCacheKey(config.helpmode, currentHelpContent, config.screenshotquality);


                if (config.tempPNG && ['2.1', '2.2', '3'].includes(config.helpmode)) {
                    if (lastCacheKey === cacheKey && fs.existsSync(temp_helpFilePath)) {
                        useCache = true;
                    }
                }


                if (useCache) {
                    logInfo(session.text('.cache.hit'));
                    try {
                        const imageBuffer = fs.readFileSync(temp_helpFilePath);
                        await session.send([
                            h.image(imageBuffer, 'image/jpeg'),
                        ]);
                        return;
                    } catch (e) {
                        logger.warn(`读取缓存图片失败，重新渲染`, e);
                        // 缓存图片读取失败， Fallback to render. And will overwrite cache.
                    }
                }


                const page = await ctx.puppeteer.page();
                try {
                    // 记录开始时间用于性能监控
                    const startTime = Date.now();
                    logInfo(`开始处理帮助请求，模式：${config.helpmode}`);

                    let helpContent = currentHelpContent;
                    let backgroundURLForPuppeteer = currentBackgroundURL;


                    switch (config.helpmode) {
                        case '1.1': {
                            logInfo(config.help_text);
                            await session.send(h.text(config.help_text));
                            return;
                        }
                        case '1.2': {
                            logInfo(config.help_URL);
                            try {
                                await session.send(h.image(config.help_URL));
                            } catch (e) {
                                logger.error(`图片菜单加载失败: ${config.help_URL}`, e);
                                await session.send(h.text(session.text('.image.load.error', [config.help_URL])));
                                return;
                            }
                            return;
                        }
                        case '2.1':
                        case '2.2':
                        case '3':
                            break; // These modes will be handled below after cache check
                        default:
                            await session.send(h.text(session.text('.mode.notsupport')));
                            return;
                    }


                    // 设置 Puppeteer 页面背景
                    if (backgroundURLForPuppeteer) {
                        await page.evaluate((url) => {
                            document.documentElement.style.setProperty('--background-image', `url(${url})`);
                        }, backgroundURLForPuppeteer);

                        // 等待背景图片加载完成
                        await page.waitForFunction(() => {
                            return new Promise(resolve => {
                                const backgroundImage = getComputedStyle(document.documentElement).getPropertyValue('--background-image');
                                if (backgroundImage && backgroundImage !== 'none') { // 检查是否设置了背景图且不为 'none'
                                    const imageUrl = backgroundImage.replace(/^url\("?/, '').replace(/"?\)$/, ''); // 提取 URL
                                    if (imageUrl) {
                                        const img = new Image();
                                        img.onload = resolve;
                                        img.onerror = resolve; // 图片加载失败也 resolve，避免无限等待
                                        img.src = imageUrl;
                                        if (img.complete) { // 检查图片是否已在缓存中加载完成
                                            resolve();
                                        }
                                    } else {
                                        resolve(); // 没有图片 URL 也 resolve
                                    }
                                } else {
                                    resolve(); // 没有设置背景图也 resolve
                                }
                            });
                        }, { timeout: 30000 }); // 设置超时时间，单位毫秒，可以根据网络情况调整
                    }


                    // 添加渲染状态提示
                    if (config.rendering) {
                        await session.send(h.text(config.rendering));
                    }

                    try {
                        const helpHTMLUrl = url.pathToFileURL(htmlPath).href
                        logInfo(`正在加载本地HTML文件：${helpHTMLUrl}`);
                        await page.goto(helpHTMLUrl, {
                            waitUntil: 'networkidle2',
                            timeout: 30000
                        });

                        // 元素操作增强日志
                        const logElementAction = async (selector, action) => {
                            const element = await page.$(selector);
                            if (!element) {
                                const errorMsg = session.text('.element.notfound', [selector]);
                                logInfo(`${errorMsg}`);
                                throw new Error(errorMsg);
                            }
                            logInfo(`正在${action}：${selector}`);
                            return element;
                        }

                        // 处理导入配置
                        const importButton = await logElementAction('.btn-group button:nth-child(2)', '点击导入配置按钮');
                        await importButton.click();

                        if (config.fontEnabled && config.fontURL) {
                            logInfo(session.text('.font.load.start', [config.fontURL]));
                            try {
                                const fontURLInput = await logElementAction('.image-upload-content input[placeholder="字体 URL (.ttf)"]', '查找字体URL输入框');
                                const addFontButton = await logElementAction('.image-upload-content button', '查找添加字体按钮');

                                await page.evaluate((inputElement, fontURL) => {
                                    inputElement.value = fontURL;
                                    inputElement.dispatchEvent(new Event('input', { bubbles: true })); // 触发输入事件
                                }, fontURLInput, config.fontURL);
                                await addFontButton.click();
                                logInfo(session.text('.font.load.success', [config.fontURL]));

                                // 等待字体加载完成，这里可能需要更精确的判断方式，例如监听字体加载事件
                                await new Promise(resolve => setTimeout(resolve, 1000)); // 简单等待 1 秒
                            } catch (fontError) {
                                logger.warn(`字体加载失败: ${config.fontURL}`, fontError);
                                logInfo(session.text('.font.load.fail', [config.fontURL]));
                            }
                        }


                        if (config.helpmode === '3') {
                            // JSON模式处理
                            const textarea = await logElementAction('.popup-content textarea', '输入JSON内容');
                            await page.evaluate((element, content) => {
                                element.value = content; // 直接设置输入框的值
                                element.dispatchEvent(new Event('input', { bubbles: true })); // 触发输入事件
                            }, textarea, helpContent);
                            const confirmButton = await logElementAction('.popup-buttons button:nth-child(1)', '确认导入');
                            await confirmButton.click();
                        } else {
                            // 快速导入模式处理
                            const tab = await logElementAction('.popup-tab:nth-child(3)', '切换至快速导入标签');
                            await tab.click();

                            const textarea = await logElementAction('.popup-content textarea', '输入帮助内容');
                            await page.evaluate((element, content) => {
                                element.value = content; // 直接设置输入框的值
                                element.dispatchEvent(new Event('input', { bubbles: true })); // 触发输入事件
                            }, textarea, helpContent);
                            const replaceButton = await logElementAction('.popup-buttons button:nth-child(1)', '执行替换导入');
                            await replaceButton.click();
                        }


                        // 等待渲染完成
                        logInfo(`等待渲染完成...`);
                        await page.waitForSelector('.preview-container-wrapper', {
                            visible: true,
                            timeout: 30000
                        });


                        // 截图处理
                        logInfo(`正在执行截图...`);
                        // 等待 1000ms 确保页面完全加载 // 不然背景图加载好了 也会截图到空白背景
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        const previewContainer = await logElementAction('.preview-container-wrapper', '执行截图');
                        const imageBuffer = await previewContainer.screenshot({
                            type: "jpeg",
                            encoding: "binary",
                            quality: config.screenshotquality,
                            captureBeyondViewport: true // 确保截取完整内容
                        });

                        // 保存缓存
                        if (config.tempPNG && ['2.1', '2.2', '3'].includes(config.helpmode)) {
                            try {
                                fs.writeFileSync(temp_helpFilePath, imageBuffer);
                                lastCacheKey = cacheKey; // 存储缓存Key
                                logInfo(`缓存图片成功，key: ${cacheKey}`);
                            } catch (e) {
                                logger.warn(`保存缓存图片失败`, e);
                            }
                        }


                        // 性能统计
                        const costTime = ((Date.now() - startTime) / 1000).toFixed(2);
                        logInfo(`截图完成，耗时${costTime}秒，图片大小：${(imageBuffer.length / 1024).toFixed(2)}KB`);

                        await session.send([
                            h.image(imageBuffer, 'image/jpeg'),
                            // h.text(session.text('.success')) // 移除成功文字
                        ]);

                    } catch (error) {
                        logger.error(`渲染过程出错：`, error);
                        await session.send(h.text(session.text('.somerror')));
                    } finally {
                        await page.close().catch(error => {
                            logger.warn(`页面关闭失败：`, error);
                        });
                    }

                } catch (error) {
                    logger.error(`全局错误：`, error);
                    await session.send(h.text(session.text('.somerror')));
                }
            });
    });


}
exports.apply = apply;
exports.Config = Config;
exports.name = name;
exports.usage = usage;
exports.inject = inject;
