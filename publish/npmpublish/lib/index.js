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
var import_node_fs = __toESM(require("node:fs"));
var import_node_path = __toESM(require("node:path"));
var import_nodejieba = __toESM(require("nodejieba"));
var name = "word-cloud-image";
var inject = ["database", "puppeteer", "cron"];
var wordcloud2jsPath = import_node_path.default.resolve(__dirname, "../data/wordcloud2.min.js");
var wordcloud2js = "";
var messageData = {};
var lastSaveTime = Date.now();
try {
  wordcloud2js = import_node_fs.default.readFileSync(wordcloud2jsPath, "utf8");
} catch (error) {
  console.error("Failed to load wordcloud2.min.js:", error);
}
var usage = `
---

所需服务：
- database
- puppeteer
- logger
- i18n

---
 
- 你也可以不使用本插件的定时功能，而使用 [command-creator-extender](/market?keyword=command-creator-extender) 来统一管理定时执行的指令

---

本插件未提供渲染所需字体，请自行确认对应字体在puppeteer里可用。（尤其是docker环境）
`;
var Config = import_koishi.Schema.intersect([
  import_koishi.Schema.object({
    enabledCommand: import_koishi.Schema.boolean().default(true).description("启用指令触发"),
    enabledCronSend: import_koishi.Schema.boolean().default(true).description("启用定时触发")
  }).description("基础配置"),
  import_koishi.Schema.union([
    import_koishi.Schema.object({
      enabledCommand: import_koishi.Schema.const(false).required()
    }),
    import_koishi.Schema.object({
      enabledCommand: import_koishi.Schema.const(true),
      commandName: import_koishi.Schema.string().default("群词云").description("指令名称"),
      commanddDscription: import_koishi.Schema.string().default("查看本群今日发言词云").description("指令描述")
    })
  ]),
  import_koishi.Schema.union([
    import_koishi.Schema.object({
      enabledCronSend: import_koishi.Schema.const(false).required()
    }),
    import_koishi.Schema.object({
      enabledCronSend: import_koishi.Schema.const(true),
      channelToEffact: import_koishi.Schema.array(import_koishi.Schema.object({
        channelId: import_koishi.Schema.string().description("频道ID"),
        BroadcastBotId: import_koishi.Schema.string().description("机器人账号"),
        enableBroadcast: import_koishi.Schema.boolean().description("定时播报").default(true),
        Broadcasttime: import_koishi.Schema.string().role("time").description("每日播报时间")
      })).role("table").description("应用的群组列表<br>注意定时播报为主动消息").default([
        {
          "Broadcasttime": "23:58:00",
          "BroadcastBotId": "0",
          "enableBroadcast": true,
          "channelId": "114514"
        }
      ])
    })
  ]),
  import_koishi.Schema.object({
    trueMiddware: import_koishi.Schema.boolean().description("使用前置中间件 `保持开启 才能完整统计数据`").default(true),
    dataFile: import_koishi.Schema.string().default("data/word-cloud-image").description("数据存储路径 `对于koishi实例的相对路径`"),
    saveInterval: import_koishi.Schema.number().max(60).min(1).default(5).description("数据保存间隔（分钟）"),
    minWordLength: import_koishi.Schema.number().default(1).description("最小词长度"),
    maxWordCount: import_koishi.Schema.number().default(1e3).description("最大词数量"),
    nested: import_koishi.Schema.object({
      stopWords: import_koishi.Schema.array(String).role("table").default([
        "的",
        "了",
        "和",
        "是",
        "就",
        "都",
        "而",
        "及",
        "与",
        "这",
        "那",
        "有",
        "在",
        "中",
        "为",
        "吗",
        "啊",
        "呢",
        "吧",
        "呀",
        "哦",
        "嗯",
        "啥",
        "么",
        "嘛",
        "哈",
        "哎",
        "唉",
        "诶",
        "哇",
        "我",
        "你",
        "他",
        "她",
        "它",
        "我们",
        "你们",
        "他们",
        "她们",
        "它们",
        "自己",
        "什么",
        "这个",
        "那个",
        "这些",
        "那些",
        "不",
        "没",
        "很",
        "太",
        "非常",
        "更",
        "最",
        "又",
        "也",
        "还",
        "但",
        "可以",
        "可能",
        "应该",
        "如果",
        "因为",
        "所以",
        "但是",
        "然后",
        "现在",
        "一个",
        "一些",
        "一下",
        "一直",
        "一定",
        "一样",
        "一起",
        "只是",
        "只有",
        "就是",
        "这样",
        "那样",
        "这么",
        "那么",
        "这种",
        "那种",
        "不是",
        "不会",
        "不能",
        "不要",
        "没有",
        "可以",
        "可能",
        "应该",
        "如果",
        "因为",
        "所以",
        "，",
        "。",
        "、",
        "；",
        "：",
        "“",
        "”",
        "‘",
        "’",
        "【",
        "】",
        "（",
        "）",
        "《",
        "》",
        "—",
        "…",
        "！",
        "？",
        "·",
        "￥",
        "×",
        "÷",
        "℃",
        "℉",
        ",",
        ".",
        "/",
        ";",
        ":",
        '"',
        "'",
        "[",
        "]",
        "(",
        ")",
        "<",
        ">",
        "-",
        "_",
        "=",
        "+",
        "\\",
        "|",
        "{",
        "}",
        "!",
        "@",
        "#",
        "$",
        "%",
        "^",
        "&",
        "*",
        "~",
        "`",
        "?",
        "…",
        // 省略号（全角）
        "···",
        "...",
        // 省略号（半角组合）
        "—",
        "——",
        // 破折号（全角、半角组合）
        "——",
        // 破折号（全角两个）
        "——",
        // 破折号（半角两个）
        "~",
        // 波浪号
        "/",
        "\\",
        // 斜杠、反斜杠
        "=",
        // 等号
        "+",
        "-",
        "*",
        // 运算符
        "<",
        ">",
        // 比较符
        "|",
        // 竖线
        "#",
        // 井号
        "@",
        // @符号
        "$",
        // 美元符号
        "%",
        // 百分号
        "^",
        // 幂符号
        "&",
        // 和符号
        "`",
        // 反引号
        "~",
        // 波浪号
        "?",
        // 问号
        "!"
        // 感叹号
      ])
    }).collapse().description("停用词列表")
  }).description("进阶设置"),
  import_koishi.Schema.object({
    fontFamily: import_koishi.Schema.union(["微软 YaHei, Arial, sans-serif", "宋体, SimSun, serif", "楷体, KaiTi, serif", "黑体, SimHei, sans-serif"]).description("渲染使用的默认字体").default("微软 YaHei, Arial, sans-serif"),
    rotateRatio: import_koishi.Schema.number().default(0.5).role("slider").min(0).max(1).step(0.1).description("文字旋转比例<br>0表示不旋转，1表示都旋转"),
    backgroundColor: import_koishi.Schema.string().role("color").description("背景色设置").default("rgba(0, 0, 0, 1)"),
    ColorSchemes: import_koishi.Schema.object({
      ColorSchemesTable: import_koishi.Schema.array(import_koishi.Schema.object({
        color: import_koishi.Schema.string().role("color")
      })).role("table").collapse().description("文字配色表（建议提供至少20个颜色，以获得更丰富的效果）").default([
        { "color": "rgba(255, 0, 0, 1)" },
        // 红色
        { "color": "rgba(0, 255, 0, 1)" },
        // 绿色
        { "color": "rgba(0, 0, 255, 1)" },
        // 蓝色
        { "color": "rgba(255, 255, 0, 1)" },
        // 黄色
        { "color": "rgba(0, 255, 255, 1)" },
        // 青色
        { "color": "rgba(255, 0, 255, 1)" },
        // 品红色
        { "color": "rgba(255, 128, 0, 1)" },
        // 橙色
        { "color": "rgba(128, 0, 255, 1)" },
        // 紫色
        { "color": "rgba(0, 128, 255, 1)" },
        // 天蓝色
        { "color": "rgba(255, 0, 128, 1)" },
        // 玫瑰红
        { "color": "rgba(128, 255, 0, 1)" },
        // 草绿色
        { "color": "rgba(0, 255, 128, 1)" },
        // 翡翠绿
        { "color": "rgba(255, 192, 203, 1)" },
        // 粉色
        { "color": "rgba(173, 216, 230, 1)" },
        // 浅蓝色
        { "color": "rgba(255, 228, 196, 1)" },
        // 浅橙色
        { "color": "rgba(152, 251, 152, 1)" },
        // 浅绿色
        { "color": "rgba(240, 230, 140, 1)" },
        // 卡其色
        { "color": "rgba(221, 160, 221, 1)" },
        // 梅红色
        { "color": "rgba(255, 99, 71, 1)" },
        // 番茄红
        { "color": "rgba(60, 179, 113, 1)" }
        // 中海绿
      ])
    }).collapse().description("文字配色"),
    scaleFactor: import_koishi.Schema.number().max(3).min(1).default(1).step(0.1).description("缩放因子，越大越清晰，渲染越慢(渲染超时)。推荐1到3。")
  }).description("词云渲染设置"),
  import_koishi.Schema.object({
    loggerinfo: import_koishi.Schema.boolean().description("启用调试日志输出模式").default(false),
    PromiseTime: import_koishi.Schema.number().default(1e3).description("确保词云渲染完成的等待时间（毫秒）"),
    autoClosePage: import_koishi.Schema.boolean().description("自动关闭puppeteer").default(true)
  }).description("开发者选项")
]);
async function apply(ctx, config) {
  ctx.on("ready", async () => {
    const dataDir = import_node_path.default.join(ctx.baseDir, config.dataFile);
    if (!import_node_fs.default.existsSync(dataDir)) {
      import_node_fs.default.mkdirSync(dataDir, { recursive: true });
    }
    ctx.model.extend("message_analytics_records", {
      id: "unsigned",
      channelId: "string",
      userId: "string",
      totalcontentnumber: "integer",
      totalcontentlength: "integer",
      totalimagenumber: "integer",
      recordtime: "string"
    }, {
      primary: "id",
      autoInc: true
    });
    ctx.i18n.define("zh-CN", {
      commands: {
        [config.commandName]: {
          description: `${config.commanddDscription}`,
          messages: {
            "imageGenerationFailed": "生成词云失败，请检查 puppeteer 服务是否正常。",
            "getUserFailed": "指定的用户不可用。",
            "noData": "该用户暂无数据，快让ta多水群吧~。"
          }
        }
      }
    });
    ctx.setInterval(async () => {
      if (Date.now() - lastSaveTime >= config.saveInterval * 60 * 1e3) {
        await saveDataToFiles();
      }
    }, 60 * 1e3);
    ctx.cron("0 0 * * *", async () => {
      await saveDataToFiles();
      for (const channelId in messageData) {
        for (const userId in messageData[channelId]) {
          messageData[channelId][userId] = {
            words: /* @__PURE__ */ new Map(),
            totalcontentnumber: 0,
            totalcontentlength: 0,
            totalimagenumber: 0
          };
        }
      }
      const dataDir2 = import_node_path.default.join(ctx.baseDir, config.dataFile);
      if (import_node_fs.default.existsSync(dataDir2)) {
        const channelDirs = import_node_fs.default.readdirSync(dataDir2);
        for (const channelId of channelDirs) {
          const channelPath = import_node_path.default.join(dataDir2, channelId);
          if (import_node_fs.default.statSync(channelPath).isDirectory()) {
            const files = import_node_fs.default.readdirSync(channelPath);
            for (const file of files) {
              if (file.endsWith(".csv")) {
                import_node_fs.default.unlinkSync(import_node_path.default.join(channelPath, file));
              }
            }
          }
        }
      }
      const yesterday = /* @__PURE__ */ new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      try {
        await ctx.database.remove("message_analytics_records", { recordtime: yesterdayStr });
        ctx.logger.info(`已清空数据库中 ${yesterdayStr} 的记录`);
      } catch (error) {
        ctx.logger.error(`清空数据库记录失败:`, error);
      }
      ctx.logger.info("今日数据已重置，文件系统和数据库中的昨日数据已清空");
    });
    if (config.enabledCronSend) {
      config.channelToEffact.forEach((channel) => {
        if (channel.enableBroadcast && channel.Broadcasttime) {
          const cronTime = timeToCron(channel.Broadcasttime);
          ctx.cron(cronTime, async () => {
            logInfo(`定时发送词云到频道 ${channel.channelId}`);
            const page = await ctx.puppeteer?.page();
            try {
              const imageBuffer = await generateWordCloudImage(page, channel.channelId);
              if (imageBuffer) {
                const bot = Object.values(ctx.bots).find((b) => b.selfId === channel.BroadcastBotId || b.user?.id === channel.BroadcastBotId);
                if (!bot || bot.status !== import_koishi.Universal.Status.ONLINE) {
                  ctx.logger.error(`[定时发送] 机器人离线或未找到: ${channel.BroadcastBotId}`);
                  return;
                } else {
                  ctx.logger.info(`[定时发送] 将由 ${channel.BroadcastBotId} 执行`);
                }
                if (bot == null) return;
                await bot.sendMessage(channel.channelId, import_koishi.h.image(imageBuffer, "image/png"));
              }
            } catch (error) {
              ctx.logger.error(`[定时发送] 发送词云到频道 ${channel.channelId} 失败:`, error);
            } finally {
              if (page && !page.isClosed()) {
                page.close();
              }
            }
          });
          logInfo(`已设置定时任务：将由 ${channel.BroadcastBotId} 在 ${cronTime}（${channel.Broadcasttime}） 发送词云图片到频道 ${channel.channelId}`);
        }
      });
    }
    ctx.middleware(async (session, next) => {
      const channelId = session.channelId;
      const userId = session.userId;
      const content = session.stripped.content;
      if (!channelId || !userId || !content) {
        return next();
      }
      const isChannelEffected = config.channelToEffact.some((c) => c.channelId === channelId);
      if (!isChannelEffected) {
        return next();
      }
      if (!content === config.commandName) {
        return next();
      }
      if (!messageData[channelId]) {
        messageData[channelId] = {};
      }
      if (!messageData[channelId][userId]) {
        messageData[channelId][userId] = {
          words: /* @__PURE__ */ new Map(),
          totalcontentnumber: 0,
          totalcontentlength: 0,
          totalimagenumber: 0
        };
      }
      const userData = messageData[channelId][userId];
      const textContent = import_koishi.h.parse(content).filter((node) => node.type === "text").map((node) => node.data.content).join("");
      const imageCount = import_koishi.h.parse(content).filter((node) => node.type === "image").length;
      userData.totalcontentnumber++;
      userData.totalcontentlength += textContent.length;
      userData.totalimagenumber += imageCount;
      if (textContent) {
        logInfo();
        const words = import_nodejieba.default.cut(textContent, true);
        words.forEach((word) => {
          const trimmedWord = word.trim();
          if (trimmedWord && trimmedWord.length >= config.minWordLength && !config.nested.stopWords.includes(trimmedWord)) {
            userData.words.set(trimmedWord, (userData.words.get(trimmedWord) || 0) + 1);
          }
        });
      }
      return next();
    }, config.trueMiddware);
    if (config.enabledCommand) {
      ctx.command(`${config.commandName} [target]`).userFields(["id"]).usage(`${config.commandName} 查看本群的词云`).usage(`${config.commandName} @用户 在本群查看指定用户的词云`).action(async ({ session, options }, target) => {
        if (!session.channelId) {
          return session.text(".noData");
        }
        let targetUserId = session.userId;
        if (target) {
          const parsedUser = import_koishi.h.parse(target)[0];
          if (parsedUser?.type === "at") {
            const { id, name: name2 } = parsedUser.attrs;
            if (!id) {
              return session.text(".getUserFailed");
            }
            targetUserId = id;
          } else {
            return session.text(".getUserFailed");
          }
        }
        const page = await ctx.puppeteer?.page();
        try {
          const imageBuffer = await generateWordCloudImage(page, session.channelId, targetUserId === session.userId ? void 0 : targetUserId);
          if (imageBuffer) {
            await session.send(import_koishi.h.image(imageBuffer, "image/png"));
          } else {
            await session.text(".noData");
          }
        } catch (error) {
          ctx.logger.error("生成词云失败:", error);
          if (error.message === "No data available") {
            return session.text(".noData");
          }
          return session.text(".imageGenerationFailed");
        } finally {
          if (page && !page.isClosed()) {
            page.close();
          }
        }
      });
    }
    function timeToCron(timeStr) {
      const [hours, minutes, seconds] = timeStr.split(":").map(Number);
      return `${seconds || 0} ${minutes} ${hours} * * *`;
    }
    __name(timeToCron, "timeToCron");
    async function saveDataToFiles() {
      for (const channelId in messageData) {
        const channelDir = import_node_path.default.join(dataDir, channelId);
        if (!import_node_fs.default.existsSync(channelDir)) {
          import_node_fs.default.mkdirSync(channelDir, { recursive: true });
        }
        for (const userId in messageData[channelId]) {
          const userData = messageData[channelId][userId];
          const userFilePath = import_node_path.default.join(channelDir, `${userId}.csv`);
          let existingWords = /* @__PURE__ */ new Map();
          if (import_node_fs.default.existsSync(userFilePath)) {
            try {
              const existingContent = import_node_fs.default.readFileSync(userFilePath, "utf8");
              existingContent.split("\n").forEach((line) => {
                if (line.trim()) {
                  const [word, countStr] = line.split(",");
                  if (word && countStr) {
                    const count = parseInt(countStr, 10);
                    if (!isNaN(count)) {
                      existingWords.set(word, count);
                    }
                  }
                }
              });
            } catch (error) {
              ctx.logger.error(`读取用户数据文件失败 ${userFilePath}:`, error);
            }
          }
          for (const [word, count] of userData.words.entries()) {
            existingWords.set(word, (existingWords.get(word) || 0) + count);
          }
          const sortedWords = [...existingWords.entries()].sort((a, b) => b[1] - a[1]).slice(0, config.maxWordCount);
          const csvContent = sortedWords.map(([word, count]) => `${word},${count}`).join("\n");
          import_node_fs.default.writeFileSync(userFilePath, csvContent, "utf8");
          const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          const existingRecord = await ctx.database.get("message_analytics_records", {
            channelId,
            userId,
            recordtime: today
          });
          if (existingRecord.length > 0) {
            await ctx.database.set("message_analytics_records", {
              channelId,
              userId,
              recordtime: today
            }, {
              totalcontentnumber: existingRecord[0].totalcontentnumber + userData.totalcontentnumber,
              totalcontentlength: existingRecord[0].totalcontentlength + userData.totalcontentlength,
              totalimagenumber: existingRecord[0].totalimagenumber + userData.totalimagenumber
            });
          } else {
            await ctx.database.create("message_analytics_records", {
              channelId,
              userId,
              totalcontentnumber: userData.totalcontentnumber,
              totalcontentlength: userData.totalcontentlength,
              totalimagenumber: userData.totalimagenumber,
              recordtime: today
            });
          }
          userData.totalcontentnumber = 0;
          userData.totalcontentlength = 0;
          userData.totalimagenumber = 0;
          userData.words.clear();
        }
      }
      lastSaveTime = Date.now();
      logInfo("数据已保存到文件");
    }
    __name(saveDataToFiles, "saveDataToFiles");
    async function getUserWordCloudData(channelId, userId) {
      await saveDataToFiles();
      let csvData = "";
      if (userId) {
        const userFilePath = import_node_path.default.join(dataDir, channelId, `${userId}.csv`);
        if (import_node_fs.default.existsSync(userFilePath)) {
          csvData = import_node_fs.default.readFileSync(userFilePath, "utf8");
        }
      } else {
        const channelDir = import_node_path.default.join(dataDir, channelId);
        if (import_node_fs.default.existsSync(channelDir)) {
          const wordCount = /* @__PURE__ */ new Map();
          const files = import_node_fs.default.readdirSync(channelDir);
          for (const file of files) {
            if (file.endsWith(".csv")) {
              const filePath = import_node_path.default.join(channelDir, file);
              const content = import_node_fs.default.readFileSync(filePath, "utf8");
              content.split("\n").forEach((line) => {
                if (line.trim()) {
                  const [word, countStr] = line.split(",");
                  if (word && countStr) {
                    const count = parseInt(countStr, 10);
                    if (!isNaN(count)) {
                      wordCount.set(word, (wordCount.get(word) || 0) + count);
                    }
                  }
                }
              });
            }
          }
          csvData = [...wordCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, config.maxWordCount).map(([word, count]) => `${word},${count}`).join("\n");
        }
      }
      return csvData;
    }
    __name(getUserWordCloudData, "getUserWordCloudData");
    async function generateWordCloudImage(page, channelId, userId) {
      const csvData = await getUserWordCloudData(channelId, userId);
      if (!csvData.trim()) {
        throw new Error("No data available");
      }
      const generateWordCloudHTML = `
<!DOCTYPE html>
<html lang="zh-CN">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>词云生成器</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }

        #word-cloud-image-container {
            width: 800px;
            height: 600px;
            position: relative;
            background-color: white;
        }

        #word-cloud-image-canvas {
            display: block; /* 避免canvas底部的小间隙 */
        }

        #screenshot-frame {
            position: absolute;
            top: 0;
            left: 0;
            width: 800px;
            height: 600px;
            border: 1px solid transparent;
            pointer-events: none;
            z-index: 10;
        }
    </style>
</head>

<body>
    <div id="word-cloud-image-container">
        <canvas id="word-cloud-image-canvas"></canvas>
        <div id="screenshot-frame"></div>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            generateWordCloud();
        });

        function generateWordCloud() {
            // CSV数据
            const csvData = \`${csvData}\`;

            const words = parseCSV(csvData);

            // 获取容器和canvas元素
            const canvas = document.getElementById('word-cloud-image-canvas');
            const container = document.getElementById('word-cloud-image-container');
            
            // 获取容器的实际显示尺寸
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;
            
            // 设置缩放因子为scaleFactor
            const scaleFactor = ${config.scaleFactor};
            
            // 设置Canvas的实际像素尺寸为容器的scaleFactor倍
            canvas.width = containerWidth * scaleFactor;
            canvas.height = containerHeight * scaleFactor;
            
            // 通过CSS将Canvas缩放回原始显示尺寸
            canvas.style.width = containerWidth + 'px';
            canvas.style.height = containerHeight + 'px';

            // 配置选项
            const options = {
                list: words,

                // 字体设置
                fontFamily: '${config.fontFamily}', 
                fontWeight: 'normal',

                // 颜色设置 - 使用多彩方案
                color: getColorFunction('colorful'),

                // 背景色设置为白色
                backgroundColor: '${config.backgroundColor}',

                // 词云布局和大小设置
                minSize: 5 * scaleFactor, // 最小字体大小乘以缩放因子
                weightFactor: 20 * scaleFactor, // 权重因子乘以缩放因子
                rotateRatio: ${config.rotateRatio}, // 0表示不旋转，1表示都旋转
                rotationSteps: 2,
                shape: 'circle', // 可选: 'cardioid', 'diamond', 'square', 'triangle-forward', 'triangle', 'pentagon', 'star'

                // 性能和布局设置
                shrinkToFit: true,
                gridSize: 8 / scaleFactor, // 网格大小除以缩放因子，使布局更精细
                drawOutOfBound: false,

                // 禁用动画
                wait: 0,
                abortThreshold: 0,
                abort: function () { return false; }
            };

            // 立即渲染词云
            WordCloud(canvas, options);
        }

        // 解析CSV数据
        function parseCSV(csvText) {
            const lines = csvText.trim().split('\\n');
            return lines.map(line => {
                // 使用正则表达式替换中文逗号为英文逗号，然后按英文逗号分割
                const parts = line.replace(/，/g, ',').split(',');
                const text = parts[0].trim();
                const weightStr = parts[1] ? parts[1].trim() : '';
                const weight = parseInt(weightStr, 10);
                if (text && !isNaN(weight)) {
                    return [text, weight]; // wordcloud2.js需要[text, weight]格式
                }
                return null;
            }).filter(item => item !== null);
        }

        // 获取颜色函数
        function getColorFunction(scheme) {
            // 颜色配置
            const colorSchemes = {
                colorful: ${JSON.stringify(config.ColorSchemes.ColorSchemesTable.map((item) => item.color))}
            };

            const colors = colorSchemes[scheme] || colorSchemes.colorful;

            return function (word, weight, fontSize, distance, theta) {
                return colors[Math.floor(Math.random() * colors.length)];
            };
        }
    </script>

    <script>
        //  https://cdnjs.cloudflare.com/ajax/libs/wordcloud2.js/1.2.3/wordcloud2.min.js
        ${wordcloud2js}
    </script>


</body>

</html>
`;
      await page.setContent(generateWordCloudHTML, { waitUntil: "networkidle2" });
      await new Promise((resolve) => setTimeout(resolve, config.PromiseTime));
      const wordCloudContainer = await page.$("#word-cloud-image-container");
      if (!wordCloudContainer) {
        await page.close();
        throw new Error("Word cloud container not found.");
      }
      const boundingBox = await wordCloudContainer.boundingBox();
      if (!boundingBox) {
        await page.close();
        throw new Error("Failed to get bounding box of word cloud container.");
      }
      await page.setViewport({
        width: Math.ceil(boundingBox.width),
        height: Math.ceil(boundingBox.height)
      });
      const imgBuf = await wordCloudContainer.screenshot({});
      if (config.autoClosePage) await page.close();
      return imgBuf;
    }
    __name(generateWordCloudImage, "generateWordCloudImage");
    function logInfo(...args) {
      if (config.loggerinfo) {
        ctx.logger.info(...args);
      }
    }
    __name(logInfo, "logInfo");
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
