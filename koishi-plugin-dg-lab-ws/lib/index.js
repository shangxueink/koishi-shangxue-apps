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
  name: () => name,
  usage: () => usage
});
module.exports = __toCommonJS(src_exports);

// src/wsServer.ts
var import_ws = __toESM(require("ws"));
var import_uuid = require("uuid");
var WsServer = class {
  static {
    __name(this, "WsServer");
  }
  static inject = ["server"];
  clients = /* @__PURE__ */ new Map();
  relations = /* @__PURE__ */ new Map();
  clientTimers = /* @__PURE__ */ new Map();
  punishmentDuration = 5;
  punishmentTime = 1;
  heartbeatMsg = {
    type: "heartbeat",
    clientId: "",
    targetId: "",
    message: "200"
  };
  heartbeatInterval;
  logger;
  wsServer;
  constructor(ctx, port) {
    this.logger = ctx.logger("dg-lab-ws");
    this.wsServer = new import_ws.default.Server({ port });
    this.wsServer.on("connection", (socket) => {
      const clientId = (0, import_uuid.v4)();
      this.logger.info("新的 WebSocket 连接已建立，标识符为:", clientId);
      this.clients.set(clientId, socket);
      socket.send(
        JSON.stringify({
          type: "bind",
          clientId,
          message: "targetId",
          targetId: ""
        })
      );
      this.MessageOn(socket);
      this.CloseOn(socket);
      this.ErrorOn(socket);
    });
    this.logger.info("WebSocket 正在监听:", port);
    ctx.on("dispose", () => {
      this.logger.debug("ws server closing");
      this.wsServer.close();
    });
  }
  MessageOn(socket) {
    socket.on("message", (Message) => {
      this.logger.info("收到消息：" + Message);
      let data = null;
      try {
        data = JSON.parse(Message);
      } catch (e) {
        socket.send(
          JSON.stringify({
            type: "msg",
            clientId: "",
            targetId: "",
            message: "403"
          })
        );
        return;
      }
      if (this.clients.get(data.clientId) !== socket && this.clients.get(data.targetId) !== socket) {
        socket.send(
          JSON.stringify({
            type: "msg",
            clientId: "",
            targetId: "",
            message: "404"
          })
        );
        return;
      }
      if (!data.type || !data.clientId || !data.message || !data.targetId) {
        return;
      }
      this.logger.info("收到消息" + JSON.stringify(data));
      this.logger.info("type: " + data.type);
      const { clientId, targetId, message, type } = data;
      switch (data.type) {
        case "bind":
          if (this.clients.has(clientId) && this.clients.has(targetId)) {
            if (![clientId, targetId].some(
              (id) => this.relations.has(id) || [...this.relations.values()].includes(id)
            )) {
              this.relations.set(clientId, targetId);
              const client = this.clients.get(clientId);
              const sendData = {
                clientId,
                targetId,
                message: "200",
                type: "bind"
              };
              socket.send(JSON.stringify(sendData));
              client.send(JSON.stringify(sendData));
            } else {
              const data2 = {
                type: "bind",
                clientId,
                targetId,
                message: "400"
              };
              socket.send(JSON.stringify(data2));
              return;
            }
          } else {
            const sendData = {
              clientId,
              targetId,
              message: "401",
              type: "bind"
            };
            socket.send(JSON.stringify(sendData));
            return;
          }
          break;
        case 1:
        case 2:
        case 3:
          this.logger.info("clientId: " + clientId);
          this.logger.info("targetId: " + targetId);
          if (this.relations.get(clientId) !== targetId) {
            const data2 = {
              type: "bind",
              clientId,
              targetId,
              message: "402"
            };
            socket.send(JSON.stringify(data2));
            return;
          }
          if (this.clients.has(targetId)) {
            const client = this.clients.get(targetId);
            const sendType = data.type - 1;
            const sendChannel = data.channel ? data.channel : 1;
            const sendStrength = data.strength;
            const msg = "strength-" + sendChannel + "+" + sendType + "+" + sendStrength;
            const sendData = {
              type: "msg",
              clientId,
              targetId,
              message: msg
            };
            this.logger.info("发送消息：" + JSON.stringify(sendData));
            client.send(JSON.stringify(sendData));
          }
          break;
        case 4:
          if (this.relations.get(clientId) !== targetId) {
            const data2 = {
              type: "bind",
              clientId,
              targetId,
              message: "402"
            };
            socket.send(JSON.stringify(data2));
            return;
          }
          if (this.clients.has(targetId)) {
            const client = this.clients.get(targetId);
            const sendData = {
              type: "msg",
              clientId,
              targetId,
              message
            };
            client.send(JSON.stringify(sendData));
          }
          break;
        case "clientMsg":
          if (this.relations.get(clientId) !== targetId) {
            const data2 = {
              type: "bind",
              clientId,
              targetId,
              message: "402"
            };
            socket.send(JSON.stringify(data2));
            return;
          }
          if (!data.channel) {
            const data2 = {
              type: "error",
              clientId,
              targetId,
              message: "406-channel is empty"
            };
            socket.send(JSON.stringify(data2));
            return;
          }
          if (this.clients.has(targetId)) {
            let sendtime = data.time ? data.time : this.punishmentDuration;
            const target = this.clients.get(targetId);
            const sendData = {
              type: "msg",
              clientId,
              targetId,
              message: "pulse-" + data.message
            };
            let totalSends = this.punishmentTime * sendtime;
            const timeSpace = 1e3 / this.punishmentTime;
            if (this.clientTimers.has(clientId + "-" + data.channel)) {
              this.logger.info(
                "通道" + data.channel + "覆盖消息发送中，总消息数：" + totalSends + "持续时间A：" + sendtime
              );
              socket.send("当前通道" + data.channel + "有正在发送的消息，覆盖之前的消息");
              const timerId = this.clientTimers.get(clientId + "-" + data.channel);
              clearInterval(timerId);
              this.clientTimers.delete(clientId + "-" + data.channel);
              switch (data.channel) {
                case "A":
                  const clearDataA = {
                    clientId,
                    targetId,
                    message: "clear-1",
                    type: "msg"
                  };
                  target.send(JSON.stringify(clearDataA));
                  break;
                case "B":
                  const clearDataB = {
                    clientId,
                    targetId,
                    message: "clear-2",
                    type: "msg"
                  };
                  target.send(JSON.stringify(clearDataB));
                  break;
                default:
                  break;
              }
              setTimeout(() => {
                this.delaySendMsg(
                  clientId,
                  socket,
                  target,
                  sendData,
                  totalSends,
                  timeSpace,
                  data.channel
                );
              }, 150);
            } else {
              this.delaySendMsg(
                clientId,
                socket,
                target,
                sendData,
                totalSends,
                timeSpace,
                data.channel
              );
              this.logger.info(
                "通道" + data.channel + "消息发送中，总消息数：" + totalSends + "持续时间：" + sendtime
              );
            }
          } else {
            this.logger.info(`未找到匹配的客户端，clientId: ${clientId}`);
            const sendData = {
              clientId,
              targetId,
              message: "404",
              type: "msg"
            };
            socket.send(JSON.stringify(sendData));
          }
          break;
        default:
          if (this.relations.get(clientId) !== targetId) {
            const data2 = {
              type: "bind",
              clientId,
              targetId,
              message: "402"
            };
            socket.send(JSON.stringify(data2));
            return;
          }
          if (this.clients.has(clientId)) {
            const client = this.clients.get(clientId);
            const sendData = {
              type,
              clientId,
              targetId,
              message
            };
            client.send(JSON.stringify(sendData));
          } else {
            const sendData = {
              clientId,
              targetId,
              message: "404",
              type: "msg"
            };
            socket.send(JSON.stringify(sendData));
          }
          break;
      }
    });
  }
  CloseOn(socket) {
    socket.on("close", () => {
      this.logger.info("WebSocket 连接已关闭");
      let clientId = "";
      this.clients.forEach((value, key) => {
        if (value === socket) {
          clientId = key;
        }
      });
      this.logger.info("断开的client id:" + clientId);
      this.relations.forEach((value, key) => {
        if (key === clientId) {
          let appid = this.relations.get(key);
          let appClient = this.clients.get(appid);
          const data = {
            type: "break",
            clientId,
            targetId: appid,
            message: "209"
          };
          appClient.send(JSON.stringify(data));
          appClient.close();
          this.relations.delete(key);
          this.logger.info("对方掉线，关闭" + appid);
        } else if (value === clientId) {
          let webClient = this.clients.get(key);
          const data = {
            type: "break",
            clientId: key,
            targetId: clientId,
            message: "209"
          };
          webClient.send(JSON.stringify(data));
          webClient.close();
          this.relations.delete(key);
          this.logger.info("对方掉线，关闭" + clientId);
        }
      });
      this.clients.delete(clientId);
      this.logger.info("已清除" + clientId + " ,当前size: " + this.clients.size);
    });
  }
  ErrorOn(socket) {
    socket.on("error", (error) => {
      this.logger.error("WebSocket 异常:", error.message);
      let clientId = "";
      for (const [key, value] of this.clients.entries()) {
        if (value === socket) {
          clientId = key;
          break;
        }
      }
      if (!clientId) {
        this.logger.error("无法找到对应的 clientId");
        return;
      }
      const errorMessage = "WebSocket 异常: " + error.message;
      this.relations.forEach((value, key) => {
        if (key === clientId) {
          let appid = this.relations.get(key);
          let appClient = this.clients.get(appid);
          const data = {
            type: "error",
            clientId,
            targetId: appid,
            message: "500"
          };
          appClient.send(JSON.stringify(data));
        }
        if (value === clientId) {
          let webClient = this.clients.get(key);
          const data = {
            type: "error",
            clientId: key,
            targetId: clientId,
            message: errorMessage
          };
          webClient.send(JSON.stringify(data));
        }
      });
    });
  }
  delaySendMsg(clientId, client, target, sendData, totalSends, timeSpace, channel) {
    target.send(JSON.stringify(sendData));
    totalSends--;
    if (totalSends > 0) {
      return new Promise((resolve, reject) => {
        const timerId = setInterval(() => {
          if (totalSends > 0) {
            target.send(JSON.stringify(sendData));
            totalSends--;
          }
          if (totalSends <= 0) {
            clearInterval(timerId);
            client.send("发送完毕");
            this.clientTimers.delete(clientId);
            resolve();
          }
        }, timeSpace);
        this.clientTimers.set(clientId + "-" + channel, timerId);
      });
    }
  }
};

// src/config.ts
var import_koishi = require("koishi");
var Config = import_koishi.Schema.object({
  port: import_koishi.Schema.string().default("5555").description("Ws服务器监听端口")
}).description("Ws服务器配置");

// src/index.ts
var name = "dg-lab-ws";
var usage = `
<div align="center">
<img src="https://dungeon-lab.cn/img/icons/u95.png" width="200" height="66">
</div>

通过安装和配置本插件，

你可以实现公网命令转发和连接管理，

让多个用户共享一个 WebSocket 服务器实例。

- \`path\`：WebSocket 服务器的路径。

`;
function apply(ctx, config) {
  ctx.plugin(WsServer, config.port);
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  name,
  usage
});
