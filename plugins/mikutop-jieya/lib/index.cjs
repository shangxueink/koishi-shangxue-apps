var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
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

// external/webui/external/iframe/src/index.ts
var src_exports = {};
__export(src_exports, {
  default: () => src_default
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var import_plugin_console = require("@koishijs/plugin-console");
var import_path = require("path");
var import_meta = {};
var _IFrameService = class _IFrameService extends import_plugin_console.DataService {
  constructor(ctx) {
  super(ctx, "iframe");

  // 直接定义固定的路由信息
  this.routes = [{
    name: "初音解压",
    desc: "", // 留空
    path: "/miku",
    link: "https://mikutap.mikuforever.com/",
    order: 0 // 默认值
  }];
    ctx.console.addEntry(process.env.KOISHI_BASE ? [
      process.env.KOISHI_BASE + "/dist/index.js",
      process.env.KOISHI_BASE + "/dist/style.css"
    ] : process.env.KOISHI_ENV === "browser" ? [
      // @ts-ignore
      import_meta.url.replace(/\/src\/[^/]+$/, "/client/index.ts")
    ] : {
      dev: (0, import_path.resolve)(__dirname, "../client/index.ts"),
      prod: (0, import_path.resolve)(__dirname, "../dist")
    });
  }
  async get(forced) {
    // 直接返回定义的路由信息
    return this.routes;
    }
  };
  __name(_IFrameService, "IFrameService");
  var IFrameService = _IFrameService;
  
  var src_default = IFrameService;
  //# sourceMappingURL=index.cjs.map