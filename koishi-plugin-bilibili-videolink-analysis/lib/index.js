"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.usage = exports.Config = exports.name = exports.inject = void 0;
const koishi_1 = require("koishi");
const logger = new koishi_1.Logger('bilibili-videolink-analysis');
exports.name = 'bilibili-videolink-analysis';
exports.inject = ['BiliBiliVideo'];
exports.usage = `

<h1>→ <a href="https://www.npmjs.com/package/koishi-plugin-bilibili-videolink-analysis" target="_blank">可以点击这里查看详细的文档说明✨</a></h1>

✨ 只需开启插件，就可以解析B站视频的链接啦~ ✨

向bot发送B站视频链接吧~

会返回视频信息与视频哦

（本插件没有注册的指令）

---

#### ⚠️ **如果你使用不了本项目，请优先检查：** ⚠️
####   视频内容是否为B站的大会员专属视频/付费视频/充电专属视频
####   是否正确配置并启动了[bilibili-login插件](/market?keyword=bilibili-login)  （启动即可，不是必须登录）
####   接入方法是否支持获取网址链接/小程序卡片消息
####   接入方法是否支持视频元素的发送
####   发送视频超时/其他网络问题
####   视频内容被平台屏蔽/其他平台因素

---

### 特别鸣谢 💖

特别鸣谢以下项目的支持：

- [@summonhim/koishi-plugin-bili-parser](/market?keyword=bili-parser)
- [koishi-plugin-iirose-media-request](/market?keyword=iirose-media-request)

---

`;

exports.Config = koishi_1.Schema.intersect([
    koishi_1.Schema.object({
        waitTip_Switch: koishi_1.Schema.union([
            koishi_1.Schema.const().description('不返回文字提示'),
            koishi_1.Schema.string().description('返回文字提示（请在右侧填写文字内容）'),
        ]).description("是否返回等待提示。开启后，会发送`等待提示语`"),

        linktextParsing: koishi_1.Schema.boolean().default(true).description("是否返回 视频图文数据 `开启后，才发送视频数据的图文解析。`"),
        VideoParsing_ToLink: koishi_1.Schema.union([
            koishi_1.Schema.const('1').description('不返回视频/视频直链'),
            koishi_1.Schema.const('2').description('仅返回视频'),
            koishi_1.Schema.const('3').description('仅返回视频直链'),
            koishi_1.Schema.const('4').description('返回视频和视频直链'),
            koishi_1.Schema.const('5').description('返回视频，仅在日志记录视频直链'),
        ]).role('radio').default('2').description("是否返回` 视频/视频直链 `"),
        Video_ClarityPriority: koishi_1.Schema.union([
            koishi_1.Schema.const('1').description('低清晰度优先（低清晰度的视频发得快一点）'),
            koishi_1.Schema.const('2').description('高清晰度优先（清晰的还是去B站看吧）'),
        ]).role('radio').default('1').description("发送的视频清晰度优先策略"),

        BVnumberParsing: koishi_1.Schema.boolean().default(true).description("是否允许根据`独立的BV号`解析视频 `开启后，可以通过视频的BV号解析视频。` <br>  [触发说明见README](https://www.npmjs.com/package/koishi-plugin-bilibili-videolink-analysis)"),
        Maximumduration: koishi_1.Schema.number().default(25).description("允许解析的视频最大时长（分钟）`超过这个时长 就不会发视频`").min(1),
        Maximumduration_tip: koishi_1.Schema.union([
            koishi_1.Schema.const('不返回文字提示').description('不返回文字提示'),
            koishi_1.Schema.string().description('返回文字提示（请在右侧填写文字内容）').default('视频太长啦！还是去B站看吧~'),
        ]).description("对过长视频的文字提示内容").default('视频太长啦！还是去B站看吧~'),
        MinimumTimeInterval: koishi_1.Schema.number().default(180).description("若干`秒`内 不再处理相同链接 `防止多bot互相触发 导致的刷屏/性能浪费`").min(1),
    }).description("基础设置"),

    koishi_1.Schema.object({
        parseLimit: koishi_1.Schema.number().default(3).description("单对话多链接解析上限").hidden(),
        useNumeral: koishi_1.Schema.boolean().default(true).description("使用格式化数字").hidden(),
        showError: koishi_1.Schema.boolean().default(false).description("当链接不正确时提醒发送者").hidden(),

        bVideoIDPreference: koishi_1.Schema.union([
            koishi_1.Schema.const("bv").description("BV 号"),
            koishi_1.Schema.const("av").description("AV 号"),
        ]).default("bv").description("ID 偏好").hidden(),
        bVideoImage: koishi_1.Schema.boolean().default(true).description("显示封面"),
        bVideoOwner: koishi_1.Schema.boolean().default(true).description("显示 UP 主"),
        bVideoDesc: koishi_1.Schema.boolean().default(false).description("显示简介`有的简介真的很长`"),
        bVideoStat: koishi_1.Schema.boolean().default(true).description("显示状态（*三连数据*）"),
        bVideoExtraStat: koishi_1.Schema.boolean().default(true).description("显示额外状态（*弹幕&观看*）"),
        bVideoShowLink: koishi_1.Schema.boolean().default(false).description("显示视频链接`开启可能会导致其他bot循环解析`"),

    }).description("链接的图文解析设置"),

    koishi_1.Schema.object({
        userAgent: koishi_1.Schema.string().description("所有 API 请求所用的 User-Agent").default("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"),
        loggerinfo: koishi_1.Schema.boolean().default(false).description("日志调试输出 `日常使用无需开启`"),
    }).description("调试设置"),
]);

