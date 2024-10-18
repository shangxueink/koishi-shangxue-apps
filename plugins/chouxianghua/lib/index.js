"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.inject = exports.name = void 0;
const { Schema, Logger } = require("koishi");
const logger = new Logger('chouxianghua');

const pinyin = require('./pinyin');
const emoji = require('./emoji');

exports.name = "chouxianghua";
exports.usage = `
使用方法:
- 抽象话 <内容>: 将内容转换为抽象话。
- 还原抽象话到拼音 <内容>: 将抽象话还原为拼音。
`;

exports.Config = Schema.intersect([
    Schema.object({
        loggerinfo: Schema.boolean().default(true).description("日志调试模式"),
    }).description('基础设置'),
]);

async function apply(ctx, config) {
    // 抽象话
    ctx.command("抽象话 <text:text>", "将输入的内容转换为抽象话")
        .example('抽象话 需要被抽象的话语')
        .action(async ({ session }, text) => {
            if (!text) return "请输入需要转换的内容。";
            return toAbstractLanguage(text);
        });

    // 还原抽象话到拼音
    ctx.command("还原抽象话到拼音 <text:text>", "将抽象话还原为拼音")
        .alias("还原抽象话")
        .example('还原抽象话 🤝‍🎼👇说💦🐵🤡🐘🅰')
        .action(async ({ session }, text) => {
            if (!text) return "请输入需要还原的抽象话。";
            return fromAbstractLanguageToPinyin(text);
        });
}

// 获取字符的拼音
function getPinyin(char) {
    return pinyin[char] || char; // 如果没有拼音映射，返回原字符
}

// 将文本转换为抽象话
function toAbstractLanguage(text) {
    let result = "";
    for (let char of text) {
        const charPinyin = getPinyin(char);
        if (emoji[charPinyin]) {
            result += emoji[charPinyin]; // 转换为emoji
        } else {
            result += char; // 如果没有对应的表情，保留原字符
        }
    }
    return result;
}

// 根据表情符号获取可能的拼音
function rawPinyin(emojiChar) {
    let possiblePinyins = [];
    for (let key in emoji) {
        if (emoji[key] === emojiChar) {
            possiblePinyins.push(key); // 找到对应的拼音
        }
    }
    return possiblePinyins.length > 0 ? possiblePinyins.join("/") : emojiChar; // 如果有多个拼音，用 "/" 分隔；否则返回原字符
}

// 将抽象话还原为拼音，拼音用 "-" 分隔
function fromAbstractLanguageToPinyin(text) {
    let result = [];
    for (let char of text) {
        let pinyinResult = rawPinyin(char);
        result.push(pinyinResult);
    }
    return result.join("-"); // 用 "-" 分隔拼音
}

exports.apply = apply;
