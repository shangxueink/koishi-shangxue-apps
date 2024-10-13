"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniversalTranslation = void 0;
const translator_1 = __importDefault(require("./translator"));
class UniversalTranslation extends translator_1.default {
    async translate(options) {
        const q = options.input;
        const to = options.target || 'zh';
        const url = [
            `https://api.jaxing.cc/v2/Translate/Tencent?SourceText=${(q)}&Target=${to}`,
            `https://translate.cloudflare.jaxing.cc/?text=${(q)}&source_lang=zh&target_lang=${to}`
        ];
        for (const getUrl of url) {
            try {
                const responseData = await this.ctx.http.get(getUrl);
                return responseData.data?.Response?.TargetText
                    || responseData.response?.translated_text;
            }
            catch (error) {
                this.logger.error(`API request failed for ${getUrl}: ${error.message}`);
            }
        }
    }
}
exports.UniversalTranslation = UniversalTranslation;
