var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var name = "music-voice";
var inject = {
  required: ["http"],
  optional: ["puppeteer"]
};
var usage = `
<a target="_blank" href="https://github.com/idranme/koishi-plugin-music-voice?tab=readme-ov-file#%E4%BD%BF%E7%94%A8%E8%AF%A5%E6%8F%92%E4%BB%B6%E6%90%9C%E7%B4%A2%E5%B9%B6%E8%8E%B7%E5%8F%96%E6%AD%8C%E6%9B%B2">食用方法点此获取</a>
`;
var Config = import_koishi.Schema.intersect([
  import_koishi.Schema.object({
    xingzhigeAPIkey: import_koishi.Schema.string().role("secret").description("星之阁的音乐API的请求key<br>（默认值是作者自己的哦，如果失效了请你自己获取一个）<br>请前往 QQ群 905188643 <br>添加QQ好友 3556898686 <br>私聊发送 `/getapikey` 获得你的APIkey以填入此处 ").default("up8bpg7bItrfvuCaEdG6vrU-Kr5u68LSKpbGUMHSmsM="),
    generationTip: import_koishi.Schema.string().description("生成语音时返回的文字提示内容").default("生成语音中…"),
    waitTimeout: import_koishi.Schema.natural().role("ms").min(import_koishi.Time.second).step(import_koishi.Time.second).description("等待用户选择歌曲序号的最长时间").default(45 * import_koishi.Time.second)
  }).description("基础设置"),
  import_koishi.Schema.object({
    imageMode: import_koishi.Schema.boolean().description("开启后返回图片歌单，关闭后返回文本歌单").required(),
    darkMode: import_koishi.Schema.boolean().description("是否开启图片歌单暗黑模式").default(true)
  }).description("歌单设置"),
  import_koishi.Schema.object({
    exitCommand: import_koishi.Schema.string().description("退出选择指令，多个指令间请用逗号分隔开").default("0, 不听了"),
    menuExitCommandTip: import_koishi.Schema.boolean().description("是否在歌单内容的后面，加上退出选择指令的文字提示").default(false),
    recall: import_koishi.Schema.boolean().description("是否在发送语音后撤回 generationTip").default(true),
    maxDuration: import_koishi.Schema.natural().role("ms").min(import_koishi.Time.minute).step(import_koishi.Time.minute).description("歌曲最长持续时间，单位为毫秒").default(30 * import_koishi.Time.minute)
  }).description("进阶设置")
]);
function formatSongList(data, platform, startIndex) {
  const formatted = data.map((song, index) => {
    let item = `${index + startIndex + 1}. ${song.songname} -- ${song.name}`;
    if (song.msgdown) {
      item = `<s>${item}</s>`;
    }
    return item;
  }).join("<br/>");
  return `<b>${platform}</b>:<br/>${formatted}`;
}
__name(formatSongList, "formatSongList");
function timeStringToSeconds(timeStr) {
  const arr = timeStr.replace("秒", "").split("分").map(Number);
  if (arr.length === 2) {
    return arr[0] * 60 + arr[1];
  } else {
    return arr[0];
  }
}
__name(timeStringToSeconds, "timeStringToSeconds");
function apply(ctx, cfg) {
  const logger = ctx.logger("music-voice");
  function searchXZG(platform, params) {
    const path = platform === "NetEase Music" ? "/NetEase_CloudMusic_new/" : "/QQmusicVIP/";
    return ctx.http.get(`https://api.xingzhige.com/API${path}`, { params });
  }
  __name(searchXZG, "searchXZG");
  function searchQQ(query) {
    return ctx.http.post("https://u6.y.qq.com/cgi-bin/musicu.fcg", {
      comm: {
        ct: 11,
        cv: "1929"
      },
      request: {
        module: "music.search.SearchCgiService",
        method: "DoSearchForQQMusicLite",
        param: {
          search_id: "83397431192690042",
          remoteplace: "search.android.keyboard",
          query,
          search_type: 0,
          num_per_page: 10,
          page_num: 1,
          highlight: 0,
          nqc_flag: 0,
          page_id: 1,
          grp: 1
        }
      }
    }, { responseType: "json" });
  }
  __name(searchQQ, "searchQQ");
  async function generateSongListImage(listText, cfg2) {
    const textChannel = cfg2.darkMode ? 255 : 0;
    const backgroundChannel = cfg2.darkMode ? 0 : 255;
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
              background: rgb(${backgroundChannel} ${backgroundChannel} ${backgroundChannel});
              color: rgb(${textChannel} ${textChannel} ${textChannel});
              min-height: 100vh;
            }
            #song-list {
              padding: 20px;
              display: inline-block; /* 使div适应内容宽度 */
              max-width: 100%; /* 防止内容溢出 */
              white-space: nowrap; /* 防止歌曲名称换行 */
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
    const screenshot = await list.screenshot({});
    page.close();
    return screenshot;
  }
  __name(generateSongListImage, "generateSongListImage");
  ctx.command("music <keyword:text>", "搜索歌曲并生成语音").alias("mdff", "点歌").action(async ({ session }, keyword) => {
    if (!keyword) return "请输入歌曲相关信息。";
    let qq, netease;
    try {
      const res = await searchQQ(keyword);
      const item = res.request?.data?.body?.item_song;
      qq = {
        code: res.code,
        msg: "",
        data: Array.isArray(item) ? item.map((v) => {
          return {
            songname: v.title,
            album: v.album.name,
            songid: v.id,
            songurl: `https://y.qq.com/n/ryqq/songDetail/${v.mid}`,
            name: v.singer.map((v2) => v2.name).join("/"),
            msgdown: v.action.msgdown
          };
        }) : []
      };
    } catch (err) {
      logger.warn("获取QQ音乐数据时发生错误", err.message);
    }
    try {
      netease = await searchXZG(
        "NetEase Music",
        {
          name: keyword,
          key: cfg.xingzhigeAPIkey
        }
      );
    } catch (err) {
      logger.warn("获取网易云音乐数据时发生错误", err.message);
    }
    const qqData = qq?.data ?? [];
    const neteaseData = netease?.data ?? [];
    if (!qqData.length && !neteaseData.length) return "无法获取歌曲列表，请稍后再试。";
    const qqListText = qqData.length ? formatSongList(qqData, "QQ Music", 0) : "<b>QQ Music</b>: 无法获取歌曲列表";
    const neteaseListText = neteaseData.length ? formatSongList(neteaseData, "NetEase Music", qqData.length) : "<b>NetEase Music</b>: 无法获取歌曲列表";
    const listText = `${qqListText}<br/><br/>${neteaseListText}`;
    const exitCommands = cfg.exitCommand.split(/[,，]/).map((cmd) => cmd.trim());
    const exitCommandTip = cfg.menuExitCommandTip ? `退出选择请发[${exitCommands}]中的任意内容<br/><br/>` : "";
    let quoteId = session.messageId;
    if (cfg.imageMode) {
      if (!ctx.puppeteer) throw new Error("发送图片歌单需启用 puppeteer 服务");
      const imageBuffer = await generateSongListImage(listText, cfg);
      const payload = [
        import_koishi.h.quote(quoteId),
        import_koishi.h.image(imageBuffer, "image/png"),
        import_koishi.h.text(`${exitCommandTip.replaceAll("<br/>", "\n")}请在 `),
        (0, import_koishi.h)("i18n:time", { value: cfg.waitTimeout }),
        import_koishi.h.text("内，\n"),
        import_koishi.h.text("输入歌曲对应的序号")
      ];
      const msg = await session.send(payload);
      quoteId = msg.at(-1);
    } else {
      const payload = `${import_koishi.h.quote(quoteId)}${listText}<br/><br/>${exitCommandTip}请在 <i18n:time value="${cfg.waitTimeout}"/>内，<br/>输入歌曲对应的序号`;
      const msg = await session.send(payload);
      quoteId = msg.at(-1);
    }
    const input = await session.prompt((session2) => {
      quoteId = session2.messageId;
      return import_koishi.h.select(session2.elements, "text").join("");
    }, { timeout: cfg.waitTimeout });
    if ((0, import_koishi.isNullable)(input)) return `${quoteId ? import_koishi.h.quote(quoteId) : ""}输入超时，已取消点歌。`;
    if (exitCommands.includes(input)) {
      return `${import_koishi.h.quote(quoteId)}已退出歌曲选择。`;
    }
    const serialNumber = +input;
    if (!Number.isInteger(serialNumber) || serialNumber < 1 || serialNumber > qqData.length + neteaseData.length) {
      return `${import_koishi.h.quote(quoteId)}序号输入错误，已退出歌曲选择。`;
    }
    const songData = [];
    if (qqData.length) {
      songData.push(...qqData);
    }
    if (neteaseData.length) {
      songData.push(...neteaseData);
    }
    let platform, songid;
    const selected = songData[serialNumber - 1];
    if (selected.songurl.includes(".163.com/")) {
      platform = "NetEase Music";
      songid = selected.id;
    } else if (selected.songurl.includes(".qq.com/")) {
      platform = "QQ Music";
      songid = selected.songid;
    }
    if (!platform) return `${import_koishi.h.quote(quoteId)}获取歌曲失败。`;
    const [tipMessageId] = await session.send(import_koishi.h.quote(quoteId) + cfg.generationTip);
    const song = await searchXZG(platform, {
      songid,
      key: cfg.xingzhigeAPIkey
    });
    const { channelId } = session;
    if (song.code === 0) {
      const { src, interval } = song.data;
      if (!src || src.startsWith("无法")) {
        if (cfg.recall) session.bot.deleteMessage(channelId, tipMessageId);
        return `${import_koishi.h.quote(quoteId)}获取歌曲失败。`;
      }
      try {
        const duration = timeStringToSeconds(interval);
        if (duration * 1e3 > cfg.maxDuration) {
          if (cfg.recall) session.bot.deleteMessage(channelId, tipMessageId);
          return `${import_koishi.h.quote(quoteId)}歌曲持续时间超出限制。`;
        }
        await session.send(import_koishi.h.audio(src, { duration }));
      } catch (err) {
        if (cfg.recall) session.bot.deleteMessage(channelId, tipMessageId);
        throw err;
      }
      if (cfg.recall) session.bot.deleteMessage(channelId, tipMessageId);
    } else {
      if (cfg.recall) session.bot.deleteMessage(channelId, tipMessageId);
      let msg = song.msg || "";
      if (msg) {
        if ([",", ".", "!", "，", "。", "！"].includes(msg.at(-1))) {
          msg = msg.slice(0, -1);
        }
        msg += "，";
      }
      return `${import_koishi.h.quote(quoteId)}${msg}获取歌曲失败。`;
    }
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
