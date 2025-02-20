//./node_modules/@koishijs/plugin-market/lib/node/index.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/node/locales/schema.zh-CN.yml
var require_schema_zh_CN = __commonJS({
  "src/node/locales/schema.zh-CN.yml"(exports2, module2) {
    module2.exports = { registry: { $description: "插件源设置", endpoint: "插件的下载源。默认跟随当前项目的 npm config。", timeout: "获取插件数据的超时时间。" }, search: { $description: "搜索设置", endpoint: "用于搜索插件市场的网址。默认跟随插件源设置。", timeout: "搜索插件市场的超时时间。", proxyAgent: "用于搜索插件市场的代理。" } };
  }
});

// src/node/locales/message.zh-CN.yml
var require_message_zh_CN = __commonJS({
  "src/node/locales/message.zh-CN.yml"(exports2, module2) {
    module2.exports = { "commands.plugin": { description: "插件管理" }, "commands.plugin.install": { description: "安装插件", messages: { "expect-name": "请输入插件名。", "already-installed": "该插件已安装。", "not-found": "未找到该插件。", success: "安装成功！" } }, "commands.plugin.uninstall": { description: "卸载插件", messages: { "expect-name": "请输入插件名。", "not-installed": "该插件未安装。", success: "卸载成功！" } }, "commands.plugin.upgrade": { description: "升级插件", options: { self: "升级 Koishi 本体" }, messages: { "all-updated": "所有插件已是最新版本。", available: "有可用的依赖更新：", prompt: "输入「Y」升级全部依赖，输入「N」取消操作。", cancelled: "已取消操作。", success: "升级成功！" } } };
  }
});

// src/node/index.ts
var node_exports = {};
__export(node_exports, {
  Config: () => Config,
  Installer: () => installer_default,
  apply: () => apply,
  inject: () => inject,
  name: () => name,
  usage: () => usage
});
module.exports = __toCommonJS(node_exports);
var import_koishi3 = require("koishi");
var import_semver2 = require("semver");
var import_path2 = require("path");
var import_fs = require("node:fs/promises"); 
var import_path = require("node:path"); 
var import_url = require("node:url"); 

// src/node/deps.ts
var import_console = require("@koishijs/console");
var DependencyProvider = class extends import_console.DataService {
  constructor(ctx) {
    super(ctx, "dependencies", { authority: 4 });
    this.ctx = ctx;
  }
  static {
    __name(this, "DependencyProvider");
  }
  async get() {
    return this.ctx.installer.getDeps();
  }
};
var RegistryProvider = class extends import_console.DataService {
  constructor(ctx) {
    super(ctx, "registry", { authority: 4 });
    this.ctx = ctx;
  }
  static {
    __name(this, "RegistryProvider");
  }
  async get() {
    return this.ctx.installer.fullCache;
  }
};

