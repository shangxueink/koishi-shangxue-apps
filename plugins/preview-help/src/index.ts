import fs from 'node:fs';
import url from "node:url";
import path from "node:path";
import crypto from 'node:crypto';
import { stat, readdir } from 'fs/promises';
import { Schema, Logger, h, noop } from "koishi";
import { } from '@koishijs/plugin-console'

export const reusable = true; // 此插件可重用
export const name = 'preview-help';
export const inject = {
    required: ['http', "i18n"],
    optional: ['console', "puppeteer", 'server']
};
export const logger = new Logger('preview-help');

const htmlPath = path.join(__dirname, '../help/index.html');

export const usage = `
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

<p>推荐使用webUI交互（开启插件后）生成你喜欢的菜单图片，并且导出JSON配置，用于配置本插件。</p>
<p>当然也可以把渲染好的菜单图片保存，使用本插件的图片返回功能等</p>

webUI 交互 （开启插件后）请见 ➤ <a href="/preview-help">/preview-help</a>


---

<h4>⚙️高级设置</h4>
<p><strong>字体设置：</strong> 您可以在插件配置中启用自定义字体，并指定字体 URL。启用后，插件在渲染菜单时会尝试加载您提供的字体。</p>
<p><strong>缓存设置：</strong> 开启缓存功能后，对于配置和 help 菜单内容不变的情况，插件会直接使用缓存的 PNG 图片，提高响应速度。关闭缓存则每次调用都会重新渲染。</p>
<p><strong>调试日志：</strong> 开启日志调试开关后，插件会在控制台输出更详细的日志信息，用于问题排查。</p>


---


本地文件地址：
<p>
  <a href="${htmlPath.replace(/\\/g, '/')} " target="_blank">${htmlPath.replace(/\\/g, '/')} </a>
</p>

<p>
  <button onclick="navigator.clipboard.writeText('${htmlPath.replace(/\\/g, '/')}')">点我复制文件地址</button>
</p>

## <a href="/preview-help">菜单 webUI 交互 （开启插件后）请点击这里 ➤ /preview-help</a>

---

注：自定义图片URL地址，支持格式：

- 本地文件的相对路径（默认内容）：\`./pictures/backgrounds/3.png\`
- 绝对路径：\`file:///D:/Pictures/meme/2024-12-05-22-10-20-627.png\`
- 网络图片URL：\`https://i1.hdslb.com/bfs/article/f32980cbce6808fd54613dea589eee013f0c5fe3.png\`
`;

