var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  name: () => name,
  usage: () => usage
});
module.exports = __toCommonJS(src_exports);
var import_koishi3 = require("koishi");

// src/dgluna.ts
var import_koishi = require("koishi");
var feedBackMsg = {
  "feedback-0": "A通道：○",
  "feedback-1": "A通道：△",
  "feedback-2": "A通道：□",
  "feedback-3": "A通道：☆",
  "feedback-4": "A通道：⬡",
  "feedback-5": "B通道：○",
  "feedback-6": "B通道：△",
  "feedback-7": "B通道：□",
  "feedback-8": "B通道：☆",
  "feedback-9": "B通道：⬡"
};
var waveData = {
  "1": `["0A0A0A0A00000000","0A0A0A0A0A0A0A0A","0A0A0A0A14141414","0A0A0A0A1E1E1E1E","0A0A0A0A28282828","0A0A0A0A32323232","0A0A0A0A3C3C3C3C","0A0A0A0A46464646","0A0A0A0A50505050","0A0A0A0A5A5A5A5A","0A0A0A0A64646464"]`,
  "2": `["0A0A0A0A00000000","0D0D0D0D0F0F0F0F","101010101E1E1E1E","1313131332323232","1616161641414141","1A1A1A1A50505050","1D1D1D1D64646464","202020205A5A5A5A","2323232350505050","262626264B4B4B4B","2A2A2A2A41414141"]`,
  "3": `["4A4A4A4A64646464","4545454564646464","4040404064646464","3B3B3B3B64646464","3636363664646464","3232323264646464","2D2D2D2D64646464","2828282864646464","2323232364646464","1E1E1E1E64646464","1A1A1A1A64646464"]`
};
var DgLab = class {
  static {
    __name(this, "DgLab");
  }
  ctx;
  ws;
  endpoint;
  connectionId;
  targetWSId;
  connectUrl;
  // 通道强度以及软上限
  channelA;
  channelB;
  softA;
  softB;
  constructor(ctx, endpoint) {
    this.ctx = ctx;
    this.endpoint = endpoint;
    this.ws = (() => {
      try {
        return this.ctx.http.ws(endpoint);
      } catch (error) {
        throw new Error("无法连接至" + endpoint);
      }
    })();
    this.connectInit();
  }
  connectInit() {
    this.ws.onopen = () => {
      this.ctx.logger.info("已创建新连接至", this.endpoint);
    };
    this.ws.onmessage = (event) => {
      let message = null;
      try {
        message = JSON.parse(event.data);
      } catch (error) {
        this.ctx.logger.error("无法解析消息: " + event.data);
        return;
      }
      switch (message.type) {
        case "bind":
          if (!message.targetId) {
            this.connectionId = message.clientId;
            this.ctx.logger.info(`[${this.connectionId}]已连接至${this.endpoint}`);
            this.connectUrl = `https://www.dungeon-lab.com/app-download.php#DGLAB-SOCKET#${this.endpoint}/${this.connectionId}`;
            this.ctx.logger.info(`连接URL: ${this.connectUrl}`);
          } else {
            if (message.clientId != this.connectionId) {
              this.ctx.logger.info("收到不正确的target消息" + message.message);
              return;
            }
            this.targetWSId = message.targetId;
            this.ctx.logger.info(`[${this.connectionId}]已绑定至${this.targetWSId}`);
          }
          break;
        case "break":
          if (message.targetId != this.targetWSId) return;
          this.ctx.logger.info(`[${this.connectionId}]连接已断开`);
          break;
        case "error":
          if (message.targetId != this.targetWSId) return;
          this.ctx.logger.error(`[${this.connectionId}]发生错误: ${message.error}`);
          break;
        case "msg":
          if (message.targetId != this.targetWSId) return;
          if (message.message.includes("strength")) {
            const numbers = message.message.match(/\d+/g).map(Number);
            this.channelA = numbers[0];
            this.channelB = numbers[1];
            this.softA = numbers[2];
            this.softB = numbers[3];
          } else if (message.message.includes("feedback")) {
            this.ctx.logger.info(`[${this.connectionId}]设置波形: ${feedBackMsg[message.message]}`);
            let msg = {
              type: "clientMsg",
              clientId: this.connectionId,
              targetId: this.targetWSId,
              message: "feedback",
              channel: "",
              time: 864e3
            };
            const feedback = message.message.match(/\d+/g)[0];
            switch (feedback) {
              case "0":
                msg.message = "A:" + waveData["1"];
                msg.channel = "A";
                this.Send(msg);
                break;
              case "1":
                msg.message = "A:" + waveData["2"];
                msg.channel = "A";
                this.Send(msg);
                break;
              case "2":
              case "3":
              case "4":
                msg.message = "A:" + waveData["3"];
                msg.channel = "A";
                this.Send(msg);
                break;
              case "5":
                msg.message = "B:" + waveData["1"];
                msg.channel = "B";
                this.Send(msg);
                break;
              case "6":
                msg.message = "B:" + waveData["2"];
                msg.channel = "B";
                this.Send(msg);
                break;
              case "7":
              case "8":
              case "9":
                msg.message = "B:" + waveData["3"];
                msg.channel = "B";
                this.Send(msg);
                break;
            }
          }
          break;
        case "heartbeat":
          this.ctx.logger.debug("收到心跳");
          break;
        default:
          this.ctx.logger.info("收到其他消息：" + JSON.stringify(message));
          break;
      }
    };
    this.ws.onerror = () => {
      this.ctx.logger.error(`[${this.connectionId}]连接发生错误`);
    };
    this.ws.onclose = () => {
      this.ctx.logger.info(`[${this.connectionId}]连接已断开`);
    };
  }
  async GetConnectionId() {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.connectionId) resolve(this.connectionId);
      }, 1e3);
    });
  }
  GetTargetId() {
    return this.targetWSId;
  }
  GetStatus() {
    return {
      channelA: this.channelA,
      channelB: this.channelB,
      softA: this.softA,
      softB: this.softB
    };
  }
  Send(message) {
    this.ws.send(JSON.stringify(message));
  }
  ChangeStrength(channel, value) {
    if (channel !== "A" && channel !== "B") return;
    const strengthType = value < 0 ? 1 : 2;
    let msg = {
      type: strengthType,
      clientId: this.connectionId,
      targetId: this.targetWSId,
      message: "set strength",
      strength: value,
      channel: 1
    };
    if (channel === "A") {
      this.channelA += value;
      if (this.channelA < 0 || this.channelA > this.softA) {
        this.channelA -= value;
        return;
      }
      msg.channel = 1;
    } else if (channel === "B") {
      this.channelB += value;
      if (this.channelB < 0 || this.channelB > this.softB) {
        this.channelB -= value;
        return;
      }
      msg.channel = 2;
    }
    this.Send(msg);
  }
  SetStrength(channel, value) {
    if (channel !== "A" && channel !== "B") return;
    let msg = {
      type: 3,
      clientId: this.connectionId,
      targetId: this.targetWSId,
      message: "set strength",
      strength: value,
      channel: 1
    };
    if (channel === "A") {
      if (value < 0 || value > this.softA) return;
      this.channelA = value;
      msg.channel = 1;
    } else if (channel === "B") {
      if (value < 0 || value > this.softB) return;
      this.channelB = value;
      msg.channel = 2;
    }
    this.Send(msg);
  }
  // 设置波形
  SetWave(channel, wave, time) {
    let msg = {
      type: "clientMsg",
      clientId: this.connectionId,
      targetId: this.targetWSId,
      message: "feedback",
      channel: "",
      time
    };
    msg.message = channel + ":" + wave;
    msg.channel = channel;
    this.Send(msg);
  }
  // 关闭连接
  Close() {
    this.ws.close();
  }
};
var Room = class {
  static {
    __name(this, "Room");
  }
  dglabs;
  users;
  constructor() {
    this.dglabs = /* @__PURE__ */ new Map();
    this.users = /* @__PURE__ */ new Set();
  }
  PushDglab(connectionId, dglab) {
    this.dglabs.set(connectionId, dglab);
  }
  PopDglab(connectionId) {
    const dglab = this.dglabs.get(connectionId);
    this.dglabs.delete(connectionId);
    return dglab;
  }
  AddUser(userId) {
    this.users.add(userId);
  }
  RemoveUser(userId) {
    if (this.users.has(userId)) {
      this.users.delete(userId);
    }
  }
  FindUser(userId) {
    return this.users.has(userId);
  }
  FindDglab(connectionId) {
    return this.dglabs.has(connectionId);
  }
  UserCount() {
    return this.users.size;
  }
  ChangeStrength(channel, value) {
    this.dglabs.forEach((dglab, key) => {
      try {
        dglab.ChangeStrength(channel, value);
      } catch (error) {
        this.dglabs.delete(key);
      }
    });
  }
  SetStrength(channel, value) {
    this.dglabs.forEach((dglab, key) => {
      try {
        dglab.SetStrength(channel, value);
      } catch (error) {
        this.dglabs.delete(key);
      }
    });
  }
  SetWave(channel, wave, time) {
    this.dglabs.forEach((dglab, key) => {
      try {
        dglab.SetWave(channel, wave, time);
      } catch (error) {
        this.dglabs.delete(key);
      }
    });
  }
  Close() {
    this.dglabs.forEach((dglab) => {
      dglab.Close();
    });
  }
};
var DgLuna = class extends import_koishi.Service {
  static {
    __name(this, "DgLuna");
  }
  dglabs;
  rooms;
  endpoint;
  constructor(ctx, config) {
    super(ctx, "dgluna");
    this.dglabs = /* @__PURE__ */ new Map();
    this.rooms = /* @__PURE__ */ new Set();
    this.endpoint = config.endpoint;
  }
  async Connect(endpoint) {
    if (endpoint === void 0) {
      endpoint = this.endpoint;
    }
    const dglab = new DgLab(this.ctx, endpoint);
    return dglab;
  }
  async CreateRoom(userId, dglab) {
    const room = new Room();
    const connectionId = await dglab.GetConnectionId();
    room.AddUser(userId);
    room.PushDglab(connectionId, dglab);
    this.rooms.add(room);
  }
  AddUserToRoom(userId, invitedUserId) {
    this.rooms.forEach((room) => {
      if (room.FindUser(userId)) {
        if (room.FindUser(invitedUserId)) {
          return;
        }
        room.AddUser(invitedUserId);
        return;
      }
    });
  }
  RemoveUserFromRoom(userId) {
    this.rooms.forEach((room) => {
      if (room.FindUser(userId)) {
        room.RemoveUser(userId);
      }
    });
  }
  AddDglabToRoom(userId, dglab) {
    this.rooms.forEach(async (room) => {
      if (room.FindUser(userId)) {
        room.PushDglab(await dglab.GetConnectionId(), dglab);
      }
    });
  }
  ChangeStrengthByRoom(userID, channel, strength) {
    this.rooms.forEach((room) => {
      if (room.FindUser(userID)) {
        room.ChangeStrength(channel, strength);
      }
    });
  }
  SetStrengthByRoom(userID, channel, strength) {
    this.rooms.forEach((room) => {
      if (room.FindUser(userID)) {
        room.SetStrength(channel, strength);
      }
    });
  }
  SetWaveByRoom(userID, channel, wave, time) {
    this.rooms.forEach((room) => {
      if (room.FindUser(userID)) {
        room.SetWave(channel, wave, time);
      }
    });
  }
  UserExit(userID) {
    this.rooms.forEach((room) => {
      if (room.FindUser(userID)) {
        room.RemoveUser(userID);
        if (room.UserCount() === 0) {
          room.Close();
          this.rooms.delete(room);
        }
      }
    });
  }
  IsUserInRoom(userID) {
    let result = false;
    this.rooms.forEach((room) => {
      if (room.FindUser(userID)) {
        result = true;
      }
    });
    return result;
  }
  PopDglab(connectionId) {
    const dglab = this.dglabs.get(connectionId);
    this.dglabs.delete(connectionId);
    return dglab;
  }
  PushDglab(connectionId, dglab) {
    this.dglabs.set(connectionId, dglab);
  }
};

