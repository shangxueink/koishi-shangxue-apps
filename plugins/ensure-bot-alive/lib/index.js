"use strict";
const { Schema, Logger, h } = require("koishi");
const logger = new Logger('ensure-bot-alive');

exports.name = "ensure-bot-alive";
exports.reusable = true; // 声明此插件可重用
exports.usage = `

本插件适合第三方的 QQ bot 来发起检测，用于检测群里另一个机器人（第三方或者是官方bot）的在线状态。

## 使用方法

### 1. 安装插件

确保两个机器人都已安装此插件，并在同一群中。

### 2. 配置指令

您可以使用 \`在线情况检测\` 指令来检测机器人的在线状态。  

（如果你需要检测多个（3个为例）官方机器人的在线情况，那么需要在右上角再添加两个本插件，并且另外三个bot都需要安装本插件，
并且本插件和对应机器人的插件都需要一样的指令名称前缀哦）（下方的command_prefix配置项）

---

### 定时触发示例

我们可以这样使用schedule，以实现定时触发：

\`\`\`
schedule -e 0:00 / 1h --rest 1在线情况检测
\`\`\`

这条指令表示从 0:00 开始，每隔 1 小时触发一次 \`在线情况检测\` 指令。

`;

exports.Config = Schema.intersect([
  Schema.object({
    command_prefix: Schema.number().default(1).description("指令前缀，用于配置多组本插件，0为无前缀。（若不多开本插件，则只需默认）").min(0),
    alivebotID: Schema.string().default('114514').description('需要确保存活的机器人的QQ号'),
    MinTimeResponse: Schema.number().default(10).description("允许等待返回的最大`秒`数").min(1),
  }).description('检测在线的测试消息'),

  Schema.object({
    Handling_of_bot_status: Schema.union([
      Schema.const('1').description('不进行任何反馈'),
      Schema.const('2').description('仅掉线的时候，进行反馈'),
      Schema.const('3').description('任何时候都进行反馈'),
    ]).role('radio').default('2').description("如何处理返回情况"),
    reporting_atMaster: Schema.string().default('1919810').description('主人的QQ号`会在群里艾特你哦~`'),
    reporting_message_offline: Schema.string().default('机器人掉线啦!').description('判断为`掉线`的消息上报内容'),
    reporting_message_alive: Schema.string().default('一切正常').description('判断为`存活`的消息上报内容'),
  }).description('测试结果处理方法'),

  Schema.object({
    loggerinfo: Schema.boolean().default(false).description("日志调试输出`记录每一次检测`"),
  }).description("调试设置"),
]);

function apply(ctx, config) {
  let alive;
  //ctx.command("ensure-bot-alive")
  const command1 = '在线情况检测';
  const command2 = '检测我在哦';
  const command3 = '检测你在吗';
  const command_prefix = config.command_prefix;

  ctx.command(`ensure-bot-alive/` + command_prefix + command1)
    .action(async ({ session }) => {
      // 每次检测前重置 alive 状态
      alive = false;

      const startMessage = h.at(config.alivebotID) + ` ` + command_prefix + command3; // 发送的消息
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
          await session.send(h.at(config.reporting_atMaster)); // 艾特主人
        }
      } else {
        if (config.Handling_of_bot_status === '3') {
          await session.send(config.reporting_message_alive);
          await session.send(h.at(config.reporting_atMaster)); // 艾特主人
        }
      }
    });

  ctx.command(`ensure-bot-alive/` + command_prefix + command3)
    .action(async ({ session }) => {
      await session.send(h.at(session.userId) + ` ` + command_prefix + command2); // 在线的情况的返回内容
    });

  ctx.command(`ensure-bot-alive/` + command_prefix + command2)
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
