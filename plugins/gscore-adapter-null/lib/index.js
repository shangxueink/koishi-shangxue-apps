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
  Config: () => Config3,
  apply: () => apply,
  inject: () => inject,
  logger: () => logger,
  name: () => name,
  reusable: () => reusable,
  usage: () => usage
});
module.exports = __toCommonJS(src_exports);
var import_koishi2 = require("koishi");

// src/client.ts
var import_ws = __toESM(require("ws"));

// src/message.ts
var import_koishi = require("koishi");
var import_fs = require("fs");
var import_node_crypto = require("node:crypto");
var import_path = require("path");
var genUserType = /* @__PURE__ */ __name((session) => {
  if (session.subsubtype) {
    if (session.subtype === "group") {
      return "group";
    } else if (session.subtype === "private") {
      return "direct";
    } else if (session.subtype === "channel") {
      return "channel";
    } else if (session.subtype === "sub_channel") {
      return "sub_channel";
    } else if (session?.event?.channel != null) {
      return "channel";
    } else {
      return "unknown";
    }
  } else {
    if (session?.event?.channel) {
      if (session?.event?.channel.type === 0) return "channel";
      if (session?.event?.channel.type === 1) return "direct";
      if (session?.event?.channel.type != null) return "channel";
    } else {
      return "unknown";
    }
  }
}, "genUserType");
var genUserPermission = /* @__PURE__ */ __name(async (session, ctx) => {
  if (ctx.database) {
    const user = await ctx.database.getUser(session.platform, session.userId);
    if (user?.authority >= 4) {
      return 6 - user.authority > 0 ? 6 - user.authority : 1;
    }
  }
  if (session.channelId?.startsWith("private:")) {
    if (session.author?.roles?.includes("admin")) {
      return 3;
    }
    if (session.author?.roles?.includes("owner")) {
      return 2;
    }
    return 6;
  } else {
    return 6;
  }
}, "genUserPermission");
var genContent = /* @__PURE__ */ __name(async (session) => {
  if (session.elements == null) return [];
  const m = [];
  for (const item of session.elements) {
    if (item.type === "at") {
      m.push({
        type: item.type,
        data: item.attrs.id
      });
    }
    if (item.type === "img") {
      m.push({
        type: item.type,
        data: item.attrs.src
      });
    }
    if (item.type === "image") {
      m.push({
        type: item.type,
        data: item.attrs.url
      });
    }
    if (item.type === "text") {
      m.push({
        type: item.type,
        data: item.attrs.content
      });
    }
    if (item.type === "quote") {
      m.push({
        type: "reply",
        data: item.attrs.id
      });
    }
    if (item.type === "file") {
      try {
        const res = await session.app.http.file(item.attrs.url);
        const b = Buffer.from(res.data);
        const content = `${item.attrs.name}|${b.toString("base64")}`;
        m.push({
          type: item.type,
          data: content
        });
      } catch (error) {
        logger.error(`下载文件失败: ${error}`);
      }
    }
  }
  return m;
}, "genContent");
var genToCoreMessage = /* @__PURE__ */ __name(async (session, ctx) => {
  return {
    bot_id: session.platform,
    bot_self_id: session.selfId,
    msg_id: session.messageId,
    user_type: genUserType(session),
    group_id: session.channelId?.startsWith("private:") ? null : session.channelId,
    user_id: session.userId,
    user_pm: await genUserPermission(session, ctx),
    content: await genContent(session)
  };
}, "genToCoreMessage");
var parseMessage = /* @__PURE__ */ __name((message, messageId, config) => {
  if (message.type === "text") return import_koishi.segment.text(message.data);
  if (message.type === "image") {
    if (message.data.startsWith("link://")) {
      const [_, url] = message.data.split("link://");
      if (config.imgType === "img") {
        return (0, import_koishi.h)("img", { src: url });
      } else {
        return (0, import_koishi.h)("image", { url, src: url });
      }
    }
    if (config.imgType === "img") {
      return (0, import_koishi.h)("img", { src: message.data.replace("base64://", "data:image/png;base64,") });
    } else {
      return (0, import_koishi.h)("image", { url: message.data.replace("base64://", "data:image/png;base64,") });
    }
  }
  if (message.type === "at") return import_koishi.segment.at(message.data);
  if (message.type === "reply") {
    return (0, import_koishi.h)("quote", { id: messageId }, import_koishi.segment.text(message.data));
  }
  if (message.type === "file") {
    const [name2, file] = message.data.split("|");
    const id = (0, import_node_crypto.randomUUID)();
    (0, import_fs.mkdirSync)(`./data`, { recursive: true });
    (0, import_fs.writeFileSync)(`./data/${id}`, file, "base64");
    const location = (0, import_path.resolve)((0, import_path.join)(".", "data"), id);
    return (0, import_koishi.h)("custom-file", { name: name2, location });
  }
  if (message.type === "node") {
    if (config.figureSupport) {
      const result = (0, import_koishi.h)("figure");
      message.data.forEach((item) => {
        const attrs = {
          nickname: "小助手"
        };
        result.children.push((0, import_koishi.h)("message", attrs, parseMessage(item, messageId, config)));
      });
      return result;
    }
    return message.data.map((i) => parseMessage(i, messageId, config));
  }
  throw new Error(`Unknown message type: ${message.type}`);
}, "parseMessage");
var parseCoreMessage = /* @__PURE__ */ __name((message, config) => {
  const segments = [];
  for (const item of message.content) {
    try {
      segments.push(parseMessage(item, message.msg_id, config));
    } catch (e) {
      logger.error(e.message);
    }
  }
  return segments;
}, "parseCoreMessage");
var wrapPassive = /* @__PURE__ */ __name((segments, messageId) => {
  return [(0, import_koishi.h)("passive", { messageId }), ...segments];
}, "wrapPassive");
var findChannelId = /* @__PURE__ */ __name((message) => {
  const group = message.content.find((item) => item.type === "group");
  return group?.data;
}, "findChannelId");

