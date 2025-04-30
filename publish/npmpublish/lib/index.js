var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/locales/zh.yml
var require_zh = __commonJS({
  "src/locales/zh.yml"(exports2, module2) {
    module2.exports = { commands: { qrcode: { description: "生成二维码", options: { margin: "边界尺寸", scale: "缩放比例", width: "图片大小", dark: "暗部颜色", light: "亮部颜色" }, messages: { "expect-text": "请输入源文本。", "invalid-segment": "禁止输入纯文本以外的内容。" } } } };
  }
});

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  apply: () => apply,
  name: () => name,
  qrcode: () => qrcode,
  usage: () => usage
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var import_qrcode = require("qrcode");
var name = "qrcode-service-null";
var Config = import_koishi.Schema.object({
  enablecommand: import_koishi.Schema.boolean().default(false).description("是否注册qrcode指令")
});
var usage = `
为koishi通过二维码生成服务

[使用方法请见readme](https://www.npmjs.com/package/koishi-plugin-qrcode-service-null)

`;
var qrcode = class extends import_koishi.Service {
  static {
    __name(this, "qrcode");
  }
  constructor(ctx) {
    super(ctx, "qrcode");
  }
  async generateQRCode(text, options) {
    const { margin, scale, width, dark, light } = options;
    const dataURL = await (0, import_qrcode.toDataURL)(text, { margin, scale, width, color: { dark, light } });
    return import_koishi.h.image(dataURL).toString();
  }
};
function apply(ctx, config) {
  ctx.plugin(qrcode);
  if (config.enablecommand) {
    ctx.i18n.define("zh", require_zh());
    ctx.command("qrcode <text:string>", "生成二维码").option("margin", "-m <margin:number>", { fallback: 4 }).option("scale", "-s <scale:number>", { fallback: 4 }).option("width", "-w <width:number>").option("dark", "-d <color:string>").option("light", "-l <color:string>").action(async ({ options, session }, text) => {
      if (!text) return session.text(".expect-text");
      if (text.includes("[CQ:")) return session.text(".invalid-segment");
      const image = await ctx.qrcode.generateQRCode(text, options);
      return image;
    });
  }
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  name,
  qrcode,
  usage
});