export const Config = Schema.intersect([
    Schema.object({
        command: Schema.string().description('注册指令名称').default("帮助菜单"),
        rendering: Schema.union([
            Schema.const("").description('unset').description("不返回提示语"),
            Schema.string().description('string').description("请在右侧修改提示语").default("正在生成帮助菜单，请稍候..."),
        ]).description("`菜单渲染中`提示语"),
        helpmode: Schema.union([
            Schema.const('1.1').description('返回文字菜单'),
            Schema.const('1.2').description('返回图片菜单'),
            Schema.const('2.1').description('返回渲染图片菜单（自动从help指令获取）'),
            Schema.const('2.2').description('返回渲染图片菜单（手动输入help文字菜单）'),
            Schema.const('3').description('返回渲染图片菜单（自定义json配置）（本地JSON文件） '),
            Schema.const('3.2').description('返回渲染图片菜单（自定义json配置）（json写入配置项） '),
        ]).role('radio').default('2.1').description('菜单返回模式<br>`自动获取的help菜单可能会与预设模版不吻合`<br>推荐前往webUI手动编辑后导出json文件使用'),
    }).description('基础配置'),
    Schema.union([
        Schema.object({
            helpmode: Schema.const("1.1").required(),
            help_text: Schema.string().default("当前可用的指令有：\necho  发送消息  其他功能\nhelp  显示帮助信息  系统工具\ninspect  查看用户、频道或消息的详细信息  系统工具\nplugin  插件管理  系统功能\nstatus  查看运行状态  系统工具\ntimer  定时器信息  系统功能\nusage  调用次数信息  系统功能\n输入“help 指令名”查看特定指令的语法和使用示例。")
                .role('textarea', { rows: [8, 8] }).description('返回的文字菜单内容<br>每行格式: `指令名称  指令描述  指令分类`<br>其中`指令分类`为导入添加标记所用，help文字菜单并不自带，需手动指定'),
        }),
        Schema.object({
            helpmode: Schema.const("1.2").required(),
            help_URL: Schema.string().role('link').default('https://i0.hdslb.com/bfs/article/a6154de573f73246ea4355a614f0b7b94eff8f20.jpg').description('图片菜单的网络URL地址'),
        }),
        Schema.object({
            helpmode: Schema.const("2.1"),
            background_URL: Schema.string().role('textarea', { rows: [4, 4] }).description('渲染使用的背景图地址，会随机选一个使用<br>一行一个图片的URL地址（`网络URL`或者`本地绝对路径的URL`）<br>默认会有使用随机的猫羽雫的背景图'),
        }),
        Schema.object({
            helpmode: Schema.const("2.2").required(),
            background_URL: Schema.string().role('textarea', { rows: [4, 4] }).description('渲染使用的背景图地址，会随机选一个使用<br>一行一个图片的URL地址（`网络URL`或者`本地绝对路径的URL`）<br>默认会有使用随机的猫羽雫的背景图'),
            help_text: Schema.string().default("当前可用的指令有：\necho  发送消息  其他功能\nhelp  显示帮助信息  系统工具\ninspect  查看用户、频道或消息的详细信息  系统工具\nplugin  插件管理  系统功能\nstatus  查看运行状态  系统工具\ntimer  定时器信息  系统功能\nusage  调用次数信息  系统功能\n输入“help 指令名”查看特定指令的语法和使用示例。")
                .role('textarea', { rows: [8, 8] }).description('返回的文字菜单内容<br>每行格式: `指令名称  指令描述  指令分类`<br>其中`指令分类`为导入添加标记所用，help文字菜单并不自带，需手动指定'),
        }),
        Schema.object({
            helpmode: Schema.const("3").required(),
            background_URL: Schema.string().role('textarea', { rows: [4, 4] }).description('渲染使用的背景图地址，会随机选一个使用<br>一行一个图片的URL地址（`网络URL`或者`本地绝对路径的URL`）<br>默认会有使用随机的猫羽雫的背景图'),
            help_text_json_path: Schema.string().role('textarea', { rows: [4, 4] }).default("C:\\Users\\shangxue\\Downloads").description('导入配置使用的JSON的`所在文件夹`的绝对路径<br>你可以直接填入浏览器导出json的默认文件夹地址 `即浏览器下载文件夹`<br>若不填入，则默认使用`./data/preview-help/menu-config.json`'),
        }),
        Schema.object({
            helpmode: Schema.const("3.2").required(),
            background_URL: Schema.string().role('textarea', { rows: [4, 4] }).description('渲染使用的背景图地址，会随机选一个使用<br>一行一个图片的URL地址（`网络URL`或者`本地绝对路径的URL`）<br>默认会有使用随机的猫羽雫的背景图'),
            help_text_json: Schema.string().role('textarea', { rows: [8, 8] }).description('导入配置使用的JSON内容'),
        }),
        Schema.object({
        }),
    ]),
    Schema.object({
        fontEnabled: Schema.boolean().description('启用自定义字体').default(false),
        fontURL: Schema.string().description("字体 URL (.ttf)<br>注意：需填入本地绝对路径的URL编码地址<br>默认内容 即为使用`jrys-prpr字体`的URL示例写法").default(url.pathToFileURL(path.join(__dirname, '../../jrys-prpr/font/千图马克手写体lite.ttf')).href),
    }).description('高级设置'),

    Schema.object({
        staticHelp: Schema.boolean().default(true).description('是否静态部署 help 目录到 /help<br>关闭后将没有 webUI，仅能使用本地HTML文件交互'),
    }).description('交互功能设置'),

    Schema.object({
        screenshotquality: Schema.number().role('slider').min(0).max(100).step(1).default(60).description('设置图片压缩质量（%）'),
        isfigure: Schema.boolean().default(false).description("是否开启合并转发 `仅支持 onebot 适配器` 其他平台开启 无效").experimental(),
        tempPNG: Schema.boolean().description('打开后，开启缓存功能。<br>在`输入配置不变`/`help菜单不变`的情况下，使用缓存的PNG菜单图片（同一张图）。<br>关闭后，每次调用均使用puppeteer渲染').default(true),
    }).description('调试设置'),

    Schema.object({
        loggerinfo: Schema.boolean().default(false).description('日志调试开关'),
    }).description('开发者选项'),
    Schema.union([
        Schema.object({
            loggerinfo: Schema.const(true).required(),
            pageclose: Schema.boolean().default(true).description('自动close page'),
        }),
        Schema.object({
        }),
    ]),
]);

