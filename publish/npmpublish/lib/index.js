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
  reusable: () => reusable,
  usage: () => usage
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var import_node_fs = __toESM(require("node:fs"));
var import_node_path = __toESM(require("node:path"));
var import_node_url = __toESM(require("node:url"));
var import_jimp = require("jimp");
var reusable = true;
var name = "bangbangcai";
var inject = {
  required: ["database", "i18n", "http", "logger"]
  // optional: [""],
};
var usage = `
<h1>邦多利猜猜看（邦邦猜）</h1>

<p>卡面图片来源于 <a href="https://bestdori.com" target="_blank">bestdori.com</a></p>

<div class="notice">
<h3>Notice</h3>
<p>在 Onebot 适配器下，偶尔发不出来图，Koishi 报错日志为 <code>retcode:1200</code> 时，

请查看协议端日志自行解决！</p>

<p>在 QQ 适配器下，偶尔发不出来图，Koishi 报错日志为 <code>bad request</code> 时，建议参见 论坛10257帖！ 

-> https://forum.koishi.xyz/t/topic/10257 </p>
</div>

<hr>

<div class="requirement">
<h3>Requirement</h3>
<p>1.1.0版本以前安装过的用户，请先使用 <code>bbcdrop</code> 指令 重置数据</p>
<p>卡面存放路径 可更改，默认值 在 koishi根目录 创建。</p>
</div>

<hr>

<div class="version">
<h3>Version</h3>
<p>1.3.0</p>
<ul>
<li>新增【重切片】指令，优化切片效果。</li>
<li>新增【数据表清除】指令，可清除数据表。</li>
<li>优化私聊环境，兼容特殊字符的频道ID。</li>
</ul>
</div>

<hr>

<div class="thanks">
<h3>Thanks</h3>
<p>灵感参考： <a href="/market?keyword=koishi-plugin-cck">koishi-plugin-cck</a></p>

<hr>

<h4>如果想继续开发优化本插件，<a href="https://github.com/xsjh/koishi-plugin-bangbangcai/pulls" target="_blank">欢迎 PR</a></h4>

</body>
`;
var Config = import_koishi.Schema.intersect([
  import_koishi.Schema.object({
    bbc: import_koishi.Schema.string().default("邦邦猜").description("`父级指令`名称"),
    bbc_command: import_koishi.Schema.string().default("bbc").description("`游戏开始`的指令名称"),
    bbc_restart_command: import_koishi.Schema.string().default("bbc重开").description("`游戏重新开始`的指令名称"),
    bbc_bzd_command: import_koishi.Schema.string().default("bbcbzd").description("`不知道答案`的指令名称"),
    bbc_drop_command: import_koishi.Schema.string().default("bbcdrop").description("`清除bbc数据表`的指令名称（默认三级权限）"),
    bbc_recrop_command: import_koishi.Schema.string().default("bbc重切").description("`重新切片`的指令名称")
  }).description("基础设置"),
  import_koishi.Schema.object({
    textMessage: import_koishi.Schema.string().description("`猜谜`提示语1").default("时间60秒~\n猜猜我是谁："),
    remind_Message: import_koishi.Schema.string().description("`猜谜`提示语2").default("(如遇到重复题目请输入 bbc重开 以清理数据库)"),
    phrase_timeout: import_koishi.Schema.array(String).role("table").description("`超时结束`时 提示：").default(["60秒到了~\n答案是："]),
    phrase_answered: import_koishi.Schema.array(String).role("table").description("`回答正确`时 提示：").default(["不赖，你还懂"]),
    phrase_bzd: import_koishi.Schema.array(String).role("table").description("触发`不知道`时 提示：").default(["游戏结束，这是："])
  }).description("进阶设置"),
  import_koishi.Schema.object({
    bbctimeout: import_koishi.Schema.number().default(60).description("游戏持续(计时)的 时长（秒）"),
    nowtimers: import_koishi.Schema.boolean().default(false).description("开启后，触发【bbc】指令之后，立即进入60秒计时<br>关闭后，等待用户 `交互第一条消息后` 才进入计时。"),
    max_recrop_times: import_koishi.Schema.number().default(3).min(0).max(15).step(1).description("允许`重新切片`的最大次数").role("slider"),
    autocleantemp: import_koishi.Schema.boolean().default(true).description("开启后，自动清除`游戏结束的`频道数据。")
  }).description("交互设置"),
  import_koishi.Schema.object({
    card_path: import_koishi.Schema.string().description("卡面图片数据 (临时)存放路径<br>请填入`文件夹绝对路径`，例如：`D:\\bbcimg\\card`<br>为空时，默认存到`koishi根目录/data/bangbangcai`"),
    cutWidth: import_koishi.Schema.number().default(200).description("卡片剪裁 宽度"),
    cutLength: import_koishi.Schema.number().default(150).description("卡片剪裁 高度")
  }).description("高级设置"),
  import_koishi.Schema.object({
    logger_info: import_koishi.Schema.boolean().default(false).description("日志调试模式")
  }).description("开发者设置")
]);
async function apply(ctx, config) {
  const timers = {};
  ctx.on("ready", async () => {
    try {
      ctx.model.extend(
        "bangguess_user",
        {
          // 各字段类型
          id: "unsigned",
          platform: "string",
          userId: "string",
          channelId: "string",
          time: "timestamp",
          img_url: "string",
          card: "binary",
          gaming: "boolean",
          nicknames: "json",
          recrop_count: "integer"
        },
        {
          // 使用自增的主键值
          autoInc: true,
          unique: [["platform", "channelId"]]
        }
      );
    } catch (error) {
      ctx.logger.error("数据表创建出错", error);
    }
    ctx.i18n.define(
      "zh-CN",
      {
        commands: {
          [config.bbc]: {
            description: `邦多利猜猜看（邦邦猜）`,
            messages: {}
          },
          [config.bbc_command]: {
            description: `BanG Dream猜猜卡面！`,
            messages: {
              "aleadygaming": '当前已有游戏进行中~输入"{0}" 可以结束当前游戏\n(如遇到故障可输入 "{1}" 以清理数据库)',
              "errorstart": "游戏启动失败，请稍后重试。",
              "jsonreaderror": "读取角色数据失败，请检查 JSON 文件",
              "failedtocachedata": "存储图片 URL 到数据库失败，请稍后重试。",
              "nowloading": "图片加载中请稍等...",
              "downloaderror": "图片下载失败，请检查网络或重新开始游戏！",
              "dataerror": '数据库出错，请输入 "{0}" 清理数据库后即可重新开始游戏！',
              "imagedataerror": '未找到图片数据，若有需要请输入 "{0}" 以清理数据库，之后重新开始游戏即可！',
              "imgfailedtosend": "答案图片发送失败",
              "runtimeerror": "执行游戏时出错，请查看日志"
            }
          },
          [config.bbc_restart_command]: {
            description: `bbc数据清理，重开！`,
            messages: {
              "restartplz": "群聊 {0} 数据已清理，请重开游戏！",
              "restarterror": "清理数据失败，请稍后再试"
            }
          },
          [config.bbc_bzd_command]: {
            description: "不知道答案",
            messages: {
              "nogame": "当前没有正在进行的游戏哦~"
            }
          },
          [config.bbc_recrop_command]: {
            description: "重新切片",
            messages: {
              "nogame": "当前没有正在进行的游戏哦~",
              "recroperror": "重切片失败，请稍后重试",
              "recrop_times_exhausted": "重切片次数已经用尽哦~",
              "recrop_success": "重切片成功！"
            }
          },
          [config.bbc_drop_command]: {
            description: "清除 bbc 数据表",
            messages: {
              "drop_success": "数据表 bangguess_user 已成功删除。",
              "drop_error": "删除数据表时发生错误，请稍后重试。"
            }
          }
        }
      }
    );
    ctx.command(`${config.bbc}`);
    ctx.command(`${config.bbc}/${config.bbc_drop_command}`, { authority: 3 }).action(async ({ session }) => {
      try {
        await ctx.model.drop("bangguess_user");
        await session.send(session.text(`.drop_success`));
        logInfo(`数据表 bangguess_user 已被删除`);
      } catch (error) {
        ctx.logger.error("删除数据表时出错", error);
        await session.send(session.text(`.drop_error`));
      }
    });
    ctx.command(`${config.bbc}/${config.bbc_restart_command}`).action(async ({ session }) => {
      const channelId = session.channelId;
      const sanitizedChannelId = session.isDirect ? sanitizeChannelId(channelId) : channelId;
      try {
        await ctx.database.remove("bangguess_user", { channelId: sanitizedChannelId });
        await session.send(session.text(".restartplz", [channelId]));
        logInfo(`群聊 ${channelId} 的数据已被清理 (包括正在进行的游戏)`);
      } catch (error) {
        ctx.logger.error(`清理群聊 ${channelId} 数据时出错`, error);
        await session.send(session.text(".restarterror"));
      }
    });
    ctx.command(`${config.bbc}/${config.bbc_bzd_command}`).action(async ({ session }) => {
      const channelId = session.channelId;
      const sanitizedChannelId = session.isDirect ? sanitizeChannelId(channelId) : channelId;
      const userId = session.userId;
      try {
        const gameRecord = await ctx.database.get("bangguess_user", { channelId: sanitizedChannelId, gaming: true });
        if (gameRecord.length === 0) {
          await session.send(session.text(`commands.${config.bbc_bzd_command}.messages.nogame`));
          return;
        }
        const record = gameRecord[0];
        const imageData = record.card;
        const nicknames = record.nicknames;
        try {
          const message = [
            `${config.phrase_bzd}${nicknames[7]}`,
            import_koishi.h.image(imageData, "image/png")
            // 使用 h.image() 发送图片;
          ].join("\n");
          await session.send(message);
        } catch (e) {
          ctx.logger.error("答案图片发送失败:", e);
          await session.send(session.text(`commands.${config.bbc_command}.messages.imgfailedtosend`));
        }
        logInfo("bzd游戏结束消息发给了", userId, channelId);
        await clearGameSession(channelId, userId, session.isDirect);
      } catch (error) {
        ctx.logger.error("处理不知道答案指令时出错:", error);
        await session.send(session.text(".runtimeerror"));
      }
    });
    ctx.command(`${config.bbc}/${config.bbc_recrop_command}`).action(async ({ session }) => {
      const channelId = session.channelId;
      const sanitizedChannelId = session.isDirect ? sanitizeChannelId(channelId) : channelId;
      const userId = session.userId;
      try {
        const gameRecord = await ctx.database.get("bangguess_user", { channelId: sanitizedChannelId, gaming: true });
        if (gameRecord.length === 0) {
          await session.send(session.text(`commands.${config.bbc_recrop_command}.messages.nogame`));
          return;
        }
        const record = gameRecord[0];
        let recrop_count = record.recrop_count;
        if (recrop_count <= 0) {
          await session.send(session.text(`commands.${config.bbc_recrop_command}.messages.recrop_times_exhausted`));
          return;
        }
        recrop_count--;
        await ctx.database.set("bangguess_user", { channelId: sanitizedChannelId, gaming: true }, { recrop_count });
        const card_path = config.card_path || import_node_path.default.join(ctx.baseDir, "data", "bangbangcai");
        const folderPath = import_node_path.default.join(card_path, "images");
        const cutWidth = config.cutWidth;
        const cutLength = config.cutLength;
        try {
          await randomCropImage(
            userId,
            sanitizedChannelId,
            // 使用处理后的 channelId;
            cutWidth,
            cutLength,
            folderPath
          );
          const imageSegments = [];
          imageSegments.push(import_koishi.h.text(session.text(".recrop_success")));
          for (let i = 1; i <= 3; i++) {
            const croppedImagePath = import_node_path.default.join(
              folderPath,
              `${userId}_${sanitizedChannelId}`,
              // 使用处理后的 channelId;
              `cropped_image_${i}.png`
            );
            if (import_node_fs.default.existsSync(croppedImagePath)) {
              imageSegments.push(import_koishi.h.image(import_node_url.default.pathToFileURL(croppedImagePath).href));
            } else {
              ctx.logger.error(`裁剪后的图片不存在: ${croppedImagePath}`);
              return "图片截取出错，请稍后再试";
            }
          }
          imageSegments.push(config.remind_Message);
          await session.send(imageSegments);
          logInfo("重新裁剪图片发往：", userId, channelId);
        } catch (error) {
          ctx.logger.error("重新裁剪失败:", error);
          await session.send(session.text(`commands.${config.bbc_recrop_command}.messages.recroperror`));
          return;
        }
      } catch (error) {
        ctx.logger.error("处理重切片指令时出错:", error);
        await session.send(session.text(".runtimeerror"));
      }
    });
    async function clearGameSession(channelId, userId, isDirect) {
      try {
        if (channelId) {
          const sanitizedChannelId = isDirect ? sanitizeChannelId(channelId) : channelId;
          const gameRecord = await ctx.database.get("bangguess_user", {
            channelId: sanitizedChannelId,
            gaming: true
          });
          if (gameRecord.length > 0) {
            if (timers[channelId]?.unregisterListener) {
              timers[channelId].unregisterListener();
              logInfo(`[clearGameSession] 已移除群聊 ${channelId} 的监听器`);
            }
            if (timers[channelId]) {
              if (timers[channelId].unregisterListener) {
                timers[channelId].unregisterListener();
                logInfo(`[clearGameSession] 已移除群聊 ${channelId} 的监听器`);
              }
              clearTimeout(timers[channelId].timer);
              delete timers[channelId];
              logInfo(`[clearGameSession] 已清除群聊 ${channelId} 的计时器`);
            }
            const gameRecord2 = await ctx.database.get("bangguess_user", { channelId: sanitizedChannelId, gaming: true });
            if (config.autocleantemp && gameRecord2.length > 0) {
              const currentUserId = userId || gameRecord2[0].userId;
              const card_path = config.card_path || import_node_path.default.join(ctx.baseDir, "data", "bangbangcai");
              const userFolder = import_node_path.default.join(card_path, "images", `${currentUserId}_${sanitizedChannelId}`);
              try {
                if (import_node_fs.default.existsSync(userFolder)) {
                  logInfo(`[clearGameSession] 准备删除用户 ${currentUserId} 在群聊 ${channelId} 的临时图片文件夹: ${userFolder}`);
                  await import_node_fs.default.promises.rm(userFolder, { recursive: true, force: true });
                  logInfo(`[clearGameSession] 已删除用户 ${currentUserId} 在群聊 ${channelId} 的临时图片文件夹: ${userFolder}`);
                } else {
                  logInfo(`[clearGameSession] 未找到用户 ${currentUserId} 在群聊 ${channelId} 的临时图片文件夹，无需删除`);
                }
              } catch (folderDeletionError) {
                ctx.logger.error(`[clearGameSession] 删除用户 ${currentUserId} 在群聊 ${channelId} 的临时图片文件夹时出错:`, folderDeletionError);
              }
              await ctx.database.remove("bangguess_user", { channelId: sanitizedChannelId, gaming: true });
              logInfo(`[clearGameSession] 已删除群聊 ${channelId} 的游戏数据 (autocleantemp enabled)`);
            } else {
              await ctx.database.set("bangguess_user", { channelId: sanitizedChannelId, gaming: true }, { gaming: false });
              logInfo(`[clearGameSession] 已结束群聊 ${channelId} 的游戏 (autocleantemp disabled, data kept)`);
            }
          }
        }
      } catch (error) {
        ctx.logger.error("[clearGameSession] 更新数据库记录时出错:", error);
      }
    }
    __name(clearGameSession, "clearGameSession");
    ctx.command(`${config.bbc}/${config.bbc_command}`).action(async ({ session }) => {
      const channelId = session.channelId;
      const sanitizedChannelId = session.isDirect ? sanitizeChannelId(channelId) : channelId;
      const userId = session.userId;
      try {
        try {
          const existingGame = await ctx.database.get("bangguess_user", {
            channelId: sanitizedChannelId,
            gaming: true
          });
          if (existingGame.length > 0) {
            await session.send(session.text(".aleadygaming", [config.bbc_bzd_command, config.bbc_restart_command]));
            return;
          } else {
            const data = {
              platform: session.platform,
              userId: session.userId,
              channelId: sanitizedChannelId,
              time: /* @__PURE__ */ new Date(),
              gaming: true,
              recrop_count: config.max_recrop_times
            };
            await ctx.database.create("bangguess_user", data);
          }
        } catch (error) {
          ctx.logger.error("插入数据时出错：", error);
          await session.send(session.text(".errorstart"));
          return;
        }
        const jsonFilePath = import_node_path.default.join(__dirname, "./../resource/all5_2.json");
        logInfo("读取的json文件位置：", jsonFilePath);
        const jsonData = await readJson(jsonFilePath);
        if (!jsonData) {
          await session.send(session.text(".jsonreaderror"));
          return;
        }
        const { resourceSetName, characterId } = jsonData;
        const nicknameFilePath = import_node_path.default.join(__dirname, "./../resource/nickname.json");
        let nicknames = await readJson_nickname(nicknameFilePath, characterId);
        logInfo(`角色ID: ${characterId} 的所有昵称:`, nicknames);
        const imageUrl = `https://bestdori.com/assets/jp/characters/resourceset/${resourceSetName}_rip/card_normal.png`;
        logInfo(`选中的角色ID: ${characterId}`);
        logInfo(`图片链接: ${imageUrl}`);
        try {
          await ctx.database.set(
            "bangguess_user",
            { channelId: sanitizedChannelId, gaming: true },
            { img_url: imageUrl, nicknames }
          );
          logInfo("图片 URL 和 昵称 已成功更新到数据库");
        } catch (error) {
          ctx.logger.error("更新图片 URL 和 昵称 到数据库时出错:", error);
          await session.send(session.text(".failedtocachedata"));
          return;
        }
        await session.send(session.text(".nowloading"));
        const imageBuffer = await downloadImage(imageUrl);
        if (!imageBuffer) {
          await session.send(session.text(".downloaderror"));
          return;
        }
        try {
          await ctx.database.set(
            "bangguess_user",
            { channelId: sanitizedChannelId, gaming: true },
            { card: imageBuffer }
            // 使用 imageBuffer
          );
          logInfo("图片 二进制数据 已成功更新到数据库");
        } catch (error) {
          ctx.logger.error("更新图片 二进制数据 到数据库时出错:", error);
          await session.send(session.text(".failedtocachedata"));
          return;
        }
        const imageSegments = [];
        try {
          const card_path = config.card_path || import_node_path.default.join(ctx.baseDir, "data", "bangbangcai");
          const folderPath = import_node_path.default.join(card_path, "images");
          const cutWidth = config.cutWidth;
          const cutLength = config.cutLength;
          await randomCropImage(
            userId,
            sanitizedChannelId,
            cutWidth,
            cutLength,
            folderPath
          );
          imageSegments.push(config.textMessage);
          for (let i = 1; i <= 3; i++) {
            const croppedImagePath = import_node_path.default.join(
              folderPath,
              `${userId}_${sanitizedChannelId}`,
              `cropped_image_${i}.png`
            );
            if (import_node_fs.default.existsSync(croppedImagePath)) {
              imageSegments.push(import_koishi.h.image(import_node_url.default.pathToFileURL(croppedImagePath).href));
            } else {
              ctx.logger.error(`裁剪后的图片不存在: ${croppedImagePath}`);
            }
          }
          imageSegments.push(config.remind_Message);
          await delay(1e3);
        } catch (error) {
          ctx.logger.error("裁剪失败:", error);
          return "裁剪失败，请检查日志。";
        }
        try {
          await session.send(imageSegments);
          logInfo("裁剪图片发往：", userId, channelId);
        } catch (error) {
          ctx.logger.error("发送图片消息时出错:", error);
        }
        logInfo("游戏已启动，等待用户输入...");
        if (!config.nowtimers) {
          timers[channelId] = timers[channelId] || {};
          timers[channelId].timer = ctx.setTimeout(async () => {
            await handleTimeout(ctx, config, session, sanitizedChannelId, timers);
          }, config.bbctimeout * 1e3);
        }
      } catch (error) {
        ctx.logger.error("游戏执行过程中出错:", error);
        await session.send(session.text(".runtimeerror"));
      }
    });
    ctx.middleware(async (session, next) => {
      const channelId = session.channelId;
      const sanitizedChannelId = session.isDirect ? sanitizeChannelId(channelId) : channelId;
      const userId = session.userId;
      const userInput = session.stripped.content.trim();
      try {
        const gameRecord = await ctx.database.get("bangguess_user", { channelId: sanitizedChannelId, gaming: true });
        if (gameRecord.length > 0 && gameRecord[0].gaming === true) {
          const record = gameRecord[0];
          const nicknames = record.nicknames;
          if (nicknames.some((nickname) => userInput.includes(nickname))) {
            logInfo(`用户 ${userId} 在频道 ${channelId} 回答正确: ${userInput}`);
            await handleCorrectAnswer(ctx, config, session, sanitizedChannelId, record, userInput, timers);
            return;
          }
          if (config.nowtimers && !timers[channelId]?.timer) {
            timers[channelId] = timers[channelId] || {};
            timers[channelId].timer = ctx.setTimeout(async () => {
              await handleTimeout(ctx, config, session, sanitizedChannelId, timers);
            }, config.bbctimeout * 1e3);
            logInfo(`[nowtimers] 启动群聊 ${channelId} 的计时器，等待超时`);
          }
          logInfo(`用户 ${userId} 在频道 ${channelId} 输入了错误答案或无关消息: ${userInput}`);
          return next();
        } else {
          return next();
        }
      } catch (error) {
        ctx.logger.error("中间件处理消息时出错:", error);
        return next();
      }
    }, config.middleware);
    async function handleTimeout(ctx2, config2, session, sanitizedChannelId, timers2) {
      const channelId = session.channelId;
      const userId = session.userId;
      const currentTimer = timers2[channelId];
      if (!currentTimer?.timer) {
        logInfo("[倒计时] 计时器已被清除，跳过处理");
        return;
      }
      try {
        const records = await ctx2.database.get("bangguess_user", {
          channelId: sanitizedChannelId,
          gaming: true
        });
        if (records.length === 0 || records[0].gaming !== true) {
          logInfo("[倒计时] 游戏已提前结束，跳过超时处理");
          return;
        }
        if (!records[0].card) {
          ctx2.logger.error("[倒计时] 倒计时结束方法未找到二进制数据");
          await session.send(session.text(`commands.${config2.bbc_command}.messages.dataerror`, [config2.bbc_restart_command]));
          return;
        }
        const record = records[0];
        const message = [
          `${config2.phrase_timeout}${record.nicknames[7]}`,
          record.img_url,
          import_koishi.h.image(record.card, "image/png")
        ].join("\n");
        await session.send(message);
        logInfo("[超时] 超时游戏结束消息发给了", channelId, userId);
      } catch (error) {
        ctx2.logger.error("[超时] 发送消息或图片时出错:", error);
      } finally {
        if (timers2[channelId]?.timer === currentTimer.timer) {
          logInfo("[超时] 清理当前游戏会话");
          await clearGameSession(channelId, userId, session.isDirect);
          clearTimeout(timers2[channelId]?.timer);
          delete timers2[channelId];
        } else {
          logInfo("[超时] 检测到新游戏已开始，跳过清理");
        }
      }
    }
    __name(handleTimeout, "handleTimeout");
    async function handleCorrectAnswer(ctx2, config2, session, sanitizedChannelId, record, userInput, timers2) {
      const channelId = session.channelId;
      const userId = session.userId;
      const img_url = record.img_url;
      const imageData = record.card;
      const nicknames = record.nicknames;
      await clearGameSession(channelId, userId, session.isDirect);
      const currentGameRecord = await ctx2.database.get("bangguess_user", { channelId: sanitizedChannelId, gaming: true });
      if (currentGameRecord.length > 0 && currentGameRecord[0].gaming) {
        logInfo("[回答正确] 游戏会话清理后，仍然检测到 gaming 为 true，可能存在竞态条件或错误");
      }
      const message_y = [`正确，${nicknames[7]} : `, img_url];
      await session.send(message_y);
      try {
        const message = [
          `${import_koishi.h.at(session.userId)} ${config2.phrase_answered}${userInput}`,
          import_koishi.h.image(imageData, "image/png"),
          "游戏结束"
        ].join("\n");
        await session.send(message);
      } catch {
        await session.send(session.text(`commands.${config2.bbc_command}.messages.imgfailedtosend`));
      }
      logInfo("[回答正确] 回答正确消息发送至：", userId, userInput);
      if (timers2[channelId]?.timer) {
        clearTimeout(timers2[channelId].timer);
        delete timers2[channelId].timer;
      }
    }
    __name(handleCorrectAnswer, "handleCorrectAnswer");
    async function delay(ms) {
      return new Promise((resolve) => ctx.setTimeout(resolve, ms));
    }
    __name(delay, "delay");
    async function downloadImage(imageUrl, maxRetries = 2, retryDelay = 2e3) {
      let attempt = 0;
      while (attempt <= maxRetries) {
        try {
          const responseData = await ctx.http.file(imageUrl);
          logInfo(`图片: ${imageUrl}`);
          logInfo(responseData);
          const buffer = Buffer.from(responseData.data);
          return buffer;
        } catch (error) {
          ctx.logger.error(`第 ${attempt + 1} 次下载图片失败:`, error);
          attempt++;
          if (attempt > maxRetries) {
            ctx.logger.error(`下载图片失败，已达到最大重试次数 (${maxRetries} 次)`);
            return null;
          }
          logInfo(`等待 ${retryDelay / 1e3} 秒后重试...`);
          await new Promise((resolve) => ctx.setTimeout(resolve, retryDelay));
        }
      }
      return null;
    }
    __name(downloadImage, "downloadImage");
    async function randomCropImage(userId, channelId, cutWidth, cutLength, folderPath) {
      const sanitizedChannelId = channelId || "sandbox";
      try {
        const records = await ctx.database.get("bangguess_user", {
          channelId: sanitizedChannelId,
          gaming: true
          // 使用 sanitizedChannelId 查询;
        });
        if (records.length === 0) {
          ctx.logger.error("未找到游戏记录");
          return;
        }
        if (!records[0].card) {
          ctx.logger.error("未找到图片数据");
          return;
        }
        const imageData = records[0].card;
        logInfo(`从数据库获取到图片数据，大小: ${imageData.byteLength} 字节`);
        const imageBuffer = Buffer.from(imageData);
        const userFolder = import_node_path.default.join(folderPath, `${userId}_${sanitizedChannelId}`);
        if (!import_node_fs.default.existsSync(userFolder)) {
          import_node_fs.default.mkdirSync(userFolder, { recursive: true });
        }
        const originalImagePath = import_node_path.default.join(userFolder, "res.png");
        await import_node_fs.default.promises.writeFile(originalImagePath, imageBuffer);
        logInfo(`原始图片已保存到: ${originalImagePath}`);
        const image = await import_jimp.Jimp.read(imageBuffer);
        for (let i = 1; i <= 3; i++) {
          const x = Math.floor(Math.random() * (image.bitmap.width - cutWidth));
          const y = Math.floor(Math.random() * (image.bitmap.height - cutLength));
          const croppedImage = image.clone().crop({ x, y, w: cutWidth, h: cutLength });
          const croppedImagePath = import_node_path.default.join(userFolder, `cropped_image_${i}.png`);
          await croppedImage.write(croppedImagePath);
          logInfo(`图像裁剪完成，保存为：${croppedImagePath}`);
        }
        logInfo("所有裁切图片已成功保存");
      } catch (error) {
        ctx.logger.error("裁剪图像时出错:", error);
        return;
      }
    }
    __name(randomCropImage, "randomCropImage");
    async function readJson(filePath) {
      try {
        const data = await import_node_fs.default.promises.readFile(filePath, "utf8");
        const parsedData = JSON.parse(data);
        const keys = Object.keys(parsedData);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const characterData = parsedData[randomKey];
        logInfo("json随机键:", randomKey);
        logInfo("获得的随机characterData:", characterData);
        const resourceSetName = characterData.resourceSetName;
        const characterId = characterData.characterId;
        logInfo("此键resourceSetName:", resourceSetName);
        logInfo("此键characterId:", characterId);
        return { resourceSetName, characterId };
      } catch (error) {
        ctx.logger.error("读取 JSON 文件时出错:", error);
        return null;
      }
    }
    __name(readJson, "readJson");
    async function readJson_nickname(nick_filePath, characterId) {
      try {
        const data = await import_node_fs.default.promises.readFile(nick_filePath, "utf8");
        const parsedData = JSON.parse(data);
        const nicknames = parsedData[characterId];
        if (nicknames) {
          return nicknames;
        } else {
          ctx.logger.error(`未找到对应的 characterId: ${characterId} 的昵称`);
          return [];
        }
      } catch (error) {
        ctx.logger.error("读取 JSON 文件时出错:", error);
        return [];
      }
    }
    __name(readJson_nickname, "readJson_nickname");
    function logInfo(...args) {
      if (config.logger_info) {
        ctx.logger.info(...args);
      }
    }
    __name(logInfo, "logInfo");
    function sanitizeChannelId(channelId) {
      return channelId.replace(/[^a-zA-Z0-9_-]/g, "_");
    }
    __name(sanitizeChannelId, "sanitizeChannelId");
  });
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name,
  reusable,
  usage
});
