"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.usage = exports.inject = exports.name = void 0;
const fs = require('node:fs');
const path = require("node:path");
const { Schema, Logger, h } = require("koishi");
exports.reusable = true; // 声明此插件可重用
exports.name = 'content-guard';

const logger = new Logger('content-guard');

exports.usage = `
---

## 违禁词库

违禁词库来自 [Sensitive-lexicon](https://github.com/konsheng/Sensitive-lexicon)。

感谢该项目提供的违禁词资源。

你也可以使用这个项目的 txt 作为 [text-censor](/market?keyword=text-censor) 的违禁词库，

与本插件不同，text-censor 提供了 censor 服务以供其他插件调用。

---

## 免责说明

本插件仅用于演示和学习目的。

使用者应自行承担使用本插件所带来的风险和责任。

违禁词库来源于第三方项目，插件开发者对其内容不承担任何责任。

请确保在遵守相关法律法规的前提下使用本插件。

---

本插件仅适用于由用户进行指令调用输入参数的文本审核

仅需在 Audit_Configuration 配置项里填入对应的特征前缀和右侧的返回文本，即可对应的开启审核。

`;

const Whitelist_input_default = [
  {
    "input": "4",
    "texttip": "这个是白名单示例，不会被屏蔽。"
  }
];
const Blacklist_input_default = [
  {
    "input": "牛魔",
    "texttip": "检测到屏蔽词：牛魔"
  },
  {
    "input": "啊米诺斯",
    "texttip": "检测到屏蔽词：啊米诺斯"
  },
  {
    "input": "你妈",
    "texttip": "检测到屏蔽词：你妈"
  }
];

exports.Config = Schema.intersect([
  Schema.object({
    Audit: Schema.boolean().default(true).description('确认开启审核（开启后，本插件生效）'),
    Audit_Configuration: Schema.array(Schema.object({
      commandname: Schema.string().description("指令名称"),
      Audit_value_blacklist: Schema.union([
        Schema.const('1').description('关闭审核，直接通过'),
        Schema.const('2').description('检测到黑名单词汇，禁止通过'),
        Schema.const('3').description('黑名单词汇替换为`***`后，通过审核'),
      ]).description('黑名单处理').default("3"),
      Audit_value_whitelist: Schema.union([
        Schema.const('1').description('关闭白名单功能'),
        Schema.const('2').description('检测到白名单词汇，直接通过'),
        Schema.const('3').description('保留白名单词汇，防止被黑名单词汇替换掉'),
      ]).description('白名单处理').default("3"),
    })).role('table').description("审核配置<br>左侧写需要审核功能的指令名称（即触发审核的输入，填入对应的指令名称。）<br>（`@`代表`@机器人`开头的消息 `这里是示例，可以删掉这一行`）<br>").default(
      [
        {
          "commandname": "say",
          "Audit_value_blacklist": "2",
          "Audit_value_whitelist": "3"
        },
        {
          "commandname": "绘画",
          "Audit_value_blacklist": "3",
          "Audit_value_whitelist": "3"
        },
        {
          "commandname": "@",
          "Audit_value_blacklist": "2",
          "Audit_value_whitelist": "3"
        }
      ]
    ),
    Return_Audit_Result_true: Schema.boolean().default(false).description('返回发送`审核通过`的文字提示 `不影响审核功能`'),
    Return_Audit_Result_false: Schema.boolean().default(true).description('返回发送`审核不通过`的文字提示 `不影响审核功能`'),
  }).description('基础设置'),
  Schema.object({
    Audit_Vocabulary_txt: Schema.boolean().default(true).description('启用自带的 [Vocabulary 词库](https://github.com/konsheng/Sensitive-lexicon)<br>➩关闭后，仅使用下面配置项的内容'),
    replace_text: Schema.string().default("***").description("`黑名单词汇`的替换文本：`***`"),
    Blacklist_input: Schema.array(Schema.object({
      input: Schema.string().description("关键词"),
      texttip: Schema.string().description("返回提示词").default("输入文本违规，不予调用。"),
    })).role('table').description('关键词-黑名单（优先）<br>对于一些额外的违禁词屏蔽').default(Blacklist_input_default),
    Whitelist_input: Schema.array(Schema.object({
      input: Schema.string().description("关键词"),
      texttip: Schema.string().description("返回提示词,该项无实际作用"),
    })).role('table').description('关键词-白名单<br>对于一些不合逻辑的关键词的取消屏蔽').default(Whitelist_input_default),
  }).description('违禁词调整设置'),
  Schema.object({
    loggerinfo: Schema.boolean().default(false).description('日志调试模式')
  }).description('调试设置'),
]);