// 存储上一次的 generateCacheKey
let lastCacheKey = "";

export function apply(ctx, config) {

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

            ctx.inject(['console'], (ctx) => {
                ctx.console.addEntry({
                    dev: path.resolve(__dirname, '../client/index.ts'),
                    prod: path.resolve(__dirname, '../dist'),
                })
            })

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
        const tempDirPath = path.join(root, 'temp');
        let jsonFilePath = path.join(root, 'menu-config.json'); // 默认json文件路径
        const temp_helpFilePath = path.join(root, 'temp_help.png');


        if (!fs.existsSync(root)) {
            fs.mkdirSync(root, { recursive: true });
        }
        if (!fs.existsSync(tempDirPath)) {
            fs.mkdirSync(tempDirPath, { recursive: true }); // 创建临时图片文件夹
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
                        "path.invalid": "无效的路径: {0}",
                        "jsonfile.notfound": "未找到 menu-config.json 文件",
                        "background.download.fail": "背景图下载失败: {0}",
                    }
                },
            }
        });

        // 下载并保存图片到本地临时目录
        async function downloadAndSaveImage(imageUrl, shouldCache) {
            try {
                const imageBuffer = Buffer.from(await ctx.http.get(imageUrl, { responseType: 'arraybuffer' }));
                const imageHash = crypto.createHash('md5').update(imageBuffer).digest('hex');
                const localImagePath = path.join(tempDirPath, `background-${imageHash}.png`);

                if (shouldCache) {
                    fs.writeFileSync(localImagePath, Buffer.from(imageBuffer));
                    logInfo(`背景图已下载并保存到本地: ${localImagePath}`);
                } else {
                    logInfo(`未开启缓存，不保存背景图到本地`);
                }

                return { localImagePath, imageHash };
            } catch (error) {
                logger.warn(`下载背景图失败: ${imageUrl}`, error);
                return { localImagePath: null, imageHash: null };
            }
        }

        // 清理临时目录，保留当前使用的背景图
        async function cleanupTempDir(currentImageHash) {
            try {
                const files = await readdir(tempDirPath);
                for (const file of files) {
                    if (file.startsWith('background-') && !file.includes(currentImageHash)) {
                        await fs.promises.unlink(path.join(tempDirPath, file));
                        logInfo(`清理临时文件: ${file}`);
                    }
                }
            } catch (error) {
                logger.warn(`清理临时文件夹失败: ${tempDirPath}`, error);
                logInfo("清理临时文件夹失败"); // 提示清理失败
            }
        }


        ctx.command(`${config.command} <help_text:text>`)
            .option('background', '-b <background:string> 指定背景URL')
            .example("帮助菜单 -b https://i0.hdslb.com/bfs/article/a6154de573f73246ea4355a614f0b7b94eff8f20.jpg   当前可用的指令有：\necho  发送消息\nstatus  查看运行状态\ntimer  定时器信息\nusage  调用次数信息\n输入“help 指令名”查看特定指令的语法和使用示例。")
            .action(async ({ session, options }, help_text) => {

                if (!ctx.puppeteer) {
                    await session.send(h.text(session.text(`.nopuppeteer`)));
                    return;
                }


                // 添加渲染状态提示
                let renderingTipmsgid
                if (config.rendering) {
                    [renderingTipmsgid] = await session.send(h.text(config.rendering));
                }
                // 生成缓存Key
                const generateCacheKey = (helpmode, helpContent, screenshotquality) => {
                    return `${helpmode}-${helpContent}-${screenshotquality}`;
                };

                let currentHelpContent = '';
                let currentBackgroundURL = '';
                let useCache = false;

                // 随机背景图处理 (如果提供了 -b 参数，则优先使用 -b 参数)
                if (options.background) {
                    currentBackgroundURL = options.background;
                    logInfo(`使用 -b 参数指定的背景图：${currentBackgroundURL}`);
                } else if (config.background_URL) {
                    const bgList = config.background_URL.split('\n').filter(url => url.trim());
                    if (bgList.length > 0) {
                        currentBackgroundURL = bgList[Math.floor(Math.random() * bgList.length)];
                        logInfo(`选择随机背景图：${currentBackgroundURL}`);
                    }
                }
                const cacheKey = generateCacheKey(config.helpmode, currentHelpContent.replace(currentBackgroundURL, ""), config.screenshotquality);

                if (config.tempPNG && ['2.1', '2.2', '3', '3.2'].includes(config.helpmode)) {
                    if (lastCacheKey === cacheKey && fs.existsSync(temp_helpFilePath)) {
                        useCache = true;
                    }
                }

                // 背景图预处理
                let localBackgroundURL = currentBackgroundURL;
                let currentImageHash = null;

                if (currentBackgroundURL && currentBackgroundURL.startsWith('http')) {
                    const shouldCache = config.tempPNG; // 是否开启缓存

                    if (!useCache) {
                        const downloadResult = await downloadAndSaveImage(currentBackgroundURL, shouldCache);
                        if (downloadResult.localImagePath) {
                            localBackgroundURL = url.pathToFileURL(downloadResult.localImagePath).href; // 转换为 file:// URL
                            currentImageHash = downloadResult.imageHash;
                            if (config.tempPNG) {
                                await cleanupTempDir(currentImageHash); // 清理旧的临时文件
                            }
                            logInfo(`背景图已下载并保存到本地: ${localBackgroundURL}`);
                        } else {
                            await session.send(h.text(session.text('.background.download.fail', [currentBackgroundURL])));
                            localBackgroundURL = ''; // 下载失败则不使用背景图，或者可以设置为默认背景图
                            currentBackgroundURL = ''; // 确保后续代码逻辑一致
                        }
                    }
                }

                if (currentBackgroundURL && !currentBackgroundURL.startsWith('http')) {
                    localBackgroundURL = currentBackgroundURL; // 本地或绝对路径URL，直接使用
                }

                switch (config.helpmode) {
                    case '2.1': {
                        logInfo(`正在获取系统帮助内容...`);
                        const koishihelptext = await session.execute("help", true);
                        if (koishihelptext && Array.isArray(koishihelptext) && koishihelptext.length > 0) {
                            currentHelpContent = `${help_text || koishihelptext[0].attrs.content}\n${currentBackgroundURL}`; // 获取纯文本内容
                        } else {
                            currentHelpContent = `${help_text || ''}\n${currentBackgroundURL}`; // 容错处理，防止 koishihelptext 为空或格式不正确
                        }
                        logInfo(`获取到帮助内容长度：${currentHelpContent?.length || 0}`);
                        break;
                    }
                    case '2.2': {
                        currentHelpContent = `${help_text || config.help_text}\n${currentBackgroundURL}`;
                        logInfo(`使用手动输入内容，长度：${currentHelpContent?.length || 0}`);
                        break;
                    }
                    case '3': {
                        let jsonFilePathToUse = jsonFilePath; // 默认路径

                        if (config.help_text_json_path) {
                            let inputPath = config.help_text_json_path.trim();
                            if (inputPath.startsWith('file:///')) {
                                inputPath = url.fileURLToPath(inputPath);
                            }

                            try {
                                const pathStat = await stat(inputPath);
                                if (pathStat.isDirectory()) {
                                    const files = await readdir(inputPath);
                                    const jsonFiles = files.filter(file => file.startsWith('menu-config (') && file.endsWith(').json'));
                                    let latestNumberedJson = "";
                                    let latestNumber = -1;

                                    for (const file of jsonFiles) {
                                        const match = file.match(/menu-config \((\d+)\)\.json/);
                                        if (match) {
                                            const number = parseInt(match[1], 10);
                                            if (number > latestNumber) {
                                                latestNumber = number;
                                                latestNumberedJson = file;
                                            }
                                        }
                                    }

                                    if (latestNumberedJson) {
                                        jsonFilePathToUse = path.join(inputPath, latestNumberedJson);
                                    } else if (files.includes('menu-config.json')) {
                                        jsonFilePathToUse = path.join(inputPath, 'menu-config.json');
                                    } else {
                                        await session.send(h.text(session.text('.jsonfile.notfound')));
                                        return; // 找不到文件直接返回，使用默认的空json文件
                                    }

                                } else if (pathStat.isFile() && path.extname(inputPath) === '.json') {
                                    jsonFilePathToUse = inputPath;
                                } else {
                                    await session.send(h.text(session.text('.path.invalid', [config.help_text_json_path])));
                                    return; // 路径无效直接返回，使用默认的空json文件
                                }
                            } catch (e) {
                                logger.warn(`路径检查失败: ${config.help_text_json_path}`, e);
                                await session.send(h.text(session.text('.path.invalid', [config.help_text_json_path])));
                                return; // 路径无效直接返回，使用默认的空json文件
                            }
                        }


                        try {
                            logInfo(`正在读取JSON配置...`);
                            currentHelpContent = fs.readFileSync(jsonFilePathToUse, 'utf-8');
                            logInfo(`从文件读取JSON成功，路径：${jsonFilePathToUse}，长度：${currentHelpContent?.length || 0}`);
                        } catch (error) {
                            logger.error(`文件读取失败：`, error);
                            await session.send(h.text(session.text('.file.read.error')));
                            return;
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
                    case '3.2': {
                        logInfo(`正在读取JSON配置...`);

                        currentHelpContent = config.help_text_json;
                        logInfo(`使用配置项JSON，长度：${currentHelpContent?.length || 0}`);

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



                if (useCache) {
                    logInfo(session.text('.cache.hit'));
                    try {
                        const imageBuffer = fs.readFileSync(temp_helpFilePath);
                        await sendwithfigure(session, h.image(imageBuffer, 'image/jpeg'), renderingTipmsgid);
                        return;
                    } catch (e) {
                        logger.warn(`读取缓存图片失败，重新渲染`, e);
                        // 缓存图片读取失败， Fallback to render. And will overwrite cache.
                    }
                }

                const page = await ctx.puppeteer.page();
                try {
                    const startTime = Date.now();
                    logInfo(`开始处理帮助请求，模式：${config.helpmode}`);

                    let helpContent = currentHelpContent;
                    // let backgroundURLForPuppeteer = currentBackgroundURL; // 不需要了

                    switch (config.helpmode) {
                        case '1.1':
                            logInfo(config.help_text);
                            await sendwithfigure(session, h.text(config.help_text), renderingTipmsgid);
                            return;
                        case '1.2':
                            logInfo(config.help_URL);
                            try {
                                await sendwithfigure(session, h.image(config.help_URL), renderingTipmsgid);
                            } catch (e) {
                                logger.error(`图片菜单加载失败: ${config.help_URL}`, e);
                                await session.send(h.text(session.text('.image.load.error', [config.help_URL])));
                                return;
                            }
                            return;
                        case '2.1':
                        case '2.2':
                        case '3':
                        case '3.2':
                            break;
                        default:
                            await session.send(h.text(session.text('.mode.notsupport')));
                            return;
                    }


                    const helpHTMLUrl = url.pathToFileURL(htmlPath).href;
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

                    // 设置背景图片 URL
                    if (localBackgroundURL) { // 使用本地背景图路径
                        logInfo(`设置背景图片 URL: ${localBackgroundURL}`);
                        try {
                            // 1. 点击 "URL" 标签
                            const urlTab = await logElementAction('.form-item .image-upload-tab:nth-child(1)', '点击 URL 标签');
                            await urlTab.click();

                            // 2. 填入 URL 输入框
                            const urlInput = await logElementAction('.form-item .image-upload-content:nth-child(3) input', '找到 URL 输入框');
                            await page.evaluate((inputElement, url) => {
                                inputElement.value = url;
                                inputElement.dispatchEvent(new Event('input', { bubbles: true })); // 触发输入事件
                            }, urlInput, localBackgroundURL); // 使用本地路径

                            //  添加一个小延迟，确保 Vue 组件有时间响应输入事件
                            await new Promise(resolve => ctx.setTimeout(resolve, 200));

                        } catch (bgError) {
                            logger.warn(`设置背景图片失败: ${localBackgroundURL}`, bgError);
                            logInfo(session.text('.background.set.fail', [localBackgroundURL]));
                        }
                    }


                    // 处理导入配置 (字体和 JSON/快速导入部分保持不变)
                    const importButton = await logElementAction('.btn-group button:nth-child(2)', '点击导入配置按钮');
                    await importButton.click();

                    if (config.fontEnabled && config.fontURL) {
                        logInfo(session.text('.font.load.start', [config.fontURL]));
                        try {

                            const fontURLInput = await logElementAction('.image-upload-content input[placeholder="绝对路径的 URL编码 (.ttf)"]', '查找字体URL输入框');

                            await page.evaluate((inputElement, fontURL) => {
                                inputElement.value = fontURL;
                                inputElement.dispatchEvent(new Event('input', { bubbles: true })); // 触发输入事件
                            }, fontURLInput, config.fontURL);
                            await page.evaluate(() => {
                                // @ts-ignore
                                document.querySelector('.image-upload-content button').click();
                            });

                            logInfo(session.text('.font.load.success', [config.fontURL]));

                            // 等待字体加载完成，这里可能需要更精确的判断方式，例如监听字体加载事件
                            await new Promise(resolve => ctx.setTimeout(resolve, 1000)); // 简单等待 1 秒
                        } catch (fontError) {
                            logger.warn(`字体加载失败: ${config.fontURL}`, fontError);
                            logInfo(session.text('.font.load.fail', [config.fontURL]));
                        }
                    }


                    if (config.helpmode === '3' || config.helpmode === '3.2') { // 模式 3.2 同样使用 JSON 导入
                        if (localBackgroundURL) {
                            let parsedJson = JSON.parse(helpContent); // 解析 JSON
                            parsedJson.config.backgroundImage = localBackgroundURL; // 改写背景图字段
                        }
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
                    // await new Promise(resolve => ctx.setTimeout(resolve, 1000));
                    await page.waitForNetworkIdle();
                    const previewContainer = await logElementAction('.preview-container-wrapper', '执行截图');
                    const imageBuffer = await previewContainer.screenshot({
                        type: "jpeg",
                        encoding: "binary",
                        quality: config.screenshotquality,
                        captureBeyondViewport: true // 确保截取完整内容
                    });

                    // 保存缓存
                    if (config.tempPNG && ['2.1', '2.2', '3', '3.2'].includes(config.helpmode)) { // 模式 3.2 也应该支持缓存
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

                    await sendwithfigure(session, h.image(imageBuffer, 'image/jpeg'), renderingTipmsgid);

                } catch (error) {
                    logger.error(`渲染过程出错：`, error);
                    await session.send(h.text(session.text('.somerror')));
                } finally {
                    if (config.pageclose !== false) {
                        await page.close().catch(error => {
                            logger.warn(`页面关闭失败：`, error);
                        });
                    }
                }

            });

        async function sendwithfigure(session, responseElements, deleteMessageId?) {
            if (config.isfigure && (session.platform === "onebot" || session.platform === "red")) {
                logInfo(`使用合并转发，正在合并消息。`);
                // 创建 figure 元素
                const figureContent = h('figure', {
                    children: responseElements
                });
                logInfo(JSON.stringify(figureContent, null, 2));
                // 发送合并转发消息
                const successsend = await session.send(figureContent);
                if (successsend.length > 0 && deleteMessageId) {
                    await session.bot.deleteMessage(session.channelId, deleteMessageId)
                }
            } else {
                // 没有启用合并转发
                const successsend = await session.send(responseElements);
                if (successsend.length > 0 && deleteMessageId) {
                    await session.bot.deleteMessage(session.channelId, deleteMessageId)
                }
            }
        }


    });

}
