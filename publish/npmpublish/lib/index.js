var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  name: () => name,
  usage: () => usage
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var name = "commands-fuck";
var inject = ["logger"];
var usage = `
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
var Config = import_koishi.Schema.intersect([
  import_koishi.Schema.object({
    commandName: import_koishi.Schema.string().default("fuck").description("指令名称"),
    maxHistoryLength: import_koishi.Schema.number().default(3).description("记录每个用户的（最近）历史消息数量"),
    similarityThreshold: import_koishi.Schema.number().default(0.4).step(0.1).description("命令相似度阈值，超过此值才会被认为是相似命令"),
    chineseCommandThreshold: import_koishi.Schema.number().default(0.3).step(0.1).description("中文命令相似度阈值，针对中文命令设置更宽松的匹配标准"),
    commandInfo: import_koishi.Schema.boolean().default(false).description("返回即将执行的指令内容提示，与`-i`选项效果一致<br>[⇒点我查看效果](https://i0.hdslb.com/bfs/openplatform/c6e71eccd095913310d2c8b61943ec006b62697d.png)")
  }).description("基础设置"),
  import_koishi.Schema.object({
    loggerinfo: import_koishi.Schema.boolean().default(false).description("日志调试：一般输出<br>提issue是请使用此功能").experimental(),
    loggeruserinputinfo: import_koishi.Schema.boolean().default(false).description("日志输出用户输入").experimental()
  }).description("调试设置")
]);
async function apply(ctx, config) {
  const userMessageHistory = {};
  function logInfo(message, detail) {
    if (config.loggerinfo) {
      if (detail) {
        ctx.logger.info(message, detail);
      } else {
        ctx.logger.info(message);
      }
    }
  }
  __name(logInfo, "logInfo");
  function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let i = 0; i <= a.length; i++) {
      matrix[0][i] = i;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            // 替换
            matrix[i][j - 1] + 1,
            // 插入
            matrix[i - 1][j] + 1
            // 删除
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
  __name(levenshteinDistance, "levenshteinDistance");
  function calculateSimilarity(a, b) {
    const distance = levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  }
  __name(calculateSimilarity, "calculateSimilarity");
  function getAllCommands() {
    const commands = [];
    const commandMap = {};
    for (const command of ctx.$commander._commandList) {
      commands.push(command.name);
      commandMap[command.name] = { command, aliases: [] };
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
  __name(getAllCommands, "getAllCommands");
  function getCommandPrefixes(session) {
    try {
      const prefixes = session.app.koishi.config.prefix || ctx.root.options.prefix || [];
      return Array.isArray(prefixes) ? prefixes : [prefixes].filter(Boolean);
    } catch (error) {
      logInfo("获取命令前缀出错", error);
      return [""];
    }
  }
  __name(getCommandPrefixes, "getCommandPrefixes");
  function findSimilarCommands(wrongCommand, prefixUsed = "") {
    const { commands, commandMap } = getAllCommands();
    const matches = [];
    if (commands.includes(wrongCommand)) {
      matches.push({
        originalCommand: wrongCommand,
        commandObj: commandMap[wrongCommand].command,
        similarity: 1,
        exactMatch: true
      });
    }
    for (const cmd of commands) {
      if (cmd === wrongCommand) continue;
      const similarity = calculateSimilarity(wrongCommand, cmd);
      const containsChinese = /[\u4e00-\u9fa5]/.test(cmd);
      const threshold = containsChinese ? config.chineseCommandThreshold : config.similarityThreshold;
      if (similarity >= threshold) {
        matches.push({
          originalCommand: cmd,
          commandObj: commandMap[cmd].command,
          similarity,
          exactMatch: false
        });
      }
    }
    matches.sort((a, b) => b.similarity - a.similarity);
    return matches;
  }
  __name(findSimilarCommands, "findSimilarCommands");
  ctx.on("ready", () => {
    ctx.middleware((session, next) => {
      const userId = session.userId;
      const content = session.stripped.content;
      const commandPart = content.trim().split(/\s+/)[0];
      const isFuckCommand = /^(\+\+|\/)?fuck$/i.test(commandPart);
      if (!isFuckCommand) {
        if (!userMessageHistory[userId]) {
          userMessageHistory[userId] = [];
        }
        userMessageHistory[userId].push(content);
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
    ctx.command(`${config.commandName} [args...]`).option("info", "-i 输出纠正的指令并执行").option("list", "-l 仅列出所有匹配的指令").action(async ({ session, options, args }) => {
      const userId = session.userId;
      let lastNonFuckMessage = null;
      let foundIndex = -1;
      if (session.quote?.content) {
        const quotedContent = session.quote.content.trim();
        const quotedCommandPart = quotedContent.split(/\s+/)[0];
        if (prefixedFuckCommandPattern(quotedCommandPart)) {
          return `不能对${config.commandName}命令使用修正`;
        }
        lastNonFuckMessage = quotedContent;
        logInfo(`用户 ${userId} 回复了消息: ${lastNonFuckMessage}`);
      } else {
        if (!userMessageHistory[userId] || userMessageHistory[userId].length < 1) {
          return "没有找到你之前的命令记录";
        }
        for (let i = userMessageHistory[userId].length - 1; i >= 0; i--) {
          const message = userMessageHistory[userId][i];
          const commandPart = message.trim().split(/\s+/)[0];
          if (!prefixedFuckCommandPattern(commandPart)) {
            lastNonFuckMessage = message;
            foundIndex = i;
            break;
          }
        }
        if (!lastNonFuckMessage) {
          return "找不到需要纠正的命令，或指令超出记录上限";
        }
        logInfo(`用户 ${userId} 的上一个非fuck命令(索引${foundIndex}): ${lastNonFuckMessage}`);
      }
      logInfo(`=== === === === FUCK START === === === ===`);
      const parts = lastNonFuckMessage.trim().split(/\s+/);
      let wrongCommandWithPrefix = parts[0];
      const commandArgs = parts.slice(1).join(" ");
      const prefixes = getCommandPrefixes(session);
      logInfo(`当前配置的命令前缀: ${JSON.stringify(prefixes)}`);
      let prefixUsed = "";
      let wrongCommand = wrongCommandWithPrefix;
      for (const prefix of prefixes) {
        if (prefix && wrongCommandWithPrefix.startsWith(prefix)) {
          prefixUsed = prefix;
          wrongCommand = wrongCommandWithPrefix.slice(prefix.length);
          break;
        }
      }
      logInfo(`解析结果: 
