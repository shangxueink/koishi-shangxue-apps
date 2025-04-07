var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  logger: () => logger,
  name: () => name,
  reusable: () => reusable,
  usage: () => usage
});
module.exports = __toCommonJS(src_exports);
var import_node_fs = __toESM(require("node:fs"));
var import_node_url = __toESM(require("node:url"));
var import_node_path = __toESM(require("node:path"));
var import_promises = require("fs/promises");
var import_koishi = require("koishi");
var import_node_crypto = __toESM(require("node:crypto"));
var reusable = true;
var name = "preview-help";
var inject = {
  required: ["http", "i18n"],
  optional: ["console", "puppeteer", "server"]
};
var logger = new import_koishi.Logger("preview-help");
var htmlPath = import_node_path.default.join(__dirname, "../help/index.html");
var usage = `
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
  <a href="${htmlPath.replace(/\\/g, "/")} " target="_blank">${htmlPath.replace(/\\/g, "/")} </a>
</p>

<p>
  <button onclick="navigator.clipboard.writeText('${htmlPath.replace(/\\/g, "/")}')">点我复制文件地址</button>
</p>

## <a href="/preview-help">菜单 webUI 交互 （开启插件后）请点击这里 ➤ /preview-help</a>

---

注：自定义图片URL地址，支持格式：

- 本地文件的相对路径（默认内容）：\`./pictures/backgrounds/3.png\`
- 绝对路径：\`file:///D:/Pictures/meme/2024-12-05-22-10-20-627.png\`
- 网络图片URL：\`https://i1.hdslb.com/bfs/article/f32980cbce6808fd54613dea589eee013f0c5fe3.png\`
`;
var Config = import_koishi.Schema.intersect([
  import_koishi.Schema.object({
    command: import_koishi.Schema.string().description("注册指令名称").default("帮助菜单"),
    rendering: import_koishi.Schema.union([
      import_koishi.Schema.const("").description("unset").description("不返回提示语"),
      import_koishi.Schema.string().description("string").description("请在右侧修改提示语").default("正在生成帮助菜单，请稍候...")
    ]).description("`菜单渲染中`提示语"),
    helpmode: import_koishi.Schema.union([
      import_koishi.Schema.const("1.1").description("返回文字菜单"),
      import_koishi.Schema.const("1.2").description("返回图片菜单"),
      import_koishi.Schema.const("2.1").description("返回渲染图片菜单（自动从help指令获取）"),
      import_koishi.Schema.const("2.2").description("返回渲染图片菜单（手动输入help文字菜单）"),
      import_koishi.Schema.const("3").description("返回渲染图片菜单（自定义json配置）（本地JSON文件） "),
      import_koishi.Schema.const("3.2").description("返回渲染图片菜单（自定义json配置）（json写入配置项） ")
    ]).role("radio").default("2.1").description("菜单返回模式<br>`自动获取的help菜单可能会与预设模版不吻合`<br>推荐前往webUI手动编辑后导出json文件使用")
  }).description("基础配置"),
  import_koishi.Schema.union([
    import_koishi.Schema.object({
      helpmode: import_koishi.Schema.const("1.1").required(),
      help_text: import_koishi.Schema.string().default("当前可用的指令有：\necho  发送消息  其他功能\nhelp  显示帮助信息  系统工具\ninspect  查看用户、频道或消息的详细信息  系统工具\nplugin  插件管理  系统功能\nstatus  查看运行状态  系统工具\ntimer  定时器信息  系统功能\nusage  调用次数信息  系统功能\n输入“help 指令名”查看特定指令的语法和使用示例。").role("textarea", { rows: [8, 8] }).description("返回的文字菜单内容<br>每行格式: `指令名称  指令描述  指令分类`<br>其中`指令分类`为导入添加标记所用，help文字菜单并不自带，需手动指定")
    }),
    import_koishi.Schema.object({
      helpmode: import_koishi.Schema.const("1.2").required(),
      help_URL: import_koishi.Schema.string().role("link").default("https://i0.hdslb.com/bfs/article/a6154de573f73246ea4355a614f0b7b94eff8f20.jpg").description("图片菜单的网络URL地址")
    }),
    import_koishi.Schema.object({
      helpmode: import_koishi.Schema.const("2.1"),
      background_URL: import_koishi.Schema.string().role("textarea", { rows: [4, 4] }).description("渲染使用的背景图地址，会随机选一个使用<br>一行一个图片的URL地址（`网络URL`或者`本地绝对路径的URL`）<br>默认会有使用随机的猫羽雫的背景图")
    }),
    import_koishi.Schema.object({
      helpmode: import_koishi.Schema.const("2.2").required(),
      background_URL: import_koishi.Schema.string().role("textarea", { rows: [4, 4] }).description("渲染使用的背景图地址，会随机选一个使用<br>一行一个图片的URL地址（`网络URL`或者`本地绝对路径的URL`）<br>默认会有使用随机的猫羽雫的背景图"),
      help_text: import_koishi.Schema.string().default("当前可用的指令有：\necho  发送消息  其他功能\nhelp  显示帮助信息  系统工具\ninspect  查看用户、频道或消息的详细信息  系统工具\nplugin  插件管理  系统功能\nstatus  查看运行状态  系统工具\ntimer  定时器信息  系统功能\nusage  调用次数信息  系统功能\n输入“help 指令名”查看特定指令的语法和使用示例。").role("textarea", { rows: [8, 8] }).description("返回的文字菜单内容<br>每行格式: `指令名称  指令描述  指令分类`<br>其中`指令分类`为导入添加标记所用，help文字菜单并不自带，需手动指定")
    }),
    import_koishi.Schema.object({
      helpmode: import_koishi.Schema.const("3").required(),
      background_URL: import_koishi.Schema.string().role("textarea", { rows: [4, 4] }).description("渲染使用的背景图地址，会随机选一个使用<br>一行一个图片的URL地址（`网络URL`或者`本地绝对路径的URL`）<br>默认会有使用随机的猫羽雫的背景图"),
      help_text_json_path: import_koishi.Schema.string().role("textarea", { rows: [4, 4] }).default("C:\\Users\\shangxue\\Downloads").description("导入配置使用的JSON的`所在文件夹`的绝对路径<br>你可以直接填入浏览器导出json的默认文件夹地址 `即浏览器下载文件夹`<br>若不填入，则默认使用`./data/preview-help/menu-config.json`")
    }),
    import_koishi.Schema.object({
      helpmode: import_koishi.Schema.const("3.2").required(),
      background_URL: import_koishi.Schema.string().role("textarea", { rows: [4, 4] }).description("渲染使用的背景图地址，会随机选一个使用<br>一行一个图片的URL地址（`网络URL`或者`本地绝对路径的URL`）<br>默认会有使用随机的猫羽雫的背景图"),
      help_text_json: import_koishi.Schema.string().role("textarea", { rows: [8, 8] }).description("导入配置使用的JSON内容")
    })
  ]),
  import_koishi.Schema.object({
    fontEnabled: import_koishi.Schema.boolean().description("启用自定义字体").default(false),
    fontURL: import_koishi.Schema.string().description("字体 URL (.ttf)<br>注意：需填入本地绝对路径的URL编码地址<br>默认内容 即为使用`jrys-prpr字体`的URL示例写法").default(import_node_url.default.pathToFileURL(import_node_path.default.join(__dirname, "../../jrys-prpr/font/千图马克手写体lite.ttf")).href)
  }).description("高级设置"),
  import_koishi.Schema.object({
    staticHelp: import_koishi.Schema.boolean().default(true).description("是否静态部署 help 目录到 /help<br>关闭后将没有 webUI，仅能使用本地HTML文件交互")
    // 新增配置项
  }).description("交互功能设置"),
  import_koishi.Schema.object({
    screenshotquality: import_koishi.Schema.number().role("slider").min(0).max(100).step(1).default(60).description("设置图片压缩质量（%）"),
    tempPNG: import_koishi.Schema.boolean().description("打开后，开启缓存功能。<br>在`输入配置不变`/`help菜单不变`的情况下，使用缓存的PNG菜单图片（同一张图）。<br>关闭后，每次调用均使用puppeteer渲染").default(true),
    isfigure: import_koishi.Schema.boolean().default(false).description("是否开启合并转发 `仅支持 onebot 适配器` 其他平台开启 无效").experimental()
  }).description("调试模式"),
  import_koishi.Schema.object({
    loggerinfo: import_koishi.Schema.boolean().default(false).description("日志调试开关")
  }).description("开发者选项")
]);
var lastCacheKey = "";
function apply(ctx, config) {
  function logInfo(message) {
    if (config.loggerinfo) {
      logger.info(message);
    }
  }
  __name(logInfo, "logInfo");
  ctx.on("ready", async () => {
    if (config.staticHelp && ctx.server) {
      const helpRoot = import_node_path.default.resolve(__dirname, "../help");
      const helpPath = "/help";
      ctx.inject(["console"], (ctx2) => {
        ctx2.console.addEntry({
          dev: import_node_path.default.resolve(__dirname, "../client/index.ts"),
          prod: import_node_path.default.resolve(__dirname, "../dist")
        });
      });
      ctx.server.get(helpPath + "(.*)", async (ctx2, next) => {
        const filename = import_node_path.default.resolve(helpRoot, ctx2.path.slice(helpPath.length).replace(/^\/+/, ""));
        if (!filename.startsWith(helpRoot)) return next();
        const stats = await (0, import_promises.stat)(filename).catch(import_koishi.noop);
        if (stats?.isFile()) {
          ctx2.type = import_node_path.default.extname(filename);
          return ctx2.body = import_node_fs.default.createReadStream(filename);
        }
        return next();
      });
      logInfo(`静态资源部署：help 目录部署到 http://127.0.0.1:${ctx.server.config.port}${helpPath}`);
    }
  });
  ctx.on("ready", async () => {
    const root = import_node_path.default.join(ctx.baseDir, "data", "preview-help");
    const tempDirPath = import_node_path.default.join(root, "temp");
    let jsonFilePath = import_node_path.default.join(root, "menu-config.json");
    const temp_helpFilePath = import_node_path.default.join(root, "temp_help.png");
    if (!import_node_fs.default.existsSync(root)) {
      import_node_fs.default.mkdirSync(root, { recursive: true });
    }
    if (!import_node_fs.default.existsSync(tempDirPath)) {
      import_node_fs.default.mkdirSync(tempDirPath, { recursive: true });
    }
    if (!import_node_fs.default.existsSync(jsonFilePath)) {
      import_node_fs.default.writeFileSync(jsonFilePath, JSON.stringify({}));
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
            "background.download.fail": "背景图下载失败: {0}"
          }
        }
      }
    });
    async function downloadAndSaveImage(imageUrl, shouldCache) {
      try {
        const imageBuffer = Buffer.from(await ctx.http.get(imageUrl, { responseType: "arraybuffer" }));
        const imageHash = import_node_crypto.default.createHash("md5").update(imageBuffer).digest("hex");
        const localImagePath = import_node_path.default.join(tempDirPath, `background-${imageHash}.png`);
        if (shouldCache) {
          import_node_fs.default.writeFileSync(localImagePath, Buffer.from(imageBuffer));
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
    __name(downloadAndSaveImage, "downloadAndSaveImage");
    async function cleanupTempDir(currentImageHash) {
      try {
        const files = await (0, import_promises.readdir)(tempDirPath);
        for (const file of files) {
          if (file.startsWith("background-") && !file.includes(currentImageHash)) {
            await import_node_fs.default.promises.unlink(import_node_path.default.join(tempDirPath, file));
            logInfo(`清理临时文件: ${file}`);
          }
        }
      } catch (error) {
        logger.warn(`清理临时文件夹失败: ${tempDirPath}`, error);
        logInfo("清理临时文件夹失败");
      }
    }
    __name(cleanupTempDir, "cleanupTempDir");
    ctx.command(`${config.command} <help_text:text>`).option("background", "-b <background:string> 指定背景URL").example("帮助菜单 -b https://i0.hdslb.com/bfs/article/a6154de573f73246ea4355a614f0b7b94eff8f20.jpg   当前可用的指令有：\necho  发送消息\nstatus  查看运行状态\ntimer  定时器信息\nusage  调用次数信息\n输入“help 指令名”查看特定指令的语法和使用示例。").action(async ({ session, options }, help_text) => {
      if (!ctx.puppeteer) {
        await session.send(import_koishi.h.text(session.text(`.nopuppeteer`)));
        return;
      }
      const generateCacheKey = /* @__PURE__ */ __name((helpmode, helpContent, screenshotquality) => {
        return `${helpmode}-${helpContent}-${screenshotquality}`;
      }, "generateCacheKey");
      let currentHelpContent = "";
      let currentBackgroundURL = "";
      let useCache = false;
      if (options.background) {
        currentBackgroundURL = options.background;
        logInfo(`使用 -b 参数指定的背景图：${currentBackgroundURL}`);
      } else if (config.background_URL) {
        const bgList = config.background_URL.split("\n").filter((url2) => url2.trim());
        if (bgList.length > 0) {
          currentBackgroundURL = bgList[Math.floor(Math.random() * bgList.length)];
          logInfo(`选择随机背景图：${currentBackgroundURL}`);
        }
      }
      const cacheKey = generateCacheKey(config.helpmode, currentHelpContent.replace(currentBackgroundURL, ""), config.screenshotquality);
      if (config.tempPNG && ["2.1", "2.2", "3", "3.2"].includes(config.helpmode)) {
        if (lastCacheKey === cacheKey && import_node_fs.default.existsSync(temp_helpFilePath)) {
          useCache = true;
        }
      }
      let localBackgroundURL = currentBackgroundURL;
      let currentImageHash = null;
      if (currentBackgroundURL && currentBackgroundURL.startsWith("http")) {
        const shouldCache = config.tempPNG;
        if (!useCache) {
          const downloadResult = await downloadAndSaveImage(currentBackgroundURL, shouldCache);
          if (downloadResult.localImagePath) {
            localBackgroundURL = import_node_url.default.pathToFileURL(downloadResult.localImagePath).href;
            currentImageHash = downloadResult.imageHash;
            if (config.tempPNG) {
              await cleanupTempDir(currentImageHash);
            }
            logInfo(`背景图已下载并保存到本地: ${localBackgroundURL}`);
          } else {
            await session.send(import_koishi.h.text(session.text(".background.download.fail", [currentBackgroundURL])));
            localBackgroundURL = "";
            currentBackgroundURL = "";
          }
        }
      }
      if (currentBackgroundURL && !currentBackgroundURL.startsWith("http")) {
        localBackgroundURL = currentBackgroundURL;
      }
      switch (config.helpmode) {
        case "2.1": {
          logInfo(`正在获取系统帮助内容...`);
          const koishihelptext = await session.execute("help", true);
          if (koishihelptext && Array.isArray(koishihelptext) && koishihelptext.length > 0) {
            currentHelpContent = `${help_text || koishihelptext[0].attrs.content}
${currentBackgroundURL}`;
          } else {
            currentHelpContent = `${help_text || ""}
${currentBackgroundURL}`;
          }
          logInfo(`获取到帮助内容长度：${currentHelpContent?.length || 0}`);
          break;
        }
        case "2.2": {
          currentHelpContent = `${help_text || config.help_text}
${currentBackgroundURL}`;
          logInfo(`使用手动输入内容，长度：${currentHelpContent?.length || 0}`);
          break;
        }
        case "3": {
          let jsonFilePathToUse = jsonFilePath;
          if (config.help_text_json_path) {
            let inputPath = config.help_text_json_path.trim();
            if (inputPath.startsWith("file:///")) {
              inputPath = import_node_url.default.fileURLToPath(inputPath);
            }
            try {
              const pathStat = await (0, import_promises.stat)(inputPath);
              if (pathStat.isDirectory()) {
                const files = await (0, import_promises.readdir)(inputPath);
                const jsonFiles = files.filter((file) => file.startsWith("menu-config (") && file.endsWith(").json"));
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
                  jsonFilePathToUse = import_node_path.default.join(inputPath, latestNumberedJson);
                } else if (files.includes("menu-config.json")) {
                  jsonFilePathToUse = import_node_path.default.join(inputPath, "menu-config.json");
                } else {
                  await session.send(import_koishi.h.text(session.text(".jsonfile.notfound")));
                  return;
                }
              } else if (pathStat.isFile() && import_node_path.default.extname(inputPath) === ".json") {
                jsonFilePathToUse = inputPath;
              } else {
                await session.send(import_koishi.h.text(session.text(".path.invalid", [config.help_text_json_path])));
                return;
              }
            } catch (e) {
              logger.warn(`路径检查失败: ${config.help_text_json_path}`, e);
              await session.send(import_koishi.h.text(session.text(".path.invalid", [config.help_text_json_path])));
              return;
            }
          }
          try {
            logInfo(`正在读取JSON配置...`);
            currentHelpContent = import_node_fs.default.readFileSync(jsonFilePathToUse, "utf-8");
            logInfo(`从文件读取JSON成功，路径：${jsonFilePathToUse}，长度：${currentHelpContent?.length || 0}`);
          } catch (error) {
            logger.error(`文件读取失败：`, error);
            await session.send(import_koishi.h.text(session.text(".file.read.error")));
            return;
          }
          try {
            JSON.parse(currentHelpContent);
          } catch (error) {
            logger.error(`JSON解析失败：`, error);
            await session.send(import_koishi.h.text(session.text(".json.parse.error")));
            return;
          }
          break;
        }
        case "3.2": {
          logInfo(`正在读取JSON配置...`);
          currentHelpContent = config.help_text_json;
          logInfo(`使用配置项JSON，长度：${currentHelpContent?.length || 0}`);
          try {
            JSON.parse(currentHelpContent);
          } catch (error) {
            logger.error(`JSON解析失败：`, error);
            await session.send(import_koishi.h.text(session.text(".json.parse.error")));
            return;
          }
          break;
        }
      }
      if (useCache) {
        logInfo(session.text(".cache.hit"));
        try {
          const imageBuffer = import_node_fs.default.readFileSync(temp_helpFilePath);
          await sendwithfigure(session, import_koishi.h.image(imageBuffer, "image/jpeg"));
          return;
        } catch (e) {
          logger.warn(`读取缓存图片失败，重新渲染`, e);
        }
      }
      const page = await ctx.puppeteer.page();
      try {
        const startTime = Date.now();
        logInfo(`开始处理帮助请求，模式：${config.helpmode}`);
        let helpContent = currentHelpContent;
        switch (config.helpmode) {
          case "1.1":
            logInfo(config.help_text);
            await sendwithfigure(session, import_koishi.h.text(config.help_text));
            return;
          case "1.2":
            logInfo(config.help_URL);
            try {
              await sendwithfigure(session, import_koishi.h.image(config.help_URL));
            } catch (e) {
              logger.error(`图片菜单加载失败: ${config.help_URL}`, e);
              await session.send(import_koishi.h.text(session.text(".image.load.error", [config.help_URL])));
              return;
            }
            return;
          case "2.1":
          case "2.2":
          case "3":
          case "3.2":
            break;
          default:
            await session.send(import_koishi.h.text(session.text(".mode.notsupport")));
            return;
        }
        if (config.rendering) {
          await session.send(import_koishi.h.text(config.rendering));
        }
        const helpHTMLUrl = import_node_url.default.pathToFileURL(htmlPath).href;
        logInfo(`正在加载本地HTML文件：${helpHTMLUrl}`);
        await page.goto(helpHTMLUrl, {
          waitUntil: "networkidle2",
          timeout: 3e4
        });
        const logElementAction = /* @__PURE__ */ __name(async (selector, action) => {
          const element = await page.$(selector);
          if (!element) {
            const errorMsg = session.text(".element.notfound", [selector]);
            logInfo(`${errorMsg}`);
            throw new Error(errorMsg);
          }
          logInfo(`正在${action}：${selector}`);
          return element;
        }, "logElementAction");
        if (localBackgroundURL) {
          logInfo(`设置背景图片 URL: ${localBackgroundURL}`);
          try {
            const urlTab = await logElementAction(".form-item .image-upload-tab:nth-child(1)", "点击 URL 标签");
            await urlTab.click();
            const urlInput = await logElementAction(".form-item .image-upload-content:nth-child(3) input", "找到 URL 输入框");
            await page.evaluate((inputElement, url2) => {
              inputElement.value = url2;
              inputElement.dispatchEvent(new Event("input", { bubbles: true }));
            }, urlInput, localBackgroundURL);
            await new Promise((resolve) => ctx.setTimeout(resolve, 200));
          } catch (bgError) {
            logger.warn(`设置背景图片失败: ${localBackgroundURL}`, bgError);
            logInfo(session.text(".background.set.fail", [localBackgroundURL]));
          }
        }
        const importButton = await logElementAction(".btn-group button:nth-child(2)", "点击导入配置按钮");
        await importButton.click();
        if (config.fontEnabled && config.fontURL) {
          logInfo(session.text(".font.load.start", [config.fontURL]));
          try {
            const fontURLInput = await logElementAction('.image-upload-content input[placeholder="绝对路径的 URL编码 (.ttf)"]', "查找字体URL输入框");
            await page.evaluate((inputElement, fontURL) => {
              inputElement.value = fontURL;
              inputElement.dispatchEvent(new Event("input", { bubbles: true }));
            }, fontURLInput, config.fontURL);
            await page.evaluate(() => {
              document.querySelector(".image-upload-content button").click();
            });
            logInfo(session.text(".font.load.success", [config.fontURL]));
            await new Promise((resolve) => ctx.setTimeout(resolve, 1e3));
          } catch (fontError) {
            logger.warn(`字体加载失败: ${config.fontURL}`, fontError);
            logInfo(session.text(".font.load.fail", [config.fontURL]));
          }
        }
        if (config.helpmode === "3" || config.helpmode === "3.2") {
          const textarea = await logElementAction(".popup-content textarea", "输入JSON内容");
          await page.evaluate((element, content) => {
            element.value = content;
            element.dispatchEvent(new Event("input", { bubbles: true }));
          }, textarea, helpContent);
          const confirmButton = await logElementAction(".popup-buttons button:nth-child(1)", "确认导入");
          await confirmButton.click();
        } else {
          const tab = await logElementAction(".popup-tab:nth-child(3)", "切换至快速导入标签");
          await tab.click();
          const textarea = await logElementAction(".popup-content textarea", "输入帮助内容");
          await page.evaluate((element, content) => {
            element.value = content;
            element.dispatchEvent(new Event("input", { bubbles: true }));
          }, textarea, helpContent);
          const replaceButton = await logElementAction(".popup-buttons button:nth-child(1)", "执行替换导入");
          await replaceButton.click();
        }
        logInfo(`等待渲染完成...`);
        await page.waitForSelector(".preview-container-wrapper", {
          visible: true,
          timeout: 3e4
        });
        logInfo(`正在执行截图...`);
        await page.waitForNetworkIdle();
        const previewContainer = await logElementAction(".preview-container-wrapper", "执行截图");
        const imageBuffer = await previewContainer.screenshot({
          type: "jpeg",
          encoding: "binary",
          quality: config.screenshotquality,
          captureBeyondViewport: true
          // 确保截取完整内容
        });
        if (config.tempPNG && ["2.1", "2.2", "3", "3.2"].includes(config.helpmode)) {
          try {
            import_node_fs.default.writeFileSync(temp_helpFilePath, imageBuffer);
            lastCacheKey = cacheKey;
            logInfo(`缓存图片成功，key: ${cacheKey}`);
          } catch (e) {
            logger.warn(`保存缓存图片失败`, e);
          }
        }
        const costTime = ((Date.now() - startTime) / 1e3).toFixed(2);
        logInfo(`截图完成，耗时${costTime}秒，图片大小：${(imageBuffer.length / 1024).toFixed(2)}KB`);
        await sendwithfigure(session, import_koishi.h.image(imageBuffer, "image/jpeg"));
      } catch (error) {
        logger.error(`渲染过程出错：`, error);
        await session.send(import_koishi.h.text(session.text(".somerror")));
      } finally {
        await page.close().catch((error) => {
          logger.warn(`页面关闭失败：`, error);
        });
      }
    });
    async function sendwithfigure(session, responseElements) {
      if (config.isfigure && (session.platform === "onebot" || session.platform === "red")) {
        logInfo(`使用合并转发，正在合并消息。`);
        const figureContent = (0, import_koishi.h)("figure", {
          children: responseElements
        });
        logInfo(JSON.stringify(figureContent, null, 2));
        await session.send(figureContent);
      } else {
        await session.send(responseElements);
      }
    }
    __name(sendwithfigure, "sendwithfigure");
  });
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  logger,
  name,
  reusable,
  usage
});