// src/node/installer.ts
var import_koishi = require("koishi");
var import_registry = __toESM(require("@koishijs/registry"));
var import_path = require("path");
var import_fs = require("fs");
var import_semver = require("semver");
var import_get_registry = __toESM(require("get-registry"));
var import_which_pm_runs = __toESM(require("which-pm-runs"));
var import_execa = __toESM(require("execa"));
var import_p_map = __toESM(require("p-map"));
var logger = new import_koishi.Logger("market");
var levelMap = {
  "info": "info",
  "warning": "debug",
  "error": "warn"
};
function loadManifest(name2) {
  const filename = require.resolve(name2 + "/package.json");
  const meta = JSON.parse((0, import_fs.readFileSync)(filename, "utf8"));
  meta.dependencies ||= {};
  (0, import_koishi.defineProperty)(meta, "$workspace", !filename.includes("node_modules"));
  return meta;
}
__name(loadManifest, "loadManifest");
function getVersions(versions) {
  return Object.fromEntries(versions.map((item) => [item.version, (0, import_koishi.pick)(item, ["peerDependencies", "peerDependenciesMeta", "deprecated"])]).sort(([a], [b]) => (0, import_semver.compare)(b, a)));
}
__name(getVersions, "getVersions");
var Installer = class extends import_koishi.Service {
  constructor(ctx, config) {
    super(ctx, "installer");
    this.ctx = ctx;
    this.config = config;
    this.manifest = loadManifest(this.cwd);
    this.flushData = ctx.throttle(() => {
      ctx.get("console")?.broadcast("market/registry", this.tempCache);
      this.tempCache = {};
    }, 500);
  }
  static {
    __name(this, "Installer");
  }
  http;
  endpoint;
  fullCache = {};
  tempCache = {};
  pkgTasks = {};
  agent = (0, import_which_pm_runs.default)();
  manifest;
  depTask;
  flushData;
  get cwd() {
    return this.ctx.baseDir;
  }
  async start() {
    const { endpoint, timeout } = this.config;
    this.endpoint = endpoint || await (0, import_get_registry.default)();
    this.http = this.ctx.http.extend({
      endpoint: this.endpoint,
      timeout
    });
  }
  resolveName(name2) {
    if (name2.startsWith("@koishijs/plugin-")) return [name2];
    if (name2.match(/(^|\/)koishi-plugin-/)) return [name2];
    if (name2[0] === "@") {
      const [left, right] = name2.split("/");
      return [`${left}/koishi-plugin-${right}`];
    } else {
      return [`@koishijs/plugin-${name2}`, `koishi-plugin-${name2}`];
    }
  }
  async findVersion(names) {
    const entries = await Promise.all(names.map(async (name2) => {
      try {
        const versions = Object.entries(await this.getPackage(name2));
        if (!versions.length) return;
        return { [name2]: versions[0][0] };
      } catch (e) {
      }
    }));
    return entries.find(Boolean);
  }
  async _getPackage(name2) {
    try {
      const registry = await this.http.get(`/${name2}`);
      this.fullCache[name2] = this.tempCache[name2] = getVersions(Object.values(registry.versions).filter((remote) => {
        return !import_registry.default.isPlugin(name2) || import_registry.default.isCompatible("4", remote);
      }));
      this.flushData();
      return this.fullCache[name2];
    } catch (e) {
      logger.warn(e.message);
    }
  }
  setPackage(name2, versions) {
    this.fullCache[name2] = this.tempCache[name2] = getVersions(versions);
    this.flushData();
    this.pkgTasks[name2] = Promise.resolve(this.fullCache[name2]);
  }
  getPackage(name2) {
    return this.pkgTasks[name2] ||= this._getPackage(name2);
  }
  async _getDeps() {
    const result = (0, import_koishi.valueMap)(this.manifest.dependencies, (request) => {
      return { request: request.replace(/^[~^]/, "") };
    });
    await (0, import_p_map.default)(Object.keys(result), async (name2) => {
      try {
        const meta = loadManifest(name2);
        result[name2].resolved = meta.version;
        result[name2].workspace = meta.$workspace;
        if (meta.$workspace) return;
      } catch {
      }
      if (!(0, import_semver.valid)(result[name2].request)) {
        result[name2].invalid = true;
      }
      const versions = await this.getPackage(name2);
      if (versions) result[name2].latest = Object.keys(versions)[0];
    }, { concurrency: 10 });
    return result;
  }
  getDeps() {
    return this.depTask ||= this._getDeps();
  }
  refreshData() {
    this.ctx.get("console")?.refresh("registry");
    this.ctx.get("console")?.refresh("packages");
  }
  refresh(refresh = false) {
    this.pkgTasks = {};
    this.fullCache = {};
    this.tempCache = {};
    this.depTask = this._getDeps();
    if (!refresh) return;
    this.refreshData();
  }
  async exec(args) {
    const name2 = this.agent?.name ?? "npm";
    const useJson = name2 === "yarn" && this.agent.version >= "2";
    if (name2 !== "yarn") args.unshift("install");
    return new Promise((resolve3) => {
      if (useJson) args.push("--json");
      const child = (0, import_execa.default)(name2, args, { cwd: this.cwd });
      child.on("exit", (code) => resolve3(code));
      child.on("error", () => resolve3(-1));
      let stderr = "";
      child.stderr.on("data", (data) => {
        data = stderr + data.toString();
        const lines = data.split("\n");
        stderr = lines.pop();
        for (const line of lines) {
          logger.warn(line);
        }
      });
      let stdout = "";
      child.stdout.on("data", (data) => {
        data = stdout + data.toString();
        const lines = data.split("\n");
        stdout = lines.pop();
        for (const line of lines) {
          if (!useJson || line[0] !== "{") {
            logger.info(line);
            continue;
          }
          try {
            const { type, data: data2 } = JSON.parse(line);
            logger[levelMap[type] ?? "info"](data2);
          } catch (error) {
            logger.warn(line);
            logger.warn(error);
          }
        }
      });
    });
  }
  async override(deps) {
    const filename = (0, import_path.resolve)(this.cwd, "package.json");
    for (const key in deps) {
      if (deps[key]) {
        this.manifest.dependencies[key] = deps[key];
      } else {
        delete this.manifest.dependencies[key];
      }
    }
    this.manifest.dependencies = Object.fromEntries(Object.entries(this.manifest.dependencies).sort((a, b) => a[0].localeCompare(b[0])));
    await import_fs.promises.writeFile(filename, JSON.stringify(this.manifest, null, 2) + "\n");
  }
  _install() {
    const args = [];
    if (this.config.endpoint) {
      args.push("--registry", this.endpoint);
    }
    return this.exec(args);
  }
  _getLocalDeps(override) {
    return (0, import_koishi.valueMap)(override, (request, name2) => {
      const dep = { request };
      try {
        const meta = loadManifest(name2);
        dep.resolved = meta.version;
        dep.workspace = meta.$workspace;
      } catch {
      }
      return dep;
    });
  }
  async install(deps, forced) {
    const localDeps = this._getLocalDeps(deps);
    await this.override(deps);
    for (const name2 in deps) {
      const { resolved, workspace } = localDeps[name2] || {};
      if (workspace || deps[name2] && resolved && (0, import_semver.satisfies)(resolved, deps[name2], { includePrerelease: true })) continue;
      forced = true;
      break;
    }
    if (forced) {
      const code = await this._install();
      if (code) return code;
    }
    this.refresh();
    const newDeps = await this.getDeps();
    for (const name2 in localDeps) {
      const { resolved, workspace } = localDeps[name2];
      if (workspace || !newDeps[name2]) continue;
      if (newDeps[name2].resolved === resolved) continue;
      try {
        if (!(require.resolve(name2) in require.cache)) continue;
      } catch (error) {
        logger.error(error);
      }
      this.ctx.loader.fullReload();
    }
    this.refreshData();
    return 0;
  }
};
((Installer2) => {
  Installer2.Config = import_koishi.Schema.object({
    endpoint: import_koishi.Schema.string().role("link"),
    timeout: import_koishi.Schema.number().role("time").default(import_koishi.Time.second * 5)
  });
})(Installer || (Installer = {}));
var installer_default = Installer;

