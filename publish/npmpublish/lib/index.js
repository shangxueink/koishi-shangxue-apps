"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { h, Schema } = require("koishi");
const name = "screenshot-links";
const inject = ["logger", "puppeteer"];
const usage = `
---

## 开启插件前，请确保一下插件已经安装！

### 所需依赖：


- [puppeteer服务](/market?keyword=koishi-plugin-puppeteer+email:shigma10826@gmail.com)  （需要额外安装）

- [logger服务](/market?keyword=logger+email:shigma10826@gmail.com) （koishi自带）

- i18n服务 （koishi自带）

---

可以通过指令或中间件方式获取网页截图的插件。

## 功能特点

- 支持指令模式：使用指令获取指定网页的截图
- 支持中间件模式：自动检测消息中的URL并返回截图
- 支持URL别名映射：可配置常用网站的快捷名称
- 支持黑白名单域名和用户
- 多种截图选项：自适应截图、指定选择器等

## 使用方法

- 指令模式：\`看看 B站\` 或 \`看看 https://example.com\`
- 中间件模式：直接发送URL链接即可自动截图

---
`;

const Config = Schema.intersect([
  Schema.object({
    workmodel: Schema.union([
      Schema.const('command').description('指令'),
      Schema.const('middleware').description('中间件'),
      Schema.const('allways').description('指令+中间件'),
    ]).role('radio').default("allways").description("工作模式选择"),
  }).description('基础设置'),
  Schema.union([
    Schema.object({
      workmodel: Schema.const('command').required(),
      commandname: Schema.string().default("看看").description("指令名称"),
      urlmaplist: Schema.array(Schema.object({
        name: Schema.string().description("名称"),
        url: Schema.string().role('link').description("地址"),
      })).role('table').description("链接地址 映射表<br>可使用`名称`快速截图对应的`地址`").default([
        {
          "name": "B站",
          "url": "https://www.bilibili.com/"
        }
      ]),
    }).description('指令解析配置'),
    Schema.object({
      workmodel: Schema.const('middleware').required(),
      truemiddleware: Schema.boolean().default(false).description("使用`前置中间件`监听"),
    }).description('中间件解析配置'),
    Schema.object({
      workmodel: Schema.const('allways'),
      commandname: Schema.string().default("看看").description("指令名称"),
      urlmaplist: Schema.array(Schema.object({
        name: Schema.string().description("名称"),
        url: Schema.string().role('link').description("地址"),
      })).role('table').description("链接地址 映射表<br>可使用`名称`快速截图对应的`地址`").default([
        {
          "name": "B站",
          "url": "https://www.bilibili.com/"
        }
      ]),
      truemiddleware: Schema.boolean().default(false).description("使用`前置中间件`监听"),
    }).description('解析配置配置(指令+中间件)'),
  ]),

  Schema.object({
    protocols: Schema.array(String).default(['http', 'https']).description('允许的协议列表。'),
    screenshotquality: Schema.number().role('slider').min(0).max(100).step(1).default(80).description('设置图片压缩质量（%）'),
    setViewport: Schema.tuple([Number, Number]).default([1280, 800]).description('设置截图视口的初始宽度和高度（像素）'),
    loadTimeout: Schema.number().default(10).description('加载页面的最长时间（秒）。当一个页面等待时间超过这个值时，如果此页面主体已经加载完成，则会发送一条提示消息"正在加载中，请稍等片刻"并继续等待加载；否则会直接提示"无法打开页面"并终止加载。'),
    idleTimeout: Schema.number().default(30).description('等待页面空闲的最长时间（秒）。当一个页面等待时间超过这个值时，将停止进一步的加载并立即发送截图。'),
    maxHeightRatio: Schema.number().default(10).description('最大高度与宽度的比例。例如，如果设置为10，宽度为1280，则最大高度为12800像素。'),
  }).description('截图设置'),

  Schema.object({
    domainWhitelist: Schema.array(String).default([]).description('域名白名单，仅允许截图这些域名（默认留空 表示不限制）'),
    domainBlacklist: Schema.array(String).default([]).description('域名黑名单，禁止截图这些域名'),
    userWhitelist: Schema.array(String).default([]).description('用户白名单（填入userId），仅允许这些用户使用截图功能（默认留空 表示不限制）'),
    userBlacklist: Schema.array(String).default([]).description('用户黑名单，禁止这些用户使用截图功能'),
    channelWhitelist: Schema.array(String).default([]).description('频道白名单（填入channelId），仅允许在这些频道使用截图功能（默认留空 表示不限制）'),
    channelBlacklist: Schema.array(String).default([]).description('频道黑名单，禁止在这些频道使用截图功能'),
    isDirectsession: Schema.boolean().default(false).description("是否允许私聊解析 (默认禁止)"),
  }).description('权限设置'),

  Schema.object({
    loggerinfo: Schema.boolean().default(false).description('启用日志调试模式').experimental(),
  }).description('调试设置'),
]);

