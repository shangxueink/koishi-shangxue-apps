"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { Schema, Universal } = require("koishi");

const name = "command-creator-extender";
const usage = `

本插件效果预览：
<li><a href="https://i0.hdslb.com/bfs/article/c3a90e76082632cd5321d23582f9bc0d312276085.png" target="_blank" referrerpolicy="no-referrer">一次调用多个指令</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/b130e445dcfe99a89e841ee7615a4e61312276085.png" target="_blank" referrerpolicy="no-referrer">同一个指令，不同群里调用不同指令</a></li>

---

我们在下面的默认配置项内容里写好了一个使用示例

（注：下面的【前缀】均指【全局设置】里的指令前缀）

> 灵感来自 [command-creator](/market?keyword=command-creater)

<h2>使用示例</h2>
<p>假设您的 全局设置 里前缀只有 <code>["++", "/"]</code>：</p>
<ul>
    <li><strong>默认配置项</strong>（例如 <code>rawCommand: "一键打卡"</code>）：
        <ul>
            <li><strong>私聊</strong>：可以使用 <code>一键打卡</code>、<code>++一键打卡</code> 或 <code>/一键打卡</code> 触发。</li>
            <li><strong>群聊</strong>：必须使用 <code>++一键打卡</code> 或 <code>/一键打卡</code> 触发。</li>
        </ul>
    </li>
    <li><strong>修改配置项</strong>（例如 <code>rawCommand: "**一键打卡"</code>）：
        <ul>
            <li><strong>私聊、群聊</strong>：必须使用 <code>++**一键打卡</code> 或 <code>/**一键打卡</code> 触发。（即使配置中包含了其他字符，全局前缀仍然是必需的）</li>
        </ul>
    </li>
</ul>

<code>即，解析rawCommand的行为 与指令效果 一致</code>

---

🎯 定时任务配置指南：
1. 启用定时执行功能开关
2. 填写机器人ID、频道ID、执行指令和定时时间
3. 时间格式为 "YYYY/MM/DD HH:mm:ss"
4. 插件启动时会自动创建定时任务
`;