// src/node/market.ts
var import_koishi2 = require("koishi");
var import_registry2 = __toESM(require("@koishijs/registry"));
var import_shared = require("../shared");
var MarketProvider = class extends import_shared.MarketProvider {
  constructor(ctx, config) {
    super(ctx);
    this.config = config;
    if (config.endpoint) this.http = ctx.http.extend(config);
    this.flushData = ctx.throttle(() => {
      ctx.console.broadcast("market/patch", {
        data: this.tempCache,
        failed: this.failed.length,
        total: this.scanner.total,
        progress: this.scanner.progress
      });
      this.tempCache = {};
    }, 500);
  }
  static {
    __name(this, "MarketProvider");
  }
  http;
  failed = [];
  scanner;
  fullCache = {};
  tempCache = {};
  flushData;
  async start(refresh = false) {
    this.failed = [];
    this.fullCache = {};
    this.tempCache = {};
    if (refresh) this.ctx.installer.refresh(true);
    await this.prepare();
    super.start();
  }
  async collect() {
    const { timeout } = this.config;
    const registry = this.ctx.installer.http;
    this.failed = [];
    this.scanner = new import_registry2.default(registry.get);

    if (this.http) {
      try {
        if (this.config.endpoint?.startsWith("file://")) {
          // Load from local file
          const { fileURLToPath } = require('node:url'); // Import fileURLToPath here
          const filePath = fileURLToPath(this.config.endpoint);
          const { readFile } = require('node:fs/promises'); // Import readFile here
          const fileContent = await readFile(filePath, 'utf8');
          const result = JSON.parse(fileContent);

          this.scanner.objects = result.objects.filter((object) => !object.ignored);
          this.scanner.total = this.scanner.objects.length;
          this.scanner.version = result.version;
        } else {
          // Load from remote URL
          const result = await this.http.get("");
          this.scanner.objects = result.objects.filter((object) => !object.ignored);
          this.scanner.total = this.scanner.objects.length;
          this.scanner.version = result.version;
        }
      } catch (e) {
        this.ctx.logger("market").warn(`Failed to load market data from local file "${this.config.endpoint}": ${e.message}. Falling back to default registry.`);
        // Fallback to default registry if loading from file fails
        await this.scanner.collect({ timeout });
      }
    } else {
      await this.scanner.collect({ timeout });
    }

    if (!this.scanner.version) {
      this.scanner.analyze({
        version: "4",
        onFailure: /* @__PURE__ */ __name((name2, reason) => {
          this.failed.push(name2);
          if (registry.config.endpoint.startsWith("https://registry.npmmirror.com")) {
            if (this.ctx.http.isError(reason) && reason.response?.status === 404) {
            }
          }
        }, "onFailure"),
        onRegistry: /* @__PURE__ */ __name((registry2, versions) => {
          this.ctx.installer.setPackage(registry2.name, versions);
        }, "onRegistry"),
        onSuccess: /* @__PURE__ */ __name((object, versions) => {
          object.package.links ||= {
            npm: `${registry.config.endpoint.replace("registry.", "www.")}/package/${object.package.name}`
          };
          this.fullCache[object.package.name] = this.tempCache[object.package.name] = object;
        }, "onSuccess"),
        after: /* @__PURE__ */ __name(() => this.flushData(), "after")
      });
    }
    return null;
  }


  async get() {
    await this.prepare();
    if (this._error) return { data: {}, failed: 0, total: 0, progress: 0 };
    return this.scanner.version ? {
      registry: this.ctx.installer.endpoint,
      data: Object.fromEntries(this.scanner.objects.map((item) => [item.package.name, item])),
      failed: 0,
      total: this.scanner.total,
      progress: this.scanner.total,
      gravatar: process.env.GRAVATAR_MIRROR
    } : {
      registry: this.ctx.installer.endpoint,
      data: this.fullCache,
      failed: this.failed.length,
      total: this.scanner.total,
      progress: this.scanner.progress,
      gravatar: process.env.GRAVATAR_MIRROR
    };
  }
};
((MarketProvider2) => {
  MarketProvider2.Config = import_koishi2.Schema.object({
    endpoint: import_koishi2.Schema.string().role("link"),
    timeout: import_koishi2.Schema.number().role("time").default(import_koishi2.Time.second * 30),
    proxyAgent: import_koishi2.Schema.string().role("link")
  });
})(MarketProvider || (MarketProvider = {}));
var market_default = MarketProvider;

