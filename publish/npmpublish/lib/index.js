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
var name = "spell-wrong";
var inject = {
  required: ["logger"]
};
var usage = `

---


通过普通中间件实现监听消息，收到消息后对 session.content 进行判断，

如果不是以 全局前缀+指令名称/别名 开头的话，那么就对用户做出提示！

提示返回部分支持自定义逻辑

---

比较适用于adapter-qq的机器人。

但是adapter-onebot使用时，在无at前缀触发的情况下，未做功能适配，所以效果不尽人意。

---
`;
var Config = import_koishi.Schema.intersect([
  import_koishi.Schema.object({
    enablePlugin: import_koishi.Schema.boolean().default(true).description("是否开启插件"),
    onlyHasAt: import_koishi.Schema.boolean().default(true).description("仅在`@机器人`的时候进入逻辑判断（以防止无前缀聊天时 触发提示语）")
  }).description("基础设置"),
  import_koishi.Schema.object({
    returnNext: import_koishi.Schema.boolean().default(true).description("使用临时中间件 以确保只处理`session没有被捕获`的情况<br>否则使用普通中间件。"),
    tipAction: import_koishi.Schema.string().role("textarea", { rows: [2, 4] }).description("提示回应方式（不包含`await`的代码）<br>> 修改后出现问题时 请恢复默认配置项").default("session.send(h.at(session.userId) + ` ${session.bot.user.name}提醒你 没有输入正确的指令哦~`)").experimental()
  }).description("进阶选项"),
  import_koishi.Schema.object({
    loggerinfo: import_koishi.Schema.boolean().default(false).description("日志调试模式")
  }).description("开发者选项")
]);
function apply(ctx, config) {
  const logger = ctx.logger("spell-wrong");
  if (!config.enablePlugin) return;
  ctx.middleware(async (session, next) => {
    if (config.onlyHasAt) {
      if (!session.stripped.hasAt || !session.stripped.atSelf) {
        return next();
      }
    }
    logInfo("=====================================================================================================================================");
    const { commands } = getAllCommands();
    const prefixes = getCommandPrefixes(session);
    logInfo("当前可用命令:", commands);
    logInfo("当前指令前缀:", prefixes);
    logInfo("当前消息内容:", session.stripped.content);
    let isValidCommand = false;
    for (const prefix of prefixes) {
      const actualPrefix = prefix === null ? "" : prefix;
      for (const command of commands) {
        if (session.stripped.content.startsWith(actualPrefix + command)) {
          const nextChar = session.stripped.content[actualPrefix.length + command.length];
          if (!nextChar || nextChar === " ") {
            isValidCommand = true;
            logInfo(`匹配到有效指令: ${actualPrefix}${command}`);
            break;
          }
        }
      }
      if (isValidCommand) break;
    }
    if (!isValidCommand) {
      const executeTipAction = /* @__PURE__ */ __name(async () => {
        logInfo("执行提示操作...");
        try {
          const executeAction = new Function("session", "h", "ctx", "logger", "config", `  return (async () => {    ${config.tipAction}  })();`);
          await executeAction(session, import_koishi.h, ctx, logger, config);
        } catch (error) {
          logger.error("执行tipAction时出错: ", error);
        }
      }, "executeTipAction");
      if (config.returnNext) {
        logInfo("用户输入不是有效指令格式，注册临时中间件");
        return next(async () => {
          logInfo("执行临时中间件提示操作...");
          await executeTipAction();
        });
      } else {
        logInfo("用户输入不是有效指令格式，执行普通中间件提示");
        await executeTipAction();
        return;
      }
    } else {
      logInfo("用户输入是有效指令格式，不执行提示");
      return next();
    }
  });
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
  function logInfo(...args) {
    if (config.loggerinfo) {
      logger.info(...args);
    }
  }
  __name(logInfo, "logInfo");
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