// src/event-manager.ts
var import_rxjs = require("rxjs");
var import_operators = require("rxjs/operators");
var SessionEventManagerMap = /* @__PURE__ */ new Map();
var _SessionEventManager = class _SessionEventManager {
  constructor(session, id, timeout = 12e4, config) {
    this.eventSource = new import_rxjs.Subject();
    this.session = session;
    this.timeout = timeout;
    this.id = id;
    SessionEventManagerMap.set(id, this);
    this.eventSource.subscribe((event) => {
      this.handleEvent(event, config);
    });
  }
  // 处理事件的逻辑
  handleEvent(event, config) {
    if (config.dev) logger.info(`Received event with ID: ${event.id}, message: ${event.message}`);
    this.session.send(event.message);
    this.createEventTimeoutObservable(event.id).subscribe(() => {
      if (config.dev) logger.info(`Event with ID ${event.id} has expired.`);
      this.destroyEventSource();
    });
  }
  createEventTimeoutObservable(eventId) {
    return (0, import_rxjs.timer)(this.timeout).pipe((0, import_operators.takeUntil)(this.eventSource.pipe((0, import_operators.filter)((e) => e.id === eventId))));
  }
  destroyEventSource() {
    this.eventSource.complete();
    SessionEventManagerMap.delete(this.id);
  }
  // 手动触发事件
  triggerEvent(event) {
    this.eventSource.next(event);
  }
};
__name(_SessionEventManager, "SessionEventManager");
var SessionEventManager = _SessionEventManager;

