"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.usage = exports.Config = exports.name = exports.inject = void 0;
const { Schema, Logger, h } = require("koishi");
const logger = new Logger('bilibili-videolink-analysis');
exports.name = 'bilibili-videolink-analysis';
exports.inject = {
    optional: ['puppeteer'],
    //required: ['BiliBiliVideo']
}
exports.usage = `

<h1>→ <a href="https://www.npmjs.com/package/koishi-plugin-bilibili-videolink-analysis" target="_blank">可以点击这里查看详细的文档说明✨</a></h1>

✨ 只需开启插件，就可以解析B站视频的链接啦~ ✨

向bot发送B站视频链接吧~

会返回视频信息与视频哦

---

#### ⚠️ **如果你使用不了本项目，请优先检查：** ⚠️
####   若无注册的指令，请关开一下[command插件](/market?keyword=commands+email:shigma10826@gmail.com)（没有指令也不影响解析别人的链接）
####   视频内容是否为B站的大会员专属视频/付费视频/充电专属视频
####   接入方法是否支持获取网址链接/小程序卡片消息
####   接入方法是否支持视频元素的发送
####   发送视频超时/其他网络问题
####   视频内容被平台屏蔽/其他平台因素

---

###  注意，点播功能需要使用 puppeteer 服务

点播功能是为了方便群友一起刷B站哦~

比如：搜索 “遠い空へ” 的第二页，并且结果以语音格式返回

示例：\`点播 遠い空へ -a  -p 2\`  


---

### 特别鸣谢 💖

特别鸣谢以下项目的支持：

- [@summonhim/koishi-plugin-bili-parser](/market?keyword=bili-parser)

---

`;

exports.Config = Schema.intersect([
    Schema.object({
        demand: Schema.boolean().default(true).description("开启点播指令功能"),
        timeout: Schema.number().role('slider').min(1).max(300).step(1).default(60).description('指定播放视频的输入时限。`单位 秒`'),
        point: Schema.tuple([Number, Number]).description('序号标注位置。分别表示`距离顶部 距离左侧`的百分比').default([50, 50]),
        enable: Schema.boolean().description('是否开启自动解析`选择对应视频 会自动解析视频内容`').default(true),
    }).description('点播设置（需要puppeteer服务）'),

    Schema.object({
        waitTip_Switch: Schema.union([
            Schema.const().description('不返回文字提示'),
            Schema.string().description('返回文字提示（请在右侧填写文字内容）'),
        ]).description("是否返回等待提示。开启后，会发送`等待提示语`"),
        linktextParsing: Schema.boolean().default(true).description("是否返回 视频图文数据 `开启后，才发送视频数据的图文解析。`"),
        VideoParsing_ToLink: Schema.union([
            Schema.const('1').description('不返回视频/视频直链'),
            Schema.const('2').description('仅返回视频'),
            Schema.const('3').description('仅返回视频直链'),
            Schema.const('4').description('返回视频和视频直链'),
            Schema.const('5').description('返回视频，仅在日志记录视频直链'),
        ]).role('radio').default('2').description("是否返回` 视频/视频直链 `"),
        BVnumberParsing: Schema.boolean().default(true).description("是否允许根据`独立的BV、AV号`解析视频 `开启后，可以通过视频的BV、AV号解析视频。` <br>  [触发说明见README](https://www.npmjs.com/package/koishi-plugin-bilibili-videolink-analysis)"),
        Maximumduration: Schema.number().default(25).description("允许解析的视频最大时长（分钟）`超过这个时长 就不会发视频`").min(1),
        Maximumduration_tip: Schema.union([
            Schema.const('不返回文字提示').description('不返回文字提示'),
            Schema.string().description('返回文字提示（请在右侧填写文字内容）').default('视频太长啦！还是去B站看吧~'),
        ]).description("对过长视频的文字提示内容").default('视频太长啦！还是去B站看吧~'),
        MinimumTimeInterval: Schema.number().default(180).description("若干`秒`内 不再处理相同链接 `防止多bot互相触发 导致的刷屏/性能浪费`").min(1),
    }).description("基础设置"),

    Schema.object({
        parseLimit: Schema.number().default(3).description("单对话多链接解析上限").hidden(),
        useNumeral: Schema.boolean().default(true).description("使用格式化数字").hidden(),
        showError: Schema.boolean().default(false).description("当链接不正确时提醒发送者").hidden(),
        bVideoIDPreference: Schema.union([
            Schema.const("bv").description("BV 号"),
            Schema.const("av").description("AV 号"),
        ]).default("bv").description("ID 偏好").hidden(),

        bVideo_area: Schema.string().role('textarea', { rows: [8, 16] }).description("图文解析的返回格式<br>注意变量格式，以及变量名称。<br>比如 `${标题}` 不可以变成`${标题123}`，你可以直接删掉但是不能修改变量名称哦<br>当然变量也不能无中生有，下面的默认值内容 就是所有变量了，你仅可以删去变量 或者修改变量之外的格式。<br>· 特殊变量`${~~~}`表示分割线，会把上下内容分为两个信息单独发送。")
            .default("${标题} --- ${UP主}\n---\n${封面}\n---\n${简介}\n---\n${点赞} --- ${投币}\n${收藏} --- ${转发}\n${观看} --- ${弹幕}"),
        bVideoShowLink: Schema.boolean().default(false).description("在末尾显示视频的链接地址 `开启可能会导致其他bot循环解析`"),
        bVideoShowIntroductionTofixed: Schema.number().default(50).description("视频的`简介`最大的字符长度<br>超出部分会使用 `...` 代替"),
    }).description("链接的图文解析设置"),

    Schema.object({
        userAgent: Schema.string().description("所有 API 请求所用的 User-Agent").default("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"),
        middleware: Schema.boolean().default(false).description("前置中间件模式"),
        loggerinfo: Schema.boolean().default(false).description("日志调试输出 `日常使用无需开启`"),
    }).description("调试设置"),
]);