async function apply(ctx, config) {
  ctx.on('ready', () => {
    const logger = ctx.logger(name);

    function logInfo(message, data = "") {
      if (config.loggerinfo) {
        logger.info(message, data);
      }
    }

    // 频道鉴权
    function checkChannelPermission(session) {
      logInfo(`频道 ${session.channelId} 触发鉴权`)
      if (session.isDirect && config.isDirectsession) {
        return true
      }
      if (!session.channelId) {
        return true; // 如果没有频道ID，则默认允许
      }

      if (config.channelWhitelist && config.channelWhitelist.length > 0) {
        return config.channelWhitelist.includes(session.channelId);
      }
      if (config.channelBlacklist && config.channelBlacklist.includes(session.channelId)) {
        return false;
      }
      return true;
    }

    // 检查用户是否有权限使用截图功能
    function checkUserPermission(userId) {
      logInfo(`用户 ${userId} 触发鉴权`)
      if (config.userWhitelist && config.userWhitelist.length > 0) {
        return config.userWhitelist.includes(userId);
      }
      if (config.userBlacklist && config.userBlacklist.includes(userId)) {
        return false;
      }
      return true;
    }

    // 检查域名是否允许截图
    function checkDomainPermission(url) {
      try {
        const domain = new URL(url).hostname;
        logInfo(`用户输入链接： ${url}`, `解析到域名：${domain}`)
        if (config.domainWhitelist && config.domainWhitelist.length > 0) {
          return config.domainWhitelist.some(d => domain.includes(d));
        }
        if (config.domainBlacklist && config.domainBlacklist.some(d => domain.includes(d))) {
          return false;
        }
        return true;
      } catch (e) {
        return false;
      }
    }

    // 从URL映射表中查找URL
    function findUrlFromMap(name) {
      const urlMap = config.urlmaplist || [];
      const found = urlMap.find(item => item.name === name);
      return found ? found.url : null;
    }

    // 格式化URL，确保有正确的协议
    function formatUrl(url) {
      const { protocols } = config;
      const scheme = /^(\w+):\/\//.exec(url);

      if (!scheme) {
        return 'http://' + url;
      } else if (!protocols.includes(scheme[1])) {
        return null;
      }

      return url;
    }

    // 截图功能的核心实现
    async function takeScreenshot(session, url, options = {}) {
      logInfo(`正在截取网页：${url}`);

      if (!checkUserPermission(session.userId)) {
        return;
      }

      if (!checkChannelPermission(session)) {
        return;
      }

      if (!checkDomainPermission(url)) {
        return '该域名不允许截图。';
      }

      // 将秒转换为毫秒
      const loadTimeout = config.loadTimeout * 1000;
      const idleTimeout = config.idleTimeout * 1000;
      const selector = options.selector;
      const [initialWidth, initialHeight] = config.setViewport || [1280, 800];
      const maxHeightRatio = config.maxHeightRatio || 10;

      let loaded = false;
      const page = await ctx.puppeteer.page();
      page.on('load', () => loaded = true);

      try {
        // 设置页面初始视口
        await page.setViewport({
          width: initialWidth,
          height: initialHeight,
          deviceScaleFactor: 1,
        });

        // 导航到页面
        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: idleTimeout,
        }).catch(async (err) => {
          if (loaded) {
            logInfo('页面主体已加载，但网络未完全空闲', err);
          } else {
            throw err;
          }
        });

        // 等待网络空闲
        try {
          await page.waitForNetworkIdle({ timeout: loadTimeout }).catch(() => {
            if (loaded) {
              session.send('页面正在加载中，请稍等片刻...');
            } else {
              throw new Error('页面加载超时');
            }
          });
        } catch (error) {
          if (!loaded) {
            throw error;
          }
        }

        // 截取指定元素或自适应页面
        let imageBuffer;
        if (selector) {
          const element = await page.$(selector);
          if (!element) {
            await page.close();
            return '找不到满足该选择器的元素。';
          }

          imageBuffer = await element.screenshot({
            type: "jpeg",
            encoding: "binary",
            quality: config.screenshotquality
          });
        } else {
          // 获取页面尺寸
          const bodyHandle = await page.$('body');
          const { width, height } = await bodyHandle.boundingBox();
          await bodyHandle.dispose();

          // 计算适合的视口尺寸
          const viewportWidth = Math.min(initialWidth, Math.ceil(width));
          // 限制最大高度为宽度的maxHeightRatio倍
          const maxHeight = viewportWidth * maxHeightRatio;
          const viewportHeight = Math.min(maxHeight, Math.ceil(height));

          // 调整视口以适应内容
          await page.setViewport({
            width: viewportWidth,
            height: viewportHeight,
            deviceScaleFactor: 1,
          });

          // 截取整个页面，但限制高度
          imageBuffer = await page.screenshot({
            type: "jpeg",
            quality: config.screenshotquality,
            clip: {
              x: 0,
              y: 0,
              width: viewportWidth,
              height: viewportHeight
            }
          });
        }

        await page.close();
        return h.image(imageBuffer, 'image/jpeg');
      } catch (error) {
        await page.close();
        logger.error(error);
        return '无法打开页面，请检查网址是否正确。';
      }
    }

    // 注册指令
    if (config.workmodel === "command" || config.workmodel === "allways") {
      const commandName = config.commandname || "看看";

      ctx.command(commandName + ' <target> [selector:text]', '网页截图')
        .alias('screenshot')
        .action(async ({ session }, target, selector) => {
          if (!target) return '请输入网址或别名。';

          // 先检查是否是别名
          let url = findUrlFromMap(target);

          // 如果不是别名，则视为直接URL
          if (!url) {
            url = formatUrl(target);
            if (!url) {
              return '请输入正确的网址。';
            }
          }

          logInfo(`指令截图请求：${url}`);
          return takeScreenshot(session, url, { selector });
        });
    }

    // 注册中间件
    if (config.workmodel === "middleware" || config.workmodel === "allways") {
      const truemiddleware = config.truemiddleware !== undefined ? config.truemiddleware : true;

      ctx.middleware(async (session, next) => {
        if (!session.stripped?.content) return next();

        try {
          // 解析消息内容
          const contentParsed = h.parse(session.stripped.content);

          // 提取所有文本类型的元素内容
          const textContents = [];

          // 递归函数，用于遍历消息元素树
          function extractTextContent(elements) {
            if (!elements || !Array.isArray(elements)) return;

            for (const element of elements) {
              if (element.type === 'text') {
                // 文本元素，直接添加内容
                textContents.push(element.attrs?.content || '');
              } else if (element.children && Array.isArray(element.children)) {
                // 递归处理子元素
                extractTextContent(element.children);
              }
            }
          }

          // 处理特殊情况：如果contentParsed是字符串，直接添加
          if (typeof contentParsed === 'string') {
            textContents.push(contentParsed);
          } else {
            extractTextContent(contentParsed);
          }

          // 合并所有文本内容
          const combinedText = textContents.join(' ');
          logInfo("合并后的文本内容:", combinedText);

          // 使用更精确的URL检测正则
          const urlRegex = /(https?:\/\/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*))/gi;
          const matches = combinedText.match(urlRegex);

          if (matches && matches.length > 0) {
            // 找到了URL，处理第一个匹配的URL
            const url = matches[0];
            logInfo(`中间件检测到URL: ${url}`);

            // 执行截图
            const result = await takeScreenshot(session, url, {});
            if (result) {
              // 发送截图结果
              await session.send(result);
            }
          }
        } catch (error) {
          // 错误处理
          logger.error(`截图中间件出错: ${error.message}`);
          logInfo(`错误堆栈: ${error.stack}`);
        }

        // 无论是否处理了截图，都继续传递给下一个中间件
        return next();
      }, truemiddleware);
    }

    logInfo("网页截图插件已初始化");

  })
}


exports.apply = apply;
exports.Config = Config;
exports.name = name;
exports.inject = inject;
exports.usage = usage;
