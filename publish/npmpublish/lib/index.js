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
  name: () => name,
  usage: () => usage
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var import_node_os = __toESM(require("node:os"));
var import_node_fs = __toESM(require("node:fs"));
var import_node_crypto = __toESM(require("node:crypto"));
var import_node_path = __toESM(require("node:path"));
var import_node_url = __toESM(require("node:url"));
var name = "music-voice";
var inject = {
  required: ["logger", "http", "i18n"],
  optional: ["puppeteer"]
};
var usage = `

---

<a target="_blank" href="https://github.com/idranme/koishi-plugin-music-voice?tab=readme-ov-file#%E4%BD%BF%E7%94%A8%E8%AF%A5%E6%8F%92%E4%BB%B6%E6%90%9C%E7%B4%A2%E5%B9%B6%E8%8E%B7%E5%8F%96%E6%AD%8C%E6%9B%B2">➤ 食用方法点此获取</a>

本插件旨在 安装后即可语音点歌。

因各种不可抗力因素，目前仅支持使用网易云音乐。



---

## 开启插件前，请确保以下服务已经启用！

### 所需服务：

- [puppeteer服务](/market?keyword=puppeteer) （可选安装）

- [http服务](/market?keyword=http+email:shigma10826@gmail.com) （已默认开启）

- [logger服务](/market?keyword=logger+email:shigma10826@gmail.com) （已默认开启）

- i18n服务 （已默认开启）

此外可能还需要这些服务才能发送语音：


- [ffmpeg服务](/market?keyword=ffmpeg)  （可选安装）

- [silk服务](/market?keyword=silk)  （可选安装）


---
`;
var Config = import_koishi.Schema.intersect([
  import_koishi.Schema.object({
    commandName: import_koishi.Schema.string().description("使用的指令名称").default("music"),
    commandAlias: import_koishi.Schema.string().description("使用的指令别名").default("mdff"),
    generationTip: import_koishi.Schema.string().description("生成语音时返回的文字提示内容").default("生成语音中…"),
    waitForTimeout: import_koishi.Schema.natural().min(1).step(1).description("等待用户选择歌曲序号的最长时间 （秒）").default(45)
  }).description("基础设置"),
  import_koishi.Schema.object({
    imageMode: import_koishi.Schema.boolean().description("开启后 返回图片歌单（需要puppeteer服务）<br>关闭后 返回文本歌单").default(false)
  }).description("歌单渲染设置"),
  import_koishi.Schema.union([
    import_koishi.Schema.object({
      imageMode: import_koishi.Schema.const(true).required(),
      textChannel: import_koishi.Schema.string().description("图片歌单的文字颜色").role("color").default("rgba(255, 255, 255, 1)"),
      backgroundChannel: import_koishi.Schema.string().description("图片歌单的背景颜色").role("color").default("rgba(0, 0, 0, 1)")
      // "rgba(42, 45, 62, 1)"
    }),
    import_koishi.Schema.object({})
  ]),
  import_koishi.Schema.object({
    searchListCount: import_koishi.Schema.natural().description("搜索歌曲列表的数量").default(20),
    exitCommandList: import_koishi.Schema.array(String).role("table").description("退出选择指令。<br>一行一个指令").default(["0", "不听了"]),
    menuExitCommandTip: import_koishi.Schema.boolean().description("是否在歌单内容的后面，加上`退出选择指令`的文字提示").default(false),
    recall: import_koishi.Schema.boolean().description("是否在发送语音后撤回 `generationTip`").default(true),
    maxSongDuration: import_koishi.Schema.natural().min(1).step(1).description("歌曲最长持续时间（分钟）").default(30)
  }).description("进阶设置"),
  import_koishi.Schema.object({
    metingAPI: import_koishi.Schema.union([
      import_koishi.Schema.const("api.injahow.cn").description("（推荐）`api.injahow.cn`").experimental(),
      import_koishi.Schema.const("api.qijieya.cn").description("（推荐）`api.qijieya.cn`").experimental()
    ]).description("获取音乐直链的后端API").default("api.qijieya.cn"),
    srcToWhat: import_koishi.Schema.union([
      import_koishi.Schema.const("text").description("文本 h.text"),
      import_koishi.Schema.const("audio").description("语音 h.audio"),
      import_koishi.Schema.const("audiobuffer").description("语音（buffer） h.audio"),
      import_koishi.Schema.const("video").description("视频 h.video"),
      import_koishi.Schema.const("file").description("文件 h.file")
    ]).role("radio").default("audio").description("歌曲信息的的返回格式")
  }).description("调试设置"),
  import_koishi.Schema.object({
    loggerinfo: import_koishi.Schema.boolean().default(false).description("日志调试模式")
  }).description("开发者选项")
]);
function apply(ctx, config) {
  ctx.on("ready", async () => {
    const logger = ctx.logger("music-voice");
    ctx.i18n.define("zh-CN", {
      commands: {
        [config.commandName]: {
          description: `搜索歌曲并播放网易云音乐`,
          messages: {
            "nokeyword": `请输入歌曲相关信息。
➣示例：/${config.commandName} 蔚蓝档案`,
            "songlisterror": "无法获取歌曲列表，请稍后再试。",
            "invalidKeyword": "无法获取歌曲列表，请尝试更换关键词。",
            "exitCommandTip": "退出选择请发 [{0}] 中的任意内容<br/><br/>",
            "imageGenerationFailed": "生成图片歌单失败，请检查 puppeteer 服务是否正常。",
            "imageListPrompt": "{0}请在 {1} 秒内，\n输入歌曲对应的序号",
            "textListPrompt": "{0}<br/><br/>{1}请在 {2} 秒内，<br/>输入歌曲对应的序号",
            "promptTimeout": "输入超时，已取消点歌。",
            "exitPrompt": "已退出歌曲选择。",
            "invalidNumber": "序号输入错误，已退出歌曲选择。",
            "durationExceeded": "歌曲持续时间超出限制。",
            "getSongFailed": "获取歌曲失败，请稍后再试。"
          }
        }
      }
    });
    ctx.command(`${config.commandName || "music"} <keyword:text>`).alias(config.commandAlias || "mdff").option("number", "-n <number:number> 歌曲序号").action(async ({ session, options }, keyword) => {
      if (!keyword) return session.text(".nokeyword");
      logInfo(session.stripped.content);
      let neteaseData = [];
      try {
        neteaseData = await searchNetEase(keyword, config.searchListCount);
      } catch (err) {
        logger.warn("获取网易云音乐数据时发生错误", err.message);
        return session.text(".songlisterror");
      }
      if (!neteaseData.length) return session.text(".invalidKeyword");
      const neteaseListText = neteaseData.length ? formatSongList(neteaseData, "NetEase Music", 0) : "<b>NetEase Music</b>: 无法获取歌曲列表";
      const listText = `${neteaseListText}`;
      const exitCommands = config.exitCommandList;
      const exitCommandTip = config.menuExitCommandTip ? session.text(".exitCommandTip", [exitCommands.join(", ")]) : "";
      let selected;
      let quoteId = session.messageId;
      if (options.number !== void 0) {
        const serialNumber = options.number;
        if (!Number.isInteger(serialNumber) || serialNumber < 1 || serialNumber > neteaseData.length) {
          return `${import_koishi.h.quote(quoteId)}` + session.text(".invalidNumber");
        }
        selected = neteaseData[serialNumber - 1];
      } else {
        if (config.imageMode) {
          const imageBuffer = await generateSongListImage(listText, config);
          if (!imageBuffer) {
            return session.text(".imageGenerationFailed");
          }
          const payload = [
            import_koishi.h.quote(quoteId),
            import_koishi.h.image(imageBuffer, "image/png"),
            import_koishi.h.text(session.text(".imageListPrompt", [exitCommandTip.replaceAll("<br/>", "\n"), config.waitForTimeout]))
          ];
          const msg = await session.send(payload);
          quoteId = msg.at(-1);
        } else {
          const payload = `${import_koishi.h.quote(quoteId)}` + session.text(".textListPrompt", [listText, exitCommandTip, config.waitForTimeout]);
          const msg = await session.send(import_koishi.h.unescape(payload));
          quoteId = msg.at(-1);
        }
        const input = await session.prompt((session2) => {
          quoteId = session2.messageId;
          return import_koishi.h.select(session2.elements, "text").join("");
        }, { timeout: config.waitForTimeout * 1e3 });
        if ((0, import_koishi.isNullable)(input)) return `${quoteId ? import_koishi.h.quote(quoteId) : ""}` + session.text(".promptTimeout");
        if (exitCommands.includes(input)) {
          return `${import_koishi.h.quote(quoteId)}` + session.text(".exitPrompt");
        }
        const serialNumber = +input;
        if (!Number.isInteger(serialNumber) || serialNumber < 1 || serialNumber > neteaseData.length) {
          return `${import_koishi.h.quote(quoteId)}` + session.text(".invalidNumber");
        }
        selected = neteaseData[serialNumber - 1];
      }
      const interval = selected.duration / 1e3;
      const [tipMessageId] = await session.send(import_koishi.h.quote(quoteId) + `` + import_koishi.h.text(config.generationTip));
      try {
        let src = "";
        if (config.metingAPI === "api.injahow.cn") {
          src = `https://api.injahow.cn/meting/?type=url&id=${selected.id}`;
        } else if (config.metingAPI === "api.qijieya.cn") {
          src = `https://api.qijieya.cn/meting/?type=url&id=${selected.id}`;
        }
        logInfo(selected);
        logInfo(src);
        logInfo(config.srcToWhat);
        if (interval * 1e3 > config.maxSongDuration * 1e3 * 60) {
          if (config.recall) session.bot.deleteMessage(session.channelId, tipMessageId);
          return `${import_koishi.h.quote(quoteId)}` + session.text(".durationExceeded");
        }
        switch (config.srcToWhat) {
          case "text":
            await session.send(import_koishi.h.text(src));
            break;
          case "audio":
            await session.send(import_koishi.h.audio(src));
            break;
          case "audiobuffer": {
            const srcFile = (await ctx.http.file(src)).data;
            const srcBuffer = Buffer.from(srcFile);
            await session.send(import_koishi.h.audio(srcBuffer, "audio/mpeg"));
            break;
          }
          case "video": {
            await session.send(import_koishi.h.video(src));
            break;
          }
          case "file": {
            const tempFilePath = await downloadFile(src);
            const fileUrl = import_node_url.default.pathToFileURL(tempFilePath).href;
            logInfo(fileUrl);
            await session.send(import_koishi.h.file(fileUrl));
            await import_node_fs.default.unlinkSync(tempFilePath);
            break;
          }
          default:
            ctx.logger.error(`Unsupported send type: ${config.srcToWhat}`);
            return;
        }
        if (config.recall) session.bot.deleteMessage(session.channelId, tipMessageId);
      } catch (error) {
        if (config.recall) session.bot.deleteMessage(session.channelId, tipMessageId);
        logger.error("获取歌曲详情或发送语音失败", error);
        return `${import_koishi.h.quote(quoteId)}` + session.text(".getSongFailed");
      }
    });
    async function downloadFile(url2) {
      try {
        const file = await ctx.http.file(url2);
        const contentType = file.type || file.mime;
        let ext = ".mp3";
        if (contentType) {
          if (contentType.includes("audio/mpeg")) {
            ext = ".mp3";
          } else if (contentType.includes("audio/mp4")) {
            ext = ".m4a";
          } else if (contentType.includes("audio/wav")) {
            ext = ".wav";
          } else if (contentType.includes("audio/flac")) {
            ext = ".flac";
          }
        }
        let filename = import_node_crypto.default.randomBytes(8).toString("hex") + ext;
        const filePath = import_node_path.default.join(import_node_os.default.tmpdir(), filename);
        const buffer = Buffer.from(file.data);
        await import_node_fs.default.writeFileSync(filePath, buffer);
        return filePath;
      } catch (error) {
        logger.error("文件下载失败:", error);
        return null;
      }
    }
    __name(downloadFile, "downloadFile");
    function logInfo(...args) {
      if (config.loggerinfo) {
        logger.info(...args);
      }
    }
    __name(logInfo, "logInfo");
    async function searchNetEase(keyword, limit = 10) {
      const searchApiUrl = `https://music.163.com/api/search/get/web?csrf_token=hlpretag=&hlposttag=&s=${encodeURIComponent(keyword)}&type=1&offset=0&total=true&limit=${limit}`;
      try {
        const searchApiResponse = await ctx.http.get(searchApiUrl);
        const parsedSearchApiResponse = JSON.parse(searchApiResponse);
        const searchData = parsedSearchApiResponse.result;
        if (!searchData || !searchData.songs || searchData.songs.length === 0) {
          return [];
        }
        const songList = searchData.songs.map((song) => {
          return {
            id: song.id,
            name: song.name,
            artists: song.artists.map((artist) => artist.name).join("/"),
            albumName: song.album.name,
            duration: song.duration
          };
        });
        logInfo(songList);
        return songList;
      } catch (error) {
        logger.error("网易云音乐搜索出错", error);
        return [];
      }
    }
    __name(searchNetEase, "searchNetEase");
    async function generateSongListImage(listText, config2) {
      if (!ctx.puppeteer) {
        logger.warn("puppeteer 服务未启用，无法生成图片歌单。");
        return null;
      }
      const content = `
      <!DOCTYPE html>
      <html lang="zh">
        <head>
          <title>music</title>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body {
              margin: 0;
              font-family: "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Noto Sans SC", "Microsoft YaHei", SimSun, sans-serif;
              font-size: 16px;
              background: ${config2.backgroundChannel};
              color: ${config2.textChannel};
              min-height: 100vh;
            }
            #song-list {
              padding: 20px;
              display: inline-block; 
              max-width: 100%; 
              white-space: nowrap; 
              transform: scale(0.9);
            }
            s {
              text-decoration-thickness: 1.5px;
            }
          </style>
        </head>
        <body>
          <div id="song-list">${listText}</div>
        </body>
      </html>
    `;
      const page = await ctx.puppeteer.page();
      await page.setContent(content);
      const list = await page.$("#song-list");
      if (!list) return null;
      const screenshot = await list.screenshot({});
      page.close();
      return screenshot;
    }
    __name(generateSongListImage, "generateSongListImage");
    function formatSongList(data, platform, startIndex) {
      const formatted = data.map((song, index) => {
        let item = `${index + startIndex + 1}. ${song.name} -- ${song.artists} -- ${song.albumName}`;
        return item;
      }).join("<br/>");
      return `<b>${platform}</b>:<br/>${formatted}`;
    }
    __name(formatSongList, "formatSongList");
  });
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name,
  usage
});
