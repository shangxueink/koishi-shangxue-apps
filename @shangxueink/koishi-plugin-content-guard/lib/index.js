var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  apply: () => apply,
  name: () => name,
  usage: () => usage
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var name = "content-guard";
var logger = new import_koishi.Logger("content-guard");
var usage = `
---

## 违禁词库

违禁词库来自 [Sensitive-lexicon](https://github.com/konsheng/Sensitive-lexicon)。

感谢该项目提供的违禁词资源。

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
var Audit_Configuration_default = {
  "/say": "输入文本违规，不予调用。",
  "say": "输入文本违规，不予调用。",
  "/绘画": "输入文本违规，不予调用。",
  "绘画": "输入文本违规，不予调用。"
};
var Whitelist_input_default = ["4"];
var Blacklist_input_default = ["牛魔", "啊米诺斯"];
var Config = import_koishi.Schema.intersect([
  import_koishi.Schema.object({
    Audit: import_koishi.Schema.boolean().default(true).description("确认开启审核（开启后，本插件生效）"),
    Audit_Configuration: import_koishi.Schema.dict(String).description("审核配置<br>---------<br>左侧写需要审核功能的指令名称（即触发审核的输入前缀，若有指令前缀，需要带指令前缀）<br>右侧写审核不通过返回的文本提示<br>---------").default(Audit_Configuration_default),
    Return_Audit_Result_true: import_koishi.Schema.boolean().default(false).description("返回发送`审核通过`的文字提示 `不影响审核功能`"),
    Return_Audit_Result_false: import_koishi.Schema.boolean().default(true).description("返回发送`审核不通过`的文字提示 `不影响审核功能`")
  }).description("基础设置"),
  import_koishi.Schema.object({
    Whitelist_input: import_koishi.Schema.array(String).role("table").default(Whitelist_input_default).description("关键词白名单<br>对于一些不合逻辑的关键词的取消屏蔽"),
    Blacklist_input: import_koishi.Schema.array(String).role("table").default(Blacklist_input_default).description("关键词黑名单<br>对于一些额外的违禁词屏蔽")
  }).description("违禁词调整设置"),
  import_koishi.Schema.object({
    removeLeadingBrackets: import_koishi.Schema.boolean().default(true).description("忽略处理尖括号内的元素 （忽略at、忽略图片 等）"),
    loggerinfo: import_koishi.Schema.boolean().default(false).description("日志调试模式")
  }).description("调试设置")
]);
function apply(ctx, config) {
  function logInfo(message) {
    if (config.loggerinfo) {
      logger.info(message);
    }
  }
  __name(logInfo, "logInfo");
  function removeLeadingBrackets(content) {
    return content.replace(/<.*?>/g, "");
  }
  __name(removeLeadingBrackets, "removeLeadingBrackets");
  async function loadVocabulary() {
    const vocabPath = import_path.default.join(__dirname, "Vocabulary");
    const files = import_fs.default.readdirSync(vocabPath);
    let vocabulary = [];
    for (const file of files) {
      const filePath = import_path.default.join(vocabPath, file);
      const data = import_fs.default.readFileSync(filePath, "utf8");
      const words = data.split("\n").map((word, index) => ({ word: word.trim(), file, line: index + 1 })).filter((entry) => entry.word);
      vocabulary.push(...words);
    }
    return vocabulary;
  }
  __name(loadVocabulary, "loadVocabulary");
  async function auditText(text, vocabulary, whitelist, blacklist) {
    for (const word of blacklist) {
      if (text.includes(word)) {
        logInfo(`匹配到黑名单词汇: ${word}`);
        return false;
      }
    }
    for (const word of whitelist) {
      if (text.includes(word)) {
        return true;
      }
    }
    for (const entry of vocabulary) {
      if (text === entry.word || text.includes(entry.word)) {
        logInfo(`匹配到违禁词: 文件: ${entry.file}, 行: ${entry.line}, 内容: ${entry.word}`);
        return false;
      }
    }
    return true;
  }
  __name(auditText, "auditText");
  ctx.middleware(
    async (session, next) => {
      if (!config.Audit) {
        return next();
      }
      let { content } = session;
      let anothercontent = content.trim().toLowerCase();
      if (config.removeLeadingBrackets) {
        anothercontent = removeLeadingBrackets(content);
      }
      const commandPrefix = Object.keys(config.Audit_Configuration).find((prefix) => anothercontent.startsWith(prefix));
      if (!commandPrefix) {
        return next();
      }
      logInfo(`用户输入内容为
${anothercontent}`);
      const vocabulary = await loadVocabulary();
      const whitelist = config.Whitelist_input;
      const blacklist = config.Blacklist_input;
      const auditResult = await auditText(anothercontent, vocabulary, whitelist, blacklist);
      if (auditResult) {
        if (config.Return_Audit_Result_true) {
          await session.send(import_koishi.h.text("审核通过"));
        }
        logInfo(`审核通过`);
        return next();
      } else {
        if (config.Return_Audit_Result_false) {
          const auditResponse = config.Audit_Configuration[commandPrefix] || "输入文本违规，不予调用。";
          await session.send(import_koishi.h.text(auditResponse));
        }
        logInfo(`输入文本违规，不予调用。`);
        return;
      }
    },
    true
    /* true 表示这是前置中间件 */
  );
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  name,
  usage
});
