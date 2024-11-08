"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.usage = exports.inject = exports.name = void 0;
const fs = require('node:fs');
const path = require("node:path");
const { Schema, Logger, h } = require("koishi");
//const MintFilter = require("mint-filter").default;

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
    })).role('table').description("审核配置<br>左侧写需要审核功能的指令名称（即触发审核的输入前缀，若有指令前缀，需要带指令前缀）<br>右侧写审核不通过返回的文本提示<br>").default(
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
        }
      ]
    ),
    Return_Audit_Result_true: Schema.boolean().default(false).description('返回发送`审核通过`的文字提示 `不影响审核功能`'),
    Return_Audit_Result_false: Schema.boolean().default(true).description('返回发送`审核不通过`的文字提示 `不影响审核功能`'),
  }).description('基础设置'),
  Schema.object({
    Audit_Vocabulary_txt: Schema.boolean().default(true).description('启用自带的 [Vocabulary 词库](https://github.com/konsheng/Sensitive-lexicon)<br>关闭后仅使用下面配置项的内容'),
    Blacklist_input: Schema.array(String).role('table').default(Blacklist_input_default).description('关键词黑名单（优先）<br>对于一些额外的违禁词屏蔽'),
    Whitelist_input: Schema.array(String).role('table').default(Whitelist_input_default).description('关键词白名单<br>对于一些不合逻辑的关键词的取消屏蔽<br>若同时包含黑名单关键词，则视为违规输入'),
  }).description('违禁词调整设置'),
  Schema.object({
    removeLeadingBrackets: Schema.boolean().default(true).description('忽略处理尖括号内的元素 （忽略at、忽略图片 等）'),
    loggerinfo: Schema.boolean().default(false).description('日志调试模式')
  }).description('调试设置'),
]);

function apply(ctx, config) {
  function logInfo(message) {
    if (config.loggerinfo) {
      logger.info(message);
    }
  }

  const removeLeadingBrackets = (str) => {
    const bracketRegex = /^<[^>]*>\s*/;
    return str.replace(bracketRegex, '').trim();
  };
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

  async function auditText(text, vocabulary, whitelist, blacklist) {
    // 检查黑名单
    for (const word of blacklist) {
      if (text.includes(word)) {
        logInfo(`匹配到黑名单词汇: ${word}`);
        return { result: false, matchedWord: word };
      }
    }

    // 检查白名单
    for (const word of whitelist) {
      if (text.includes(word)) {
        return { result: true }; // 白名单词汇直接通过
      }
    }

    // 检查违禁词
    for (const entry of vocabulary) {
      if (text.includes(entry)) {
        logInfo(`匹配到违禁词: 内容: ${entry}`);
        return { result: false, matchedWord: entry };
      }
    }

    return { result: true }; // 通过
  }

  ctx.middleware(async (session, next) => {
    if (!config.Audit) {
      return next(); // 如果审核功能未开启，直接通过消息
    }

    let { content } = session;
    let anothercontent = content.trim().toLowerCase();

    if (config.removeLeadingBrackets) {
      anothercontent = removeLeadingBrackets(content);
    }

    const commandConfig = config.Audit_Configuration2.find(item => anothercontent.startsWith(item.commandname));

    if (!commandConfig || commandConfig.Audit_value1 === '关闭审核') {
      return next(); // 如果不需要审核的指令，或审核关闭，直接通过消息
    }

    logInfo(`用户输入内容为\n${anothercontent}`);

    const vocabulary = await loadVocabulary();
    const whitelist = config.Whitelist_input;
    const blacklist = config.Blacklist_input;

    const auditResult = await auditText(anothercontent, vocabulary, whitelist, blacklist);

    if (auditResult.result) {
      if (config.Return_Audit_Result_true) {
        await session.send(h.text('审核通过'));
      }
      logInfo(`审核通过`);
      return next(); // 通过消息，允许处理
    } else {
      if (commandConfig.Audit_value1 === '仅替换关键词为 *** ，允许执行原指令逻辑') {
        anothercontent = anothercontent.replace(new RegExp(auditResult.matchedWord, 'g'), '***');
        logInfo(`关键词已替换为 ***`);
        session.content = anothercontent; // 更新会话内容
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
