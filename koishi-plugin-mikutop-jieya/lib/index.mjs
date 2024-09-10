var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// external/webui/external/iframe/src/index.ts
import { Schema } from "koishi";
import { DataService } from "@koishijs/plugin-console";
import { resolve } from "path";
var IFrameService = class extends DataService {
  constructor(ctx, config) {
    super(ctx, "iframe");
    this.config = config;
    ctx.console.addEntry(process.env.KOISHI_BASE ? [
      process.env.KOISHI_BASE + "/dist/index.js",
      process.env.KOISHI_BASE + "/dist/style.css"
    ] : process.env.KOISHI_ENV === "browser" ? [
      // @ts-ignore
      import.meta.url.replace(/\/src\/[^/]+$/, "/client/index.ts")
    ] : {
      dev: resolve(__dirname, "../client/index.ts"),
      prod: resolve(__dirname, "../dist")
    });
  }
  static {
    __name(this, "IFrameService");
  }
  async get(forced) {
    return this.config.routes;
  }
};
((IFrameService2) => {
  IFrameService2.Route = Schema.object({
    name: Schema.string().required().description("页面标题。"),
    desc: Schema.string().description("页面描述。"),
    path: Schema.string().required().description("页面所占据的路由。"),
    link: Schema.string().required().description("页面要访问的网络链接。"),
    order: Schema.number().default(0).description("页面在活动栏中显示的优先级。")
  });
  IFrameService2.Config = Schema.object({
    routes: Schema.array(IFrameService2.Route)
  });
})(IFrameService || (IFrameService = {}));
var src_default = IFrameService;
export {
  src_default as default
};
//# sourceMappingURL=index.mjs.map