// src/node/index.ts
__reExport(node_exports, require("../shared"), module.exports);
var name = "market";
var inject = ["http"];
var usage = `
如果插件市场页面提示「无法连接到插件市场」，则可以选择一个 Koishi 社区提供的镜像地址，填入下方对应的配置项中。

## 插件市场（填入 search.endpoint）

- [t4wefan](https://k.ilharp.cc/2611)（大陆）：https://registry.koishi.t4wefan.pub/index.json
- [Lipraty](https://k.ilharp.cc/3530)（大陆）：https://koi.nyan.zone/registry/index.json
- [itzdrli](https://k.ilharp.cc/9975)（全球）：https://kp.itzdrli.cc
- [Q78KG](https://k.ilharp.cc/10042)（全球）：https://koishi-registry.yumetsuki.moe/index.json
- Koishi（全球）：https://registry.koishi.chat/index.json

要浏览更多社区镜像，请访问 [Koishi 论坛上的镜像一览](https://k.ilharp.cc/4000)。`;
var Config = import_koishi3.Schema.object({
  registry: installer_default.Config,
  search: market_default.Config
}).i18n({
  "zh-CN": require_schema_zh_CN()
});
function apply(ctx, config) {
  if (!ctx.loader?.writable) {
    return ctx.logger("app").warn("@koishijs/plugin-market is only available for json/yaml config file");
  }
  ctx.plugin(installer_default, config.registry);
  ctx.inject(["installer"], (ctx2) => {
    ctx2.i18n.define("zh-CN", require_message_zh_CN());
    ctx2.command("plugin.install <name>", { authority: 4 }).alias(".i").action(async ({ session }, name2) => {
      if (!name2) return session.text(".expect-name");
      const names = ctx2.installer.resolveName(name2);
      const deps = await ctx2.installer.getDeps();
      name2 = names.find((name3) => deps[name3]);
      if (name2) return session.text(".already-installed");
      const result = await ctx2.installer.findVersion(names);
      if (!result) return session.text(".not-found");
      ctx2.loader.envData.message = {
        ...(0, import_koishi3.pick)(session, ["sid", "channelId", "guildId", "isDirect"]),
        content: session.text(".success")
      };
      await ctx2.installer.install(result);
      ctx2.loader.envData.message = null;
      return session.text(".success");
    });
    ctx2.command("plugin.uninstall <name>", { authority: 4 }).alias(".r").action(async ({ session }, name2) => {
      if (!name2) return session.text(".expect-name");
      const names = ctx2.installer.resolveName(name2);
      const deps = await ctx2.installer.getDeps();
      name2 = names.find((name3) => deps[name3]);
      if (!name2) return session.text(".not-installed");
      await ctx2.installer.install({ [name2]: null });
      return session.text(".success");
    });
    ctx2.command("plugin.upgrade [name...]", { authority: 4 }).alias(".update", ".up").option("self", "-s, --koishi").action(async ({ session, options }, ...names) => {
      async function getPackages(names2) {
        if (!names2.length) return Object.keys(deps);
        names2 = names2.map((name2) => {
          const names3 = ctx2.installer.resolveName(name2);
          return names3.find((name3) => deps[name3]);
        }).filter(Boolean);
        if (options.self) names2.push("koishi");
        return names2;
      }
      __name(getPackages, "getPackages");
      ctx2.installer.refresh(true);
      const deps = await ctx2.installer.getDeps();
      names = await getPackages(names);
      names = names.filter((name2) => {
        const { latest, resolved, invalid } = deps[name2];
        try {
          return !invalid && (0, import_semver2.gt)(latest, resolved);
        } catch {
        }
      });
      if (!names.length) return session.text(".all-updated");
      const output = names.map((name2) => {
        const { latest, resolved } = deps[name2];
        return `${name2}: ${resolved} -> ${latest}`;
      });
      output.unshift(session.text(".available"));
      output.push(session.text(".prompt"));
      await session.send(output.join("\n"));
      const result = await session.prompt();
      if (!["Y", "y"].includes(result?.trim())) {
        return session.text(".cancelled");
      }
      ctx2.loader.envData.message = {
        ...(0, import_koishi3.pick)(session, ["sid", "channelId", "guildId", "isDirect"]),
        content: session.text(".success")
      };
      await ctx2.installer.install(names.reduce((result2, name2) => {
        result2[name2] = deps[name2].latest;
        return result2;
      }, {}));
      ctx2.loader.envData.message = null;
      return session.text(".success");
    });
  });
  ctx.inject(["console", "installer"], (ctx2) => {
    ctx2.plugin(DependencyProvider);
    ctx2.plugin(RegistryProvider);
    ctx2.plugin(market_default, config.search);
    ctx2.console.addEntry({
      dev: (0, import_path2.resolve)(__dirname, "../../client/index.ts"),
      prod: (0, import_path2.resolve)(__dirname, "../../dist")
    });
    ctx2.console.addListener("market/install", async (deps, forced) => {
      const code = await ctx2.installer.install(deps, forced);
      ctx2.get("console")?.refresh("dependencies");
      ctx2.get("console")?.refresh("registry");
      ctx2.get("console")?.refresh("packages");
      return code;
    }, { authority: 4 });
    ctx2.console.addListener("market/registry", async (names) => {
      const meta = await Promise.all(names.map((name2) => ctx2.installer.getPackage(name2)));
      return Object.fromEntries(meta.map((meta2, index) => [names[index], meta2]));
    }, { authority: 4 });
  });
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  Installer,
  apply,
  inject,
  name,
  usage,
  ...require("../shared")
});
//# sourceMappingURL=index.js.map