function apply(ctx, config) {
    const bilibiliVideo = ctx.BiliBiliVideo;
    ctx.middleware(async (session, next) => {
        let content = session.content;

        // 如果允许解析 BV 号，则进行解析
        if (config.BVnumberParsing) {
            const bvUrls = convertBVToUrl(content);
            if (bvUrls.length > 0) {
                content += '\n' + bvUrls.join('\n');
            }
        }

        // 解析内容中的链接
        const links = link_type_parser(content);
        if (links.length === 0) {
            return next();
        }
        var ret = "";
        ret += [(0, koishi_1.h)("quote", { id: session.messageId })];
        let countLink = 0;
        let tp_ret;
        // 循环检测链接类型
        for (const element of links) {
            if (countLink >= 1)
                ret += "\n";
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
            }
            else
                ret += tp_ret;
            countLink++;
        }

        if (ret) {
            const lastretUrl = extractLastUrl(ret);// 提取ret最后一个http链接作为解析目标

            // 检查该链接是否在设定的时间间隔内已经处理过
            const currentTime = Date.now();
            if (lastProcessedUrls[lastretUrl] && (currentTime - lastProcessedUrls[lastretUrl] < config.MinimumTimeInterval * 1000)) {
                if (config.loggerinfo) {
                    logger.info(`重复出现，略过处理：\n ${lastretUrl}`);
                }
                return next();
            }

            // 更新该链接的最后处理时间
            lastProcessedUrls[lastretUrl] = currentTime;

            if (config.waitTip_Switch) {
                // 等候的提示文字
                await session.send(config.waitTip_Switch);
            }

            if (config.linktextParsing) { // 发送视频数据，图文信息
                if (config.bVideoShowLink) {
                    await session.send(ret);
                } else {
                    // 去掉最后一个链接
                    const retWithoutLastLink = ret.replace(lastretUrl, '');
                    await session.send(retWithoutLastLink);
                }
            }
            let bilibilimediaDataURL = '';
            let mediaData = '';
            if (config.VideoParsing_ToLink) {
                const mediaDataString = JSON.stringify(await handleBilibiliMedia(bilibiliVideo, lastretUrl, config));
                mediaData = JSON.parse(mediaDataString);
                bilibilimediaDataURL = mediaData[0].url
                const videoDuration = mediaData[0].duration; // 提取视频时长，单位为秒

                if (videoDuration > config.Maximumduration * 60) {
                    // 如果视频时长超过配置的最大值
                    if (config.Maximumduration_tip) {
                        await session.send(config.Maximumduration_tip);
                    }
                    return next();
                }
                // 根据配置的值来决定发送的内容
                /*
                * VideoParsing_ToLink: koishi_1.Schema.union([
                *    
                * koishi_1.Schema.const('1').description('不返回视频/视频直链'),
                * koishi_1.Schema.const('2').description('仅返回视频'),
                * koishi_1.Schema.const('3').description('仅返回视频直链'),
                * koishi_1.Schema.const('4').description('返回视频和视频直链'),
                * koishi_1.Schema.const('5').description('返回视频，仅在日志记录视频直链'),
                * 
                * ]).role('radio').default('2').description("是否返回` 视频/视频直链 `"),
                */
                switch (config.VideoParsing_ToLink) {
                    case '1': // 不返回视频/视频直链 
                        break;
                    case '2': // 仅返回视频     
                        await session.send(koishi_1.h.video(bilibilimediaDataURL)); // 发送视频
                        break;
                    case '3': // 仅返回视频直链                    
                        await session.send(koishi_1.h.text(bilibilimediaDataURL)); // 发送视频直链
                        break;
                    case '4': // 返回视频和视频直链
                        await session.send(koishi_1.h.text(bilibilimediaDataURL)); // 先发送视频直链
                        await session.send(koishi_1.h.video(bilibilimediaDataURL)); // 发送视频                    
                        break;
                    case '5': // 返回视频，记录视频链接
                        await logger.info(bilibilimediaDataURL); // 先记录日志
                        await session.send(koishi_1.h.video(bilibilimediaDataURL)); // 发送视频                    
                        break;
                    default:
                        // 处理默认情况或者错误配置     
                        // 目前默认 不返回视频/视频直链
                        break;
                }
            }

            if (config.loggerinfo) {
                //logger.info(`userAgent为\n ${config.userAgent}`);
                //logger.info(`提取到的链接为\n ${JSON.stringify(links)}`);         
                logger.info(`视频信息内容：\n ${JSON.stringify(mediaData)}`);
                logger.info(`机器人发送完整消息为：\n ${ret}`);
            }

        }
        return next();
    });


    // 提取最后一个URL
    function extractLastUrl(text) {
        const urlPattern = /https?:\/\/[^\s]+/g;
        const urls = text.match(urlPattern);
        return urls ? urls.pop() : null;
    }

    // 检测BV号并转换为URL
    function convertBVToUrl(text) {
        const bvPattern = /(?:^|\s)(BV\w{10})(?:\s|$)/g;
        const bvMatches = [];
        let match;
        while ((match = bvPattern.exec(text)) !== null) {
            bvMatches.push(match[1]);
        }
        return bvMatches.length ? bvMatches.map(bv => `https://www.bilibili.com/video/${bv}`) : [];
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
            var ret = `${info["data"]["title"]}\n`;
            this.config.bVideoImage
                ? (ret += `<img src=\"${info["data"]["pic"]}\"/>\n`)
                : null;
            this.config.bVideoOwner
                ? (ret += `UP主： ${info["data"]["owner"]["name"]}\n`)
                : null;
            this.config.bVideoDesc ? (ret += `${info["data"]["desc"]}\n`) : null;
            this.config.bVideoStat
                ? (ret += `点赞：${(0, numeral)(info["data"]["stat"]["like"], this.config)}\t\t投币：${(0, numeral)(info["data"]["stat"]["coin"], this.config)}\n`)
                : null;
            this.config.bVideoStat
                ? (ret += `收藏：${(0, numeral)(info["data"]["stat"]["favorite"], this.config)}\t\t转发：${(0, numeral)(info["data"]["stat"]["share"], this.config)}\n`)
                : null;
            this.config.bVideoExtraStat
                ? (ret += `观看：${(0, numeral)(info["data"]["stat"]["view"], this.config)}\t\t弹幕：${(0, numeral)(info["data"]["stat"]["danmaku"], this.config)}\n`)
                : null;
            switch (this.config.bVideoIDPreference) {
                case "bv":
                    ret += `https://www.bilibili.com/video/${info["data"]["bvid"]}\n`;
                    break;
                case "av":
                    ret += `https://www.bilibili.com/video/av${info["data"]["aid"]}\n`;
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
        var linkRegex = [
            {
                pattern: /bilibili\.com\/video\/([ab]v[0-9a-zA-Z]+)/gim,
                type: "Video",
            },
            {
                pattern: /live\.bilibili\.com(?:\/h5)?\/(\d+)/gim,
                type: "Live",
            },
            {
                pattern: /bilibili\.com\/bangumi\/play\/((ep|ss)(\d+))/gim,
                type: "Bangumi",
            },
            {
                pattern: /bilibili\.com\/bangumi\/media\/(md(\d+))/gim,
                type: "Bangumi",
            },
            {
                pattern: /bilibili\.com\/read\/cv(\d+)/gim,
                type: "Article",
            },
            {
                pattern: /bilibili\.com\/read\/mobile(?:\?id=|\/)(\d+)/gim,
                type: "Article",
            },
            {
                pattern: /bilibili\.com\/audio\/au(\d+)/gim,
                type: "Audio",
            },
            {
                pattern: /bilibili\.com\/opus\/(\d+)/gim,
                type: "Opus",
            },
            // {
            //   pattern: /space\.bilibili\.com\/(\d+)/gim,
            //   type: "Space",
            // },
            {
                pattern: /b23\.tv(?:\\)?\/([0-9a-zA-Z]+)/gim,
                type: "Short",
            },
            {
                pattern: /bili(?:22|23|33)\.cn\/([0-9a-zA-Z]+)/gim,
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
    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    /**
     * 检查看看一个url是否返回403，或者无法访问，主要用在通过bilibili官方api拿到的视频流
     * @param url  链接
     * @returns boolean
     */
    async function checkResponseStatus(url) {
        try {
            const response = await ctx.http(url, {
                method: 'GET',
                headers: {
                    'Referer': 'no-referrer',
                    'Range': 'bytes=0-10000'
                }
            });
            //尝试打印一下看看response
            //await logger.info(response);

            if (response.status === 403 || response.status === 410) {
                return false;
            }
            else if (response.status === 200 || response.status === 206) {
                return true;
            }
            else {
                return false;
            }
        }
        catch (error) {
            return false;
        }
    }

    async function handleBilibiliMedia(bilibiliVideo, originUrl) {
        const GetVideoStream = async (h5videoStream, pcvideoStream, cid) => {
            if (!h5videoStream.data ||
                !pcvideoStream.data ||
                !h5videoStream.data.accept_quality ||
                !pcvideoStream.data.accept_quality ||
                !h5videoStream.data.accept_format ||
                !pcvideoStream.data.accept_format)
                throw new Error('无法获取清晰度信息, 可能该视频为大会员专享或者该视频为付费视频/充电专属视频！或者账号被风控。');
            const h5Quality = h5videoStream.data.accept_quality;
            const pcQuality = pcvideoStream.data.accept_quality;
            if (config.loggerinfo) {
                logger.info(`h5Quality清晰度：  ` + h5Quality)
                logger.info(`pcQuality清晰度：  ` + pcQuality)
            }
            const CombinedQualityInfo = h5Quality
                .filter((item, index) => !(h5videoStream.data?.accept_format?.includes('flv') && h5videoStream.data.accept_format.split(',')[index].includes('flv')))
                .map(item => ['html5', item])
                .concat(pcQuality
                    .filter((item, index) => !(pcvideoStream.data?.accept_format?.includes('flv') && pcvideoStream.data.accept_format.split(',')[index].includes('flv')))
                    .map(item => ['pc', item]));
            CombinedQualityInfo.sort((a, b) => {
                if (b[1] === a[1]) {
                    // 如果两者数字相等
                    if (a[0] === 'html5') {
                        // html5排在前面
                        return -1;
                    }
                    else if (b[0] === 'html5') {
                        // pc排在前面
                        return 1;
                    }
                    else {
                        // 如果都是相同类型，则按照原顺序
                        return 0;
                    }
                }
                else {
                    // 根据配置决定排序顺序
                    switch (config.Video_ClarityPriority) {
                        case '1':
                          //logger.info(`低清晰度优先排序，a[1]: ${a[1]}, b[1]: ${b[1]}`);
                          return a[1] - b[1]; // 从低到高排序（低清晰度优先）
                        case '2':
                          //logger.info(`高清晰度优先排序，a[1]: ${a[1]}, b[1]: ${b[1]}`);
                          return b[1] - a[1]; // 从高到低排序（高清晰度优先）
                        default:
                          //logger.warn(`未知的视频清晰度优先级配置: ${config.Video_ClarityPriority}`);
                          return 0; // 默认保持原顺序
                      }
                }
            });
            outerLoop: for (const [index, item] of CombinedQualityInfo.entries()) {

                videoStream = await bilibiliVideo.getBilibiliVideoStream(avid, bvid, cid, item[1], item[0], 1);

                if (!videoStream || !videoStream.data || !videoStream.data.durl) {
                    continue;
                }
                if (await checkResponseStatus(videoStream.data.durl[0].url) === true) {
                    break outerLoop;
                }
                const isLastItem = index === CombinedQualityInfo.length - 1;
                if (isLastItem) {
                    throw new Error('在尝试了全部清晰度和平台后，无法获取流媒体');
                }
            }
            return videoStream;
        };
        const duration = [];
        const cids = [];
        const cover = [];
        const name = [];
        const type = [];
        const singer = [];
        const link = [];
        const origin = [];
        const bitRate = [];
        const url = [];
        let bvid;
        if (originUrl.includes('http') && originUrl.includes('video')) {
            originUrl = originUrl.replace(/\?/g, '/');
            bvid = originUrl.split('/video/')[1].split('/')[0];
        }
        else if (originUrl.includes('BV') || originUrl.includes('bv')) {
            bvid = originUrl;
        }
        else {
            const mediaData = returnErrorMediaData(['暂不支持']);
            return mediaData;
        }
        const videoInfo = await bilibiliVideo.getBilibiliVideoDetail(null, bvid);
        if (!videoInfo || !videoInfo.data) {
            const mediaData = returnErrorMediaData(['这个不是正确的bv号']);
            return mediaData;
        }
        videoInfo.data.pages.forEach((page) => {
            if (!videoInfo.data)
                return;
            cids.push(page.cid);
            cover.push(videoInfo.data.pic);
            type.push('video');
            singer.push(videoInfo.data.owner.name);
            link.push(`https://www.bilibili.com/video/${bvid}`);
            duration.push(page.duration + 1 || videoInfo.data.duration + 1);
            origin.push('bilibili');
            if (videoInfo.data.pages.length <= 1) {
                name.push(videoInfo.data.title);
            }
            else {
                name.push(`${videoInfo.data.title} - P${page.part}`);
            }
        });
        const avid = videoInfo.data.aid;
        let videoStream;

        const h5videoStream = await bilibiliVideo.getBilibiliVideoStream(avid, bvid, cids[0], 112, 'html5', 1);
        const pcvideoStream = await bilibiliVideo.getBilibiliVideoStream(avid, bvid, cids[0], 112, 'pc', 1);
        if (!h5videoStream || !pcvideoStream)
            return returnErrorMediaData(['无法获取B站视频流']);

        const cid = cids[0];
        videoStream = await GetVideoStream(h5videoStream, pcvideoStream, cid);
        if (!videoStream || !videoStream.data || !videoStream.data.quality || !videoStream.data.durl)
            return returnErrorMediaData(['无法获取videoStream信息']);
        bitRate.push(videoStream.data.quality);
        url.push(videoStream.data.durl[0].url);
        /*
        for (const cid of cids) {
            videoStream = await GetVideoStream(h5videoStream, pcvideoStream, cid);
            if (!videoStream || !videoStream.data || !videoStream.data.quality || !videoStream.data.durl)
                return returnErrorMediaData(['无法获取videoStream信息']);
            bitRate.push(videoStream.data.quality);
            url.push(videoStream.data.durl[0].url);
        }
        */
        const mediaData = returnCompleteMediaData(type, name, singer, cover, url, duration, bitRate, [], origin, link);
        return mediaData;
    }

    /**
     * 返回包含错误信息的mediaData
     * @param errorMsg 错误信息
     * @return mediaData
     */
    function returnErrorMediaData(errorMsgs) {
        const errorMediaDataArray = [];
        for (const errorMsg of errorMsgs) {
            const mediaData = {
                type: 'music',
                name: '0',
                signer: '0',
                cover: '0',
                link: '0',
                url: '0',
                duration: 0,
                bitRate: 0,
                lyrics: null,
                origin: null,
                error: errorMsg,
            };
            errorMediaDataArray.push(mediaData);
        }
        return errorMediaDataArray;
    }

    /**
     * 返回完整的mediaData
     * @param type 类型
     * @param name 标题
     * @param signer 创作者
     * @param cover 封面图url
     * @param url 链接
     * @param duration 时长
     * @param bitRate 比特率
     * @return mediaData
     */
    function returnCompleteMediaData(typeList, nameList, signerList, coverList, urlList, durationList, bitRateList, lyricsList = [], origin = [], linkList = [], commentList) {
        const mediaDataArray = [];
        for (let i = 0; i < urlList.length; i++) {
            const mediaData = {
                type: typeList[i],
                name: nameList[i],
                signer: signerList[i],
                cover: coverList[i],
                link: linkList[i] || urlList[i],
                url: urlList[i],
                duration: durationList[i],
                bitRate: bitRateList[i],
                lyrics: lyricsList[i] || null,
                origin: origin[i] || null,
                comment: commentList?.[i] || undefined,
                error: null,
            };

            mediaDataArray.push(mediaData);
        }
        /*
        if (config.loggerinfo) {
            logger.info(mediaDataArray)
        }
        */
        return mediaDataArray;
    }

}
exports.apply = apply;
