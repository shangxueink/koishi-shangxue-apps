"use strict";
const koishi_1 = require("koishi");
const logger = new koishi_1.Logger('ensure-bot-alive');

exports.name = "ensure-bot-alive";
exports.usage = `

本插件适合第三方的 QQ bot 来发起检测，用于检测群里另一个机器人（第三方或者是官方bot）的在线状态。

## 使用方法

### 1. 安装插件

确保两个机器人都已安装此插件，并在同一群中。

### 2. 配置指令

您可以使用 \`在线情况检测\` 指令来检测机器人的在线状态。  


---

### 定时触发示例

我们可以这样使用schedule，以实现定时触发：

\`\`\`
schedule -e 0:00 / 1h --rest 在线情况检测
\`\`\`

这条指令表示从 0:00 开始，每隔 1 小时触发一次 \`在线情况检测\` 指令。

`;

exports.Config = koishi_1.Schema.intersect([
  koishi_1.Schema.object({
    alivebotID: koishi_1.Schema.string().default('114514').description('需要确保存活的机器人的QQ号'),
    MinTimeResponse: koishi_1.Schema.number().default(10).description("允许等待返回的最大`秒`数").min(1),
  }).description('检测在线的测试消息'),

  koishi_1.Schema.object({
    Handling_of_bot_status: koishi_1.Schema.union([
      koishi_1.Schema.const('1').description('不进行任何反馈'),
      koishi_1.Schema.const('2').description('仅掉线的时候，进行反馈'),
      koishi_1.Schema.const('3').description('任何时候都进行反馈'),
    ]).role('radio').default('2').description("如何处理返回情况"),
    reporting_atMaster: koishi_1.Schema.string().default('1919810').description('主人的QQ号`会在群里艾特你哦~`'),
    reporting_message_offline: koishi_1.Schema.string().default('机器人掉线啦!').description('判断为`掉线`的消息上报内容'),
    reporting_message_alive: koishi_1.Schema.string().default('一切正常').description('判断为`存活`的消息上报内容'),
  }).description('测试结果处理方法'),

  koishi_1.Schema.object({
    loggerinfo: koishi_1.Schema.boolean().default(false).description("日志调试输出`记录每一次检测`"),
  }).description("调试设置"),
]);

function apply(ctx, config) {
  let alive;
  ctx.command("ensure-bot-alive")
  const command1 = '在线情况检测';
  const command2 = '检测我在哦';
  const command3 = '检测你在吗';

  ctx.command(`ensure-bot-alive/` + command1)
    .action(async ({ session }) => {
      // 每次检测前重置 alive 状态
      alive = false;

      const startMessage = koishi_1.h.at(config.alivebotID) + ` ` + command3; // 发送的消息
      await session.send(startMessage); // 发送消息

      // 记录日志
      if (config.loggerinfo) {
        logger.info(`开始检测 ${config.alivebotID} 的在线状态`);
      }

      // 等待 config.MinTimeResponse 秒，检查 alive 的状态
      const timeout = config.MinTimeResponse * 1000;
      const checkAlive = new Promise((resolve) => {
        const interval = setInterval(() => {
          if (alive) {
            clearInterval(interval);
            resolve(true);
          }
        }, 1000); // 每秒检查一次
        setTimeout(() => {
          clearInterval(interval);
          resolve(false);
        }, timeout);
      });

      const isAlive = await checkAlive;

      // 记录检测结果
      if (config.loggerinfo) {
        if (isAlive) {
          logger.info(`${config.alivebotID} 在线`);
        } else {
          logger.warn(`${config.alivebotID} 离线`);
        }
      }

      // 根据处理方式反馈结果
      if (!isAlive) {
        if (config.Handling_of_bot_status === '1') {
          // 不进行任何反馈
        } else if (config.Handling_of_bot_status === '2' || config.Handling_of_bot_status === '3') {
          await session.send(config.reporting_message_offline);
          await session.send(koishi_1.h.at(config.reporting_atMaster)); // 艾特主人
        }
      } else {
        if (config.Handling_of_bot_status === '3') {
          await session.send(config.reporting_message_alive);
          await session.send(koishi_1.h.at(config.reporting_atMaster)); // 艾特主人
        }
      }
    });

  ctx.command(`ensure-bot-alive/` + command3)
    .action(async ({ session }) => {
      await session.send(koishi_1.h.at(session.userId) + command2); // 在线的情况的返回内容
    });

  ctx.command(`ensure-bot-alive/` + command2)
    .action(async ({ session }) => {
      // 机器人2成功触发了这个指令，是在线的
      alive = true; // 这里的 alive 变量会影响 command1 的检测
      // 记录日志
      if (config.loggerinfo) {
        logger.info(`${session.userId} 触发了 ${command2}，状态为在线`);
      }
    });
}

exports.apply = apply;