// src/config.ts
var import_koishi2 = require("koishi");
var Config = import_koishi2.Schema.object({
  endpoint: import_koishi2.Schema.string().required().description("DG-Lab ws服务端地址`末尾无需斜杠`")
});

// src/index.ts
var name = "dgluna";
var inject = {
  required: ["qrcode"]
};
var usage = `
<h1>DgLuna 插件</h1>

<p>DgLuna 是一个用于 DG-LAB 游戏的插件，提供了公共放映厅的功能。</p>

<h2>使用方法</h2>

<details>
<summary>点击此处————查看指令说明</summary>

<h3>连接 DG-LAB 频道</h3>
<ul>
<li><strong>参数</strong>:</li>
<ul>
<li><code>endpoint</code>: 可选，指定连接的 DG-LAB 频道。</li>
</ul>
<li><strong>触发示例</strong>: <code>dgluna.connect ws://1.2.3.4:5555</code> 或者 <code>dgluna.connect</code></li>
</ul>

<h3>调整通道强度</h3>
<ul>
<li><strong>参数</strong>:</li>
<ul>
<li><code>channel</code>: 要调整的通道名称。</li>
<li><code>value</code>: 要调整的强度增量值（可以为负）。</li>
</ul>
<li><strong>触发示例</strong>: <code>dgluna.strchange A -5</code>（A通道减弱5）</li>
</ul>

<h3>设定通道强度</h3>
<ul>
<li><strong>参数</strong>:</li>
<ul>
<li><code>channel</code>: 要设定的通道名称。</li>
<li><code>value</code>: 要设定的强度值。</li>
</ul>
<li><strong>触发示例</strong>: <code>dgluna.strset A 15</code>（A通道设定至15）</li>
</ul>

<h3>设定通道波形</h3>
<ul>
<li><strong>参数</strong>:</li>
<ul>
<li><code>channel</code>: 要设定的通道名称。</li>
<li><code>wave</code>: 波形编号。</li>
<li><code>time</code>: 持续时间（秒）。</li>
</ul>
<li><strong>触发示例</strong>: <code>dgluna.setwave A 2 30</code>（A通道设定为波形2，持续30秒）</li>
</ul>

<h3>邀请用户加入</h3>
<ul>
<li><strong>参数</strong>:</li>
<ul>
<li><code>user</code>: 要邀请的用户 ID。</li>
</ul>
<li><strong>触发示例</strong>: <code>dgluna.invite @猫猫</code></li>
</ul>

<h3>退出频道</h3>
<pre><code>dgluna.exit</code></pre>

</details>

<p>本插件需要搭配配套的 WebSocket 后端使用。请<a href="/market?keyword=dg-lab-ws">前往插件市场下载 DG-LAB-ws</a> 插件。</p>

<details>
<summary>点击此处————查看玩法说明</summary>
<p>在确保本插件已经填写了正确的 WebSocket 服务器地址之后，您可以开启本插件，然后供用户玩耍。</p>

<p>逻辑是这样的：</p>
<ul>
<li>用户先触发【连接 DG】，然后通过郊狼 APP 扫码连接至服务器。</li>
<li>用户自己在 APP 上选波形，并且按下对应通道的波形，才能让本插件输出。</li>
<li>已经连接的用户可以使用【设定强度 A 10】这样的指令来设定通道强度。</li>
<li>也可以通过【邀请】来让没有通过扫码连接的用户一起控制。</li>
<li>最后用户可以【退出】或在郊狼 APP 上点击【断开连接】。</li>
</ul>

</details>

<hr>

`;
function dgluna(ctx, config) {
  const logger = ctx.logger("dgluna");
  logger.info("Dg-Lab插件已启用");
  ctx.command("dgluna.connect [endpoint: string]", "加入DG-LAB频道").alias("连接DG").action(async ({ session }, endpoint) => {
    if (endpoint === void 0) {
      endpoint = config.endpoint;
    }
    const userID = session.event.user.id;
    if (ctx.dgluna.IsUserInRoom(userID) !== false) {
      const dglab = await ctx.dgluna.Connect(endpoint);
      await ctx.dgluna.AddDglabToRoom(userID, dglab);
      await session.send("已添加新的连接。\n若需连接至默认服务器，请先【退出】后 再【连接DG】");
      return;
    }
    try {
      const dglab = await ctx.dgluna.Connect(endpoint);
      const uuid = await dglab.GetConnectionId();
      await ctx.dgluna.CreateRoom(userID, dglab);
      const image = await ctx.qrcode.generateQRCode(`https://www.dungeon-lab.com/app-download.php#DGLAB-SOCKET#${endpoint}/${uuid}`, "Text");
      await session.send("请打开DG-LAB软件选择 SOCKET控制 ，并且进行扫码连接：");
      await session.send(import_koishi3.h.image("https://i0.hdslb.com/bfs/article/f66d7352b84b0e58e4dcb42e272a86e5312276085.png"));
      await session.send(image);
      await session.send("在扫码连接后，请按下APP内任意一个波形");
      return;
    } catch (error) {
      logger.error(error);
    }
  });
  ctx.command("dgluna.strchange <channel: string> <value: number>", "调整通道强度").alias("调整强度").example("调整强度 A 1").action(async ({ session }, channel, value) => {
    const userID = session.event.user.id;
    if (await ctx.dgluna.IsUserInRoom(userID) === false) {
      await session.send("尚未创建Dg-Lab连接");
      return;
    }
    if (!channel || !value) {
      await session.send("参数不正确。使用示例：\n调整强度 A 1");
      return;
    }
    const numericValue = Number(value);
    try {
      await ctx.dgluna.ChangeStrengthByRoom(userID, channel, numericValue);
      await session.send(`已调整 ${channel} 通道强度：${value}
（若超过上限设定，则不会生效）`);
    } catch (error) {
      logger.error(error);
    }
  });
  ctx.command("dgluna.strset <channel: string> <value: string>", "设定通道强度").alias("设定强度").example("设定强度 A 10").action(async ({ session }, channel, value) => {
    const userID = session.event.user.id;
    if (await ctx.dgluna.IsUserInRoom(userID) === false) {
      await session.send("尚未创建Dg-Lab连接");
      return;
    }
    if (!channel || !value) {
      await session.send("参数不正确。使用示例：\n设定强度 A 10");
      return;
    }
    const numericValue = Number(value);
    try {
      await ctx.dgluna.SetStrengthByRoom(userID, channel, numericValue);
      await session.send(`已设定 ${channel} 通道强度至：${value}
（若超过上限设定，则不会生效）`);
    } catch (error) {
      logger.error(error);
    }
  });
  ctx.command("dgluna.waveset <channel: string> <wave: number> <time: number>", "设定通道波形").alias("设定波形").example("设定波形 A 1 300").action(async ({ session }, channel, wave, time) => {
    const userID = session.event.user.id;
    if (await ctx.dgluna.IsUserInRoom(userID) === false) {
      await session.send("尚未创建Dg-Lab连接");
      return;
    }
    if (!channel || !wave || !time) {
      await session.send("参数不正确。使用示例：\n设定波形 A 1 300");
      return;
    }
    const numericTime = Number(time);
    try {
      await ctx.dgluna.SetWaveByRoom(userID, channel, wave, numericTime);
      await session.send(`已设定 ${channel} 通道：${wave}波形
持续时间：${numericTime}`);
    } catch (error) {
      logger.error(error);
    }
  });
  ctx.command("dgluna.invite <user: string>", "邀请用户加入").alias("邀请").action(async ({ session }, user) => {
    let invitedUserId;
    try {
      const parsedUser = import_koishi3.h.parse(user)[0];
      if (parsedUser?.type !== "at") {
        await session.send("请艾特一个有效用户。\n示例： 邀请 @猫猫");
        return;
      }
      invitedUserId = parsedUser.attrs.id;
      if (!invitedUserId) throw new Error("请艾特一个有效用户");
    } catch (error) {
      logger.error(error);
      await session.send("请艾特一个有效用户");
      return;
    }
    const userID = session.event.user.id;
    if (await ctx.dgluna.IsUserInRoom(userID) === false) {
      await session.send("尚未创建Dg-Lab连接");
      return;
    }
    try {
      await ctx.dgluna.AddUserToRoom(userID, invitedUserId);
    } catch (error) {
      logger.error(error);
    }
    await session.send("已邀请用户加入连接");
    return;
  });
  ctx.command("dgluna.exit", "退出DG-LAB频道").alias("退出").action(async ({ session }) => {
    const userID = session.event.user.id;
    const connectionID = await ctx.dgluna.IsUserInRoom(userID);
    if (connectionID === null) {
      await session.send("尚未创建Dg-Lab连接");
      return;
    }
    try {
      await ctx.dgluna.UserExit(userID);
    } catch (error) {
      logger.error(error);
    }
    await session.send("连接已断开");
    return;
  });
}
__name(dgluna, "dgluna");
function apply(ctx, config) {
  ctx.plugin(DgLuna, config);
  ctx.plugin(
    {
      apply: dgluna,
      inject: {
        dgluna: { required: true }
      },
      name: "dgluna"
    },
    config
  );
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name,
  usage
});
