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
          "nextCommand": "status"
        },
        {
          "rawCommand": "/一键打卡",
          "nextCommand": "今日运势"
        },
        {
          "rawCommand": "/一键打卡",
          "nextCommand": "签到"
        },
        {
          "rawCommand": "/一键打卡",
          "nextCommand": "鹿"
        }
      ]
    ),
  }).description('指令设置'),
  Schema.object({
    reverse_order: Schema.boolean().default(false).description('逆序执行指令（先执行下一个指令再执行原始指令）').experimental(),
    loggerinfo: Schema.boolean().default(false).description('日志调试模式'),
  }).description('调试设置'),

]);

// 移除前导尖括号内容的辅助函数
function removeLeadingBrackets(content) {
  return content.replace(/^<.*?>\s*/, '');
}

async function apply(ctx, config) {

  ctx.middleware(async (session, next) => {
    if (!config.reverse_order) {
      await next(); // 先执行后面的 next
    }
    let sessioncontent = session.content; // 重新弄一个变量 防止影响下一个中间件
    // 移除前导尖括号内容，也就是移除 at 机器人的元素消息
    if (session.platform === 'qq') {
      sessioncontent = removeLeadingBrackets(sessioncontent);
    }

    // 修剪内容并拆分指令和参数
    const trimmedContent = sessioncontent.trim();
    const [currentCommand, ...args] = trimmedContent.split(/\s+/); // 使用正则表达式确保以空格分割
    const remainingArgs = args.join(" ");

    // 查找匹配的原始指令
    const mappings = config.table2.filter(item => currentCommand === item.rawCommand);

    if (mappings.length > 0) {
      for (const mapping of mappings) {
        // 处理全角和半角逗号
        const effectChannelIds = mapping.effectchannelId.replace(/，/g, ',').split(',').map(id => id.trim());
        const uneffectChannelIds = mapping.uneffectchannelId.replace(/，/g, ',').split(',').map(id => id.trim());

        // 计算实际生效的群组 ID 数组
        let effectiveChannels = [];

        // 如果 effectChannelIds 包含 "0"，所有频道都生效，先将所有频道包含进来
        if (effectChannelIds.includes("0")) {
          effectiveChannels = ["0"]; // 全部生效
        } else {
          effectiveChannels = effectChannelIds;
        }

        // 排除 uneffectChannelIds 中的频道
        if (uneffectChannelIds.includes("0")) {
          // 如果 uneffectChannelIds 包含 "0"，实际生效频道为空（即无效）
          effectiveChannels = [];
        } else {
          // 否则从 effectiveChannels 中移除 uneffectChannelIds 中的 ID
          effectiveChannels = effectiveChannels.filter(channel => !uneffectChannelIds.includes(channel));
        }

        // 检查当前频道是否在有效频道中
        if (effectiveChannels.includes("0") || effectiveChannels.includes(session.channelId)) {
          if (config.loggerinfo) {
            ctx.logger.info(`用户 ${session.userId} 在频道 ${session.channelId} 触发了 ${currentCommand} ${remainingArgs}，即将自动执行：\n${mapping.nextCommand} ${remainingArgs}`);
          }
          await session.execute(`${mapping.nextCommand} ${remainingArgs}`);
        } else {
          if (config.loggerinfo) {
            ctx.logger.info(`用户 ${session.userId} 在频道 ${session.channelId} 触发了 ${currentCommand}，但该指令未在当前频道生效（实际生效频道：${effectiveChannels.join(", ")}）。`);
          }
        }
      }

    }

    return next(); // next
  }, true);
}

exports.apply = apply;
exports.Config = Config;
exports.name = name;
exports.usage = usage;