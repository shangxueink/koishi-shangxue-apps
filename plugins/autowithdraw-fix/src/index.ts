import { Context, Schema, sleep, h } from "koishi";

export const name = "autowithdraw-fix";
// export const inject = [];
export const usage = `
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

`;


export const Config =
  Schema.intersect([
    Schema.object({
      quoteEnable: Schema.boolean().default(false).description("是否 以引用的方式发送 回复指令<br>可能会有兼容问题，谨慎开启"),

    }).description('基础设置'),
    Schema.union([
      Schema.object({
        quoteEnable: Schema.const(true).required(),
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
      }),
      Schema.object({}),
    ]),

    Schema.object({
      withdrawExpire: Schema.number().default(150).description("记录`session.sn`的过期时间 (秒)<br>超出此时间的`session.sn`将被清除记录，不再能找到对应需要撤回的消息ID<br>此时间应该大于用户限定撤回时间，例如`onebot`平台：两分钟`（120秒）`"),
      returntable: Schema.array(Schema.object({
        include: Schema.string().description("关键词"),
      })).role('table').description("`响应内容`包含特定字符时，不进行代理发送<br>即 消息包含下面的任意一个内容时，跳过本插件逻辑"),
    }).description('进阶设置'),

    Schema.object({
      autodeleteMessage: Schema.boolean().default(false).description("自动定时撤回机器人的所有消息<br>不论有没有用户有没有撤回输入，都定时撤回已发送的内容").experimental(),
    }).description('自动撤回设置'),
    Schema.union([
      Schema.object({
        autodeleteMessage: Schema.const(true).required(),
        autodeleteMessagewithdrawExpire: Schema.number().default(60).description("设定阈值时间。发送多少秒后撤回消息 (秒)<br>需注意部分平台可能有撤回时间最大值限制，例如`onebot`平台：两分钟`（120秒）`"),
      }),
      Schema.object({}),
    ]),


    Schema.object({
      loggerinfo: Schema.boolean().default(false).description("日志调试：一般输出").experimental(),
      loggerinfo_content: Schema.boolean().default(false).description("日志调试：代发内容输出(content)").experimental(),
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
const pendingCleanup = new Map<string, () => void>(); // 记录清理定时器，key为originId

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

      /*
      // 定时打印 messageIdMap  视检
      ctx.setInterval(() => {
        logInfo("messageIdMap 内容 (每 15 秒打印):", messageIdMap);
      }, 15 * 1000);
      */
    }

    // 清理 messageIdMap 记录
    function scheduleCleanup(originId: string, sessionSn: number) {
      // 取消已有的定时器
      if (pendingCleanup.has(originId)) {
        pendingCleanup.get(originId)(); // 执行取消定时器的函数
      }

      // 设置新的定时器
      const timer = ctx.setTimeout(() => {
        delete messageIdMap[originId]; // 定时清理 messageIdMap
        pendingCleanup.delete(originId);
        logInfo(`[withdrawExpire] 已定时清理 messageIdMap 记录, originId: ${originId}, sessionSn: ${sessionSn}`);
      }, config.withdrawExpire * 1000);

      pendingCleanup.set(originId, timer);
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
      if (config.loggerinfo_content) logInfo("原始响应发送内容:", outputContent);
      logInfo("Session SN:", sessionSn);

      // 检查是否来自已撤回的session
      if (withdrawnSessions.has(sessionSn)) {
        logInfo(`拦截已撤回session的后续消息: SN=${sessionSn}`);
        outputSession.content = '';
        logInfo("========= before-send 事件结束 =========");
        return false;
      }

      const shouldSkip = config.returntable.some(item => outputContent.includes(item.include));
      if (shouldSkip) {
        logInfo("消息内容包含特定内容，跳过处理");
        logInfo("========= before-send 事件结束 =========");
        return; // 直接返回，不执行后续逻辑
      }


      if (!inputMessageId) {
        logInfo("警告: inputMessageId 为空，无法记录消息映射");
        logInfo("========= before-send 事件结束 =========");
        return;
      } else {
        logInfo("inputMessageId: ", inputMessageId);
      }
      // 初始化或获取记录
      if (inputMessageId && !messageIdMap[inputMessageId]) {
        messageIdMap[inputMessageId] = {
          replyIds: [],
          sessionSn: sessionSn
        };
      }

      // 发送消息并记录消息ID
      try {
        let messageToSend: string | h = outputContent;

        if (config.quoteEnable) {
          const shouldReturnOriginal = config.returnquotetable.some(item => outputContent.includes(item.include));
          if (!shouldReturnOriginal) {
            logInfo("手动回复指令:", config.quoteEnable);
            messageToSend = h.quote(inputMessageId) + messageToSend;
          }
        }

        if (config.loggerinfo_content) logInfo("发送内容:", messageToSend);
        const sendmessageIds = await outputSession.send(messageToSend);
        logInfo("手动发送消息成功，消息 IDs:", sendmessageIds);

        // 将新消息ID添加到映射中
        messageIdMap[inputMessageId].replyIds.push(...sendmessageIds);
        logInfo(`messageIdMap 更新 (添加记录)`, {
          originId: inputMessageId,
          replyIds: sendmessageIds,
          currentMap: messageIdMap
        });

        // 启动定时清理 (withdrawExpire)
        scheduleCleanup(inputMessageId, sessionSn);

        // 自动撤回逻辑 (autodeleteMessage)
        if (config.autodeleteMessage) {
          ctx.setTimeout(async () => {
            for (const id of sendmessageIds) {
              try {
                await outputSession.bot.deleteMessage(outputSession.channelId, id);
                logInfo(`[autodeleteMessage] 自动撤回成功, 消息ID: ${id}`);
              } catch (error: any) {
                ctx.logger.error(`[autodeleteMessage] 自动撤回失败, 消息ID: ${id}`, error);
              }
            }
            // 自动撤回后立即删除 messageIdMap 记录 (autodeleteMessage)
            delete messageIdMap[inputMessageId];
            logInfo(`messageIdMap 更新 (autodeleteMessage 自动撤回后删除记录)`, {
              currentMap: messageIdMap
            });
          }, config.autodeleteMessagewithdrawExpire * 1000);
        }


        // 清空原始内容防止重复发送
        outputSession.content = '';
        logInfo("========= before-send 事件结束 =========");
        return false;
      } catch (error: any) {
        ctx.logger.error("手动发送消息失败:", error);
        logInfo("========= before-send 事件结束 =========");
        return false;
      }
    }, true);




    /*
        ctx.once("before-send", async (_session) => {
          if (!_session) {
            return;
          }
          logInfo(_session);
          await _session.send("11")
        }, true);
    */

    ctx.on("message-deleted", async (session) => {
      const originId = session.messageId;
      if (!originId || !messageIdMap[originId]) {
        logInfo('[message-deleted] 警告: 未找到关联的回复消息');
        return;
      }

      const { replyIds, sessionSn } = messageIdMap[originId];
      logInfo(`[message-deleted] 撤回处理, 原始消息ID: ${originId}`, {
        associatedIds: replyIds,
        sessionSn: sessionSn
      });

      // 标记该session.sn为已撤回 (这个逻辑可能不再需要，因为 withdrawExpire 会定时清理)
      withdrawnSessions.add(sessionSn);
      logInfo(`[message-deleted] 已标记session.sn为已撤回: ${sessionSn}`);

      // 撤回所有已发送的消息
      for (const id of replyIds) {
        try {
          await session.bot.deleteMessage(session.channelId, id);
          logInfo(`[message-deleted] 撤回成功, 消息ID: ${id}`);
        } catch (error: any) {
          ctx.logger.error(`[message-deleted] 撤回失败, 消息ID: ${id}`, error);
        }
      }
      // 用户撤回后立即删除 messageIdMap 记录 (message-deleted)
      delete messageIdMap[originId];
      logInfo(`messageIdMap 更新 (message-deleted 用户撤回后删除记录)`, {
        currentMap: messageIdMap
      });
    });

  });
}
