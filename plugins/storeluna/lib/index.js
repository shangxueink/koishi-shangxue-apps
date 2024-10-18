var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(src_exports);

// src/filter.ts
var fs = __toESM(require("node:fs/promises"));
var path = __toESM(require("node:path"));
var import_yaml = require("yaml");
async function readFilterRule(baseDir) {
  const ymlDir = path.join(baseDir, "data", "storeluna");
  const ymlPath = path.join(ymlDir, "filterrule.yaml");
  const resourcesPath = path.join(baseDir, "node_modules", "koishi-plugin-storeluna", "lib");
  await fs.mkdir(ymlDir, { recursive: true });
  if (!await fs.access(ymlPath).then(() => true).catch(() => false)) {
    await fs.copyFile(path.join(resourcesPath, "defaultfilterrule.yaml"), ymlPath);
  }
  const data = await fs.readFile(ymlPath, "utf-8");
  const filterRule = (0, import_yaml.parse)(data);
  return filterRule;
}
__name(readFilterRule, "readFilterRule");
function SearchFilter(data, config, rule) {
  let filtered = [];
  if (config.filterUnsafe) {
    data.objects = data.objects.filter((item) => {
      if (item.insecure) {
        filtered.push(item);
        return false;
      }
      return true;
    });
  }
  if (config.filterRule) {
    data.objects = data.objects.filter((item) => {
      if (rule.blacklist.shortname.includes(item.shortname)) {
        filtered.push(item);
        return false;
      }
      return true;
    });
  }
  filtered.forEach((item) => {
    if (rule.writelist.shortname.includes(item.shortname)) {
      data.objects.push(item);
    }
  });
  data.objects.push;
  return data;
}
__name(SearchFilter, "SearchFilter");

// src/config.ts
var import_koishi = require("koishi");
var Config = import_koishi.Schema.object({
  upstream: import_koishi.Schema.string().default("https://registry.koishi.chat/index.json").description("上游市场源地址"),
  path: import_koishi.Schema.string().default("/server/storeluna").description("监听路径"),
  time: import_koishi.Schema.number().default(60).description("同步上游间隔时间"),
  filterRule: import_koishi.Schema.boolean().default(false).description("规则屏蔽功能"),
  filterUnsafe: import_koishi.Schema.boolean().default(false).description("过滤不安全插件")
});

// src/index.ts
var name = "storeluna";
var inject = {
  required: ["server"]
};
async function apply(ctx, config) {
  const upstream = config.upstream;
  const serverPath = config.path;
  const time = config.time;
  const logger = ctx.logger("storeluna");
  const filterRule = await readFilterRule(ctx.baseDir);
  if (ctx.server) {
    logger.info(`同步上游: ${upstream}`);
    let data = await getFromUpstream(ctx, upstream);
    data = SearchFilter(data, config, filterRule);
    ctx.setInterval(async () => {
      const response = await getFromUpstream(ctx, upstream);
      if (response) {
        data = data = SearchFilter(response, config, filterRule);
        logger.info(`同步成功: ${upstream}`);
      } else {
        logger.warn(`同步失败: ${upstream}`);
      }
    }, time * 1e3);
    try {
      ctx.server["get"](serverPath, (ctx2) => {
        ctx2.set("Content-Type", "application/json");
        ctx2.status = 200;
        ctx2.body = data;
      });
      logger.info(`监听路径: ${serverPath}`);
    } catch (error) {
      logger.error(error);
    }
    ctx.on("dispose", () => {
      ctx.loader.fullReload();
    });
  }
}
__name(apply, "apply");
async function getFromUpstream(ctx, upstream) {
  try {
    const response = await ctx.http.get(upstream);
    return response;
  } catch (error) {
    ctx.logger("storeluna").error(error);
  }
}
__name(getFromUpstream, "getFromUpstream");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name
});
