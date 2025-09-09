import { Schema, Logger, h, Context, Session } from "koishi";
import { } from "koishi-plugin-puppeteer";

const logger = new Logger('bilibili-videolink-analysis');

export const name = 'bilibili-videolink-analysis';
export const inject = {
  optional: ['puppeteer'],
  //  required: ['BiliBiliVideo']
}
export const usage = `

<h2>→ <a href="https://www.npmjs.com/package/koishi-plugin-bilibili-videolink-analysis" target="_blank">可以点击这里查看详细的文档说明✨</a></h2>

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

export interface Config {
  demand: boolean;
  timeout?: number;
  point?: [number, number];
  enable?: boolean;
  enablebilianalysis: boolean;
  waitTip_Switch?: string | null;
  linktextParsing: boolean;
  VideoParsing_ToLink: '1' | '2' | '3' | '4' | '5';
  BVnumberParsing: boolean;
  MinimumTimeInterval: number;
  Minimumduration: number;
  Minimumduration_tip: 'return' | { tipcontent: string; tipanalysis: boolean } | null;
  Maximumduration: number;
  Maximumduration_tip: 'return' | { tipcontent: string; tipanalysis: boolean } | null;
  parseLimit: number;
  useNumeral: boolean;
  showError: boolean;
  bVideoIDPreference: "bv" | "av";
  bVideo_area: string;
  bVideoShowLink: boolean;
  bVideoShowIntroductionTofixed: number;
  isfigure: boolean;
  filebuffer: boolean;
  middleware: boolean;
  userAgent: string;
  pageclose: boolean;
  loggerinfo: boolean;
  loggerinfofulljson: boolean;
}

export const Config = Schema.intersect([
  Schema.object({
    demand: Schema.boolean().default(true).description("开启点播指令功能<br>`其实点播登录不登录 都搜不准，登录只是写着玩的`"),
  }).description('点播设置（需要puppeteer服务）'),
  Schema.union([
    Schema.object({
      demand: Schema.const(false).required(),
    }),
    Schema.object({
      demand: Schema.const(true),
      timeout: Schema.number().role('slider').min(1).max(300).step(1).default(60).description('指定播放视频的输入时限。`单位 秒`'),
      point: Schema.tuple([Number, Number]).description('序号标注位置。分别表示`距离顶部 距离左侧`的百分比').default([50, 50]),
      enable: Schema.boolean().description('是否开启自动解析`选择对应视频 会自动解析视频内容`').default(true),
    }),
  ]),

  Schema.object({
    enablebilianalysis: Schema.boolean().default(true).description("开启解析功能<br>`关闭后，解析功能将关闭`"),
  }).description('视频解析 - 功能开关'),
  Schema.union([
    Schema.object({
      enablebilianalysis: Schema.const(false).required(),
    }),
    Schema.intersect([
      Schema.object({
        enablebilianalysis: Schema.const(true),
        // @ts-ignore // 摸了摸了
        waitTip_Switch: Schema.union([
          Schema.const(null).description('不返回文字提示'),
          Schema.string().description('返回文字提示（请在右侧填写文字内容）').default('正在解析B站链接...'),
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
        MinimumTimeInterval: Schema.number().default(180).description("若干`秒`内 不再处理相同链接 `防止多bot互相触发 导致的刷屏/性能浪费`").min(1),
      }),

      Schema.object({
        enablebilianalysis: Schema.const(true),
        Minimumduration: Schema.number().default(0).description("允许解析的视频最小时长（分钟）`低于这个时长 就不会发视频内容`").min(0),
        Minimumduration_tip: Schema.union([
          Schema.const('return').description('不返回文字提示'),
          Schema.object({
            tipcontent: Schema.string().default('视频太短啦！不看不看~').description("文字提示内容"),
            tipanalysis: Schema.boolean().default(true).description("是否进行图文解析（不会返回视频链接）"),
          }).description('返回文字提示'),
          Schema.const(null),
        ]).description("对`过短视频`的文字提示内容").default(null),
        Maximumduration: Schema.number().default(25).description("允许解析的视频最大时长（分钟）`超过这个时长 就不会发视频内容`").min(1),
        Maximumduration_tip: Schema.union([
          Schema.const('return').description('不返回文字提示'),
          Schema.object({
            tipcontent: Schema.string().default('视频太长啦！内容还是去B站看吧~').description("文字提示内容"),
            tipanalysis: Schema.boolean().default(true).description("是否进行图文解析（不会返回视频链接）"),
          }).description('返回文字提示'),
          Schema.const(null),
        ]).description("对`过长视频`的文字提示内容").default(null),
      }).description("视频解析 - 内容限制"),

      Schema.object({
        parseLimit: Schema.number().default(3).description("单对话多链接解析上限").hidden(),
        useNumeral: Schema.boolean().default(true).description("使用格式化数字").hidden(),
        showError: Schema.boolean().default(false).description("当链接不正确时提醒发送者").hidden(),
        bVideoIDPreference: Schema.union([
          Schema.const("bv").description("BV 号"),
          Schema.const("av").description("AV 号"),
        ]).default("bv").description("ID 偏好").hidden(),

        bVideo_area: Schema.string().role('textarea', { rows: [8, 16] })
          .default("${标题} --- ${UP主}\n${简介}\n点赞：${点赞} --- 投币：${投币}\n收藏：${收藏} --- 转发：${转发}\n观看：${观看} --- 弹幕：${弹幕}\n${~~~}\n${封面}")
          .description(`图文解析的返回格式<br>
