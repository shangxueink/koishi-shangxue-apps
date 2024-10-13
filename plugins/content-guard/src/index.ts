import { Context, Schema, Logger, h, Session } from 'koishi';
import fs from 'fs';
import path from 'path';

export const name = 'content-guard';

const logger = new Logger('content-guard');

export const usage = `
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

interface AuditConfig {
  Audit: boolean;
  Audit_Configuration: Record<string, string>;
  Return_Audit_Result_true: boolean;
  Return_Audit_Result_false: boolean;
  Whitelist_input: string[];
  Blacklist_input: string[];
  removeLeadingBrackets: boolean;
  loggerinfo: boolean;
}

const Audit_Configuration_default: Record<string, string> = {
  "/say": "输入文本违规，不予调用。",
  "say": "输入文本违规，不予调用。",
  "/绘画": "输入文本违规，不予调用。",
  "绘画": "输入文本违规，不予调用。"
};

const Whitelist_input_default: string[] = ["4"];

const Blacklist_input_default: string[] = ["牛魔", "啊米诺斯"];

export const Config: Schema<AuditConfig> = Schema.intersect([
  Schema.object({
    Audit: Schema.boolean().default(true).description('确认开启审核（开启后，本插件生效）'),
    Audit_Configuration: Schema.dict(String).description("审核配置<br>---------<br>左侧写需要审核功能的指令名称（即触发审核的输入前缀，若有指令前缀，需要带指令前缀）<br>右侧写审核不通过返回的文本提示<br>---------").default(Audit_Configuration_default),
    Return_Audit_Result_true: Schema.boolean().default(false).description('返回发送`审核通过`的文字提示 `不影响审核功能`'),
    Return_Audit_Result_false: Schema.boolean().default(true).description('返回发送`审核不通过`的文字提示 `不影响审核功能`'),
  }).description('基础设置'),
  Schema.object({
    Whitelist_input: Schema.array(String).role('table').default(Whitelist_input_default).description('关键词白名单<br>对于一些不合逻辑的关键词的取消屏蔽'),
    Blacklist_input: Schema.array(String).role('table').default(Blacklist_input_default).description('关键词黑名单<br>对于一些额外的违禁词屏蔽'),
  }).description('违禁词调整设置'),
  Schema.object({
    removeLeadingBrackets: Schema.boolean().default(true).description('忽略处理尖括号内的元素 （忽略at、忽略图片 等）'),
    loggerinfo: Schema.boolean().default(false).description('日志调试模式')
  }).description('调试设置'),
]);

export function apply(ctx: Context, config: AuditConfig) {
  function logInfo(message: string) {
    if (config.loggerinfo) {
      logger.info(message);
    }
  }

  function removeLeadingBrackets(content: string): string {
    return content.replace(/<.*?>/g, '');
  }

  async function loadVocabulary(): Promise<{ word: string; file: string; line: number }[]> {
    const vocabPath = path.join(__dirname, 'Vocabulary');
    const files = fs.readdirSync(vocabPath);
    let vocabulary: { word: string; file: string; line: number }[] = [];

    for (const file of files) {
      const filePath = path.join(vocabPath, file);
      const data = fs.readFileSync(filePath, 'utf8');
      const words = data.split('\n').map((word, index) => ({ word: word.trim(), file, line: index + 1 })).filter(entry => entry.word);
      vocabulary.push(...words);
    }

    return vocabulary;
  }

  async function auditText(text: string, vocabulary: { word: string; file: string; line: number }[], whitelist: string[], blacklist: string[]): Promise<boolean> {
    // 先检查黑名单
    for (const word of blacklist) {
      if (text.includes(word)) {
        logInfo(`匹配到黑名单词汇: ${word}`);
        return false; // 如果包含黑名单中的任意一个词，直接审核不通过
      }
    }
    // 再检查白名单
    for (const word of whitelist) {
      if (text.includes(word)) {
        return true; // 如果包含白名单中的任意一个词，直接通过审核
      }
    }
    // 最后检查违禁词库
    for (const entry of vocabulary) {
      if (text === entry.word || text.includes(entry.word)) { // 完全包含或者等同
        logInfo(`匹配到违禁词: 文件: ${entry.file}, 行: ${entry.line}, 内容: ${entry.word}`);
        return false;
      }
    }
    return true;
  }

  ctx.middleware(async (session: Session, next) => {
    if (!config.Audit) {
      return next(); // 如果审核功能未开启，直接通过消息
    }

    let { content } = session;
    let anothercontent = content.trim().toLowerCase();

    if (config.removeLeadingBrackets) {
      anothercontent = removeLeadingBrackets(content);
    }

    // 检查是否需要审核
    const commandPrefix = Object.keys(config.Audit_Configuration).find(prefix => anothercontent.startsWith(prefix));

    if (!commandPrefix) {
      return next(); // 如果不需要审核的指令，直接通过消息
    }

    logInfo(`用户输入内容为\n${anothercontent}`);

    const vocabulary = await loadVocabulary();
    const whitelist = config.Whitelist_input;
    const blacklist = config.Blacklist_input;
    const auditResult = await auditText(anothercontent, vocabulary, whitelist, blacklist);

    if (auditResult) {
      if (config.Return_Audit_Result_true) {
        await session.send(h.text('审核通过'));
      }
      logInfo(`审核通过`);
      return next(); // 通过消息，允许处理
    } else {
      if (config.Return_Audit_Result_false) {
        const auditResponse = config.Audit_Configuration[commandPrefix] || '输入文本违规，不予调用。';
        await session.send(h.text(auditResponse));
      }
      logInfo(`输入文本违规，不予调用。`);
      return; // 屏蔽消息
    }

  }, true /* true 表示这是前置中间件 */);
}
