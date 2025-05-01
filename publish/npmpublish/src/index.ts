import { Context, Schema, h } from "koishi";

export const name = "commands-cao";
export const inject = ["logger"];
export const usage = `
---

<h2>使用方法</h2>
<p>当你输入一个错误的命令后，可以使用 <code>fuck</code> 命令来尝试纠正你的错误并执行正确的命令。插件会优先尝试纠正你回复的消息，如果没有回复消息，则会尝试纠正你最近一次输入的命令。</p>

<h3>示例：</h3>
<h4>1. 回复消息进行纠正：</h4> 
<li><a href="https://i0.hdslb.com/bfs/openplatform/af951636c3092d0e19350b324e675d20cb51294b.png" target="_blank" referrerpolicy="no-referrer">点我查看效果图</a></li>
<ol>
<li>用户输入：<code>hekp -H</code>（错误的命令）</li>
<li>用户回复这条消息，并输入：<code>fuck</code></li>
<li>插件会自动执行：<code>help -H</code></li>
</ol>

<h4>2. 使用最近一次命令进行纠正：</h4>
<li><a href="https://i0.hdslb.com/bfs/openplatform/d4da3cdb2353ba4902e2697263c963de9d58ea87.png" target="_blank" referrerpolicy="no-referrer">点我查看效果图</a></li>
<ol>
<li>用户输入：<code>hekp -H</code>（错误的命令）</li>
<li>然后输入：<code>fuck</code></li>
<li>插件会自动执行：<code>help -H</code></li>
</ol>

<p>如果有多个相似的命令，可以使用：</p>
<li><a href="https://i0.hdslb.com/bfs/openplatform/07c2283e70a1f5dc7e96fe95368f0bae8729b824.png" target="_blank" referrerpolicy="no-referrer">点我查看效果图</a></li>
<ul>
<li><code>fuck</code> - 执行最匹配的命令</li>
<li><code>fuck fuck</code> - 执行第二匹配的命令</li>
<li><code>fuck fuck fuck</code> - 执行第三匹配的命令</li>
<li>以此类推...</li>
</ul>

---
`;

export const Config = Schema.intersect([
  Schema.object({
    commandName: Schema.string().default("fuck").description("指令名称"),
    maxHistoryLength: Schema.number().default(3).description('记录每个用户的（最近）历史消息数量'),
    similarityThreshold: Schema.number().default(0.4).step(0.1).description('命令相似度阈值，超过此值才会被认为是相似命令'),
    chineseCommandThreshold: Schema.number().default(0.3).step(0.1).description('中文命令相似度阈值，针对中文命令设置更宽松的匹配标准'),
    commandInfo: Schema.boolean().default(false).description("返回即将执行的指令内容提示，与`-i`选项效果一致<br>[⇒点我查看效果](https://i0.hdslb.com/bfs/openplatform/c6e71eccd095913310d2c8b61943ec006b62697d.png)"),
  }).description('基础设置'),

  Schema.object({
    loggerinfo: Schema.boolean().default(false).description("日志调试：一般输出<br>提issue是请使用此功能").experimental(),
    loggeruserinputinfo: Schema.boolean().default(false).description("日志输出用户输入").experimental(),
  }).description('调试设置'),
]);