// src/client.ts
var _GsuidCoreClient = class _GsuidCoreClient {
  constructor() {
    this.reconnectInterval = 5e3;
    this.isDispose = false;
  }
  createWs(ctx, config) {
    const url = `${config.isWss ? "wss" : "ws"}://${config.host}:${config.port}/${config.wsPath}/${config.botId}`;
    this.ws = new import_ws.default(url);
    this.ws.on("open", () => {
      logger.info(`与[gsuid-core]成功连接! Bot_ID: ${config.botId}`);
    });
    this.ws.on("error", (err) => {
      logger.error(`与[gsuid-core]连接时发生错误: ${err}`);
    });
    this.ws.on("close", (err) => {
      logger.error(`与[gsuid-core]连接断开: ${err}`);
      if (!this.isDispose) {
        setTimeout(() => {
          logger.info(`自动连接core服务器失败...${this.reconnectInterval / 1e3}秒后重新连接...`);
          this.createWs(ctx, config);
        }, this.reconnectInterval);
      } else {
        logger.info("已经重载实例或停用插件，当前实例不再自动重连");
      }
    });
    this.ws.on("message", (data) => {
      const message = JSON.parse(data.toString());
      if (config.dev) logger.info(data.toString());
      if (message.target_id == null) {
        message.content.forEach((element) => {
          logger.info(`收到[gsuid-core]日志消息: ${element.data}`);
        });
      } else {
        const bot = ctx.bots[`${message.bot_id}:${message.bot_self_id}`];
        if (bot == null) return;
        let parsed = parseCoreMessage(message, config);
        if (config.figureSupport) {
          if (message.msg_id && config.passive) {
            parsed = wrapPassive(parsed, message.msg_id);
          }
          if (message.msg_id && SessionEventManagerMap.get(message.msg_id)) {
            SessionEventManagerMap.get(message.msg_id)?.triggerEvent({ message: parsed, id: message.msg_id });
          } else {
            if (message.target_type === "group") {
              bot.sendMessage(message.target_id, parsed, message.target_id);
            } else if (message.target_type === "direct") {
              bot.sendPrivateMessage(message.target_id, parsed);
            }
            if (message.target_type === "channel") {
              const id = findChannelId(message) ?? message.target_id;
              bot.sendMessage(id, parsed, message.target_id);
            }
          }
        } else {
          parsed.flat().forEach((element) => {
            const p = message.msg_id && config.passive ? wrapPassive([element], message.msg_id) : [element];
            if (message.msg_id && SessionEventManagerMap.get(message.msg_id)) {
              SessionEventManagerMap.get(message.msg_id)?.triggerEvent({ message: parsed, id: message.msg_id });
            } else {
              if (message.target_type === "group") {
                bot.sendMessage(message.target_id, p, message.target_id);
              } else if (message.target_type === "direct") {
                bot.sendPrivateMessage(message.target_id, p);
              } else if (message.target_type === "channel") {
                const id = findChannelId(message) ?? message.target_id;
                bot.sendMessage(id, p, message.target_id);
              }
            }
          });
        }
      }
    });
  }
};
__name(_GsuidCoreClient, "GsuidCoreClient");
var GsuidCoreClient = _GsuidCoreClient;

// src/index.ts
var import_plugin_console = require("@koishijs/plugin-console");

// src/custom-file.ts
var import_fs2 = require("fs");
var createCustomFile = /* @__PURE__ */ __name((ctx) => {
  try {
    ctx.component("custom-file", (attrs, children, session) => {
      if (session.platform !== "onebot") {
        return "该平台适配器不支持导出文件类型消息";
      }
      const onebot = session.onebot;
      try {
        if (session.subtype === "private") {
          const id = session.channelId;
          const reg = /private:(\d+)/;
          const userId = reg.test(id) ? reg.exec(id)[1] : null;
          if (userId)
            onebot.uploadPrivateFile(userId, attrs.location, attrs.name).finally(() => (0, import_fs2.rmSync)(attrs.location));
        } else {
          onebot.uploadGroupFile(session.channelId, attrs.location, attrs.name).finally(() => (0, import_fs2.rmSync)(attrs.location));
        }
      } catch (error) {
        return `发送文件失败`;
      }
      return `已发送文件 ${attrs.name}`;
    });
  } catch (error) {
    logger.info("已经注册该组件");
  }
}, "createCustomFile");

