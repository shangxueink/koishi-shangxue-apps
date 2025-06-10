import { Schema, Context, h } from 'koishi'

export const name = 'spell-wrong'
export const inject = {
  required: ['logger']
}

export const usage = `

---


通过普通中间件实现监听消息，收到消息后对 session.content 进行判断，

如果不是以 全局前缀+指令名称/别名 开头的话，那么就对用户做出提示！

提示返回部分支持自定义逻辑

---

比较适用于adapter-qq的机器人。

但是adapter-onebot使用时，在无at前缀触发的情况下，未做功能适配，所以效果不尽人意。

---
`;


export const Config =
  Schema.intersect([
    Schema.object({
      enablePlugin: Schema.boolean().default(true).description("是否开启插件"),
      onlyHasAt: Schema.boolean().default(true).description("仅在`@机器人`的时候进入逻辑判断（以防止无前缀聊天时 触发提示语）"),
    }).description('基础设置'),

    Schema.object({
      returnNext: Schema.boolean().default(true).description("使用临时中间件 以确保只处理`session没有被捕获`的情况<br>否则使用普通中间件。"),
      tipAction: Schema.string().role('textarea', { rows: [2, 4] }).description("提示回应方式（不包含`await`的代码）<br>> 修改后出现问题时 请恢复默认配置项").default("session.send(h.at(session.userId) + ` ${session.bot.user.name}提醒你 没有输入正确的指令哦~`)").experimental(),
    }).description('进阶选项'),

    Schema.object({
      loggerinfo: Schema.boolean().default(false).description("日志调试模式"),
    }).description('开发者选项'),
  ])

export function apply(ctx: Context, config) {
  const logger = ctx.logger('spell-wrong')

  // 如果插件未启用，直接返回
  if (!config.enablePlugin) return

  // 临时中间件
  ctx.middleware(async (session, next) => {
    // 检查是否需要@机器人
    if (config.onlyHasAt) {
      // 如果需要@机器人，但当前消息没有@机器人，则直接返回
      if (!session.stripped.hasAt || !session.stripped.atSelf) {
        return next();
      }
    }

    logInfo('=====================================================================================================================================');
    // 获取所有命令和前缀
    const { commands } = getAllCommands();
    const prefixes = getCommandPrefixes(session);

    logInfo('当前可用命令:', commands);
    logInfo('当前指令前缀:', prefixes);
    logInfo('当前消息内容:', session.stripped.content);

    // 检查消息是否是有效指令
    let isValidCommand = false;

    // 检查是否以任何前缀+命令开头
    for (const prefix of prefixes) {
      // 如果前缀是null，表示无前缀也可以触发命令
      const actualPrefix = prefix === null ? '' : prefix;

      for (const command of commands) {
        // 检查消息是否以 前缀+命令 开头
        if (session.stripped.content.startsWith(actualPrefix + command)) {
          // 确保命令后面是空格或消息结束
          const nextChar = session.stripped.content[actualPrefix.length + command.length];
          if (!nextChar || nextChar === ' ') {
            isValidCommand = true;
            logInfo(`匹配到有效指令: ${actualPrefix}${command}`);
            break;
          }
        }
      }

      if (isValidCommand) break;
    }

    // 如果不是有效指令，根据配置决定使用临时中间件还是普通中间件
    if (!isValidCommand) {
      // 定义执行提示操作的函数
      const executeTipAction = async () => {
        logInfo('执行提示操作...');
        try {
          const executeAction = new Function('session', 'h', 'ctx', 'logger', 'config', `  return (async () => {    ${config.tipAction}  })();`);
          await executeAction(session, h, ctx, logger, config);
        } catch (error) {
          logger.error('执行tipAction时出错: ', error);
        }
      };

      if (config.returnNext) {
        // 使用临时中间件（低优先级，确保最后才处理session）
        logInfo('用户输入不是有效指令格式，注册临时中间件');
        return next(async () => {
          logInfo('执行临时中间件提示操作...');
          await executeTipAction();
        });
      } else {
        // 使用普通中间件（正常优先级）这可能需要用户手动调整中间件优先级
        logInfo('用户输入不是有效指令格式，执行普通中间件提示');
        await executeTipAction();
        return;
      }
    } else {
      logInfo('用户输入是有效指令格式，不执行提示');
      return next();
    }
  })

  /*
  // 此部分用于捕获session
    if (config.loggerinfo) {
      ctx.middleware(async (session, next) => {
        logInfo("测试中间件：", session.content)
      })
    }
  */
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

  function logInfo(...args: any[]) {
    if (config.loggerinfo) {
      (logger.info as (...args: any[]) => void)(...args);
    }
  }
}
