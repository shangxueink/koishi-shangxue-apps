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
  name: () => name,
  usage: () => usage
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var name = "auto-withdraw";
var usage = `
---

<h2>简介</h2>

<p>自动撤回 Koishi 机器人发送的消息，并在消息被撤回后，自动撤回机器人回复的关联消息。</p>

---

<h2>特性</h2>

<ul>
<li><b>自动关联撤回:</b> 当用户撤回消息时，自动撤回机器人回复的关联消息 (通过引用)。</li>
<li><b>可配置的过期时间:</b> 可以设置记录 <code>session.sn</code> 的过期时间，防止内存占用过多。</li>
<li><b>可配置的引用回复:</b> 可以选择是否以引用的方式回复指令，方便用户追溯上下文。</li>
<li><b>日志调试:</b> 提供详细的日志输出，方便开发者调试和排查问题。</li>
<li><b>防止撤回指令的发送:</b> 拦截已撤回 session 的后续消息，避免消息继续发送。</li>
</ul>

---

<h2>配置</h2>

<p>插件提供以下配置选项：</p>

<ul>
<li><b><code>quoteEnable</code> (boolean):</b> 是否以引用的方式回复用户的指令。如果启用，机器人回复的消息会引用用户的原始消息。 默认为 <code>false</code>。</li>
<li><b><code>withdrawExpire</code> (number):</b> 记录 <code>session.sn</code> 的过期时间，单位为秒。 超过这个时间后，插件会清理已撤回的 <code>session.sn</code> 记录，释放内存。默认为 <code>60</code> 秒。</li>
<li><b><code>loggerinfo</code> (boolean):</b> 是否开启详细的日志调试输出。 开启后，插件会在控制台输出更多的调试信息，方便开发者排查问题。 默认为 <code>false</code>。 <b>警告：</b> 开启此选项可能会产生大量的日志输出。</li>
</ul>

---

<h2>使用方法</h2>

<ol>
<li>安装并配置插件后，插件会自动监听 <code>message-deleted</code> 事件。</li>
<li>当用户撤回消息时，插件会自动撤回机器人回复的关联消息 (如果存在)。</li>
<li>如果开启了 <code>quoteEnable</code> 选项，机器人会以引用的方式回复用户的指令。</li>
</ol>

---

<h2>注意事项</h2>

<ul>
<li>确保 Koishi 机器人具有撤回消息的权限。</li>
<li><code>withdrawExpire</code> 设置得太小可能会导致插件无法正确撤回消息。</li>
<li><code>loggerinfo</code> 选项仅用于调试目的，不建议在生产环境中开启。</li>
</ul>

<h2>灵感来源</h2>
<p>灵感来自这个项目：<a href="https://github.com/Kabuda-czh/koishi-plugin-autowithdraw/">https://github.com/Kabuda-czh/koishi-plugin-autowithdraw/</a></p>

---

`;
var Config = import_koishi.Schema.intersect([
  import_koishi.Schema.object({
    quoteEnable: import_koishi.Schema.boolean().default(false).description("是否 以引用的方式 回复指令<br>可能会有兼容问题，谨慎开启"),
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
    )
  }).description("基础设置"),
  import_koishi.Schema.object({
    withdrawExpire: import_koishi.Schema.number().default(60).description("记录`session.sn`的过期时间 (秒)"),
    returntable: import_koishi.Schema.array(import_koishi.Schema.object({
      include: import_koishi.Schema.string().description("关键词")
    })).role("table").description("`响应内容`包含特定字符时，不进行代理发送<br>即 消息包含下面的任意一个内容时，跳过本插件逻辑")
  }).description("进阶设置"),
  import_koishi.Schema.object({
    loggerinfo: import_koishi.Schema.boolean().default(false).description("日志调试输出").experimental()
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
    }
    function scheduleCleanup(sessionSn) {
      if (pendingCleanup.has(sessionSn)) {
        pendingCleanup.get(sessionSn)();
      }
      const timer = ctx.setTimeout(() => {
        withdrawnSessions.delete(sessionSn);
        pendingCleanup.delete(sessionSn);
        logInfo(`已清理撤回记录的session.sn: ${sessionSn}`);
      }, config.withdrawExpire * 1e3);
      pendingCleanup.set(sessionSn, timer);
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
      logInfo("========= before-send 事件触发 =========");
      logInfo("用户输入消息 ID:", inputMessageId);
      logInfo("原始响应发送内容:", outputContent);
      logInfo("Session SN:", sessionSn);
      if (withdrawnSessions.has(sessionSn)) {
        logInfo(`拦截已撤回session的后续消息: SN=${sessionSn}`);
        outputSession.content = "";
        return false;
      }
      const shouldSkip = config.returntable.some((item) => outputContent.includes(item.include));
      if (shouldSkip) {
        logInfo("消息内容包含特定内容，跳过处理");
        return;
      }
      const shouldReturnOriginal = config.returnquotetable.some((item) => outputContent.includes(item.include));
      if (!inputMessageId) {
        logInfo("警告: inputMessageId 为空，无法记录消息映射");
        return;
      }
      if (!messageIdMap[inputMessageId]) {
        messageIdMap[inputMessageId] = {
          replyIds: [],
          sessionSn
        };
      }
      try {
        let messageToSend = outputContent;
        if (config.quoteEnable && !shouldReturnOriginal) {
          logInfo("手动回复指令:", config.quoteEnable);
          messageToSend = import_koishi.h.quote(inputMessageId) + messageToSend;
        }
        logInfo("发送内容:", messageToSend);
        const sendmessageIds = await outputSession.send(messageToSend);
        logInfo("手动发送消息成功，消息 IDs:", sendmessageIds);
        messageIdMap[inputMessageId].replyIds.push(...sendmessageIds);
        logInfo(`messageIdMap 更新`, {
          originId: inputMessageId,
          replyIds: sendmessageIds,
          currentMap: messageIdMap
        });
        outputSession.content = "";
        return false;
      } catch (error) {
        ctx.logger.error("手动发送消息失败:", error);
        return false;
      }
    }, true);
    ctx.on("message-deleted", async (session) => {
      const originId = session.messageId;
      if (!originId || !messageIdMap[originId]) {
        logInfo("[message-deleted] 警告: 未找到关联的回复消息");
        return;
      }
      const { replyIds, sessionSn } = messageIdMap[originId];
      logInfo(`[撤回处理] 原始消息ID: ${originId}`, {
        associatedIds: replyIds,
        sessionSn
      });
      withdrawnSessions.add(sessionSn);
      scheduleCleanup(sessionSn);
      logInfo(`已标记session.sn为已撤回: ${sessionSn}`);
      for (const id of replyIds) {
        try {
          await session.bot.deleteMessage(session.channelId, id);
          logInfo(`[撤回成功] 消息ID: ${id}`);
        } catch (error) {
          ctx.logger.error(`[撤回失败] 消息ID: ${id}`, error);
        }
      }
      delete messageIdMap[originId];
      logInfo(`messageIdMap 更新 (删除记录)`, {
        currentMap: messageIdMap
      });
    });
  });
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  name,
  usage
});