注意变量格式，以及变量名称。<br>比如 \`\${标题}\` 不可以变成\`\${标题123}\`，你可以直接删掉但是不能修改变量名称哦<br>
当然变量也不能无中生有，下面的默认值内容 就是所有变量了，你仅可以删去变量 或者修改变量之外的格式。<br>
· 特殊变量\`\${~~~}\`表示分割线，会把上下内容分为两个信息单独发送。\`\${tab}\`表示制表符。`),
        bVideoShowLink: Schema.boolean().default(false).description("在末尾显示视频的链接地址 `开启可能会导致其他bot循环解析`"),
        bVideoShowIntroductionTofixed: Schema.number().default(50).description("视频的`简介`最大的字符长度<br>超出部分会使用 `...` 代替"),
      }).description("链接的图文解析设置"),

      Schema.object({
        isfigure: Schema.boolean().default(false).description("是否开启合并转发 `仅支持 onebot 适配器` 其他平台开启 无效").experimental(),
        filebuffer: Schema.boolean().default(true).description("是否将视频链接下载后再发送 （以解决部分onebot协议端的问题）<br>否则使用视频直链发送").experimental(),
        middleware: Schema.boolean().default(false).description("前置中间件模式"),
        userAgent: Schema.string().description("所有 API 请求所用的 User-Agent").default("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"),
      }).description("调试设置"),
    ]),
  ]),

  Schema.object({
    pageclose: Schema.boolean().default(true).description("自动`page.close()`<br>非开发者请勿改动").experimental(),
    loggerinfo: Schema.boolean().default(false).description("日志调试输出 `日常使用无需开启`<br>非开发者请勿改动").experimental(),
    loggerinfofulljson: Schema.boolean().default(false).description("打印完整的机器人发送的json输出").experimental(),
  }).description("开发者选项"),
]);

