import { Schema, Universal, Bot, Context } from "koishi";

interface ExtendedChannel extends Record<string, any> {
  assignee?: string;
}

export const name = "command-creator-extender";

export const usage = `

本插件效果预览：
<li><a href="https://i0.hdslb.com/bfs/article/c3a90e76082632cd5321d23582f29bc0d312276085.png" target="_blank" referrerpolicy="no-referrer">一次调用多个指令</a></li>
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

export const Config = Schema.intersect([

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
            "effectchannelId": "11514",
            "uneffectchannelId": ""
          },
          {
            "rawCommand": "一键打卡",
            "nextCommand": "今日运势",
            "uneffectchannelId": "11514",
            "effectchannelId": ""
          },
          {
            "rawCommand": "一键打卡",
            "nextCommand": "签到",
            "uneffectchannelId": "11514",
            "effectchannelId": ""
          },
          {
            "rawCommand": "一键打卡",
            "nextCommand": "鹿",
            "uneffectchannelId": "11514",
            "effectchannelId": ""
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
          iscommand: Schema.boolean().description("是否为指令").default(true),
          executecommand: Schema.string().description("内容"),
          scheduletime: Schema.string().role('datetime').description("定时时间"),
          every: Schema.union([
            Schema.const('once').description('仅一次'),
            Schema.const('sec').description('每/秒'),
            Schema.const('min').description('每/分钟'),
            Schema.const('hour').description('每/小时'),
            Schema.const('day').description('每/天'),
            Schema.const('week').description('每/周'),
            Schema.const('month').description('每/月'),
            Schema.const('year').description('每/年'),
          ]).role('radio').description("周期").default("once"),
          cycletime: Schema.number().default(1).description("间隔倍数").min(1),
        })).role('table').description("schedule 定时表<br>不受`table2`指令映射表影响<br>勾选`是否为指令`则定时调用此指令，不勾选`是否为指令`则直接发送`内容`（元素消息）<br>间隔倍数：每隔多少个周期执行一次。例如：周期`每/小时` 间隔倍数`3` ， 代表`每3个小时`"),
    }),
    Schema.object({
    }),
  ]),


  Schema.object({
    loggerinfo: Schema.boolean().default(false).description('启用日志调试模式'),
  }).description('调试设置'),
]);

export async function apply(ctx: Context, config) {
  ctx.on('ready', () => {
    const logger = ctx.logger(name);

    function logInfo(...args: any[]) {
      if (config.loggerinfo) {
        (logger.info as (...args: any[]) => void)(...args);
      }
    }

    if (config.enabletable2) {
      ctx.middleware(async (session, next) => {
        if (!config.reverse_order) {
          await next();
        }

        try {
          await session.observeChannel(['assignee']);
        } catch (error) {
          // 如果无法获取频道信息，继续执行但记录错误
          if (config.loggerinfo) {
            ctx.logger(name).warn('无法获取频道信息:', error);
          }
        }

        // 检查当前机器人是否为频道的 assign 机器人
        const channel = session.channel as ExtendedChannel;
        logInfo(channel?.assignee, session.selfId)
        if (channel?.assignee && session.selfId !== channel.assignee) {
          return next();
        }

        const { hasAt, content, atSelf } = session.stripped;
        const [currentCommand, ...args] = content.trim().split(/\s+/);
        const remainingArgs = args.join(" ");

        let prefixes = session.app.koishi.config.prefix || ctx.root.options.prefix || [];
        if (typeof prefixes === 'string') {
          prefixes = [prefixes];
        }
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


    // 模拟/虚拟的session对象
    function createSession(bot: Bot, task) {
      const timestamp = Date.now();
      return bot.session({
        selfId: bot.selfId,
        platform: bot.platform,
        type: 'message-created',
        subtype: 'group',
        // @ts-ignore
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

    // 执行任务逻辑
    async function executeTask(bot: Bot, task, index) {
      try {
        const session = createSession(bot, task);
        // @ts-ignore
        await ctx.emit(session, 'message-created');
        if (task.iscommand) {
          // @ts-ignore
          await session.execute(task.executecommand);
          logInfo(task.executecommand);
        } else {
          // @ts-ignore
          await session.send(task.executecommand);
          logInfo(`[任务${index}] 发送消息: ${task.executecommand}`);
        }
        logInfo(`任务执行成功 #${index}`);
      } catch (error) {
        logger.error(`[任务${index}] 执行失败: ${error.message}`);
        logger.error(error.stack);
      }
    }


    function getNextTime(task, now) {
      const normalizedTime = task.scheduletime.replace(/\//g, '-');
      const [datePart, timePart] = normalizedTime.split(' ');
      const [hours, minutes, seconds] = timePart.split(':').map(Number);

      // 创建基准时间点
      let baseTime = new Date(normalizedTime);
      if (isNaN(baseTime.getTime())) {
        // 如果日期解析失败，使用当前日期
        baseTime = new Date(now);
        baseTime.setHours(hours, minutes, seconds, 0);
      }

      // 对于"once"类型，直接返回配置的时间
      if (task.every === 'once') {
        return baseTime;
      }

      // 计算下一个执行时间
      let nextTime = new Date(baseTime);
      const cycleTime = task.cycletime || 1;

      // 如果基准时间已经过去，计算下一个周期的时间
      while (nextTime <= now) {
        switch (task.every) {
          case 'sec':
            nextTime = new Date(nextTime.getTime() + cycleTime * 1000);
            break;
          case 'min':
            nextTime = new Date(nextTime.getTime() + cycleTime * 60000);
            break;
          case 'hour':
            nextTime = new Date(nextTime.getTime() + cycleTime * 3600000);
            break;
          case 'day':
            nextTime.setDate(nextTime.getDate() + cycleTime);
            break;
          case 'week':
            nextTime.setDate(nextTime.getDate() + cycleTime * 7);
            break;
          case 'month':
            // 处理月份增加，避免超出月份范围
            let nextMonth = nextTime.getMonth() + cycleTime;
            let nextYear = nextTime.getFullYear();
            while (nextMonth >= 12) {
              nextMonth -= 12;
              nextYear++;
            }
            nextTime.setFullYear(nextYear);
            nextTime.setMonth(nextMonth);
            break;
          case 'year':
            nextTime.setFullYear(nextTime.getFullYear() + cycleTime);
            break;
        }
      }

      return nextTime;
    }

    // 定时任务处理器
    function setupSchedules() {
      if (!config.enablescheduletable || !config.scheduletable) return;

      config.scheduletable.forEach(async (task, index) => {
        try {
          // Bot状态预检
          const bot = Object.values(ctx.bots).find(b =>
            (b as Bot).selfId === task.botId || (b as Bot).user?.id === task.botId
          ) as Bot | undefined;
          if (!bot || bot.status !== Universal.Status.ONLINE) {
            logger.error(`[任务${index}] 机器人离线或未找到: ${task.botId}`);
            return;
          }

          const now = new Date();
          let nextTime = getNextTime(task, now);

          if (isNaN(nextTime.getTime())) {
            logger.error(`[任务${index}] 时间解析失败: ${task.scheduletime}`);
            return;
          }

          const delay = nextTime.getTime() - now.getTime();

          const taskType = task.iscommand ? 'command' : 'content';
          const taskContent = task.executecommand; // 获取执行内容

          logInfo(`初始化定时任务 #${index}`, {
            bot: task.botId,
            executeAt: `${nextTime}`,
            [taskType]: taskContent, // 使用动态键名
            every: task.every,
            cycletime: task.cycletime // 添加 cycletime 字段
          });

          // 定时执行
          const scheduleTask = () => {
            executeTask(bot, task, index);

            if (task.every !== 'once') {
              const now = new Date();
              nextTime = getNextTime(task, now);
              const nextDelay = nextTime.getTime() - now.getTime();

              logInfo(`执行定时任务 #${index}`, {
                bot: task.botId,
                executeAt: `${nextTime}`,
                [taskType]: taskContent, // 使用动态键名
                nextExecuteAt: `${nextTime}`,
                every: task.every,
                cycletime: task.cycletime
              });

              ctx.setTimeout(scheduleTask, nextDelay);
            }
          };

          // 对于 once 任务，如果时间已过，则不执行
          if (task.every === 'once' && delay < 0) {
            logger.warn(`[任务${index}] 时间已过，跳过执行: ${task.scheduletime}`);
            return;
          }

          ctx.setTimeout(scheduleTask, delay);

        } catch (error) {
          logger.error(`[任务${index}] 初始化异常: ${error.message}`);
          logger.error(error.stack);
        }
      });
    }

    if (config.enablescheduletable) {
      logger.info('定时系统初始化...');

      // 首先检查现有的在线机器人
      const checkAndSetupTasks = () => {
        const onlineBots = Object.values(ctx.bots).filter(bot =>
          (bot as Bot).status === Universal.Status.ONLINE
        ) as Bot[];

        const relevantTasks = config.scheduletable.filter(task =>
          onlineBots.some(bot => task.botId === bot.selfId || task.botId === bot.user?.id)
        );

        if (relevantTasks.length > 0) {
          logInfo(`发现 ${onlineBots.length} 个在线机器人，正在初始化相关定时任务...`);
          setupSchedules(); // 已经在线，无需等待，直接启动定时任务
        }
      };

      // 检查现有机器人
      checkAndSetupTasks();

      // 监听后续的登录事件
      ctx.on('login-added', async ({ bot }) => {
        const relevantTasks = config.scheduletable.filter(task =>
          task.botId === bot.selfId || task.botId === bot.user?.id
        );

        if (relevantTasks.length > 0) {
          logger.info(`检测到机器人 ${bot.selfId} 上线，正在初始化相关定时任务...`);
          ctx.setTimeout(setupSchedules, 5000); // 正在上线，延时5秒启动定时任务
        }
      });
    }

  });
}