function apply(ctx, config) {

    ctx.middleware(async (session, next) => {
        let sessioncontent = session.content;
        // 如果允许解析 BV 号，则进行解析
        if (config.BVnumberParsing) {
            const bvUrls = convertBVToUrl(sessioncontent);
            if (bvUrls.length > 0) {
                sessioncontent += '\n' + bvUrls.join('\n');
            }
        }
        const links = await isProcessLinks(sessioncontent); // 判断是否需要解析
        if (links) {
            const ret = await extractLinks(session, config, ctx, links); // 提取链接
            if (ret && !isLinkProcessedRecently(ret, lastProcessedUrls, config, logger)) {
                await processVideoFromLink(session, config, ctx, lastProcessedUrls, logger, ret); // 解析视频并返回
            }
        }
        return next();
    }, config.middleware);

    if (config.demand) {
        ctx.command('B站点播/退出登录', '退出B站账号')
            .action(async ({ session }) => {
                const page = await ctx.puppeteer.page();
                await page.goto('https://www.bilibili.com/', { waitUntil: 'networkidle2' });

                const loginButtonSelector = '.right-entry__outside.go-login-btn';
                const isLoggedIn = await page.$(loginButtonSelector) === null;

                if (!isLoggedIn) {
                    await page.close();
                    await session.send(h.text('您尚未登录。'))
                    return;
                }

                const avatarLinkSelector = '.header-entry-mini';
                const logoutButtonSelector = '.logout-item';

                try {
                    const avatarElement = await page.$(avatarLinkSelector);
                    if (avatarElement) {
                        await avatarElement.hover();
                        await page.waitForSelector(logoutButtonSelector, { visible: true });

                        await page.click(logoutButtonSelector);

                        await new Promise(resolve => setTimeout(resolve, 1000));

                        await page.close();
                        await session.send(h.text('已成功退出登录。'))
                        return;
                    } else {
                        await page.close();
                        await session.send(h.text('找不到用户头像，无法退出登录。'))
                        return;
                    }
                } catch (error) {
                    await page.close();
                    logger.error('Error during logout:', error);
                    await session.send(h.text('退出登录时出错。'))
                    return;
                }
            });

        ctx.command('B站点播/登录', '登录B站账号')
            .alias("登陆")
            .action(async ({ session }) => {
                const page = await ctx.puppeteer.page();
                await page.goto('https://www.bilibili.com/', { waitUntil: 'networkidle2' });

                const loginButtonSelector = '.right-entry__outside.go-login-btn';
                const isLoggedIn = await page.$(loginButtonSelector) === null;

                if (isLoggedIn) {
                    await page.close();
                    await session.send(h.text('您已经登录了。'))
                    return;
                }

                await page.click(loginButtonSelector);

                const qrCodeSelector = '.login-scan-box img';
                await page.waitForSelector(qrCodeSelector);
                const qrCodeUrl = await page.$eval(qrCodeSelector, img => img.src);

                await session.send(h.image(qrCodeUrl, 'image/png'));
                await session.send('请扫描二维码进行登录。');

                let attempts = 0;
                let loginSuccessful = false;

                while (attempts < 6) {
                    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 
                    const isStillLoggedIn = await page.$(loginButtonSelector) === null;

                    if (isStillLoggedIn) {
                        loginSuccessful = true;
                        break;
                    }

                    attempts++;
                }

                await page.close();
                await session.send(h.text(loginSuccessful ? '登录成功！' : '登录失败，请重试。'))
                return;
            });

        ctx.command('B站点播 [keyword]', '点播B站视频')
            .option('video', '-v 解析返回视频')
            .option('audio', '-a 解析返回语音')
            .option('link', '-l 解析返回链接')
            .option('page', '-p <page:number> 指定页数', { fallback: '1' })
            .example('点播   遠い空へ  -v')
            .action(async ({ options, session }, keyword) => {
                if (!keyword) {
                    await session.execute('点播 -h')
                    await session.send(h.text('没输入点播内容'))
                    return
                }


                const url = `https://search.bilibili.com/video?keyword=${encodeURIComponent(keyword)}&page=${options.page}&o=30`
                const page = await ctx.puppeteer.page()

                await page.goto(url, {
                    waitUntil: 'networkidle2'
                })

                await page.addStyleTag({
                    content: `
div.bili-header, 
div.login-tip, 
div.v-popover, 
div.right-entry__outside {
display: none !important;
}
`
                })
                // 获取视频列表并为每个视频元素添加序号
                const videos = await page.evaluate((point) => {
                    const items = Array.from(document.querySelectorAll('.video-list-item:not([style*="display: none"])'))
                    return items.map((item, index) => {
                        const link = item.querySelector('a')
                        const href = link?.getAttribute('href') || ''
                        const idMatch = href.match(/\/video\/(BV\w+)\//)
                        const id = idMatch ? idMatch[1] : ''

                        if (!id) {
                            // 如果没有提取到视频ID，隐藏这个元素
                            //const htmlElement = item as HTMLElement
                            const htmlElement = item
                            htmlElement.style.display = 'none'
                        } else {
                            // 创建一个包含序号的元素，并将其插入到视频元素的正中央
                            const overlay = document.createElement('div')
                            overlay.style.position = 'absolute'
                            overlay.style.top = `${point[0]}%`
                            overlay.style.left = `${point[1]}%`
                            overlay.style.transform = 'translate(-50%, -50%)'
                            overlay.style.fontSize = '48px'
                            overlay.style.fontWeight = 'bold'
                            overlay.style.color = 'black'
                            overlay.style.zIndex = '10'
                            overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.7)'  // 半透明白色背景，确保数字清晰可见
                            overlay.style.padding = '10px'
                            overlay.style.borderRadius = '8px'
                            overlay.textContent = `${index + 1}` // 序号

                            // 确保父元素有 `position: relative` 以正确定位
                            //const videoElement = item as HTMLElement
                            const videoElement = item
                            videoElement.style.position = 'relative'
                            videoElement.appendChild(overlay)
                        }

                        return { id }
                    }).filter(video => video.id)
                }, config.point) // 传递配置的 point 参数

                // 如果开启了日志调试模式，打印获取到的视频信息
                if (config.loggerinfo) {
                    ctx.logger.info(options)
                    ctx.logger.info(`共找到 ${videos.length} 个视频:`)
                    videos.forEach((video, index) => {
                        ctx.logger.info(`序号 ${index + 1}: ID - ${video.id}`)
                    })
                }

                if (videos.length === 0) {
                    await page.close()
                    await session.send(h.text('未找到相关视频。'))
                    return
                }

                // 动态调整窗口大小以适应视频数量
                const viewportHeight = 200 + videos.length * 100
                await page.setViewport({
                    width: 1440,
                    height: viewportHeight
                })
                let msg;
                // 截图
                const videoListElement = await page.$('.video-list.row')
                if (videoListElement) {
                    const imgBuf = await videoListElement.screenshot({
                        captureBeyondViewport: false
                    })
                    msg = h.image(imgBuf, 'image/png')
                }

                await page.close()

                // 发送截图
                await session.send(msg)

                // 提示用户输入
                await session.send(`请选择视频的序号：`)

                // 等待用户输入
                const userChoice = await session.prompt(config.timeout * 1000)
                const choiceIndex = parseInt(userChoice) - 1
                if (isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex >= videos.length) {
                    await session.send(h.text('输入无效，请输入正确的序号。'))
                    return
                }

                // 返回用户选择的视频ID
                const chosenVideo = videos[choiceIndex]

                // 如果开启了日志调试模式，打印用户选择的视频信息
                if (config.loggerinfo) {
                    ctx.logger.info(`渲染序号设置\noverlay.style.top = ${config.point[0]}% \noverlay.style.left = ${config.point[1]}%`)
                    ctx.logger.info(`用户选择了序号 ${choiceIndex + 1}: ID - ${chosenVideo.id}`)
                }

                if (config.enable) { // 开启自动解析了

                    const ret = await extractLinks(session, config, ctx, [{ type: 'Video', id: chosenVideo.id }], logger); // 提取链接
                    if (ret && !isLinkProcessedRecently(ret, lastProcessedUrls, config, logger)) {
                        await processVideoFromLink(session, config, ctx, lastProcessedUrls, logger, ret, options); // 解析视频并返回
                    }
                }
            })
    }

    if (config.loggerinfo) {
        ctx.command('B站点播/调试点播 [keyword]', '调试时点播B站视频')
            .option('video', '-v 解析返回视频')
            .option('audio', '-a 解析返回语音')
            .option('link', '-l 解析返回链接')
            .option('page', '-p <page:number> 指定页数', { fallback: '1' })
            .example('调试点播 遠い空へ -v')
            .action(async ({ options, session }, keyword) => {
                if (!keyword) {
                    await session.execute('调试点播 -h');
                    return '没输入keyword';
                }
                const url = `https://search.bilibili.com/video?keyword=${encodeURIComponent(keyword)}&page=${options.page}&o=30`;
                const page = await ctx.puppeteer.page();
                await page.goto(url, {
                    waitUntil: 'networkidle2',
                });

                // 获取视频列表并为每个视频元素添加序号
                const videos = await page.evaluate((point) => {
                    const items = Array.from(document.querySelectorAll('.video-list-item:not([style*="display: none"])'));
                    return items.map((item, index) => {
                        const link = item.querySelector('a');
                        const href = link?.getAttribute('href') || '';
                        const idMatch = href.match(/\/video\/(BV\w+)\//);
                        const id = idMatch ? idMatch[1] : '';
                        if (!id) {
                            const htmlElement = item;
                            htmlElement.style.display = 'none';
                        } else {
                            const overlay = document.createElement('div');
                            overlay.style.position = 'absolute';
                            overlay.style.top = `${point[0]}%`;
                            overlay.style.left = `${point[1]}%`;
                            overlay.style.transform = 'translate(-50%, -50%)';
                            overlay.style.fontSize = '48px';
                            overlay.style.fontWeight = 'bold';
                            overlay.style.color = 'black';
                            overlay.style.zIndex = '10';
                            overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
                            overlay.style.padding = '10px';
                            overlay.style.borderRadius = '8px';
                            overlay.textContent = `${index + 1}`;
                            const videoElement = item;
                            videoElement.style.position = 'relative';
                            videoElement.appendChild(overlay);
                        }
                        return { id };
                    }).filter(video => video.id);
                }, config.point);

                // 如果开启了日志调试模式，打印获取到的视频信息
                if (config.loggerinfo) {
                    ctx.logger.info(options);
                    ctx.logger.info(`共找到 ${videos.length} 个视频:`);
                    videos.forEach((video, index) => {
                        ctx.logger.info(`序号 ${index + 1}: ID - ${video.id}`);
                    });
                }
                if (videos.length === 0) {
                    await page.close();
                    return '未找到相关视频。';
                }

                // 动态调整窗口大小以适应视频数量
                const viewportHeight = 200 + videos.length * 100;
                await page.setViewport({
                    width: 1440,
                    height: viewportHeight,
                });

                let msg;
                // 截取整个页面
                const imgBuf = await page.screenshot({ fullPage: true });
                msg = h.image(imgBuf, 'image/png');

                await page.close();

                // 发送截图
                await session.send(msg);
                // 提示用户输入
                await session.send(`请选择视频的序号：`);
                // 等待用户输入
                const userChoice = await session.prompt(config.timeout * 1000);
                const choiceIndex = parseInt(userChoice) - 1;
                if (isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex >= videos.length) {
                    return '输入无效，请输入正确的序号。';
                }

                // 返回用户选择的视频ID
                const chosenVideo = videos[choiceIndex];
                // 如果开启了日志调试模式，打印用户选择的视频信息
                if (config.loggerinfo) {
                    ctx.logger.info(`渲染序号设置\noverlay.style.top = ${config.point[0]}% \noverlay.style.left = ${config.point[1]}%`);
                    ctx.logger.info(`用户选择了序号 ${choiceIndex + 1}: ID - ${chosenVideo.id}`);
                }

                if (config.enable) {
                    // 开启自动解析了

                    const ret = await extractLinks(session, config, ctx, [{ type: 'Video', id: chosenVideo.id }], logger);
                    if (ret && !isLinkProcessedRecently(ret, lastProcessedUrls, config, logger)) {
                        await processVideoFromLink(session, config, ctx, lastProcessedUrls, logger, ret, options);
                    }
                }
            });
    }
    //判断是否需要解析
    async function isProcessLinks(sessioncontent) {
        // 解析内容中的链接
        const links = link_type_parser(sessioncontent);
        if (links.length === 0) {
            return false; // 如果没有找到链接，返回 false
        }
        return links; // 返回解析出的链接
    }

    //提取链接 
    async function extractLinks(session, config, ctx, links) {
        let ret = "";
        ret += [(0, h)("quote", { id: session.messageId })];
        let countLink = 0;
        let tp_ret;

        // 循环检测链接类型
        for (const element of links) {
            if (countLink >= 1) ret += "\n";
            if (countLink >= config.parseLimit) {
                ret += "已达到解析上限…";
                break;
            }
            tp_ret = await (0, type_processer)(ctx, config, element);
            if (tp_ret == "") {
                if (config.showError)
                    ret = "无法解析链接信息。可能是 ID 不存在，或该类型可能暂不支持。";
                else
                    ret = null;
            } else {
                ret += tp_ret;
            }
            countLink++;
        }
        return ret;
    }

    //判断链接是否已经处理过
    function isLinkProcessedRecently(ret, lastProcessedUrls, config, logger) {
        const lastretUrl = extractLastUrl(ret); // 提取 ret 最后一个 http 链接作为解析目标
        const currentTime = Date.now();

        if (lastProcessedUrls[lastretUrl] && (currentTime - lastProcessedUrls[lastretUrl] < config.MinimumTimeInterval * 1000)) {
            if (config.loggerinfo) {
                logger.info(`重复出现，略过处理：\n ${lastretUrl}`);
            }
            return true; // 已经处理过
        }

        // 更新该链接的最后处理时间
        lastProcessedUrls[lastretUrl] = currentTime;
        return false; // 没有处理过
    }

    //解析视频并返回 
    async function processVideoFromLink(session, config, ctx, lastProcessedUrls, logger, ret, options = { video: true }) {
        const lastretUrl = extractLastUrl(ret);

        if (config.waitTip_Switch) {
            // 等候的提示文字
            await session.send(config.waitTip_Switch);
        }

        let textParts = []; // 用于存储分割后的文本部分
        if (config.linktextParsing) {
            let fullText;
            if (config.bVideoShowLink) {
                fullText = ret; // 发送完整信息
            } else {
                // 去掉最后一个链接
                fullText = ret.replace(lastretUrl, '');
            }

            // 分割文本
            textParts = fullText.split('${~~~}');
        }
        // 发送分割后的文本部分
        for (const part of textParts) {
            const trimmedPart = part.trim(); // 去除首尾空格
            if (trimmedPart) { // 确保不是空字符串
                await session.send(trimmedPart);
            }
        }

        if (config.VideoParsing_ToLink) {
            const fullAPIurl = `https://api.xingzhige.com/API/b_parse/?url=${encodeURIComponent(lastretUrl)}`;

            try {
                const responseData = await ctx.http.get(fullAPIurl);

                if (responseData.code === 0 && responseData.msg === "video" && responseData.data) {
                    const { bvid, cid, video } = responseData.data;
                    const bilibiliUrl = `https://api.bilibili.com/x/player/playurl?fnval=80&cid=${cid}&bvid=${bvid}`;
                    const playData = await ctx.http.get(bilibiliUrl);
                    if (config.loggerinfo) {
                        ctx.logger.info(bilibiliUrl);
                    }
                    if (playData.code === 0 && playData.data && playData.data.dash.duration) {
                        const videoDurationSeconds = playData.data.dash.duration;
                        const videoDurationMinutes = videoDurationSeconds / 60;

                        if (videoDurationMinutes > config.Maximumduration) {
                            if (config.Maximumduration_tip !== '不返回文字提示') {
                                await session.send(config.Maximumduration_tip);
                                return;
                            } else {
                                return;
                            }
                        }

                        const videoUrl = video.url;
                        if (config.loggerinfo) {
                            ctx.logger.info(videoUrl);
                        }
                        if (videoUrl) {
                            if (options.link) {
                                await session.send(h.text(videoUrl));
                                return;
                            } else if (options.audio) {
                                await session.send(h.audio(videoUrl));
                                return;
                            } else {
                                switch (config.VideoParsing_ToLink) {
                                    case '1':
                                        break;
                                    case '2':
                                        await session.send(h.video(videoUrl));
                                        break;
                                    case '3':
                                        await session.send(h.text(videoUrl));
                                        break;
                                    case '4':
                                        await session.send(h.text(videoUrl));
                                        await session.send(h.video(videoUrl));
                                        break;
                                    case '5':
                                        logger.info(videoUrl);
                                        await session.send(h.video(videoUrl));
                                        break;
                                    default:
                                        break;
                                }
                            }
                        } else {
                            throw new Error("解析视频直链失败");
                        }
                    } else {
                        throw new Error("获取播放数据失败");
                    }
                } else {
                    throw new Error("解析视频信息失败或非视频类型内容");
                }
            } catch (error) {
                logger.error("请求解析 API 失败或处理出错:", error);
            }
        }

        if (config.loggerinfo) {
            logger.info(`机器人发送完整消息为：\n ${ret}`);
        }
        return;
    }



    // 提取最后一个URL
    function extractLastUrl(text) {
        const urlPattern = /https?:\/\/[^\s]+/g;
        const urls = text.match(urlPattern);
        return urls ? urls.pop() : null;
    }

    // 检测BV / AV 号并转换为URL
    function convertBVToUrl(text) {
        const bvPattern = /(?:^|\s)(BV\w{10})(?:\s|$)/g;
        const avPattern = /(?:^|\s)(av\d+)(?:\s|$)/g; // 新增 AV 号的正则表达式
        const matches = [];
        let match;

        // 查找 BV 号
        while ((match = bvPattern.exec(text)) !== null) {
            matches.push(`https://www.bilibili.com/video/${match[1]}`);
        }

        // 查找 AV 号
        while ((match = avPattern.exec(text)) !== null) {
            matches.push(`https://www.bilibili.com/video/${match[1]}`);
        }

        return matches;
    }

    // 记录上次处理链接的时间
    const lastProcessedUrls = {};

    /////////////////////////////////////////////////////////////////////////////////////////////////////////

    function numeral(number, config) {
        if (config.useNumeral) {
            if (number >= 10000 && number < 100000000) {
                return (number / 10000).toFixed(1) + "万";
            }
            else if (number >= 100000000) {
                return (number / 100000000).toFixed(1) + "亿";
            }
            else {
                return number.toString();
            }
        }
        else {
            return number;
        }
    }

    class Bili_Video {
        ctx;
        config;
        constructor(ctx, config) {
            this.ctx = ctx;
            this.config = config;
        }
        /**
        * 解析 ID 类型
        * @param id 视频 ID
        * @returns type: ID 类型, id: 视频 ID
        */
        vid_type_parse(id) {
            var idRegex = [
                {
                    pattern: /av([0-9]+)/i,
                    type: "av",
                },
                {
                    pattern: /bv([0-9a-zA-Z]+)/i,
                    type: "bv",
                },
            ];
            for (const rule of idRegex) {
                var match = id.match(rule.pattern);
                if (match) {
                    return {
                        type: rule.type,
                        id: match[1],
                    };
                }
            }
            return {
                type: null,
                id: null,
            };
        }
        /**
        * 根据视频 ID 查找视频信息
        * @param id 视频 ID
        * @returns 视频信息 Json
        */
        async fetch_video_info(id) {
            var ret;
            const vid = this.vid_type_parse(id);
            switch (vid["type"]) {
                case "av":
                    ret = await this.ctx.http.get("https://api.bilibili.com/x/web-interface/view?aid=" + vid["id"], {
                        headers: {
                            "User-Agent": this.config.userAgent,
                        },
                    });
                    break;
                case "bv":
                    ret = await this.ctx.http.get("https://api.bilibili.com/x/web-interface/view?bvid=" + vid["id"], {
                        headers: {
                            "User-Agent": this.config.userAgent,
                        },
                    });
                    break;
                default:
                    ret = null;
                    break;
            }
            return ret;
        }
        /**
         * 生成视频信息
         * @param id 视频 ID
         * @returns 文字视频信息
         */
        async gen_context(id) {
            const info = await this.fetch_video_info(id);
            if (!info || !info["data"])
                return null;

            let description = info["data"]["desc"];
            // 根据配置处理简介
            const maxLength = config.bVideoShowIntroductionTofixed;
            if (description.length > maxLength) {
                description = description.substring(0, maxLength) + '...';
            }
            // 定义占位符对应的数据
            const placeholders = {
                '${标题}': info["data"]["title"],
                '${UP主}': info["data"]["owner"]["name"],
                '${封面}': `<img src="${info["data"]["pic"]}"/>`,
                '${简介}': description, // 使用处理后的简介
                '${点赞}': `点赞：${(0, numeral)(info["data"]["stat"]["like"], this.config)}`,
                '${投币}': `投币：${(0, numeral)(info["data"]["stat"]["coin"], this.config)}`,
                '${收藏}': `收藏：${(0, numeral)(info["data"]["stat"]["favorite"], this.config)}`,
                '${转发}': `转发：${(0, numeral)(info["data"]["stat"]["share"], this.config)}`,
                '${观看}': `观看：${(0, numeral)(info["data"]["stat"]["view"], this.config)}`,
                '${弹幕}': `弹幕：${(0, numeral)(info["data"]["stat"]["danmaku"], this.config)}`,
            };

            // 根据配置项中的格式替换占位符
            let ret = this.config.bVideo_area;
            for (const [placeholder, value] of Object.entries(placeholders)) {
                ret = ret.replace(new RegExp(placeholder.replace(/\$/g, '\\$'), 'g'), value);
            }

            // 根据 ID 偏好添加视频链接
            switch (this.config.bVideoIDPreference) {
                case "bv":
                    ret += `\nhttps://www.bilibili.com/video/${info["data"]["bvid"]}`;
                    break;
                case "av":
                    ret += `\nhttps://www.bilibili.com/video/av${info["data"]["aid"]}`;
                    break;
                default:
                    break;
            }

            return ret;
        }


    }

    /**
    * 链接类型解析
    * @param content 传入消息
    * @returns type: "链接类型", id :"内容ID"
    */
    function link_type_parser(content) {
        // 先替换转义斜杠
        content = content.replace(/\\\//g, '/');
        var linkRegex = [
            {
                pattern: /bilibili\.com\/video\/([ab]v[0-9a-zA-Z]+)/gim,
                type: "Video",
            },
            {
                pattern: /b23\.tv(?:\\)?\/([0-9a-zA-Z]+)/gim,
                type: "Short",
            },
            {
                pattern: /bili(?:22|23|33)\.cn\/([0-9a-zA-Z]+)/gim,
                type: "Short",
            },
            {
                pattern: /bili2233\.cn\/([0-9a-zA-Z]+)/gim,
                type: "Short",
            },
        ];
        var ret = [];
        for (const rule of linkRegex) {
            var match;
            let lastID;
            while ((match = rule.pattern.exec(content)) !== null) {
                if (lastID == match[1])
                    continue;
                ret.push({
                    type: rule.type,
                    id: match[1],
                });
                lastID = match[1];
            }
        }
        return ret;
    }

    /**
    * 类型执行器
    * @param ctx Context
    * @param config Config
    * @param element 链接列表
    * @returns 解析来的文本
    */
    async function type_processer(ctx, config, element) {
        var ret = "";
        switch (element["type"]) {
            case "Video":
                const bili_video = new Bili_Video(ctx, config);
                const video_info = await bili_video.gen_context(element["id"]);
                if (video_info != null)
                    ret += video_info;
                break;

            case "Short":
                const bili_short = new Bili_Short(ctx, config);
                const typed_link = link_type_parser(await bili_short.get_redir_url(element["id"]));
                for (const element of typed_link) {
                    const final_info = await type_processer(ctx, config, element);
                    if (final_info != null)
                        ret += final_info;
                    break;
                }
                break;
        }
        return ret;
    }

    class Bili_Short {
        ctx;
        config;
        constructor(ctx, config) {
            this.ctx = ctx;
            this.config = config;
        }
        /**
        * 根据短链接重定向获取正常链接
        * @param id 短链接 ID
        * @returns 正常链接
        */
        async get_redir_url(id) {
            var data = await this.ctx.http.get("https://b23.tv/" + id, {
                redirect: "manual",
                headers: {
                    "User-Agent": this.config.userAgent,
                },
            });
            const match = data.match(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"/i);
            if (match)
                return match[1];
            else
                return null;
        }
    }
}
exports.apply = apply;