export function apply(ctx: Context, config: Config) {

  // 记录上次处理链接的时间
  const lastProcessedUrls: Record<string, number> = {};

  if (config.enablebilianalysis) {
    ctx.middleware(async (session, next) => {
      let sessioncontent = session.stripped.content;
      if (config.BVnumberParsing) {
        const bvUrls = convertBVToUrl(sessioncontent);
        if (bvUrls.length > 0) {
          sessioncontent += '\n' + bvUrls.join('\n');
        }
      }
      const links = await isProcessLinks(sessioncontent); // 判断是否需要解析
      if (links) {
        const ret = await extractLinks(session, links); // 提取链接
        if (ret && !isLinkProcessedRecently(ret, session.channelId)) {
          await processVideoFromLink(session, ret); // 解析视频并返回
        }
      }
      return next();
    }, config.middleware);
  }

  if (config.demand) {
    ctx.command('B站点播 [keyword]', '点播B站视频')
      .option('video', '-v 解析返回视频')
      .option('audio', '-a 解析返回语音')
      .option('link', '-l 解析返回链接')
      .option('page', '-p <page:number> 指定页数', { fallback: '1' })
      .example('B站点播   遠い空へ  -v')
      .action(async ({ options, session }, keyword) => {
        if (!keyword) {
          await session.send(h.text('告诉我 你想要点播的关键词吧~'))
          keyword = await session.prompt(30 * 1000)
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
        const videos = await page.evaluate((point: [number, number]) => {
          const items = Array.from(document.querySelectorAll('.video-list-item:not([style*="display: none"])'))
          return items.map((item, index) => {
            const link = item.querySelector('a')
            const href = link?.getAttribute('href') || ''
            const idMatch = href.match(/\/video\/(BV\w+)\//)
            const id = idMatch ? idMatch[1] : ''

            if (!id) {
              // 如果没有提取到视频ID，隐藏这个元素
              const htmlElement = item as HTMLElement
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
              const videoElement = item as HTMLElement
              videoElement.style.position = 'relative'
              videoElement.appendChild(overlay)
            }

            return { id }
          }).filter(video => video.id)
        }, config.point) // 传递配置的 point 参数

        logInfo(options)
        logInfo(`共找到 ${videos.length} 个视频:`)
        videos.forEach((video: any, index: number) => {
          logInfo(`序号 ${index + 1}: ID - ${video.id}`)
        })


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
        logInfo("窗口：宽度：")
        logInfo(1440)

        logInfo("窗口：高度：")
        logInfo(viewportHeight)
        let msg: any;

        // 截图
        const videoListElement = await page.$('.video-list.row')
        if (videoListElement) {
          const imgBuf = await videoListElement.screenshot({
            captureBeyondViewport: false
          }) as Buffer
          msg = h.image(imgBuf, 'image/png')
        }
        if (page && config.pageclose) {
          await page.close()
        }

        // 发送截图
        await session.send(msg + h.text(`请选择视频的序号：`))
        // 等待用户输入
        const userChoice = await session.prompt(config.timeout * 1000)
        const choiceIndex = parseInt(userChoice) - 1
        if (isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex >= videos.length) {
          await session.send(h.text('输入无效，请输入正确的序号。'))
          return
        }

        // 返回用户选择的视频ID
        const chosenVideo = videos[choiceIndex]

        logInfo(`渲染序号设置\noverlay.style.top = ${config.point[0]}% \noverlay.style.left = ${config.point[1]}%`)
        logInfo(`用户选择了序号 ${choiceIndex + 1}: ID - ${chosenVideo.id}`)

        // 开启自动解析了
        if (config.enable) {
          const ret = await extractLinks(session, [{ type: 'Video', id: chosenVideo.id }]); // 提取链接
          if (ret && !isLinkProcessedRecently(ret, session.channelId)) {
            await processVideoFromLink(session, ret, options); // 解析视频并返回
          }
        }
      })
  }

  function logInfo(...args: any[]) {
    if (config.loggerinfo) {
      (logger.info as (...args: any[]) => void)(...args);
    }
  }

  //  判断是否需要解析
  async function isProcessLinks(sessioncontent: string) {
    // 解析内容中的链接
    const links = link_type_parser(sessioncontent);
    if (links.length === 0) {
      return false; // 如果没有找到链接，返回 false
    }
    return links; // 返回解析出的链接
  }

  //提取链接 
  async function extractLinks(session: Session, links: { type: string; id: string }[]) {
    let ret = "";
    if (!config.isfigure) {
      ret += h("quote", { id: session.messageId });
    }
    let countLink = 0;
    let tp_ret: string;

    // 循环检测链接类型
    for (const element of links) {
      if (countLink >= 1) ret += "\n";
      if (countLink >= config.parseLimit) {
        ret += "已达到解析上限…";
        break;
      }
      tp_ret = await type_processer(element);
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
  function isLinkProcessedRecently(ret: string, channelId: string) {
    const lastretUrl = extractLastUrl(ret); // 提取 ret 最后一个 http 链接作为解析目标
    const currentTime = Date.now();

    //  channelId 作为 key 的一部分，分频道鉴别
    const channelKey = `${channelId}:${lastretUrl}`;

    if (lastretUrl && lastProcessedUrls[channelKey] && (currentTime - lastProcessedUrls[channelKey] < config.MinimumTimeInterval * 1000)) {
      ctx.logger.info(`重复出现，略过处理：\n ${lastretUrl} (频道 ${channelId})`);

      return true; // 已经处理过
    }

    // 更新该链接的最后处理时间，使用 channelKey
    if (lastretUrl) {
      lastProcessedUrls[channelKey] = currentTime;
    }
    return false; // 没有处理过
  }

  async function processVideoFromLink(session: Session, ret: string, options: { video?: boolean; audio?: boolean; link?: boolean } = { video: true }) {
    const lastretUrl = extractLastUrl(ret);

    let waitTipMsgId: string = null;
    // 等待提示语单独发送
    if (config.waitTip_Switch) {
      const result = await session.send(`${h.quote(session.messageId)}${config.waitTip_Switch}`);
      waitTipMsgId = Array.isArray(result) ? result[0] : result;
    }

    let videoElements: any[] = []; // 用于存储视频相关元素
    let textElements: any[] = []; // 用于存储图文解析元素
    let shouldPerformTextParsing = config.linktextParsing;

    // 先进行图文解析
    if (shouldPerformTextParsing) {
      let fullText: string;
      if (config.bVideoShowLink) {
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
    if (config.VideoParsing_ToLink) {
      const fullAPIurl = `http://api.xingzhige.cn/API/b_parse/?url=${encodeURIComponent(lastretUrl)}`;

      try {
        const responseData: any = await ctx.http.get(fullAPIurl);

        if (responseData.code === 0 && responseData.msg === "video" && responseData.data) {
          const { bvid, cid, video } = responseData.data;
          const bilibiliUrl = `https://api.bilibili.com/x/player/playurl?fnval=80&cid=${cid}&bvid=${bvid}`;
          const playData: any = await ctx.http.get(bilibiliUrl);

          logInfo(bilibiliUrl);

          if (playData.code === 0 && playData.data && playData.data.dash && playData.data.dash.duration) {
            const videoDurationSeconds = playData.data.dash.duration;
            const videoDurationMinutes = videoDurationSeconds / 60;

            // 检查视频是否太短
            if (videoDurationMinutes < config.Minimumduration) {

              // 根据 Minimumduration_tip 的值决定行为
              if (config.Minimumduration_tip === 'return') {
                // 不返回文字提示，直接返回
                return;
              } else if (typeof config.Minimumduration_tip === 'object' && config.Minimumduration_tip !== null) {
                // 返回文字提示
                if (config.Minimumduration_tip.tipcontent) {
                  if (config.Minimumduration_tip.tipanalysis) {
                    videoElements.push(h.text(config.Minimumduration_tip.tipcontent));
                  } else {
                    await session.send(config.Minimumduration_tip.tipcontent);
                  }
                }

                // 决定是否进行图文解析
                shouldPerformTextParsing = config.Minimumduration_tip.tipanalysis === true;

                // 如果不进行图文解析，清空已准备的文本元素
                if (!shouldPerformTextParsing) {
                  textElements = [];
                }
              }
            }
            // 检查视频是否太长
            else if (videoDurationMinutes > config.Maximumduration) {

              // 根据 Maximumduration_tip 的值决定行为
              if (config.Maximumduration_tip === 'return') {
                // 不返回文字提示，直接返回
                return;
              } else if (typeof config.Maximumduration_tip === 'object' && config.Maximumduration_tip !== null) {
                // 返回文字提示
                if (config.Maximumduration_tip.tipcontent) {
                  if (config.Maximumduration_tip.tipanalysis) {
                    videoElements.push(h.text(config.Maximumduration_tip.tipcontent));
                  } else {
                    await session.send(config.Maximumduration_tip.tipcontent);
                  }
                }

                // 决定是否进行图文解析
                shouldPerformTextParsing = config.Maximumduration_tip.tipanalysis === true;

                // 如果不进行图文解析，清空已准备的文本元素
                if (!shouldPerformTextParsing) {
                  textElements = [];
                }
              }
            } else {
              // 视频时长在允许范围内，处理视频
              let videoData = video.url;  // 使用新变量名，避免覆盖原始URL
              logInfo(videoData);

              if (config.filebuffer) {
                try {
                  const videoFileBuffer: any = await ctx.http.file(video.url);
                  logInfo(videoFileBuffer);

                  // 检查文件类型
                  if (videoFileBuffer && videoFileBuffer.data) {
                    // 将ArrayBuffer转换为Buffer
                    const buffer = Buffer.from(videoFileBuffer.data);

                    // 获取MIME类型
                    const mimeType = videoFileBuffer.type || videoFileBuffer.mime || 'video/mp4';

                    // 创建data URI
                    const base64Data = buffer.toString('base64');
                    videoData = `data:${mimeType};base64,${base64Data}`;

                    logInfo("成功使用 ctx.http.file 将视频URL 转换为data URI格式");
                  } else {
                    logInfo("文件数据无效，使用原始URL");
                  }
                } catch (error) {
                  logger.error("获取视频文件失败:", error);
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
                  switch (config.VideoParsing_ToLink) {
                    case '1':
                      break;
                    case '2':
                      videoElements.push(h.video(videoData));
                      break;
                    case '3':
                      videoElements.push(h.text(video.url));
                      break;
                    case '4':
                      videoElements.push(h.text(video.url));
                      videoElements.push(h.video(videoData));
                      break;
                    case '5':
                      logger.info(video.url);
                      videoElements.push(h.video(videoData));
                      break;
                    default:
                      break;
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
        logger.error("请求解析 API 失败或处理出错:", error);
      }
    }

    // 准备发送的所有元素
    let allElements = [...textElements, ...videoElements];

    if (allElements.length === 0) {
      return;
    }

    // 合并转发处理
    if (config.isfigure && (session.platform === "onebot" || session.platform === "red")) {
      logInfo(`使用合并转发，正在合并消息。`);

      // 创建 figure 元素
      const figureContent = h('figure', {
        children: allElements
      });

      if (config.loggerinfofulljson) {
        logInfo(JSON.stringify(figureContent, null, 2));
      }

      // 发送合并转发消息
      await session.send(figureContent);
    } else {
      // 没有启用合并转发，按顺序发送所有元素
      for (const element of allElements) {
        await session.send(element);
      }
    }

    logInfo(`机器人已发送完整消息。`);
    if (waitTipMsgId) {
      await session.bot.deleteMessage(session.channelId, waitTipMsgId);
    }
    return;
  }

  // 提取最后一个URL
  function extractLastUrl(text: string): string | null {
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlPattern);
    return urls ? urls.pop() : null;
  }

  // 检测BV / AV 号并转换为URL
  function convertBVToUrl(text: string): string[] {
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

  function numeral(number: number): string | number {
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

  /**
   * 解析 ID 类型
   * @param id 视频 ID
   * @returns type: ID 类型, id: 视频 ID
   */
  function vid_type_parse(id: string): { type: string | null; id: string | null } {
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
  async function fetch_video_info(id: string): Promise<any> {
    var ret: any;
    const vid = vid_type_parse(id);
    switch (vid["type"]) {
      case "av":
        ret = await ctx.http.get("https://api.bilibili.com/x/web-interface/view?aid=" + vid["id"], {
          headers: {
            "User-Agent": config.userAgent,
          },
        });
        break;
      case "bv":
        ret = await ctx.http.get("https://api.bilibili.com/x/web-interface/view?bvid=" + vid["id"], {
          headers: {
            "User-Agent": config.userAgent,
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
  async function gen_context(id: string): Promise<string | null> {
    const info = await fetch_video_info(id);
    if (!info || !info["data"])
      return null;

    let description = info["data"]["desc"];
    // 根据配置处理简介
    const maxLength = config.bVideoShowIntroductionTofixed;
    if (description.length > maxLength) {
      description = description.substring(0, maxLength) + '...';
    }
    // 定义占位符对应的数据
    const placeholders: Record<string, string> = {
      '${标题}': info["data"]["title"],
      '${UP主}': info["data"]["owner"]["name"],
      '${封面}': `<img src="${info["data"]["pic"]}"/>`,
      '${简介}': description, // 使用处理后的简介
      '${点赞}': `${numeral(info["data"]["stat"]["like"])}`,
      '${投币}': `${numeral(info["data"]["stat"]["coin"])}`,
      '${收藏}': `${numeral(info["data"]["stat"]["favorite"])}`,
      '${转发}': `${numeral(info["data"]["stat"]["share"])}`,
      '${观看}': `${numeral(info["data"]["stat"]["view"])}`,
      '${弹幕}': `${numeral(info["data"]["stat"]["danmaku"])}`,
      '${tab}': `<pre>\t</pre>`
    };

    // 根据配置项中的格式替换占位符
    let ret = config.bVideo_area;
    for (const [placeholder, value] of Object.entries(placeholders)) {
      ret = ret.replace(new RegExp(placeholder.replace(/\$/g, '\\$'), 'g'), value);
    }

    // 根据 ID 偏好添加视频链接
    switch (config.bVideoIDPreference) {
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
  function link_type_parser(content: string): { type: string; id: string }[] {
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
  async function type_processer(element: { type: string; id: string }): Promise<string> {
    var ret = "";
    switch (element["type"]) {
      case "Video":
        const video_info = await gen_context(element["id"]);
        if (video_info != null)
          ret += video_info;
        break;

      case "Short":
        const typed_link = link_type_parser(await get_redir_url(element["id"]));
        for (const element of typed_link) {
          const final_info = await type_processer(element);
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
  async function get_redir_url(id: string): Promise<string | null> {
    var data = await ctx.http.get("https://b23.tv/" + id, {
      redirect: "manual",
      headers: {
        "User-Agent": config.userAgent,
      },
    });
    const match = data.match(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"/i);
    if (match)
      return match[1];
    else
      return null;
  }

}