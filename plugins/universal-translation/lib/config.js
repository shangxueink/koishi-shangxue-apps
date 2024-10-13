"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const koishi_1 = require("koishi");
exports.Config = koishi_1.Schema.object({
    defaultTargetLang: koishi_1.Schema.string()
        .description("默认的目标语言代码（例如 'en', 'zh', 'ja' 等）")
        .default("en")
});
