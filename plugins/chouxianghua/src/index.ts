import { Context, Schema } from "koishi";
import pinyinData from "../data/pinyin.json";
import emojiData from "../data/emoji.json";

export const name = "chouxianghua";

export const usage = `
---

使用方法:
- 抽象话 <内容>: 将内容转换为抽象话。
- 还原抽象话到拼音 <内容>: 将抽象话还原为拼音。

---
`;

export interface PinyinMap {
  [char: string]: string;
}

export interface EmojiMap {
  [pinyin: string]: string;
}

export interface Config {
  commandname: string;
  commandname2: string;
  loggerinfo: boolean;
}

export const Config = Schema.intersect([
  Schema.object({
    commandname: Schema.string().default("抽象话").description("抽象话命令名称"),
    commandname2: Schema.string().default("还原抽象话").description("还原抽象话命令名称"),
    loggerinfo: Schema.boolean().default(true).description("日志调试模式").hidden(),
  }).description('基础设置'),
]);

const pinyin = pinyinData as PinyinMap;
const emoji = emojiData as EmojiMap;

export function apply(ctx: Context, config: Config) {
  ctx.command(`${config.commandname} <text:text>`, "将输入的内容转换为抽象话")
    .example('抽象话 需要被抽象的话语')
    .action(async ({ session }, text) => {
      if (!text) return "请输入需要转换的内容。";
      return toAbstractLanguage(text);
    });

  ctx.command(`${config.commandname2} <text:text>`, "将抽象话还原为拼音")
    .alias("还原抽象话")
    .example('还原抽象话 🤝‍🎼👇说💦🐵🤡🐘🅰')
    .action(async ({ session }, text) => {
      if (!text) return "请输入需要还原的抽象话。";
      return fromAbstractLanguageToPinyin(text);
    });

  function getPinyin(char: string): string {
    return pinyin[char] || char;
  }

  function toAbstractLanguage(text: string): string {
    let result = "";
    for (let char of text) {
      const charPinyin = getPinyin(char);
      if (emoji[charPinyin]) {
        result += emoji[charPinyin];
      } else {
        result += char;
      }
    }
    return result;
  }

  function rawPinyin(emojiChar: string): string {
    let possiblePinyins: string[] = [];
    for (let key in emoji) {
      if (emoji[key] === emojiChar) {
        possiblePinyins.push(key);
      }
    }
    return possiblePinyins.length > 0 ? possiblePinyins.join("/") : emojiChar;
  }

  function fromAbstractLanguageToPinyin(text: string): string {
    let result: string[] = [];
    for (let char of text) {
      let pinyinResult = rawPinyin(char);
      result.push(pinyinResult);
    }
    return result.join("-");
  }
}