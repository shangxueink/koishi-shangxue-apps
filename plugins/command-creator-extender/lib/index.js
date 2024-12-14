"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { Schema } = require("koishi");

const name = "command-creator-extender";

const usage = `
<p>本插件用于将一个已有的指令映射到其他指令，并允许用户自定义指令。</p>

本插件效果预览：
<li><a href="https://i0.hdslb.com/bfs/article/c3a90e76082632cd5321d23582f9bc0d312276085.png" target="_blank" referrerpolicy="no-referrer">一次调用多个指令</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/b130e445dcfe99a89e841ee7615a4e61312276085.png" target="_blank" referrerpolicy="no-referrer">同一个指令，不同群里调用不同指令</a></li>

<h2>功能</h2>
<ul>
<li>指令映射：通过配置表将输入指令映射到多个输出指令。</li>
<li>自定义指令：用户可以创建自定义指令，指定其行为为回复消息或执行其他指令。</li>
<li>日志调试：启用调试模式以输出详细日志信息。</li>
</ul>
<h2>使用方法</h2>
<p>您可以在 <strong>table2</strong> 表格中指定【关键词或已经注册的指令】的调用关系。</p>
<h3>注意事项</h3>
<ul>
<li><strong>table2</strong>：在执行完【关键词或原始指令】之后，会自动执行右侧的【下一个指令】。可以指定多个重复的【关键词或原始指令】以实现多重调用。</li>
</ul>
</body>


---

我们在下面的默认配置项内容里写好了一个使用示例

（注：下面的【前缀】均指【全局设置】里的指令前缀）

> 灵感来自 [command-creator](/market?keyword=command-creater)
`;


const Config = Schema.intersect([
  Schema.object({
    table2: Schema.array(Schema.object({
      rawCommand: Schema.string().description('【当接收到消息】或【原始指令】'),
      nextCommand: Schema.string().description('自动执行的下一个指令（无需指令前缀）'),
      effectchannelId: Schema.string().description('生效的频道ID。全部频道请填入 `0`，多群组使用逗号分隔开').default("0"),
      uneffectchannelId: Schema.string().description('排除的频道ID。全部频道请填入 `0`，多群组使用逗号分隔开').default(""),
    })).role('table').description('指令调用映射表<br>因为不是注册指令 只是匹配接收到的消息 所以如果你希望有前缀触发的话，需要加上前缀<br>当然你也可以写已有的指令名称比如【/help】（需要指令前缀）').default(
      [
        {
          "rawCommand": "/help",
          "nextCommand": "status",
          "effectchannelId": "11514"
        },
        {
          "rawCommand": "/一键打卡",
          "nextCommand": "今日运势",
          "uneffectchannelId": "11514"
        },
        {
          "rawCommand": "/一键打卡",
          "nextCommand": "签到",
          "uneffectchannelId": "11514"
        },
        {
          "rawCommand": "/一键打卡",
          "nextCommand": "鹿",
          "uneffectchannelId": "11514"
        }
      ]
    ),
  }).description('指令设置'),
  Schema.object({
    reverse_order: Schema.boolean().default(false).description('逆序执行指令（先执行下一个指令再执行原始指令）').experimental(),
    loggerinfo: Schema.boolean().default(false).description('日志调试模式'),
  }).description('调试设置'),

]);


async function apply(ctx, config) {
  ctx.middleware(async (session, next) => {
    if (!config.reverse_order) {
      await next();
    }

    const { hasAt, content, atSelf } = session.stripped;
    const [currentCommand, ...args] = content.trim().split(/\s+/);
    const remainingArgs = args.join(" ");

    // 查找匹配的原始指令
    const mappings = config.table2.filter(item => currentCommand === item.rawCommand);
    if (mappings.length > 0) {
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
            if (config.loggerinfo) {
              ctx.logger.info(
                `用户 ${session.userId} 在频道 ${session.channelId} 触发了 ${currentCommand} ${remainingArgs}，即将自动执行：\n${mapping.nextCommand} ${remainingArgs}`
              );
            }
            await session.execute(`${mapping.nextCommand} ${remainingArgs}`);
          } else {
            if (config.loggerinfo) {
              ctx.logger.info(
                `用户 ${session.userId} 在频道 ${session.channelId} 触发了 ${currentCommand}，但该指令未在当前频道生效（effectChannelId: ${effectChannelIds.join(
                  ", "
                )}, uneffectChannelId: ${uneffectChannelIds.join(", ")}）。`
              );
            }
          }
        } else {
          if (config.loggerinfo) {
            ctx.logger.info(
              `用户 ${session.userId} 在频道 ${session.channelId} 触发了 ${currentCommand}，但由于 at 了其他用户，该指令未触发。`
            );
          }
        }
      }
    }
    return next();
  }, true);
}




exports.apply = apply;
exports.Config = Config;
exports.name = name;
exports.usage = usage;