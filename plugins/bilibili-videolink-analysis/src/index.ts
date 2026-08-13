import { Schema, Logger, h, Context, Session } from "koishi";
import { } from "koishi-plugin-puppeteer";
import { BilibiliParser } from "./utils";

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
  videoParseMode: string[];
  waitTip_Switch?: string | null;
  videoParseComponents: string[];
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
  MaximumFileSizeMB: number;
  middleware: boolean;
  preventSingleUserListAttack: boolean;
  userAgent: string;
  pageclose: boolean;
  loggerinfo: boolean;
  loggerinfofulljson: boolean;
  bufferDelay: number;
}

export const Config = Schema.intersect([
  // 点播功能配置
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

  // 解析功能总开关
  Schema.object({
    enablebilianalysis: Schema.boolean().default(true).description("开启解析功能<br>`关闭后，解析功能将关闭`"),
  }).description('视频解析 - 功能开关'),

  Schema.union([
    Schema.object({
      enablebilianalysis: Schema.const(false).required(),
    }),
    Schema.intersect([
      // 基础解析设置
      Schema.object({
        enablebilianalysis: Schema.const(true),
        waitTip_Switch: Schema.union([
          Schema.const(null).description('不返回文字提示'),
          Schema.string().description('返回文字提示（请在右侧填写文字内容）').default('正在解析B站链接...'),
        ]).description("是否返回等待提示。开启后，会发送`等待提示语`"),
        videoParseMode: Schema.array(Schema.union([
          Schema.const('link').description('解析链接'),
          Schema.const('card').description('解析哔哩哔哩分享卡片'),
        ]))
          .default(['link', 'card'])
          .role('checkbox')
          .description('选择解析来源'),
        videoParseComponents: Schema.array(Schema.union([
          Schema.const('log').description('记录日志'),
          Schema.const('text').description('返回图文'),
          Schema.const('link').description('返回视频直链'),
          Schema.const('video').description('返回视频'),
        ]))
          .default(['text', 'video'])
          .role('checkbox')
          .description('选择要返回的内容组件'),
        BVnumberParsing: Schema.boolean().default(true).description("是否允许根据`独立的BV、AV号`解析视频 `开启后，可以通过视频的BV、AV号解析视频。` <br>  [触发说明见README](https://www.npmjs.com/package/koishi-plugin-bilibili-videolink-analysis)"),
      }).description('基础解析设置'),
      // 视频过滤规则
      Schema.object({
        MinimumTimeInterval: Schema.number().default(180).description("若干`秒`内 不再处理相同链接 `防止多bot互相触发 导致的刷屏/性能浪费`").min(1),
        Minimumduration: Schema.number().default(0).description("允许解析的视频最小时长（分钟）`低于这个时长 就不会发视频内容`").min(0),
        Minimumduration_tip: Schema.union([
          Schema.const('return').description('不返回文字提示'),
          Schema.object({
            tipcontent: Schema.string().default('视频太短啦！不看不看~').description("文字提示内容"),
            tipanalysis: Schema.boolean().default(true).description("是否进行图文解析（不会返回视频链接）"),
          }).description('返回文字提示'),
        ]).description("对`过短视频`的文字提示内容").default(null),
        Maximumduration: Schema.number().default(25).description("允许解析的视频最大时长（分钟）`超过这个时长 就不会发视频内容`").min(1),
        Maximumduration_tip: Schema.union([
          Schema.const('return').description('不返回文字提示'),
          Schema.object({
            tipcontent: Schema.string().default('视频太长啦！内容还是去B站看吧~').description("文字提示内容"),
            tipanalysis: Schema.boolean().default(true).description("是否进行图文解析（不会返回视频链接）"),
          }).description('返回文字提示'),
        ]).description("对`过长视频`的文字提示内容").default(null),
        MaximumFileSizeMB: Schema.number().default(50).description("文件缓冲最大大小（MB）`超过这个大小 就不会发视频内容`<br>设置为0 表示不限制").min(0).max(200),
      }).description('视频过滤规则'),
      // 图文解析设置
      Schema.object({
        bVideo_area: Schema.string().role('textarea', { rows: [8, 16] })
          .default("${标题} ${tab} ${UP主}\n${简介}\n点赞：${点赞} ${tab} 投币：${投币}\n收藏：${收藏} ${tab} 转发：${转发}\n观看：${观看} ${tab} 弹幕：${弹幕}\n${~~~}\n${封面}")
          .description(`图文解析的返回格式<br>
注意变量格式，以及变量名称。<br>比如 \`\${标题}\` 不可以变成\`\${标题123}\`，你可以直接删掉但是不能修改变量名称哦<br>
当然变量也不能无中生有，下面的默认值内容 就是所有变量了，你仅可以删去变量 或者修改变量之外的格式。<br>
· 特殊变量\`\${~~~}\`表示分割线，会把上下内容分为两个信息单独发送。\`\${tab}\`表示制表符。`),
        bVideoShowLink: Schema.boolean().default(false).description("在末尾显示视频的链接地址 `开启可能会导致其他bot循环解析`"),
        bVideoShowIntroductionTofixed: Schema.number().default(50).description("视频的`简介`最大的字符长度<br>超出部分会使用 `...` 代替"),
      }).description('图文解析设置'),
      // 高级功能设置
      Schema.object({
        isfigure: Schema.boolean().default(false).description("是否开启合并转发 `仅支持 onebot 适配器` 其他平台开启 无效").experimental(),
        filebuffer: Schema.boolean().default(true).description("是否将视频链接下载后再发送 （以解决部分onebot协议端的问题）<br>否则使用视频直链发送").experimental(),
        bufferDelay: Schema.number().default(5).description("消息接收缓冲延迟（秒）<br>收到链接后等待指定时间，收集同时发送的多个链接后再逐个处理").min(0).max(30),
        middleware: Schema.boolean().default(false).description("前置中间件模式"),
      }).description('高级功能设置'),
      // 频率限制设置
      Schema.object({
        preventSingleUserListAttack: Schema.boolean().default(true).description("是否禁止单用户列表攻击<br>关闭后就没有解析频率限制。"),
      }).description('频率限制设置'),
      // 网络请求设置
      Schema.object({
        userAgent: Schema.string().description("所有 API 请求所用的 User-Agent").default("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"),
      }).description('网络请求设置'),
      // 隐藏配置项
      Schema.object({
        parseLimit: Schema.number().default(3).description("单对话多链接解析上限").hidden(),
        useNumeral: Schema.boolean().default(true).description("使用格式化数字").hidden(),
        showError: Schema.boolean().default(false).description("当链接不正确时提醒发送者").hidden(),
        bVideoIDPreference: Schema.union([
          Schema.const("bv").description("BV 号"),
          Schema.const("av").description("AV 号"),
        ]).default("bv").description("ID 偏好").hidden(),
      }), // .description('其他设置')
    ]),
  ]),

  // 开发者选项
  Schema.object({
    pageclose: Schema.boolean().default(true).description("自动`page.close()`<br>非开发者请勿改动").experimental(),
    loggerinfo: Schema.boolean().default(false).description("日志调试输出 `日常使用无需开启`<br>非开发者请勿改动").experimental(),
    loggerinfofulljson: Schema.boolean().default(false).description("打印完整的机器人发送的json输出").experimental(),
  }).description("开发者选项"),
]);

