import { Schema, Logger, h, Context, Session } from "koishi";
import type { Config } from './index';

export class BilibiliParser {
    private lastProcessedUrls: Record<string, number> = {};

    constructor(private ctx: Context, private config: Config, private logger: Logger) { }

    public logInfo(...args: any[]) {
        if (this.config.loggerinfo) {
            (this.logger.info as (...args: any[]) => void)(...args);
        }
    }

    //  判断是否需要解析
    public async isProcessLinks(sessioncontent: string) {
        // 解析内容中的链接
        const links = this.link_type_parser(sessioncontent);
        if (links.length === 0) {
            return false; // 如果没有找到链接，返回 false
        }
        return links; // 返回解析出的链接
    }

    //提取链接
    public async extractLinks(session: Session, links: { type: string; id: string }[]) {
        let ret = "";
        if (!this.config.isfigure) {
            ret += h("quote", { id: session.messageId });
        }
        let countLink = 0;
        let tp_ret: string;

        // 循环检测链接类型
        for (const element of links) {
            if (countLink >= 1) ret += "\n";
            if (countLink >= this.config.parseLimit) {
                ret += "已达到解析上限…";
                break;
            }
            tp_ret = await this.type_processer(element);
            if (tp_ret == "") {
                if (this.config.showError)
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
    public isLinkProcessedRecently(ret: string, channelId: string) {
        const lastretUrl = this.extractLastUrl(ret); // 提取 ret 最后一个 http 链接作为解析目标
        const currentTime = Date.now();

        //  channelId 作为 key 的一部分，分频道鉴别
        const channelKey = `${channelId}:${lastretUrl}`;

        if (lastretUrl && this.lastProcessedUrls[channelKey] && (currentTime - this.lastProcessedUrls[channelKey] < this.config.MinimumTimeInterval * 1000)) {
            this.ctx.logger.info(`重复出现，略过处理：\n ${lastretUrl} (频道 ${channelId})`);

            return true; // 已经处理过
        }

        // 更新该链接的最后处理时间，使用 channelKey
        if (lastretUrl) {
            this.lastProcessedUrls[channelKey] = currentTime;
        }
        return false; // 没有处理过
    }

    public async processVideoFromLink(session: Session, ret: string, options: { video?: boolean; audio?: boolean; link?: boolean } = { video: true }) {
        const lastretUrl = this.extractLastUrl(ret);

        let waitTipMsgId: string = null;
        // 等待提示语单独发送
        if (this.config.waitTip_Switch) {
            const result = await session.send(`${h.quote(session.messageId)}${this.config.waitTip_Switch}`);
            waitTipMsgId = Array.isArray(result) ? result[0] : result;
        }

        let videoElements: any[] = []; // 用于存储视频相关元素
        let textElements: any[] = []; // 用于存储图文解析元素
        let shouldPerformTextParsing = this.config.videoParseComponents.includes('text');

        // 先进行图文解析
        if (shouldPerformTextParsing) {
            let fullText: string;
            if (this.config.bVideoShowLink) {
                fullText = ret; // 发送完整信息
            } else {
                // 去掉最后一个链接
                fullText = ret.replace(lastretUrl, '');
            }

            // 分割文本
            const textParts = fullText.split('${~~~}');

            // 循环处理每个分割后的部分
            for (const part of textParts) {
                const trimmedPart = part.trim(); // 去除首尾空格
                if (trimmedPart) { // 确保不是空字符串
                    const parsedElements = h.parse(trimmedPart);

                    // 创建 message 元素
                    const messageElement = h('message', {
                        userId: session.userId,
                        nickname: session.author?.nickname || session.username,
                    }, parsedElements);

                    // 添加 message 元素到 textElements
                    textElements.push(messageElement);
                }
            }
        }

        // 视频/链接解析
        if (this.config.videoParseComponents.length > 0) {
            const fullAPIurl = `http://api.xingzhige.cn/API/b_parse/?url=${encodeURIComponent(lastretUrl)}`;

            try {
                const responseData: any = await this.ctx.http.get(fullAPIurl);

                if (responseData.code === 0 && responseData.msg === "video" && responseData.data) {
                    const { bvid, cid, video } = responseData.data;
                    const bilibiliUrl = `https://api.bilibili.com/x/player/playurl?fnval=80&cid=${cid}&bvid=${bvid}`;
                    const playData: any = await this.ctx.http.get(bilibiliUrl);

                    this.logInfo(bilibiliUrl);

                    if (playData.code === 0 && playData.data && playData.data.dash && playData.data.dash.duration) {
                        const videoDurationSeconds = playData.data.dash.duration;
                        const videoDurationMinutes = videoDurationSeconds / 60;

                        // 检查视频是否太短
                        if (videoDurationMinutes < this.config.Minimumduration) {

                            // 根据 Minimumduration_tip 的值决定行为
                            if (this.config.Minimumduration_tip === 'return') {
                                // 不返回文字提示，直接返回
                                return;
                            } else if (typeof this.config.Minimumduration_tip === 'object' && this.config.Minimumduration_tip !== null) {
                                // 返回文字提示
                                if (this.config.Minimumduration_tip.tipcontent) {
                                    if (this.config.Minimumduration_tip.tipanalysis) {
                                        videoElements.push(h.text(this.config.Minimumduration_tip.tipcontent));
                                    } else {
                                        await session.send(this.config.Minimumduration_tip.tipcontent);
                                    }
                                }

                                // 决定是否进行图文解析
                                shouldPerformTextParsing = this.config.Minimumduration_tip.tipanalysis === true;

                                // 如果不进行图文解析，清空已准备的文本元素
                                if (!shouldPerformTextParsing) {
                                    textElements = [];
                                }
                            }
                        }
                        // 检查视频是否太长
                        else if (videoDurationMinutes > this.config.Maximumduration) {

                            // 根据 Maximumduration_tip 的值决定行为
                            if (this.config.Maximumduration_tip === 'return') {
                                // 不返回文字提示，直接返回
                                return;
                            } else if (typeof this.config.Maximumduration_tip === 'object' && this.config.Maximumduration_tip !== null) {
                                // 返回文字提示
                                if (this.config.Maximumduration_tip.tipcontent) {
                                    if (this.config.Maximumduration_tip.tipanalysis) {
                                        videoElements.push(h.text(this.config.Maximumduration_tip.tipcontent));
                                    } else {
                                        await session.send(this.config.Maximumduration_tip.tipcontent);
                                    }
                                }

                                // 决定是否进行图文解析
                                shouldPerformTextParsing = this.config.Maximumduration_tip.tipanalysis === true;

                                // 如果不进行图文解析，清空已准备的文本元素
                                if (!shouldPerformTextParsing) {
                                    textElements = [];
                                }
                            }
                        } else {
                            // 视频时长在允许范围内，处理视频
                            let videoData = video.url;  // 使用新变量名，避免覆盖原始URL
                            this.logInfo(videoData);

                            if (this.config.filebuffer) {
                                try {
                                    const videoFileBuffer: any = await this.ctx.http.file(video.url);
                                    this.logInfo(videoFileBuffer);

                                    // 检查文件类型
                                    if (videoFileBuffer && videoFileBuffer.data) {
                                        // 将ArrayBuffer转换为Buffer
                                        const buffer = Buffer.from(videoFileBuffer.data);

                                        // 获取MIME类型
                                        const mimeType = videoFileBuffer.type || videoFileBuffer.mime || 'video/mp4';

                                        // 创建data URI
                                        const base64Data = buffer.toString('base64');
                                        videoData = `data:${mimeType};base64,${base64Data}`;

                                        this.logInfo("成功使用 ctx.http.file 将视频URL 转换为data URI格式");
                                    } else {
                                        this.logInfo("文件数据无效，使用原始URL");
                                    }
                                } catch (error) {
                                    this.logger.error("获取视频文件失败:", error);
                                    // 出错时继续使用原始URL
                                }
                            }

                            if (videoData) {
                                if (options.link) {
                                    // 如果是链接选项，仍然使用原始URL
                                    videoElements.push(h.text(video.url));
                                } else if (options.audio) {
                                    videoElements.push(h.audio(videoData));
                                } else {
                                    if (this.config.videoParseComponents.includes('log')) {
                                        this.logger.info(video.url);
                                    }
                                    if (this.config.videoParseComponents.includes('link')) {
                                        videoElements.push(h.text(video.url));
                                    }
                                    if (this.config.videoParseComponents.includes('video')) {
                                        videoElements.push(h.video(videoData));
                                    }
                                }
                            } else {
                                throw new Error("解析视频直链失败");
                            }

                        }
                    } else {
                        throw new Error("获取播放数据失败");
                    }
                } else {
                    throw new Error("解析视频信息失败或非视频类型内容");
                }
            } catch (error) {
                this.logger.error("请求解析 API 失败或处理出错:", error);
            }
        }

        // 准备发送的所有元素
        let allElements = [...textElements, ...videoElements];

        if (allElements.length === 0) {
            return;
        }

        // 合并转发处理
        if (this.config.isfigure && (session.platform === "onebot" || session.platform === "red")) {
            this.logInfo(`使用合并转发，正在合并消息。`);

            // 创建 figure 元素
            const figureContent = h('figure', {
                children: allElements
            });

            if (this.config.loggerinfofulljson) {
                this.logInfo(JSON.stringify(figureContent, null, 2));
            }

            // 发送合并转发消息
            await session.send(figureContent);
        } else {
            // 没有启用合并转发，按顺序发送所有元素
            for (const element of allElements) {
                await session.send(element);
            }
        }

        this.logInfo(`机器人已发送完整消息。`);
        if (waitTipMsgId) {
            await session.bot.deleteMessage(session.channelId, waitTipMsgId);
        }
        return;
    }

    // 提取最后一个URL
    private extractLastUrl(text: string): string | null {
        const urlPattern = /https?:\/\/[^\s]+/g;
        const urls = text.match(urlPattern);
        return urls ? urls.pop() : null;
    }

    // 检测BV / AV 号并转换为URL
    public convertBVToUrl(text: string): string[] {
        const bvPattern = /(?:^|\s)(BV\w{10})(?:\s|$)/g;
        const avPattern = /(?:^|\s)(av\d+)(?:\s|$)/g;
        const matches: string[] = [];
        let match: RegExpExecArray;

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

    private numeral(number: number): string | number {
        if (this.config.useNumeral) {
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

    /**
     * 解析 ID 类型
     * @param id 视频 ID
     * @returns type: ID 类型, id: 视频 ID
     */
    private vid_type_parse(id: string): { type: string | null; id: string | null } {
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
    private async fetch_video_info(id: string): Promise<any> {
        var ret: any;
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
    private async gen_context(id: string): Promise<string | null> {
        const info = await this.fetch_video_info(id);
        if (!info || !info["data"])
            return null;

        let description = info["data"]["desc"];
        // 根据配置处理简介
        const maxLength = this.config.bVideoShowIntroductionTofixed;
        if (description.length > maxLength) {
            description = description.substring(0, maxLength) + '...';
        }
        // 定义占位符对应的数据
        const placeholders: Record<string, string> = {
            '${标题}': info["data"]["title"],
            '${UP主}': info["data"]["owner"]["name"],
            '${封面}': `<img src="${info["data"]["pic"]}"/>`,
            '${简介}': description, // 使用处理后的简介
            '${点赞}': `${this.numeral(info["data"]["stat"]["like"])}`,
            '${投币}': `${this.numeral(info["data"]["stat"]["coin"])}`,
            '${收藏}': `${this.numeral(info["data"]["stat"]["favorite"])}`,
            '${转发}': `${this.numeral(info["data"]["stat"]["share"])}`,
            '${观看}': `${this.numeral(info["data"]["stat"]["view"])}`,
            '${弹幕}': `${this.numeral(info["data"]["stat"]["danmaku"])}`,
            '${tab}': `<pre>\t</pre>`
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

    /**
    * 链接类型解析
    * @param content 传入消息
    * @returns type: "链接类型", id :"内容ID"
    */
    private link_type_parser(content: string): { type: string; id: string }[] {
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
        var ret: { type: string; id: string }[] = [];
        for (const rule of linkRegex) {
            var match: RegExpExecArray;
            let lastID: string;
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
    * @param element 链接列表
    * @returns 解析来的文本
    */
    private async type_processer(element: { type: string; id: string }): Promise<string> {
        var ret = "";
        switch (element["type"]) {
            case "Video":
                const video_info = await this.gen_context(element["id"]);
                if (video_info != null)
                    ret += video_info;
                break;

            case "Short":
                const typed_link = this.link_type_parser(await this.get_redir_url(element["id"]));
                for (const element of typed_link) {
                    const final_info = await this.type_processer(element);
                    if (final_info != null)
                        ret += final_info;
                    break;
                }
                break;
        }
        return ret;
    }

    /**
    * 根据短链接重定向获取正常链接
    * @param id 短链接 ID
    * @returns 正常链接
    */
    private async get_redir_url(id: string): Promise<string | null> {
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