const Config = Schema.intersect([

  Schema.object({
    enabletable2: Schema.boolean().default(true).description("是否开启指令映射功能"),
  }).description('映射调用设置'),
  Schema.union([
    Schema.object({
      enabletable2: Schema.const(false).required(),
    }),
    Schema.object({
      enabletable2: Schema.const(true),
      table2: Schema.array(Schema.object({
        rawCommand: Schema.string().description('【当接收到消息】或【原始指令】'),
        nextCommand: Schema.string().description('自动执行的下一个指令'),
        effectchannelId: Schema.string().description('生效的频道ID。全部频道请填入 `0`，多群组使用逗号分隔开').default("0"),
        uneffectchannelId: Schema.string().description('排除的频道ID。全部频道请填入 `0`，多群组使用逗号分隔开').default(""),
      })).role('table').description('指令调用映射表<br>因为不是注册指令 只是匹配接收到的消息 所以如果你希望有前缀触发的话，需要加上前缀<br>当然你也可以写已有的指令名称比如【help】').default(
        [
          {
            "rawCommand": "help",
            "nextCommand": "status",
            "effectchannelId": "11514"
          },
          {
            "rawCommand": "一键打卡",
            "nextCommand": "今日运势",
            "uneffectchannelId": "11514"
          },
          {
            "rawCommand": "一键打卡",
            "nextCommand": "签到",
            "uneffectchannelId": "11514"
          },
          {
            "rawCommand": "一键打卡",
            "nextCommand": "鹿",
            "uneffectchannelId": "11514"
          }
        ]
      ),
      reverse_order: Schema.boolean().default(false).description('逆序执行指令（先执行下一个指令再执行原始指令）').experimental(),
    }),
  ]),

  Schema.object({
    enablescheduletable: Schema.boolean().default(false).description("是否开启定时执行功能"),
  }).description('定时执行设置'),
  Schema.union([
    Schema.object({
      enablescheduletable: Schema.const(true).required(),
      scheduletable: Schema.array(
        Schema.object({
          botId: Schema.string().description("机器人ID"),
          channelId: Schema.string().description("频道ID"),
          executecommand: Schema.string().description("执行指令"),
          scheduletime: Schema.string().role('datetime').description("定时时间"),
          everyday: Schema.boolean().default(false).description("每日执行"),
        })).role('table').description("schedule 定时表<br>不受`table2`指令映射表影响"),
    }),
    Schema.object({}),
  ]),

  Schema.object({
    loggerinfo: Schema.boolean().default(false).description('启用日志调试模式'),
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
    ////////////////////////////////////////映射调用设置////////////////////////////////////////////////////////////////

    if (config.enabletable2) {
      ctx.middleware(async (session, next) => {
        if (!config.reverse_order) {
          await next();
        }

        const { hasAt, content, atSelf } = session.stripped;
        const [currentCommand, ...args] = content.trim().split(/\s+/);
        const remainingArgs = args.join(" ");

        const prefixes = session.app.koishi.config.prefix || ctx.root.options.prefix || [];
        if (typeof prefixes === 'string') prefixes = [prefixes];
        // 查找匹配的原始指令
        const mappings = config.table2.filter(item => {
          // 如果 rawCommand 已经包含了前缀，则直接匹配
          if (prefixes.some(prefix => currentCommand === prefix + item.rawCommand || currentCommand === item.rawCommand) && session.isDirect) { // 私聊 允许无前缀
            return true;
          } else if (prefixes.some(prefix => currentCommand === prefix + item.rawCommand) && !session.isDirect) { // 群聊 必须有前缀
            return true;
          }
          // 否则，检查是否为无前缀调用 或 添加了任意一个前缀
          return prefixes.length === 0 ? currentCommand === item.rawCommand : prefixes.some(prefix => currentCommand === (prefix + item.rawCommand));
        });

        if (mappings.length > 0) {
          logInfo(prefixes)
          for (const mapping of mappings) {
            // 处理全角和半角逗号
            const effectChannelIds = (mapping.effectchannelId || "").replace(/，/g, ',').split(',').map(id => id.trim());
            const uneffectChannelIds = (mapping.uneffectchannelId || "").replace(/，/g, ',').split(',').map(id => id.trim());

            let isEffective = true;

            // 检查生效条件
            if (effectChannelIds.includes("0")) {
              isEffective = true;
            } else if (effectChannelIds.length > 0) {
              isEffective = effectChannelIds.includes(session.channelId);
            }

            // 检查失效条件
            if (uneffectChannelIds.includes("0")) {
              isEffective = false;
            } else if (uneffectChannelIds.length > 0 && uneffectChannelIds.includes(session.channelId)) {
              isEffective = false;
            }

            // 检查 at 情况
            if ((hasAt && atSelf) || !hasAt) {
              if (isEffective) {
                logInfo(`用户 ${session.userId} 在频道 ${session.channelId} 触发了 ${currentCommand} ${remainingArgs}，即将自动执行：\n${mapping.nextCommand} ${remainingArgs}`);
                await session.execute(`${mapping.nextCommand} ${remainingArgs}`);
              } else {
                logInfo(`用户 ${session.userId} 在频道 ${session.channelId} 触发了 ${currentCommand}，但该指令未在当前频道生效（effectChannelId: ${effectChannelIds.join(", "
                )}, uneffectChannelId: ${uneffectChannelIds.join(", ")}）。`
                );
              }
            } else {
              logInfo(`用户 ${session.userId} 在频道 ${session.channelId} 触发了 ${currentCommand}，但由于 at 了其他用户，该指令未触发。`);
            }
          }
        }
        return next();
      }, true);
    }

    ////////////////////////////////////////定时执行设置////////////////////////////////////////////////////////////////

    // 模拟/虚拟的session对象
    function createSession(bot, task) {
      const timestamp = Date.now();
      return bot.session({
        selfId: bot.selfId,
        platform: bot.platform,
        type: 'message-created',
        subtype: 'group',
        messageId: `schedule-${timestamp}-${task.channelId}`,
        content: task.executecommand,
        elements: [{
          type: 'text',
          attrs: { content: task.executecommand },
          children: []
        }],
        user: {
          id: 'system-scheduler',
          name: '定时任务系统',
          userId: 'system-scheduler',
          avatar: '',
          username: 'System Scheduler'
        },
        channel: {
          id: task.channelId,
          type: Universal.Channel.Type.TEXT
        },
        guild: {
          id: `${task.channelId}`.replace("private:", "")
        },
        timestamp,
        _type: bot.platform,
        _data: {
          post_type: 'message',
          message_type: 'group',
          sub_type: 'normal',
          group_id: task.channelId,
          user_id: 'system-scheduler',
          message: [{ type: 'text', data: { text: task.executecommand } }]
        }
      });
    }

    // 创建定时任务
    function createSchedule(task, index) {
      // 标准化时间格式（配置项输入格式只能是YYYY/MM/DD HH:mm:ss）
      const normalizedTime = task.scheduletime.replace(/\//g, '-');
      let targetTime = new Date(normalizedTime);

      // 每日任务处理逻辑
      if (task.everyday) {
        const now = new Date();
        const [hours, minutes, seconds] = normalizedTime.split(' ')[1].split(':');

        // 创建当天的时间对象
        targetTime = new Date();
        targetTime.setHours(hours);
        targetTime.setMinutes(minutes);
        targetTime.setSeconds(seconds);

        // 如果已经过了当天时间，设置为明天
        if (targetTime <= now) {
          targetTime.setDate(targetTime.getDate() + 1);
        }
      }

      // 有效性校验
      if (isNaN(targetTime)) {
        logger.error(`[任务${index}] 时间解析失败: ${task.scheduletime}`);
        return null;
      }

      const delay = targetTime - Date.now();
      if (delay < 0 && !task.everyday) {
        logger.error(`[任务${index}] 跳过过期任务: ${task.scheduletime}`);
        return null;
      }

      // Bot状态预检
      const bot = Object.values(ctx.bots).find(b =>
        b.selfId === task.botId || b.user?.id === task.botId
      );
      if (!bot || bot.status !== Universal.Status.ONLINE) {
        logger.error(`[任务${index}] 机器人离线或未找到: ${task.botId}`);
        return null;
      }

      logInfo(`初始化定时任务 #${index}`, {
        bot: task.botId,
        executeAt: targetTime.toISOString(),
        command: task.executecommand,
        type: task.everyday ? '每日任务' : '单次任务'
      });
      return { bot, targetTime, delay };
    }

    // 执行任务逻辑
    async function executeTask(bot, task, index) {
      try {
        const session = createSession(bot, task);
        await ctx.emit(session, 'message-created');
        const result = await session.execute(task.executecommand);
        logInfo(task.executecommand);
        logInfo(result);
        if (result === undefined) {
          logger.error(`[任务${index}] 指令执行无返回: ${task.executecommand}`);
        }

        logInfo(`任务执行成功 #${index}`);
      } catch (error) {
        logger.error(`[任务${index}] 执行失败: ${error.message}`);
        logger.error(error.stack);
      }
    }

    // 定时任务处理器
    function setupSchedules() {
      if (!config.enablescheduletable || !config.scheduletable) return;

      config.scheduletable.forEach(async (task, index) => {
        try {
          const schedule = createSchedule(task, index);
          if (!schedule) return;

          const { bot, targetTime, delay } = schedule;

          // 单次任务
          if (!task.everyday) {
            ctx.setTimeout(() => executeTask(bot, task, index), delay);
            return;
          }

          // 每日重复任务
          const wrapper = () => {
            executeTask(bot, task, index);
            // 重新设置明天的定时
            const nextDelay = 86400000 - (Date.now() - targetTime);
            ctx.setTimeout(wrapper, nextDelay);
          };

          ctx.setTimeout(wrapper, delay);
        } catch (error) {
          logger.error(`[任务${index}] 初始化异常: ${error.message}`);
        }
      });
    }


    if (config.enablescheduletable) {
      logger.info('定时系统初始化...');
      setupSchedules();
      logger.info(`已加载 ${config.scheduletable.length} 个定时任务`);
    }
  });
}

exports.apply = apply;
exports.Config = Config;
exports.name = name;
exports.usage = usage;
