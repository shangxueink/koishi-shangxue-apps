"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.usage = exports.inject = exports.name = void 0;
const fs = require('node:fs');
const path = require("node:path");
const { Schema, Logger, h } = require("koishi");

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

const Whitelist_input_default = ["4"];
const Blacklist_input_default = ["牛魔", "啊米诺斯"];

exports.Config = Schema.intersect([
  Schema.object({
    Audit: Schema.boolean().default(true).description('确认开启审核（开启后，本插件生效）'),
    Audit_Configuration2: Schema.array(Schema.object({
      commandname: Schema.string().description("指令名称"),
      Audit_value1: Schema.union(['关闭审核', '仅替换关键词为 *** ，允许执行原指令逻辑', '检测到关键词，禁止执行原指令逻辑']).description("应用逻辑"),
      texttip: Schema.string().description("返回提示词"),
    })).role('table').description("审核配置<br>左侧写需要审核功能的指令名称（即触发审核的输入前缀，若有指令前缀，需要带指令前缀。`@`代表`@机器人`开头的消息）<br>右侧写`对违规内容的`文本提示<br>").default(
      [
        {
          "Audit_value1": "检测到关键词，禁止执行原指令逻辑",
          "texttip": "输入文本违规，不予调用。",
          "commandname": "say"
        },
        {
          "commandname": "/say",
          "Audit_value1": "检测到关键词，禁止执行原指令逻辑",
          "texttip": "输入文本违规，不予调用。"
        },
        {
          "commandname": "绘画",
          "Audit_value1": "仅替换关键词为 *** ，允许执行原指令逻辑",
          "texttip": "检测到R18词条，不予调用。"
        },
        {
          "commandname": "/绘画",
          "Audit_value1": "仅替换关键词为 *** ，允许执行原指令逻辑",
          "texttip": "检测到R18词条，不予调用。"
        },
        {
          "commandname": "@",
          "Audit_value1": "检测到关键词，禁止执行原指令逻辑",
          "texttip": "输入文本违规，不予交互。"
        }
      ]
    ),
    Return_Audit_Result_true: Schema.boolean().default(false).description('返回发送`审核通过`的文字提示 `不影响审核功能`'),
    Return_Audit_Result_false: Schema.boolean().default(true).description('返回发送`审核不通过`的文字提示 `不影响审核功能`'),
  }).description('基础设置'),
  Schema.object({
    Audit_Vocabulary_txt: Schema.boolean().default(true).description('启用自带的 [Vocabulary 词库](https://github.com/konsheng/Sensitive-lexicon)<br>➩关闭后，仅使用下面配置项的内容'),
    replace_text: Schema.string().default("***").description("`黑名单词汇`的替换文本：`***`"),
    list_input: Schema.union([
      Schema.const('blacklist').description('同时包含白名单和黑名单词汇的输入，禁止通过'),
      Schema.const('whitelist').description('同时包含白名单和黑名单词汇的输入，直接通过'),
      Schema.const('replace').description('同时包含白名单和黑名单词汇的输入，将黑名单词汇替换为`***`后，通过审核'),
    ]).role('radio').description('审核判断逻辑'),
    Blacklist_input: Schema.array(String).role('table').default(Blacklist_input_default).description('关键词黑名单（优先）<br>对于一些额外的违禁词屏蔽'),
    Whitelist_input: Schema.array(String).role('table').default(Whitelist_input_default).description('关键词白名单<br>对于一些不合逻辑的关键词的取消屏蔽'),
  }).description('违禁词调整设置'),
  Schema.object({
    loggerinfo: Schema.boolean().default(false).description('日志调试模式')
  }).description('调试设置'),
]);