export function apply(ctx: Context, config: Config) {
  const bilibiliParser = new BilibiliParser(ctx, config, logger);
  ctx.on('dispose', () => bilibiliParser.dispose());

  if (config.enablebilianalysis) {
    ctx.middleware(async (session, next) => {
      // 尝试解析JSON卡片
      let isCard = false;
      try {
        if (session.stripped.content.startsWith('<json data=')) {
          isCard = true;
        }
      } catch (e) {
        // Not a valid JSON card
      }

      if (isCard) {
        if (!config.videoParseMode.includes('card')) {
          return next();
        }
      } else {
        if (!config.videoParseMode.includes('link')) {
          return next();
        }
      }

      let sessioncontent = session.stripped.content;
      if (config.BVnumberParsing) {
        const bvUrls = bilibiliParser.convertBVToUrl(sessioncontent);
        if (bvUrls.length > 0) {
          sessioncontent += '\n' + bvUrls.join('\n');
        }
      }

      const links = await bilibiliParser.isProcessLinks(sessioncontent);
      if (links) {
        // 直接将整个 session 加入队列，在队列中串行处理
        const reason = await bilibiliParser.queueSession(session, sessioncontent, links.length);
        if (reason) {
          const reasonText = {
            'channel-video-limit': '同一频道同时解析视频数超过限制，已跳过解析',
            'user-video-limit': '同一用户短时间发送视频达到警戒线，已停止后续解析',
          }[reason];
          bilibiliParser.logInfo(`[频率限制] ${reasonText}`);
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

        bilibiliParser.logInfo(options)
        bilibiliParser.logInfo(`共找到 ${videos.length} 个视频:`)
        videos.forEach((video: any, index: number) => {
          bilibiliParser.logInfo(`序号 ${index + 1}: ID - ${video.id}`)
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
        bilibiliParser.logInfo("窗口：宽度：")
        bilibiliParser.logInfo(1440)

        bilibiliParser.logInfo("窗口：高度：")
        bilibiliParser.logInfo(viewportHeight)
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

        bilibiliParser.logInfo(`渲染序号设置\noverlay.style.top = ${config.point[0]}% \noverlay.style.left = ${config.point[1]}%`)
        bilibiliParser.logInfo(`用户选择了序号 ${choiceIndex + 1}: ID - ${chosenVideo.id}`)

        // 开启自动解析了
        if (config.enable) {
          const link = { type: 'Video', id: chosenVideo.id };
          const ret = await bilibiliParser.extractLinks(session, [link]); // 提取链接
          if (ret && !bilibiliParser.isLinkProcessedRecently(ret, session.channelId)) {
            await bilibiliParser.processVideoFromLink(session, ret, options); // 加入缓冲队列
          }
        }
      })
  }
}
