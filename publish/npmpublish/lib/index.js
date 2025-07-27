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
var name = "autowithdraw-fix";
var inject = ["logger"];
var usage = `
---

<h2>简介</h2>

<p>在用户输入被撤回后，自动撤回机器人响应的关联消息。</p>

---

<h2>注意事项</h2>

<ul>
<li>确保 Koishi 机器人具有撤回消息的权限。</li>
<li><code>withdrawExpire</code> 设置得太小可能会导致插件无法正确撤回消息。</li>
<li><code>loggerinfo</code> 选项仅用于调试目的，不建议在生产环境中开启。</li>
</ul>

<h2>灵感来源</h2>
<p>灵感来自这个项目：<a href="https://github.com/Kabuda-czh/koishi-plugin-autowithdraw/" target="_blank">github.com/Kabuda-czh/koishi-plugin-autowithdraw</a></p>

---

目前仅在 onebot 平台测试 实际可用！

已知bug：在qq平台使用会导致报错，发不出消息。

`;
var Config = import_koishi.Schema.intersect([
  import_koishi.Schema.object({
    enableplatform: import_koishi.Schema.array(String).role("table").default(["onebot"]).description("允许应用的平台。在下列平台之外，本插件不会生效<br>注意 本插件仅在`onebot`平台实测可用，并且`qq`平台无法使用。其他平台可用性未知。")
  }).description("基础设置"),
  import_koishi.Schema.object({
    quoteEnable: import_koishi.Schema.boolean().default(false).description("是否 以引用的方式发送 回复内容（还有其他功能）<br>可能会有兼容问题，谨慎开启").experimental()
  }).description("追加消息设置"),
  import_koishi.Schema.union([
    import_koishi.Schema.object({
      quoteEnable: import_koishi.Schema.const(true).required(),
      returnquotetable: import_koishi.Schema.array(import_koishi.Schema.object({
        include: import_koishi.Schema.string().description("关键词")
      })).role("table").description("当`响应内容`包含特定字符时，不进行回复发送，而是使用原始方法<br>注意：一般这里会填入 不支持回复发送 的消息元素关键词").default(
        [
          {
            "include": "<figure"
          },
          {
            "include": "<quote"
          },
          {
            "include": "<audio"
          },
          {
            "include": "<file"
          },
          {
            "include": "<video"
          },
          {
            "include": "<message"
          }
        ]
      ),
      morequoteEnable: import_koishi.Schema.array(import_koishi.Schema.object({
        hModel: import_koishi.Schema.union(["text", "at", "sharp", "quote", "image", "audio", "video", "file"]).description("h函数的使用方法"),
        value: import_koishi.Schema.string().description("传入参数"),
        replacecontent: import_koishi.Schema.boolean().description("是否为变量")
      })).role("table").default([
        {
          "hModel": "quote",
          "value": "session.messageId",
          "replacecontent": true
        }
      ]).description("自定义消息前缀<br>默认为`引用`功能").experimental()
    }),
    import_koishi.Schema.object({})
  ]),
  import_koishi.Schema.object({
    withdrawExpire: import_koishi.Schema.number().default(150).description("记录`session.sn`的过期时间 (秒)<br>超出此时间的`session.sn`将被清除记录，不再能找到对应需要撤回的消息ID<br>此时间应该大于用户限定撤回时间，例如`onebot`平台：两分钟`（120秒）`"),
    returntable: import_koishi.Schema.array(import_koishi.Schema.object({
      include: import_koishi.Schema.string().description("关键词")
    })).role("table").description("`响应内容`包含特定字符时，不进行代理发送<br>即 消息包含下面的任意一个内容时，跳过本插件逻辑")
  }).description("进阶设置"),
  import_koishi.Schema.object({
    autodeleteMessage: import_koishi.Schema.boolean().default(false).description("自动定时撤回机器人的所有消息<br>不论有没有用户有没有撤回输入，都定时撤回已发送的内容").experimental()
  }).description("自动撤回设置"),
  import_koishi.Schema.union([
    import_koishi.Schema.object({
      autodeleteMessage: import_koishi.Schema.const(true).required(),
      autodeleteMessagewithdrawExpire: import_koishi.Schema.number().default(60).description("设定阈值时间。发送多少秒后撤回消息 (秒)<br>需注意部分平台可能有撤回时间最大值限制，例如`onebot`平台：两分钟`（120秒）`")
    }),
    import_koishi.Schema.object({})
  ]),
  import_koishi.Schema.object({
    loggerinfo: import_koishi.Schema.boolean().default(false).description("日志调试：一般输出<br>提issue时，请开启此功能 并且提供BUG复现日志").experimental(),
    loggerinfo_content: import_koishi.Schema.boolean().default(false).description("日志调试：代发内容输出(content)<br>非开发者请勿改动").experimental(),
    loggerinfo_setInterval: import_koishi.Schema.boolean().default(false).description("日志调试：20 秒 定时打印 变量-视检<br>非开发者请勿改动").experimental()
  }).description("调试设置")
]);
var messageIdMap = {};
var withdrawnSessions = /* @__PURE__ */ new Set();
var pendingCleanup = /* @__PURE__ */ new Map();
async function apply(ctx, config) {
  ctx.on("ready", () => {
    function logInfo(message, detail) {
      if (config.loggerinfo) {
        if (detail) {
          ctx.logger.info(message, detail);
        } else {
          ctx.logger.info(message);
        }
      }
    }
    __name(logInfo, "logInfo");
    if (config.loggerinfo) {
      ctx.command("撤回测试").action(async ({ session }) => {
        await session.send(import_koishi.h.quote(session.messageId) + "即时回复111");
        await session.send("即时回复222");
        await (0, import_koishi.sleep)(1e4);
        await session.send("延迟回复111");
        await session.send("延迟回复222");
      });
      if (config.loggerinfo_setInterval) {
        ctx.setInterval(() => {
          logInfo("messageIdMap 内容 (每 20 秒打印):", messageIdMap);
          logInfo("withdrawnSessions 内容 (每 20 秒打印):", withdrawnSessions);
        }, 20 * 1e3);
      }
    }
    function scheduleCleanup(originId, sessionSn) {
      if (pendingCleanup.has(originId)) {
        pendingCleanup.get(originId)();
      }
      const timer = ctx.setTimeout(() => {
        delete messageIdMap[originId];
        pendingCleanup.delete(originId);
        logInfo(`[withdrawExpire] 已定时清理 messageIdMap 记录, originId: ${originId}, sessionSn: ${sessionSn}`);
      }, config.withdrawExpire * 1e3);
      pendingCleanup.set(originId, timer);
    }
    __name(scheduleCleanup, "scheduleCleanup");
    ctx.on("before-send", async (_session, options) => {
      if (!options?.session) {
        return;
      }
      const inputSession = options.session;
      const outputSession = _session;
      const inputMessageId = inputSession.messageId;
      const outputContent = outputSession.content;
      const sessionSn = inputSession.sn;
      const platform = inputSession.platform;
      if (!config.enableplatform.includes(platform)) {
        logInfo(`当前平台 ${platform} 不在配置的可用平台列表中，插件跳过。可用平台：${config.enableplatform.join(", ")}`);
        return;
      }
      if (!inputMessageId) {
        return;
      } else {
        logInfo("========= before-send 事件触发 =========");
        logInfo("inputMessageId: ", inputMessageId);
      }
      if (config.loggerinfo_content) logInfo("原始响应发送内容:", outputContent);
      logInfo("Session SN:", sessionSn);
      if (!outputContent || outputContent.trim() === "") {
        logInfo("消息内容为空，跳过代理发送");
        logInfo("========= before-send 事件结束 =========");
        return;
      }
      if (withdrawnSessions.has(sessionSn)) {
        logInfo(`拦截已撤回session的后续消息: SN=${sessionSn}`);
        outputSession.content = "";
        logInfo("========= before-send 事件结束 =========");
        return false;
      }
      const shouldSkip = config.returntable.some((item) => outputContent.includes(item.include));
      if (shouldSkip) {
        logInfo("消息内容包含特定内容，跳过处理");
        logInfo("========= before-send 事件结束 =========");
        return;
      }
      if (inputMessageId && !messageIdMap[inputMessageId]) {
        messageIdMap[inputMessageId] = {
          replyIds: [],
          sessionSn
        };
      }
      try {
        let messageToSend = outputContent;
        if (config.quoteEnable) {
          const shouldReturnOriginal = config.returnquotetable.some((item) => outputContent.includes(item.include));
          if (!shouldReturnOriginal) {
            logInfo("自定义消息前缀处理开始");
            let prefix = "";
            for (const item of config.morequoteEnable) {
              let value = item.value;
              if (item.replacecontent) {
                try {
                  value = new Function("session", `return ${value}`)(inputSession);
                } catch (error) {
                  ctx.logger.error(`变量替换失败: ${value}`, error);
                  continue;
                }
              }
              try {
                prefix += import_koishi.h[item.hModel](value);
              } catch (error) {
                ctx.logger.error(`h.${item.hModel} 调用失败`, error);
              }
            }
            messageToSend = prefix + messageToSend;
            logInfo("处理后的消息前缀: ", prefix);
            if (config.loggerinfo_content) logInfo("处理后的消息内容: ", messageToSend);
          }
        }
        if (config.loggerinfo_content) {
          logInfo("发送内容:", messageToSend);
        }
        const sendmessageIds = await outputSession.send(messageToSend);
        logInfo("手动发送消息成功，消息 IDs:", sendmessageIds);
        messageIdMap[inputMessageId].replyIds.push(...sendmessageIds);
        logInfo(`messageIdMap 更新 (添加记录)`, {
          originId: inputMessageId,
          replyIds: sendmessageIds,
          currentMap: messageIdMap
        });
        scheduleCleanup(inputMessageId, sessionSn);
        if (config.autodeleteMessage) {
          ctx.setTimeout(async () => {
            for (const id of sendmessageIds) {
              try {
                await outputSession.bot.deleteMessage(outputSession.channelId, id);
                logInfo(`[autodeleteMessage] 自动撤回成功, 消息ID: ${id}`);
              } catch (error) {
                ctx.logger.error(`[autodeleteMessage] 自动撤回失败, 消息ID: ${id}`, error);
              }
            }
            delete messageIdMap[inputMessageId];
            logInfo(`messageIdMap 更新 (autodeleteMessage 自动撤回后删除记录)`, {
              currentMap: messageIdMap
            });
          }, config.autodeleteMessagewithdrawExpire * 1e3);
        }
        outputSession.content = "";
        logInfo("========= before-send 事件结束 =========");
        return false;
      } catch (error) {
        ctx.logger.error("手动发送消息失败:", error);
        logInfo("========= before-send 事件结束 =========");
        return false;
      }
    }, true);
    ctx.on("message-deleted", async (session) => {
      if (session.userId === session.selfId) {
        return;
      }
      logInfo("========= message-deleted 事件触发 =========");
      const originId = session.messageId;
      if (!originId || !messageIdMap[originId]) {
        logInfo("[message-deleted] 警告: 未找到关联的回复消息");
        logInfo("========= message-deleted 事件结束 =========");
        return;
      }
      const { replyIds, sessionSn } = messageIdMap[originId];
      logInfo(`[message-deleted] 撤回处理, 原始消息ID: ${originId}`, {
        associatedIds: replyIds,
        sessionSn
      });
      withdrawnSessions.add(sessionSn);
      logInfo(`[message-deleted] 已标记session.sn为已撤回: ${sessionSn}`);
      ctx.setTimeout(() => {
        withdrawnSessions.delete(sessionSn);
        logInfo(`[withdrawnSessions] 已定时清理 session.sn: ${sessionSn}`);
      }, config.withdrawExpire * 1e3);
      for (const id of replyIds) {
        try {
          await session.bot.deleteMessage(session.channelId, id);
          logInfo(`[message-deleted] 撤回成功, 消息ID: ${id}`);
        } catch (error) {
          ctx.logger.error(`[message-deleted] 撤回失败, 消息ID: ${id}`, error);
        }
      }
      delete messageIdMap[originId];
      logInfo(`messageIdMap 更新 (message-deleted 用户撤回后删除记录)`, {
        currentMap: messageIdMap
      });
      logInfo("========= message-deleted 事件结束 =========");
    });
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