前缀: "${prefixUsed}" 
命令: "${wrongCommand}" 
参数: "${commandArgs}"`);
      const similarCommands = findSimilarCommands(wrongCommand, prefixUsed);
      if (!similarCommands || similarCommands.length === 0) {
        return "无法找到相似的命令";
      } else {
        logInfo(similarCommands);
      }
      if (options.list) {
        const matchList = similarCommands.map((match, index) => {
          return `${match.originalCommand}：${(match.similarity * 100).toFixed(0)}%`;
        }).join("\n");
        return `找到以下可能的命令：
${matchList}

使用 ${config.commandName}${" " + config.commandName}... 选择对应的命令`;
      }
      const fuckCount = args.filter((arg) => arg.toLowerCase() === `${config.commandName}`).length;
      const matchIndex = Math.min(fuckCount, similarCommands.length - 1);
      logInfo(`用户输入了 ${fuckCount} 个 ${config.commandName}，将使用第 ${matchIndex + 1} 个匹配结果`);
      if (matchIndex >= similarCommands.length) {
        return `没有更多匹配的命令了，只找到了 ${similarCommands.length} 个可能的命令`;
      }
      const selectedMatch = similarCommands[matchIndex];
      const correctedCommand = selectedMatch.originalCommand;
      const fullCommand = `${correctedCommand} ${commandArgs}`.trim();
      if (correctedCommand.toLowerCase() === config.commandName.toLowerCase()) {
        return `不能执行${config.commandName}命令`;
      }
      logInfo(`选择的命令: ${wrongCommand} -> ${correctedCommand} (匹配度: ${(selectedMatch.similarity * 100).toFixed(1)}%)
完整命令: ${fullCommand}`);
      try {
        if (config.commandInfo || options.info) {
          if (selectedMatch.exactMatch) {
            await session.send(`将执行完全匹配的命令: ${import_koishi.h.escape(fullCommand)}`);
          } else {
            await session.send(`将执行相似度 ${(selectedMatch.similarity * 100).toFixed(1)}% 的命令: ${import_koishi.h.escape(fullCommand)}`);
          }
        }
        logInfo(`=== === === === FUCK OVER === === === ===`);
        return await session.execute(fullCommand);
      } catch (error) {
        logInfo("执行纠正命令时出错", error);
        return `执行命令时出错: ${error.message}`;
      }
      function prefixedFuckCommandPattern(commandText) {
        const prefixes2 = getCommandPrefixes(session);
        const prefixPattern = prefixes2.length ? `(${prefixes2.map((p) => escapeRegExp(p)).join("|")})?` : "";
        const pattern = new RegExp(`^${prefixPattern}${config.commandName}$`, "i");
        return pattern.test(commandText);
      }
      __name(prefixedFuckCommandPattern, "prefixedFuckCommandPattern");
      function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      __name(escapeRegExp, "escapeRegExp");
    });
  });
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name,
  usage
});
