"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { Schema } = require("koishi");

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
`;



const Config = Schema.intersect([
  Schema.object({
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
  }).description('指令设置'),
  Schema.object({
    reverse_order: Schema.boolean().default(false).description('逆序执行指令（先执行下一个指令再执行原始指令）').experimental(),
    loggerinfo: Schema.boolean().default(false).description('日志调试模式'),
  }).description('调试设置'),

]);


async function apply(ctx, config) {

  function loggerinfo(message, message2) {
    if (config.loggerinfo) {
      if (message2) {
        ctx.logger.info(`${message}${message2}`)
      } else {
        ctx.logger.info(message);
      }
    }
  }

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
      loggerinfo(prefixes)
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
            loggerinfo(`用户 ${session.userId} 在频道 ${session.channelId} 触发了 ${currentCommand} ${remainingArgs}，即将自动执行：\n${mapping.nextCommand} ${remainingArgs}`);
            await session.execute(`${mapping.nextCommand} ${remainingArgs}`);
          } else {
            loggerinfo(`用户 ${session.userId} 在频道 ${session.channelId} 触发了 ${currentCommand}，但该指令未在当前频道生效（effectChannelId: ${effectChannelIds.join(", "
            )}, uneffectChannelId: ${uneffectChannelIds.join(", ")}）。`
            );
          }
        } else {
          loggerinfo(`用户 ${session.userId} 在频道 ${session.channelId} 触发了 ${currentCommand}，但由于 at 了其他用户，该指令未触发。`);
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
