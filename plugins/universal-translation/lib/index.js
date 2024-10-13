"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.name = exports.languageMap = void 0;
const service_1 = require("./service");
exports.languageMap = require('./languageMap.json');
__exportStar(require("./config"), exports);
exports.name = 'universal-translation';
function apply(ctx, config) {
    const translation = new service_1.UniversalTranslation(ctx, config);
    ctx.command("universal-translation <text:text>", "翻译命令")
        .option('to', '-t [language] 指定翻译的目标语言', { fallback: config.defaultTargetLang })
        .action(async ({ options }, text) => {
        if (!text) {
            return '请输入要翻译的文本...';
        }
        const to = options.to
            ? (exports.languageMap[options.to] || options.to)
            : config.defaultTargetLang;
        const result = await translation.translate({
            input: text,
            target: to
        });
        return result;
    });
    ctx.command('universal-translation/语言代码对照表')
        .action(async () => {
        return '注意：并不是所列语言均支持翻译，此表仅供参考语言代码\n对照表请见这里【http://www.lingoes.cn/zh/translator/langcode.htm】';
    });
}
exports.apply = apply;
