import { Context, Schema, sleep, h } from "koishi";

export const name = "auto-withdraw";
// export const inject = [];
export const usage = `
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


export const Config =
  Schema.intersect([
    Schema.object({
      quoteEnable: Schema.boolean().default(false).description("是否 以引用的方式 回复指令<br>可能会有兼容问题，谨慎开启"),
      returnquotetable: Schema.array(Schema.object({
        include: Schema.string().description("关键词"),
      })).role('table').description("当`响应内容`包含特定字符时，不进行回复发送，而是使用原始方法<br>注意：一般这里会填入 不支持回复发送 的消息元素关键词").default(
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
    }).description('基础设置'),

    Schema.object({
      withdrawExpire: Schema.number().default(60).description("记录`session.sn`的过期时间 (秒)"),
      returntable: Schema.array(Schema.object({
        include: Schema.string().description("关键词"),
      })).role('table').description("`响应内容`包含特定字符时，不进行代理发送<br>即 消息包含下面的任意一个内容时，跳过本插件逻辑")
    }).description('进阶设置'),

    Schema.object({
      loggerinfo: Schema.boolean().default(false).description("日志调试输出").experimental(),
    }).description('调试设置'),
  ]);


interface MessageIdMap {
  [originId: string]: {
    replyIds: string[];
    sessionSn: number;
  };
}

const messageIdMap: MessageIdMap = {};
const withdrawnSessions = new Set<number>(); // 记录已撤回的session.sn
const pendingCleanup = new Map<number, () => void>(); // 记录清理定时器

export async function apply(ctx: Context, config) {

  ctx.on('ready', () => {

    function logInfo(message: any, detail?: any) {
      if (config.loggerinfo) {
        if (detail) {
          ctx.logger.info(message, detail);
        } else {
          ctx.logger.info(message);
        }
      }
    }

    if (config.loggerinfo) {
      ctx.command('撤回测试')
        .action(async ({ session },) => {
          await session.send(h.quote(session.messageId) + "即时回复111");
          await session.send("即时回复222");
          await sleep(10000);
          await session.send("延迟回复111");
          await session.send("延迟回复222");
        });
    }

    // 清理已撤回的session.sn记录
    function scheduleCleanup(sessionSn: number) {
      // 取消已有的定时器
      if (pendingCleanup.has(sessionSn)) {
        pendingCleanup.get(sessionSn)(); // 执行取消定时器的函数
      }

      // 设置新的定时器
      const timer = ctx.setTimeout(() => {
        withdrawnSessions.delete(sessionSn);
        pendingCleanup.delete(sessionSn);
        logInfo(`已清理撤回记录的session.sn: ${sessionSn}`);
      }, config.withdrawExpire * 1000);

      pendingCleanup.set(sessionSn, timer);
    }

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

      // 检查是否来自已撤回的session
      if (withdrawnSessions.has(sessionSn)) {
        logInfo(`拦截已撤回session的后续消息: SN=${sessionSn}`);
        outputSession.content = '';
        return false;
      }

      const shouldSkip = config.returntable.some(item => outputContent.includes(item.include));
      if (shouldSkip) {
        logInfo("消息内容包含特定内容，跳过处理");
        return; // 直接返回，不执行后续逻辑
      }

      const shouldReturnOriginal = config.returnquotetable.some(item => outputContent.includes(item.include));

      if (!inputMessageId) {
        logInfo("警告: inputMessageId 为空，无法记录消息映射");
        return;
      }

      // 初始化或获取记录
      if (!messageIdMap[inputMessageId]) {
        messageIdMap[inputMessageId] = {
          replyIds: [],
          sessionSn: sessionSn
        };
      }

      // 发送消息并记录消息ID
      try {
        let messageToSend: string | h = outputContent;

        if (config.quoteEnable && !shouldReturnOriginal) {
          logInfo("手动回复指令:", config.quoteEnable);
          messageToSend = h.quote(inputMessageId) + messageToSend;
        }

        logInfo("发送内容:", messageToSend);
        const sendmessageIds = await outputSession.send(messageToSend);

        logInfo("手动发送消息成功，消息 IDs:", sendmessageIds);

        // 将新消息ID添加到映射中
        messageIdMap[inputMessageId].replyIds.push(...sendmessageIds);
        logInfo(`messageIdMap 更新`, {
          originId: inputMessageId,
          replyIds: sendmessageIds,
          currentMap: messageIdMap
        });

        // 清空原始内容防止重复发送
        outputSession.content = '';
        return false;
      } catch (error: any) {
        ctx.logger.error("手动发送消息失败:", error);
        return false;
      }
    }, true);

    ctx.on("message-deleted", async (session) => {
      const originId = session.messageId;
      if (!originId || !messageIdMap[originId]) {
        logInfo('[message-deleted] 警告: 未找到关联的回复消息');
        return;
      }

      const { replyIds, sessionSn } = messageIdMap[originId];
      logInfo(`[撤回处理] 原始消息ID: ${originId}`, {
        associatedIds: replyIds,
        sessionSn: sessionSn
      });

      // 标记该session.sn为已撤回
      withdrawnSessions.add(sessionSn);
      scheduleCleanup(sessionSn);
      logInfo(`已标记session.sn为已撤回: ${sessionSn}`);

      // 撤回所有已发送的消息
      for (const id of replyIds) {
        try {
          await session.bot.deleteMessage(session.channelId, id);
          logInfo(`[撤回成功] 消息ID: ${id}`);
        } catch (error: any) {
          ctx.logger.error(`[撤回失败] 消息ID: ${id}`, error);
        }
      }

      // 删除映射记录
      delete messageIdMap[originId];
      logInfo(`messageIdMap 更新 (删除记录)`, {
        currentMap: messageIdMap
      });
    });

  });
}
