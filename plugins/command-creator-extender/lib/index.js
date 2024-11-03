"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const koishi = require("koishi");
const { Schema } = require("koishi");

const name = "command-creator-extender";

const usage = `
<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>插件使用说明</title>
</head>
<body>
<h1>插件使用说明</h1>
<p>该插件用于将一个已有的指令映射到其他指令，并允许用户自定义指令。</p>
<h2>功能</h2>
<ul>
<li>指令映射：通过配置表将输入指令映射到多个输出指令。</li>
<li>自定义指令：用户可以创建自定义指令，指定其行为为回复消息或执行其他指令。</li>
<li>日志调试：启用调试模式以输出详细日志信息。</li>
</ul>
<h2>使用方法</h2>
<p>您可以在 <strong>table2</strong> 表格中指定【已经注册的指令】的调用关系。</p>
<p>如果希望创建一个全新的指令，可以使用 <strong>commands</strong> 配置项。</p>
<h3>注意事项</h3>
<ul>
<li><strong>table2</strong>：在执行完【原始指令】之后，会自动执行右侧的【下一个指令】。可以指定多个重复的【原始指令】以实现多重调用。</li>
<li><strong>commands</strong>：用于创建自定义的指令，实现【创建一个指令去调用另一个指令】或【创建一个指令返回指定内容】的功能。</li>
<li>需要注意：在同一个 Koishi 环境中，【指令名称不可以重复】，即配置项<strong>commands.name</strong>不可以与已有指令重复。<strong>table2</strong>配置项里的指令必须都已经存在。</li>
</ul>
<p>推荐在 <strong>commands</strong> 中创建全新指令，并在 <strong>table2</strong> 表格中指定其对应的调用指令。</p>
</body>
</html>

---

我们在下面的默认配置项内容里写好了一个使用示例

（注：下面的【前缀】均指【全局设置】里的指令前缀）

> 灵感来自 command-creator
`;

const UserCommand = Schema.object({
  name: Schema.string().description("需要创建的指令名（无需指令前缀）").required(),
  content: Schema.string().description("【指令内容】").required(),
  mode: Schema.union([
    Schema.const("reply").description("发送【指令内容】（直接返回）"),
    Schema.const("execute").description("调用【指令内容】（功能有点类似上表的右列）")
  ]).description("触发指令后").role("radio").required()
});

const Config = Schema.intersect([
  Schema.object({
    table2: Schema.array(Schema.object({
      rawCommand: Schema.string().description('原始指令（如果有指令前缀，需要加上）'),
      nextCommand: Schema.string().description('自动执行的下一个指令（如果有指令前缀 需要去除）'),
    })).role('table').description('指令调用映射表').default(
      [
        {
          "rawCommand": "++一键打卡",
          "nextCommand": "今日运势"
        },
        {
          "rawCommand": "++一键打卡",
          "nextCommand": "签到"
        },
        {
          "rawCommand": "++一键打卡",
          "nextCommand": "鹿"
        }
      ]
    ),
    commands: Schema.array(UserCommand).description('自定义创建一些指令').default([
      {
        "mode": "reply",
        "name": "一键打卡",
        "content": "即将自动打卡... ..."
      }
    ])
  }).description('指令设置'),
  Schema.object({
    loggerinfo: Schema.boolean().default(false).description('日志调试模式'),
  }).description('调试设置'),

]);

// 移除前导尖括号内容的辅助函数
function removeLeadingBrackets(content) {
  return content.replace(/^<.*?>\s*/, '');
}

async function apply(ctx, config) {

  for (const command of config.commands) {
    ctx.command(command.name)
      .action(async ({ session }) => {
        switch (command.mode) {
          case 'reply':
            await session.send(command.content);
            break;
          case 'execute':
            let content = session.content.split(" ");
            content.shift();
            await session.execute(`${command.content}${content.length > 0 ? " " + content.join(" ") : ""}`);
            break;
        }
      });
  }
  ctx.middleware(async (session, next) => {
    await next(); // 先执行后面的next

    // 移除前导尖括号内容，也就是移除at机器人的元素消息
    if (session.platform === 'qq') {
      session.content = removeLeadingBrackets(session.content);
    }

    // 修剪内容并拆分指令和参数
    const trimmedContent = session.content.trim();
    const [currentCommand, ...args] = trimmedContent.split(/\s+/); // 使用正则表达式确保以空格分割
    const remainingArgs = args.join(" ");

    // 查找匹配的原始指令
    const mappings = config.table2.filter(item => currentCommand === item.rawCommand);

    if (mappings.length > 0) {
      if (config.loggerinfo) {
        ctx.logger.info(`用户 ${session.userId} 触发了 ${currentCommand} ${remainingArgs}，即将自动执行 ：\n${mappings.map(m => `${m.nextCommand} ${remainingArgs}`).join('\n')}`);
      }
      for (const mapping of mappings) {
        await session.execute(`${mapping.nextCommand} ${remainingArgs}`);
      }
    }
  }, true);


}

exports.apply = apply;
exports.Config = Config;
exports.name = name;
exports.usage = usage;