function apply(ctx, config) {

  function logInfo(message, message2) {
    if (config.loggerinfo) {
      if (message2) {
        logger.info(`${message} ${message2}`)
      } else {
        logger.info(message);
      }
    }
  }

  async function loadVocabulary() {
    if (!config.Audit_Vocabulary_txt) return [];

    const vocabPath = path.join(__dirname, '../Vocabulary');
    const files = fs.readdirSync(vocabPath);
    let vocabulary = [];

    for (const file of files) {
      const filePath = path.join(vocabPath, file);
      const data = fs.readFileSync(filePath, 'utf8');
      const words = data.split('\n').map(word => word.trim()).filter(word => word);
      vocabulary.push(...words);
    }

    return vocabulary;
  }

  // 转义正则表达式特殊字符的辅助函数
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& 表示整个匹配的字符串
  }

  async function auditText(text, vocabulary, whitelist, blacklist, auditConfig) {
    const lowerText = text.toLowerCase();

    // 检查白名单（仅在白名单功能开启时）
    const matchedWhitelist = [];
    if (auditConfig.Audit_value_whitelist !== '1') {
      for (const wordObj of whitelist) {
        if (lowerText.includes(wordObj.input.toLowerCase())) {
          matchedWhitelist.push(wordObj.input);
        }
      }
    }

    // 检查黑名单 (包括词库和自定义黑名单)
    const matchedBlacklist = [];
    const matchedBlacklistTips = {}; // 用于存储匹配到的黑名单词汇及其对应的提示

    for (const word of vocabulary) {
      if (lowerText.includes(word.toLowerCase())) {
        matchedBlacklist.push(word);
        matchedBlacklistTips[word] = "输入文本违规，不予调用。"; // 默认提示
      }
    }

    for (const wordObj of blacklist) {
      if (lowerText.includes(wordObj.input.toLowerCase())) {
        matchedBlacklist.push(wordObj.input);
        matchedBlacklistTips[wordObj.input] = wordObj.texttip; // 使用自定义提示
      }
    }

    // 处理黑名单逻辑
    if (matchedBlacklist.length > 0) {
      if (auditConfig.Audit_value_blacklist === '2') {
        logInfo(`匹配到黑名单词汇: ${matchedBlacklist.join(', ')}，禁止通过`);
        // 返回第一个匹配到的黑名单词汇及其提示
        const firstMatchedWord = matchedBlacklist[0];
        return { result: false, matchedWord: firstMatchedWord, texttip: matchedBlacklistTips[firstMatchedWord] };
      } else if (auditConfig.Audit_value_blacklist === '3') {
        logInfo(`匹配到黑名单词汇: ${matchedBlacklist.join(', ')}，替换为 ${config.replace_text} 后通过`);

        let modifiedText = text;

        // 构建正则表达式, 优先匹配更长的词, 并且先处理白名单
        const sortedBlacklist = matchedBlacklist.sort((a, b) => b.length - a.length);

        // 如果白名单功能开启，先排除白名单中的词
        if (auditConfig.Audit_value_whitelist !== '1') {
          const sortedWhitelist = matchedWhitelist.sort((a, b) => b.length - a.length);

          // 先将白名单中的词替换成一个唯一的临时占位符
          for (const whiteWord of sortedWhitelist) {
            const whiteWordRegex = new RegExp(escapeRegExp(whiteWord), 'gi');
            modifiedText = modifiedText.replace(whiteWordRegex, (match) => {
              return `__WHITELIST_PLACEHOLDER_${whiteWord}__`;
            });
          }
        }

        // 然后替换黑名单中的词
        const blacklistPattern = sortedBlacklist.map(escapeRegExp).join('|');
        modifiedText = modifiedText.replace(
          new RegExp(`(${blacklistPattern})`, 'gi'),
          (match) => config.replace_text
        );

        // 最后将临时占位符替换回白名单的词
        if (auditConfig.Audit_value_whitelist !== '1') {
          modifiedText = modifiedText.replace(/__WHITELIST_PLACEHOLDER_(.*?)__/g, (match, word) => {
            return word;
          });
        }
        logInfo("modifiedText:", modifiedText)
        return { result: true, modifiedText };
      }
    }

    return { result: true }; // 通过
  }




  ctx.middleware(async (session, next) => {
    if (!config.Audit) {
      return next(); // 如果审核功能未开启，直接通过消息
    }

    // 如果 at 了其他人，不处理本次消息
    if (session.stripped.hasAt && !session.stripped.atSelf) {
      logInfo("用户 at 了其他人，不处理本次输入");
      return next();
    }
    let originalContent = session.content; // 存储原始的 session.content
    let inputContent = session.stripped.content.trim();
    const [command, ...args] = inputContent.split(/\s+/); // 分割指令和参数
    const lowerCommand = command.toLowerCase();
    const prefixes = session.app.koishi.config.prefix || ctx.root.options.prefix || [];
    const isDirectMessage = session.isDirect;


    // 处理 @ 机器人的情况
    if (session.stripped.hasAt && session.stripped.atSelf) {
      const atConfig = config.Audit_Configuration.find(item => item.commandname === "@");
      if (atConfig) {
        const anothercontent = session.stripped.content.trim(); // 使用原始的，未小写的content
        logInfo(`用户输入内容为\n${anothercontent}`);

        const vocabulary = await loadVocabulary();
        const whitelist = config.Whitelist_input;
        const blacklist = config.Blacklist_input;

        const auditResult = await auditText(anothercontent, vocabulary, whitelist, blacklist, atConfig);

        if (auditResult.result) {
          if (auditResult.modifiedText) {
            session.content = auditResult.modifiedText; // 更新会话内容为审核后的文本
          }
          if (config.Return_Audit_Result_true) {
            await session.send(h.text('审核通过'));
          }
          logInfo(`审核通过`);
          //return next(); // 通过消息，允许处理  // 注释掉这里的 return
        } else {
          if (config.Return_Audit_Result_false && auditResult.texttip) {
            await session.send(h.text(auditResult.texttip));
          }
          logInfo(`输入文本违规，不予交互。`);
          return; // 屏蔽消息
        }
      }
    }



    // 遍历配置，查找匹配的指令
    for (const commandConfig of config.Audit_Configuration) {
      if (commandConfig.Audit_value_blacklist === '1') continue;  //跳过关闭审核的配置

      const commandName = commandConfig.commandname.toLowerCase();
      const expectedCommand = isDirectMessage
        ? [commandName, ...prefixes.map(p => p + commandName)]
        : prefixes.map(p => p + commandName);

      if (expectedCommand.includes(lowerCommand)) {
        const anothercontent = inputContent; // 使用原始输入进行违禁词检查, 不需要 toLowerCase()
        logInfo(`用户输入内容为\n${anothercontent}`);

        const vocabulary = await loadVocabulary();
        const whitelist = config.Whitelist_input;
        const blacklist = config.Blacklist_input;

        const auditResult = await auditText(anothercontent, vocabulary, whitelist, blacklist, commandConfig);

        if (auditResult.result) {
          if (auditResult.modifiedText) {
            // 直接使用审核后的文本
            session.content = `${auditResult.modifiedText}`;
            logInfo(`auditResult.modifiedText: ${auditResult.modifiedText}`);
            logInfo(`session.content: ${session.content}`);
          }
          if (config.Return_Audit_Result_true) {
            await session.send(h.text('审核通过'));
          }
          logInfo(`审核通过`);
          //return next(); // 通过消息，允许处理  // 注释掉这里的 return
        } else {
          if (config.Return_Audit_Result_false && auditResult.texttip) {
            await session.send(h.text(auditResult.texttip));
          }
          logInfo(`输入文本违规，不予调用。`);
          return; // 屏蔽消息
        }
      }
    }

    // 在所有审核逻辑之后，调用 next()
    if (session.content !== originalContent) { // 只有session.content被修改过，才继续
      return next();
    } else {
      return next(); // 如果没有修改，也继续
    }

  }, true);
}


exports.apply = apply;