// src/index.ts
var import_path2 = require("path");
var reusable = true;
var inject = ["database"];
var name = "gscore-adapter-null";
var usage = `
---
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>早柚核心 GsCore</title>
</head>
<body>
<div class="gs-core-content">
<h1>🌟 早柚核心 GsCore 🌟</h1>
<p>将 <strong>早柚核心</strong> 机器人接入到你的 <strong>koishi</strong> 中，享受智能化的聊天体验！</p>
<hr>
<p>📚 文档参考：</p>
<ul>
<li><a href="https://docs.sayu-bot.com/" target="_blank">早柚核心 文档</a></li>
<li><a href="https://github.com/TimeRainStarSky/Yunzai" target="_blank">TRSS云崽 文档</a></li>
</ul>
<hr>
<p>接入不同的机器人需要不同的配置，请根据实际情况修改配置项中的【后端请求】部分。</p>
<p>以下是几个框架的示例配置：</p>

<details>
<summary>🔧 点击此处 —— 查看 <strong>早柚核心</strong> 配置</summary>
<pre>
botId: QQ号即可
host: 一般本地搭建即为 localhost
port: 早柚默认端口 8765
wsPath: ws
</pre>
</details>

<details>
<summary>🔧 点击此处 —— 查看 <strong>TRSS云崽</strong> 配置</summary>
<pre>
botId: QQ即可
host: 一般本地搭建即为 localhost
port: 早柚默认端口 2536
wsPath: GSUIDCore
</pre>
</details>

<details>
<summary>出现了野生bot！</strong> 点击查看</summary>
<pre>
如果你只是需要一个基础的云崽/早柚功能
那你可以
在 host 配置项里写 114514 ，以获得云崽功能
在 host 配置项里写 1919810 ，以获得早柚功能
</pre>
</details>

</div>
</body>
</html>

`;
var logger = new import_koishi2.Logger(name);
var Config3 = import_koishi2.Schema.intersect([
  import_koishi2.Schema.object({
    isWss: import_koishi2.Schema.boolean().default(false).description("是否使用wss"),
    isHttps: import_koishi2.Schema.boolean().default(false).description("是否使用https")
  }).description("请求设置"),
  import_koishi2.Schema.object({
    isconsole: import_koishi2.Schema.boolean().default(false).description("是否注册活动栏【早柚核心】`尤其多开插件时，建议关闭`"),
    botId: import_koishi2.Schema.string().default("114514").description("机器人ID"),
    host: import_koishi2.Schema.string().default("localhost").description("后端主机地址"),
    port: import_koishi2.Schema.number().default(8765).description("端口"),
    wsPath: import_koishi2.Schema.string().default("ws").description("ws路径")
  }).description("后端设置"),
  import_koishi2.Schema.object({
    httpPath: import_koishi2.Schema.string().default("genshinuid").description("http路径"),
    figureSupport: import_koishi2.Schema.boolean().description("兼容项：是否支持合并转发，如果当前适配器不支持，请切换为FALSE").default(true),
    imgType: import_koishi2.Schema.union(["image", "img"]).description("兼容项：图片消息元素类型，新版本使用img，旧版本使用image").default("img"),
    passive: import_koishi2.Schema.boolean().description("兼容项：passive消息元素包裹，用于获取消息上下文").default(true)
  }).description("高级设置"),
  import_koishi2.Schema.object({
    dev: import_koishi2.Schema.boolean().description("调试输出").default(false)
  }).description("调试设置")
]);
function apply(ctx, config) {
  if (config.host === "114514") {
    config.host = "146.56.251.70";
    config.port = 2536;
    config.wsPath = "GSUIDCore";
  } else if (config.host === "1919810") {
    config.host = "146.56.251.70";
    config.port = 8765;
    config.wsPath = "ws";
  }
  const _GSCOREProvider = class _GSCOREProvider extends import_plugin_console.DataService {
    constructor(ctx2) {
      super(ctx2, "gscore-custom");
    }
    async get() {
      return [config.host, config.port.toString(), config.isHttps ? "https:" : "http:", config.httpPath];
    }
  };
  __name(_GSCOREProvider, "GSCOREProvider");
  let GSCOREProvider = _GSCOREProvider;
  ctx.plugin(GSCOREProvider);
  if (config.isconsole) {
    ctx.inject(["console"], (ctx2) => {
      ctx2.console.addEntry({
        dev: (0, import_path2.resolve)(__dirname, "../client/index.ts"),
        prod: (0, import_path2.resolve)(__dirname, "../dist")
      });
    });
  }
  const client = new GsuidCoreClient();
  createCustomFile(ctx);
  ctx.on("ready", () => {
    client.createWs(ctx, config);
  });
  ctx.on("message", (session) => {
    if (config.dev) {
      session.elements.forEach(logger.info);
    }
    genToCoreMessage(session, ctx).then((message) => {
      client.ws.send(Buffer.from(JSON.stringify(message)));
      if (message.msg_id) {
        new SessionEventManager(session, message.msg_id, 12e4, config);
      }
    });
  });
  ctx.on("dispose", () => {
    client.isDispose = true;
    client.ws.close();
  });
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  logger,
  name,
  reusable,
  usage
});