export async function apply(ctx: Context, config) {
  // 存储用户历史消息
  const userMessageHistory = {};

  function logInfo(message: any, detail?: any) {
    if (config.loggerinfo) {
      if (detail) {
        ctx.logger.info(message, detail);
      } else {
        ctx.logger.info(message);
      }
    }
  }

  // 计算两个字符串的相似度（Levenshtein 距离）
  function levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // 初始化矩阵
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let i = 0; i <= a.length; i++) {
      matrix[0][i] = i;
    }

    // 填充矩阵
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // 替换
            matrix[i][j - 1] + 1,     // 插入
            matrix[i - 1][j] + 1      // 删除
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  // 计算相似度（0-1之间，1表示完全匹配）
  function calculateSimilarity(a: string, b: string): number {
    const distance = levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  }

  // 获取所有命令及其别名
  function getAllCommands() {
    const commands = [];
    const commandMap = {};

    for (const command of ctx.$commander._commandList) {
      commands.push(command.name);
      commandMap[command.name] = { command, aliases: [] };

      // 添加别名
      for (const alias in command._aliases) {
        if (alias !== command.name) {
          commands.push(alias);
          commandMap[alias] = { command, aliases: [] };
          commandMap[command.name].aliases.push(alias);
        }
      }
    }

    return { commands, commandMap };
  }

  // 获取命令前缀列表
  function getCommandPrefixes(session) {
    try {
      // 尝试从不同位置获取前缀配置
      const prefixes = session.app.koishi.config.prefix || ctx.root.options.prefix || [];
      return Array.isArray(prefixes) ? prefixes : [prefixes].filter(Boolean);
    } catch (error) {
      logInfo('获取命令前缀出错', error);
      return ['']; // 默认前缀
    }
  }

  // 查找相似的命令（返回多个匹配结果）
  function findSimilarCommands(wrongCommand: string, prefixUsed: string = '') {
    const { commands, commandMap } = getAllCommands();
    const matches = [];

    // 检查是否有完全匹配的命令
    if (commands.includes(wrongCommand)) {
      matches.push({
        originalCommand: wrongCommand,
        commandObj: commandMap[wrongCommand].command,
        similarity: 1,
        exactMatch: true
      });
    }

    // 获取所有相似度超过阈值的命令
    for (const cmd of commands) {
      if (cmd === wrongCommand) continue; // 跳过已添加的完全匹配

      const similarity = calculateSimilarity(wrongCommand, cmd);

      // 判断命令是否包含中文
      const containsChinese = /[\u4e00-\u9fa5]/.test(cmd);
      const threshold = containsChinese ? config.chineseCommandThreshold : config.similarityThreshold;

      if (similarity >= threshold) {
        matches.push({
          originalCommand: cmd,
          commandObj: commandMap[cmd].command,
          similarity: similarity,
          exactMatch: false
        });
      }
    }

    // 按相似度排序
    matches.sort((a, b) => b.similarity - a.similarity);

    return matches;
  }

  ctx.on('ready', () => {
    // 记录用户消息历史，但跳过 fuck 命令
    ctx.middleware((session, next) => {
      const userId = session.userId;
      const content = session.stripped.content;

      // 检查是否是 fuck 命令
      const commandPart = content.trim().split(/\s+/)[0];
      const isFuckCommand = /^(\+\+|\/)?fuck$/i.test(commandPart);

      if (!isFuckCommand) {
        if (!userMessageHistory[userId]) {
          userMessageHistory[userId] = [];
        }

        // 添加新消息到历史记录
        userMessageHistory[userId].push(content);

        // 保持历史记录不超过指定长度
        if (userMessageHistory[userId].length > config.maxHistoryLength) {
          userMessageHistory[userId].shift();
        }

        if (config.loggeruserinputinfo) {
          logInfo(`记录用户 ${userId} 的消息: ${content}`);
        }
      } else if (config.loggeruserinputinfo) {
        logInfo(`跳过记录 fuck 命令: ${content}`);
      }

      return next();
    }, true);

    ctx.command(`${config.commandName} [args...]`)
      .option('info', '-i 输出纠正的指令并执行')
      .option('list', '-l 仅列出所有匹配的指令')
      .action(async ({ session, options, args }) => {
        const userId = session.userId;
        let lastNonFuckMessage = null;
        let foundIndex = -1;

        // 优先检查是否回复了某条消息
        if (session.quote?.content) {
          // 检查回复的消息是否是fuck命令，如果是则拒绝处理
          const quotedContent = session.quote.content.trim();
          const quotedCommandPart = quotedContent.split(/\s+/)[0];

          // 检查是否是任何形式的fuck命令
          if (prefixedFuckCommandPattern(quotedCommandPart)) {
            return `不能对${config.commandName}命令使用修正`;
          }

          lastNonFuckMessage = quotedContent;
          logInfo(`用户 ${userId} 回复了消息: ${lastNonFuckMessage}`);
        }
        // 如果没有回复消息，则从历史记录中查找
        else {
          // 检查用户是否有历史消息
          if (!userMessageHistory[userId] || userMessageHistory[userId].length < 1) {
            return '没有找到你之前的命令记录';
          }

          // 从历史记录中找到最近的非 fuck 命令
          // 从最新消息向前查找
          for (let i = userMessageHistory[userId].length - 1; i >= 0; i--) {
            const message = userMessageHistory[userId][i];
            const commandPart = message.trim().split(/\s+/)[0];

            // 如果不是 fuck 命令，就使用它
            if (!prefixedFuckCommandPattern(commandPart)) {
              lastNonFuckMessage = message;
              foundIndex = i;
              break;
            }
          }

          if (!lastNonFuckMessage) {
            return '找不到需要纠正的命令，或指令超出记录上限';
          }

          logInfo(`用户 ${userId} 的上一个非fuck命令(索引${foundIndex}): ${lastNonFuckMessage}`);
        }

        logInfo(`=== === === === FUCK START === === === ===`);

        // 解析命令和参数
        const parts = lastNonFuckMessage.trim().split(/\s+/);
        let wrongCommandWithPrefix = parts[0];
        const commandArgs = parts.slice(1).join(' ');

        // 获取命令前缀列表
        const prefixes = getCommandPrefixes(session);
        logInfo(`当前配置的命令前缀: ${JSON.stringify(prefixes)}`);

        // 检查并移除前缀
        let prefixUsed = '';
        let wrongCommand = wrongCommandWithPrefix;

        for (const prefix of prefixes) {
          if (prefix && wrongCommandWithPrefix.startsWith(prefix)) {
            prefixUsed = prefix;
            wrongCommand = wrongCommandWithPrefix.slice(prefix.length);
            break;
          }
        }

        logInfo(`解析结果: \n前缀: "${prefixUsed}" \n命令: "${wrongCommand}" \n参数: "${commandArgs}"`);

        // 查找相似的命令（多个结果）
        const similarCommands = findSimilarCommands(wrongCommand, prefixUsed);
        if (!similarCommands || similarCommands.length === 0) {
          return '无法找到相似的命令';
        } else {
          logInfo(similarCommands);
        }
        if (options.list) {
          const matchList = similarCommands.map((match, index) => {
            return `${match.originalCommand}：${(match.similarity * 100).toFixed(0)}%`;
          }).join('\n');

          return `找到以下可能的命令：\n${matchList}\n\n使用 ${config.commandName}${' ' + config.commandName}... 选择对应的命令`;
        }

        // 确定使用第几个匹配结果
        const fuckCount = args.filter(arg => arg.toLowerCase() === `${config.commandName}`).length;
        const matchIndex = Math.min(fuckCount, similarCommands.length - 1);

        logInfo(`用户输入了 ${fuckCount} 个 ${config.commandName}，将使用第 ${matchIndex + 1} 个匹配结果`);

        if (matchIndex >= similarCommands.length) {
          return `没有更多匹配的命令了，只找到了 ${similarCommands.length} 个可能的命令`;
        }

        const selectedMatch = similarCommands[matchIndex];
        const correctedCommand = selectedMatch.originalCommand;
        const fullCommand = `${correctedCommand} ${commandArgs}`.trim();

        // 确保纠正后的命令不是fuck命令
        if (correctedCommand.toLowerCase() === config.commandName.toLowerCase()) {
          return `不能执行${config.commandName}命令`;
        }

        logInfo(`选择的命令: ${wrongCommand} -> ${correctedCommand} (匹配度: ${(selectedMatch.similarity * 100).toFixed(1)}%)\n完整命令: ${fullCommand}`);

        // 执行纠正后的命令
        try {
          if (config.commandInfo || options.info) {
            if (selectedMatch.exactMatch) {
              await session.send(`将执行完全匹配的命令: ${h.escape(fullCommand)}`);
            } else {
              await session.send(`将执行相似度 ${(selectedMatch.similarity * 100).toFixed(1)}% 的命令: ${h.escape(fullCommand)}`);
            }
          }
          logInfo(`=== === === === FUCK OVER === === === ===`);
          return await session.execute(fullCommand);
        } catch (error) {
          logInfo('执行纠正命令时出错', error);
          return `执行命令时出错: ${error.message}`;
        }

        //  检查是否是任何形式的fuck命令
        function prefixedFuckCommandPattern(commandText) {
          // 匹配任何可能的前缀后跟fuck
          const prefixes = getCommandPrefixes(session);
          const prefixPattern = prefixes.length ?
            `(${prefixes.map(p => escapeRegExp(p)).join('|')})?` :
            '';
          const pattern = new RegExp(`^${prefixPattern}${config.commandName}$`, 'i');
          return pattern.test(commandText);
        }

        //  转义正则表达式特殊字符
        function escapeRegExp(string) {
          return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
      });

  });
}