function apply(ctx, config) {

  function logInfo(message) {
    if (config.loggerinfo) {
      logger.info(message);
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
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& 表示匹配的子字符串
  }
  async function auditText(text, vocabulary, whitelist, blacklist, listInput) {
    const lowerText = text.toLowerCase();

    // 将违禁词库与黑名单合并为一个黑名单
    const combinedBlacklist = [...blacklist, ...vocabulary];

    // 检查黑名单
    const matchedBlacklist = [];
    for (const word of combinedBlacklist) {
      if (lowerText.includes(word.toLowerCase())) {
        matchedBlacklist.push(word);
      }
    }

    // 检查白名单
    const matchedWhitelist = [];
    for (const word of whitelist) {
      if (lowerText.includes(word.toLowerCase())) {
        matchedWhitelist.push(word);
      }
    }

    // 根据 listInput 配置项处理逻辑
    if (matchedBlacklist.length > 0 && matchedWhitelist.length > 0) {
      if (listInput === 'blacklist') {
        logInfo(`同时匹配到黑名单词汇: ${matchedBlacklist.join(', ')} 和白名单词汇: ${matchedWhitelist.join(', ')}，禁止通过`);
        return { result: false, matchedWord: matchedBlacklist[0] };
      } else if (listInput === 'whitelist') {
        logInfo(`同时匹配到黑名单词汇: ${matchedBlacklist.join(', ')} 和白名单词汇: ${matchedWhitelist.join(', ')}，直接通过`);
        return { result: true };
      } else if (listInput === 'replace') {
        logInfo(`同时匹配到黑名单词汇: ${matchedBlacklist.join(', ')} 和白名单词汇: ${matchedWhitelist.join(', ')}，将黑名单词汇替换为 ${config.replace_text} 后通过`);

        let modifiedText = text;

        // 使用正则表达式一次性替换所有匹配的词汇
        modifiedText = modifiedText.replace(new RegExp(`(${matchedBlacklist.map(escapeRegExp).join('|')})`, 'gi'), (match) => {
          // 检查匹配的词汇是否在白名单中
          if (matchedWhitelist.some(whitelistItem => whitelistItem.toLowerCase() === match.toLowerCase())) {
            return match; // 如果在白名单中，则保留原词汇
          } else {
            return `${config.replace_text}`; // 否则替换为 ${config.replace_text}
          }
        });

        return { result: true, modifiedText };
      }
    } else if (matchedBlacklist.length > 0) { // 如果只有黑名单词汇
      logInfo(`匹配到黑名单词汇: ${matchedBlacklist.join(', ')}`);
      return { result: false, matchedWord: matchedBlacklist[0] };
    } else if (matchedWhitelist.length > 0) { // 如果只有白名单词汇
      logInfo(`匹配到白名单词汇: ${matchedWhitelist.join(', ')}`);
      return { result: true };
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

    let anothercontent = session.stripped.content.trim().toLowerCase();
    const commandConfig = config.Audit_Configuration2.find(item => anothercontent.startsWith(item.commandname.toLowerCase()));

    // 如果没有匹配到指令配置，但消息是 @机器人，则检查是否有 "@" 配置项
    if (!commandConfig && session.stripped.hasAt && session.stripped.atSelf) {
      const atConfig = config.Audit_Configuration2.find(item => item.commandname === "@");
      if (atConfig) {
        logInfo(`用户输入内容为\n${anothercontent}`);

        const vocabulary = (await loadVocabulary()).map(word => word.toLowerCase());
        const whitelist = config.Whitelist_input.map(word => word.toLowerCase());
        const blacklist = config.Blacklist_input.map(word => word.toLowerCase());

        const auditResult = await auditText(anothercontent, vocabulary, whitelist, blacklist, config.list_input);

        if (auditResult.result) {
          if (auditResult.modifiedText) {
            session.content = auditResult.modifiedText; // 更新会话内容
            logInfo(session.content);
          }
          if (config.Return_Audit_Result_true) {
            await session.send(h.text('审核通过'));
          }
          logInfo(`审核通过`);
          return next(); // 通过消息，允许处理
        } else {
          if (config.Return_Audit_Result_false) {
            await session.send(h.text(atConfig.texttip));
          }
          logInfo(`输入文本违规，不予交互。`);
          return; // 屏蔽消息
        }
      }
    }

    if (!commandConfig || commandConfig.Audit_value1 === '关闭审核') {
      return next(); // 如果不需要审核的指令，或审核关闭，直接通过消息
    }

    logInfo(`用户输入内容为\n${anothercontent}`);

    const vocabulary = (await loadVocabulary()).map(word => word.toLowerCase());
    const whitelist = config.Whitelist_input.map(word => word.toLowerCase());
    const blacklist = config.Blacklist_input.map(word => word.toLowerCase());

    const auditResult = await auditText(anothercontent, vocabulary, whitelist, blacklist, config.list_input);

    if (auditResult.result) {
      if (auditResult.modifiedText) {
        session.content = auditResult.modifiedText; // 更新会话内容
        logInfo(session.content);
      }
      if (config.Return_Audit_Result_true) {
        await session.send(h.text('审核通过'));
      }
      logInfo(`审核通过`);
      return next(); // 通过消息，允许处理
    } else {
      if (commandConfig.Audit_value1 === '仅替换关键词为 *** ，允许执行原指令逻辑') {
        anothercontent = anothercontent.replace(new RegExp(auditResult.matchedWord, 'gi'), `${config.replace_text}`);
        logInfo(`关键词已替换为 ${config.replace_text}`);
        session.content = anothercontent; // 更新会话内容        
        logInfo(session.content);
        return next(); // 允许继续执行原指令逻辑
      }

      if (config.Return_Audit_Result_false) {
        await session.send(h.text(commandConfig.texttip));
      }
      logInfo(`输入文本违规，不予调用。`);
      return; // 屏蔽消息

    }

  }, true);


}

exports.apply = apply;
