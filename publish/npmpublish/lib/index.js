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
  name: () => name,
  reusable: () => reusable,
  usage: () => usage
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var import_node_fs = __toESM(require("node:fs"));
var import_node_path = __toESM(require("node:path"));
var import_jimp = require("jimp");
var reusable = true;
var name = "bangbangcai";
var inject = {
  required: ["database"]
};
var usage = `
<h1>邦多利猜猜看（邦邦猜）</h1>

<p>卡面图片来源于 <a href="https://bestdori.com" target="_blank">bestdori.com</a></p>

<div class="notice">
<h3>Notice</h3>
<p>在 Onebot 适配器下，偶尔发不出来图，Koishi 报错日志为 <code>retcode:1200</code> 时，

请查看协议端日志自行解决！</p>

<p>在 QQ 适配器下，偶尔发不出来图，Koishi 报错日志为 <code>bad request</code> 时，建议参见 论坛10257帖！ 

-> https://forum.koishi.xyz/t/topic/10257 </p>
</div>

<hr>

<div class="version">
<h3>Version</h3>
<p>1.6.0</p>
<ul>
<li>现在答案对大小写不敏感了</li>
</ul>
<p>1.5.0</p>
<ul>
<li>题库中加入特训后卡面</li>
<li>@的后面加了个空格</li>
</ul>
<p>1.4.0</p>
<ul>
<li>完全重构了代码</li>
<li>修复了已知的所有bug</li>
<li>删除了不必要的指令：bbc重开、bbcdrop等</li>
</ul>
</div>

<hr>

<div class="thanks">
<h3>Thanks</h3>
<p>灵感参考： <a href="/market?keyword=koishi-plugin-cck">koishi-plugin-cck</a></p>

<hr>

<h4>如果想继续开发优化本插件，<a href="https://github.com/xsjh/koishi-plugin-bangbangcai/pulls" target="_blank">欢迎 PR</a></h4>

</body>
`;
var Config = import_koishi.Schema.intersect([
  import_koishi.Schema.object({
    bbc_command: import_koishi.Schema.string().default("bbc").description("`游戏开始`的指令名称"),
    bbc_recrop_command: import_koishi.Schema.string().default("bbc重切").description("`重新切片`的指令名称")
  }).description("基础设置"),
  import_koishi.Schema.object({
    textMessage: import_koishi.Schema.string().description("`猜谜`提示语1").default("时间60秒~\n猜猜我是谁："),
    phrase_timeout: import_koishi.Schema.array(String).role("table").description("`超时结束`时 提示：").default(["60秒到了~\n答案是："]),
    phrase_answered: import_koishi.Schema.array(String).role("table").description("`回答正确`时 提示：").default(["不赖，你还懂"]),
    phrase_bzd: import_koishi.Schema.array(String).role("table").description("触发`不知道`时 提示：").default(["游戏结束，这是："])
  }).description("进阶设置"),
  import_koishi.Schema.object({
    bbctimeout: import_koishi.Schema.number().default(60).description("游戏持续(计时)的 时长（秒）"),
    recrop: import_koishi.Schema.boolean().default(false).description("玩家是否可以重新裁剪图片"),
    max_recrop_times: import_koishi.Schema.number().default(3).min(0).max(15).step(1).description("允许`重新切片`的最大次数").role("slider")
  }).description("交互设置"),
  import_koishi.Schema.object({
    cutWidth: import_koishi.Schema.number().default(200).description("卡片剪裁 宽度"),
    cutLength: import_koishi.Schema.number().default(150).description("卡片剪裁 高度")
  }).description("高级设置")
]);
async function apply(ctx, config) {
  let games = {};
  ctx.command(config.bbc_command).action(async ({ session }) => {
    if (games[session.channelId]) {
      return "当前已有正在进行的游戏";
    }
    games[session.channelId] = true;
    await session.send("图片加载中请稍等...");
    const { resourceSetName, characterId } = randomCharacter();
    const nicknames = getNicknames(characterId);
    let imageArrayBuffer;
    let imageUrl;
    try {
      if (import_koishi.Random.bool(0.5)) {
        imageUrl = `https://bestdori.com/assets/jp/characters/resourceset/${resourceSetName}_rip/card_after_training.png`;
        if ((await ctx.http.get(imageUrl, { responseType: "text" })).includes("We're sorry but Bestdori!")) {
          imageUrl = `https://bestdori.com/assets/jp/characters/resourceset/${resourceSetName}_rip/card_normal.png`;
          imageArrayBuffer = await ctx.http.get(imageUrl, { responseType: "arraybuffer" });
        } else {
          imageArrayBuffer = await ctx.http.get(imageUrl, { responseType: "arraybuffer" });
        }
      } else {
        imageUrl = `https://bestdori.com/assets/jp/characters/resourceset/${resourceSetName}_rip/card_normal.png`;
        imageArrayBuffer = await ctx.http.get(imageUrl, { responseType: "arraybuffer" });
      }
    } catch {
      games[session.channelId] = false;
      return "下载图片时遇到网络错误";
    }
    const image = Buffer.from(imageArrayBuffer);
    const cropedImages = await randomCropImage(image, config.cutWidth, config.cutLength);
    const message = `时间${config.bbctimeout}秒~
猜猜我是谁：
${import_koishi.h.image(cropedImages[0], "image/jpeg")}
${import_koishi.h.image(cropedImages[1], "image/jpeg")}
${import_koishi.h.image(cropedImages[2], "image/jpeg")}
${config.recrop ? `(输入 重切 可以重新随机裁剪图片，至多${config.max_recrop_times}次)` : ""}
(如果猜不出来输入 bzd 可以查看答案)`;
    await session.send(message);
    let cropTimes = 0;
    const dispose = ctx.channel(session.channelId).middleware(async (session2, next) => {
      if (nicknames.includes(session2.content.toLowerCase())) {
        dispose();
        disposeTimer();
        games[session2.channelId] = false;
        await session2.send(`正确，${nicknames[7]}：${imageUrl}`);
        await session2.send(`${import_koishi.h.at(session2.userId)} ${config.phrase_answered}${session2.content.toLowerCase()}
${import_koishi.h.image(image, "image/jpeg")}`);
      } else if (session2.content === "bzd") {
        dispose();
        disposeTimer();
        games[session2.channelId] = false;
        await session2.send(`${import_koishi.h.at(session2.userId)} ${config.phrase_bzd}${nicknames[7]}
${import_koishi.h.image(image, "image/jpeg")}`);
      } else if (session2.content === "重切") {
        if (!config.recrop) {
          return next();
        } else if (cropTimes >= config.max_recrop_times) {
          await session2.send(`已经重切了${config.max_recrop_times}次了哦~`);
        } else {
          cropTimes++;
          await session2.send("正在重新裁剪请稍等...");
          const recropedImages = await randomCropImage(image, config.cutWidth, config.cutLength);
          await session2.send(`${import_koishi.h.at(session2.userId)}</br>${import_koishi.h.image(recropedImages[0], "image/jpeg")}
${import_koishi.h.image(recropedImages[1], "image/jpeg")}
${import_koishi.h.image(recropedImages[2], "image/jpeg")}`);
        }
      } else {
        return next();
      }
    }, true);
    const disposeTimer = ctx.setTimeout(async () => {
      if (games[session.channelId]) {
        dispose();
        games[session.channelId] = false;
        await session.send(`${config.phrase_timeout}${nicknames[7]}
${import_koishi.h.image(image, "image/jpeg")}`);
      }
    }, config.bbctimeout * 1e3);
  });
  function randomCharacter() {
    const characters = JSON.parse(import_node_fs.default.readFileSync(import_node_path.default.join(__dirname, "./../resource/all5_2.json"), "utf-8"));
    return characters[import_koishi.Random.pick(Object.keys(characters))];
  }
  __name(randomCharacter, "randomCharacter");
  function getNicknames(characterId) {
    const allNicknames = JSON.parse(import_node_fs.default.readFileSync(import_node_path.default.join(__dirname, "./../resource/nickname.json"), "utf-8"));
    return allNicknames[characterId];
  }
  __name(getNicknames, "getNicknames");
  async function randomCropImage(imageBuffer, cutWidth, cutLength) {
    const image = await import_jimp.Jimp.read(imageBuffer);
    let images = [];
    for (let i = 1; i <= 3; i++) {
      const x = Math.floor(Math.random() * (image.bitmap.width - cutWidth));
      const y = Math.floor(Math.random() * (image.bitmap.height - cutLength));
      images.push(await image.clone().crop({ x, y, w: cutWidth, h: cutLength }).getBuffer("image/jpeg"));
    }
    return images;
  }
  __name(randomCropImage, "randomCropImage");
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name,
  reusable,
  usage
});
