"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const koishi_1 = require("koishi");
class Translator extends koishi_1.Service {
    config;
    constructor(ctx, config) {
        super(ctx, 'translator', true);
        this.config = config;
    }
}
exports.default = Translator;
