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

// src/index.ts
var src_exports = {};
__export(src_exports, {
  CommandManager: () => CommandManager,
  default: () => src_default
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");

// src/locales/zh-CN.yml
var zh_CN_default = { "commands.command": { description: "指令管理", options: { create: "创建指令", alias: "添加指令别名", unalias: "移除指令别名", name: "修改显示名称", parent: "设置父指令", "parent.": "移除父指令", option: "修改选项" }, messages: { "not-found": "指令不存在。", created: "已创建指令。", updated: "已更新指令配置。" } } };

// src/command.ts
function command_default(ctx, manager) {
  ctx.i18n.define("zh-CN", zh_CN_default);
  ctx.command("command <name>", { authority: 4, checkArgCount: true }).option("create", "-c").option("alias", "-a [name]").option("unalias", "-A [name]").option("rename", "-n [name]").option("parent", "-p [name]").option("parent", "-P, --no-parent", { value: "" }).action(async ({ options, session }, name) => {
    if (options.create)
      manager.create(name);
    if (!ctx.$commander.resolve(name)) {
      return session.text(".not-found");
    }
    const snapshot = manager.ensure(name);
    const command = snapshot.command;
    if (typeof options.alias === "string") {
      const item = command._aliases[options.rename] || {};
      const aliases = { ...command._aliases, [options.alias]: item };
      manager.alias(command, aliases, true);
      delete options.alias;
    }
    if (typeof options.unalias === "string") {
      const aliases = { ...command._aliases };
      delete aliases[options.unalias];
      manager.alias(command, aliases, true);
      delete options.unalias;
    }
    if (typeof options.rename === "string") {
      const item = command._aliases[options.rename] || {};
      const aliases = { [options.rename]: item, ...command._aliases };
      manager.alias(command, aliases, true);
      delete options.rename;
    }
    if (typeof options.parent === "string") {
      manager.teleport(command, options.parent, true);
      delete options.parent;
    }
    return options.create ? session.text(".created") : session.text(".updated");
  });
}
__name(command_default, "default");

// src/index.ts
var import_path = require("path");
var import_meta = {};
var Override = import_koishi.Schema.object({
  name: import_koishi.Schema.string(),
  create: import_koishi.Schema.boolean(),
  aliases: import_koishi.Schema.union([
    import_koishi.Schema.dict(import_koishi.Schema.union([
      import_koishi.Schema.object({
        args: import_koishi.Schema.array(null).default(null),
        options: import_koishi.Schema.dict(null).default(null),
        filter: import_koishi.Schema.any()
      }),
      import_koishi.Schema.transform(false, () => ({ filter: false }))
    ]).default({})),
    import_koishi.Schema.transform(import_koishi.Schema.array(String), (aliases) => {
      return Object.fromEntries(aliases.map((name) => [name, {}]));
    })
  ]),
  options: import_koishi.Schema.dict(null).default(null),
  config: import_koishi.Schema.any()
});
var Config = import_koishi.Schema.union([
  Override,
  import_koishi.Schema.transform(String, (name) => ({ name, aliases: {}, config: {}, options: {} }))
]);
var CommandManager = class {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
    this.refresh = this.ctx.debounce(() => {
      this._cache = null;
      this.entry?.refresh();
    }, 0);
    for (const key in config) {
      const command = ctx.$commander.get(key);
      if (command) {
        this.accept(command, config[key]);
      } else if (config[key].create) {
        const command2 = ctx.command(key);
        this.accept(command2, config[key]);
      }
    }
    ctx.on("command-added", async (cmd) => {
      this.init(cmd);
      for (const { command, pending } of Object.values(this.snapshots)) {
        const parent = this.ctx.$commander.get(pending);
        if (!parent || !pending)
          continue;
        this.snapshots[command.name].pending = null;
        this._teleport(command, parent);
      }
      this.refresh();
    });
    ctx.on("command-updated", (cmd) => {
      this.init(cmd);
      this.refresh();
    });
    ctx.on("command-removed", (cmd) => {
      delete this._tasks[cmd.name];
      delete this.snapshots[cmd.name];
      for (const command of cmd.children) {
        const parent = this.snapshots[command.name]?.parent;
        if (!parent || parent === cmd)
          continue;
        this._teleport(command, parent);
      }
      this.refresh();
    });
    ctx.on("dispose", () => {
      this._tasks = /* @__PURE__ */ Object.create(null);
      for (const key in this.snapshots) {
        const { command, parent, initial } = this.snapshots[key];
        command.config = initial.config;
        command._aliases = initial.aliases;
        Object.assign(command._options, initial.options);
        this._teleport(command, parent);
      }
    }, true);
    ctx.plugin(command_default, this);
    this.installWebUI();
  }
  static {
    __name(this, "CommandManager");
  }
  static filter = false;
  static schema = import_koishi.Schema.dict(Config).hidden();
  _tasks = /* @__PURE__ */ Object.create(null);
  _cache;
  entry;
  refresh;
  snapshots = /* @__PURE__ */ Object.create(null);
  init(command) {
    if (!this.config[command.name])
      return;
    this._tasks[command.name] ||= this.ctx.setTimeout(() => {
      delete this._tasks[command.name];
      this.accept(command, this.config[command.name], true);
    }, 0);
  }
  ensure(name, create, patch) {
    const command = this.ctx.$commander.get(name);
    const snapshot = this.snapshots[command.name];
    if (patch && snapshot) {
      snapshot.initial.options = (0, import_koishi.mapValues)(command._options, (option, key) => {
        return snapshot.initial.options[key] || (0, import_koishi.clone)(option);
      });
      for (const key of Object.keys(command._aliases)) {
        if (snapshot.initial.aliases[key])
          continue;
        if (snapshot.override.aliases[key])
          continue;
        snapshot.initial.aliases[key] = command._aliases[key];
      }
      snapshot.override.aliases = command._aliases;
      return snapshot;
    }
    return this.snapshots[command.name] ||= {
      create,
      command,
      parent: command.parent,
      initial: {
        aliases: { ...command._aliases },
        options: (0, import_koishi.clone)(command._options),
        config: (0, import_koishi.clone)(command.config)
      },
      override: {
        aliases: command._aliases,
        options: {},
        config: {}
      }
    };
  }
  _teleport(command, parent = null) {
    if (command.parent === parent)
      return;
    if (command.parent) {
      (0, import_koishi.remove)(command.parent.children, command);
    }
    command.parent = parent;
  }
  teleport(command, name, write = false) {
    this.snapshots[command.name].pending = null;
    const parent = this.ctx.$commander.get(name);
    if (name && !parent) {
      this.snapshots[command.name].pending = name;
    } else {
      this._teleport(command, parent);
    }
    if (write) {
      this.config[command.name] ||= {};
      this.config[command.name].name = `${name || ""}/${command.displayName}`;
      this.write(command);
    }
  }
  alias(command, aliases, write = false) {
    const { initial, override } = this.snapshots[command.name];
    command._aliases = override.aliases = aliases;
    if (write) {
      this.config[command.name] ||= {};
      this.config[command.name].name = `${command.parent?.name || ""}/${command.displayName}`;
      this.config[command.name].aliases = (0, import_koishi.filterKeys)(aliases, (key, value) => {
        return !(0, import_koishi.deepEqual)(initial.aliases[key], value, true);
      });
      this.write(command);
    }
  }
  update(command, data, write = false) {
    const { initial, override } = this.snapshots[command.name];
    override.config = data.config || {};
    override.options = data.options || {};
    command.config = Object.assign({ ...initial.config }, override.config);
    for (const key in override.options) {
      const option = initial.options[key];
      if (!option)
        continue;
      command._options[key] = Object.assign({ ...initial.options[key] }, override.options[key]);
    }
    if (write) {
      this.config[command.name] ||= {};
      this.config[command.name].config = override.config;
      this.config[command.name].options = override.options;
      this.write(command);
    }
  }
  create(name) {
    this.ctx.command(name);
    this.ensure(name, true);
    this.config[name] = { create: true };
    this.write();
  }
  remove(name) {
    const snapshot = this.snapshots[name];
    const commands = snapshot.command.children.slice();
    delete this.snapshots[name];
    delete this.config[name];
    for (const child of commands) {
      const { parent } = this.snapshots[child.name];
      this._teleport(child, parent);
      this.config[child.name].name = `${parent?.name || ""}/${child.displayName}`;
    }
    snapshot.command.dispose();
    this.write(...commands);
  }
  accept(target, override, patch) {
    const { create, options = {}, config = {} } = override;
    this.ensure(target.name, create, patch);
    this.update(target, { options, config });
    let name = override.name;
    if (name?.includes("/")) {
      const [parent, child] = name.split("/");
      name = child;
      this.teleport(target, parent);
    }
    this.alias(target, {
      ...name ? { [name]: {} } : {},
      ...target._aliases,
      ...override.aliases
    });
    this.refresh();
  }
  write(...commands) {
    for (const command of commands) {
      const snapshot = this.ensure(command.name);
      const override = this.config[command.name];
      if (override.config && !Object.keys(override.config).length) {
        delete override.config;
      }
      for (const key in override.options) {
        if (override.options[key] && !Object.keys(override.options[key]).length) {
          delete override.options[key];
        }
      }
      if (override.options && !Object.keys(override.options).length) {
        delete override.options;
      }
      if (override.aliases && !Object.keys(override.aliases).length) {
        delete override.aliases;
      }
      if (override.name) {
        const initial = (snapshot.parent?.name || "") + "/" + command.name;
        if (override.name === initial || override.name === command.name) {
          delete this.config[command.name].name;
        }
      }
      if (!Object.keys(override).length) {
        delete this.config[command.name];
      }
    }
    this.ctx.scope.update(this.config, false);
  }
  installWebUI() {
    this.ctx.inject(["console"], (ctx) => {
      ctx.on("dispose", () => this.entry = void 0);
      this.entry = ctx.console.addEntry(process.env.KOISHI_BASE ? [
        process.env.KOISHI_BASE + "/dist/index.js",
        process.env.KOISHI_BASE + "/dist/style.css"
      ] : process.env.KOISHI_ENV === "browser" ? [
        // @ts-ignore
        import_meta.url.replace(/\/src\/[^/]+$/, "/client/index.ts")
      ] : {
        dev: (0, import_path.resolve)(__dirname, "../client/index.ts"),
        prod: (0, import_path.resolve)(__dirname, "../dist")
      }, () => {
        return this._cache ||= Object.fromEntries(ctx.$commander._commandList.map((command) => [command.name, {
          name: command.name,
          children: command.children.map((child) => child.name),
          create: this.snapshots[command.name]?.create,
          initial: this.snapshots[command.name]?.initial || { aliases: command._aliases, config: command.config, options: command._options },
          override: this.snapshots[command.name]?.override || { aliases: command._aliases, config: null, options: {} },
          paths: this.ctx.get("loader")?.paths(command.ctx.scope) || []
        }]));
      });
      ctx.console.addListener("command/update", (name, config) => {
        const { command } = this.ensure(name);
        this.update(command, config, true);
        this.refresh();
      }, { authority: 4 });
      ctx.console.addListener("command/teleport", (name, parent) => {
        const { command } = this.ensure(name);
        this.teleport(command, parent, true);
        this.refresh();
      }, { authority: 4 });
      ctx.console.addListener("command/aliases", (name, aliases) => {
        const { command } = this.ensure(name);
        this.alias(command, aliases, true);
        this.refresh();
      }, { authority: 4 });
      ctx.console.addListener("command/create", (name) => {
        this.create(name);
        this.refresh();
      }, { authority: 4 });
      ctx.console.addListener("command/remove", (name) => {
        this.remove(name);
        this.refresh();
      }, { authority: 4 });
      ctx.console.addListener("command/parse", (name, source) => {
        const command = this.ctx.$commander.get(name);
        return command.parse(source);
      });
    });
  }
};
var src_default = CommandManager;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CommandManager
});
//# sourceMappingURL=index.js.map
