import { Context, Schema, h, Random } from "koishi";
import fs from "node:fs";
import path from "node:path";
import { Jimp } from "jimp";

export const reusable = true; // 声明此插件可重用

export const name = "bangbangcai";

export const inject = {
  required: ["database"],
};

export const usage = `
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

export const Config =
  Schema.intersect([
    Schema.object({
      bbc_command: Schema.string().default("bbc").description("`游戏开始`的指令名称"),
      bbc_recrop_command: Schema.string().default("bbc重切").description("`重新切片`的指令名称"),
    }).description('基础设置'),
    Schema.object({
      textMessage: Schema.string().description("`猜谜`提示语1").default("时间60秒~\n猜猜我是谁："),
      phrase_timeout: Schema.array(String).role("table").description("`超时结束`时 提示：").default(["60秒到了~\n答案是："]),
      phrase_answered: Schema.array(String).role("table").description("`回答正确`时 提示：").default(["不赖，你还懂"]),
      phrase_bzd: Schema.array(String).role("table").description("触发`不知道`时 提示：").default(["游戏结束，这是："]),
    }).description('进阶设置'),
    Schema.object({
      bbctimeout: Schema.number().default(60).description("游戏持续(计时)的 时长（秒）"),
      recrop: Schema.boolean().default(false).description("玩家是否可以重新裁剪图片"),
      max_recrop_times: Schema.number().default(3).min(0).max(15).step(1).description("允许`重新切片`的最大次数").role("slider"),
    }).description('交互设置'),
    Schema.object({
      cutWidth: Schema.number().default(200).description("卡片剪裁 宽度"),
      cutLength: Schema.number().default(150).description("卡片剪裁 高度"),
    }).description('高级设置'),
  ]);

interface Gaming {
  [channelId: string]: boolean
}

export async function apply(ctx: Context, config) {
  let games: Gaming = {}

  ctx.command(config.bbc_command)
    .action(async ({session}) => {
      if (games[session.channelId]) {
        return "当前已有正在进行的游戏"
      }

      games[session.channelId] = true

      await session.send("图片加载中请稍等...")
      const {resourceSetName, characterId} = randomCharacter()
      const nicknames = getNicknames(characterId)

      let imageArrayBuffer: ArrayBuffer
      let imageUrl: string
      try {
        if (Random.bool(0.5)) {
          imageUrl = `https://bestdori.com/assets/jp/characters/resourceset/${resourceSetName}_rip/card_after_training.png`
          if ((await ctx.http.get(imageUrl, {responseType: "text"})).includes("We're sorry but Bestdori!")) {
            imageUrl = `https://bestdori.com/assets/jp/characters/resourceset/${resourceSetName}_rip/card_normal.png`
            imageArrayBuffer = await ctx.http.get(imageUrl, {responseType: "arraybuffer"})
          } else {
            imageArrayBuffer = await ctx.http.get(imageUrl, {responseType: "arraybuffer"})
          }
        } else {
          imageUrl = `https://bestdori.com/assets/jp/characters/resourceset/${resourceSetName}_rip/card_normal.png`
          imageArrayBuffer = await ctx.http.get(imageUrl, {responseType: "arraybuffer"})
        }
      } catch {
        games[session.channelId] = false
        return "下载图片时遇到网络错误"
      }

      const image = Buffer.from(imageArrayBuffer)
      const cropedImages = await randomCropImage(image, config.cutWidth, config.cutLength)
      const message = `时间${config.bbctimeout}秒~
猜猜我是谁：
${h.image(cropedImages[0], "image/jpeg")}
${h.image(cropedImages[1], "image/jpeg")}
${h.image(cropedImages[2], "image/jpeg")}
${config.recrop ? `(输入 重切 可以重新随机裁剪图片，至多${config.max_recrop_times}次)` : ""}
(如果猜不出来输入 bzd 可以查看答案)`

      await session.send(message)

      let cropTimes = 0

      const dispose = ctx.channel(session.channelId).middleware(async (session, next) => {
        if (nicknames.includes(session.content.toLowerCase())) {
          dispose()
          disposeTimer()
          games[session.channelId] = false
          await session.send(`正确，${nicknames[7]}：${imageUrl}`)
          await session.send(`${h.at(session.userId)} ${config.phrase_answered}${session.content.toLowerCase()}\n${h.image(image, "image/jpeg")}`)
        } else if (session.content === "bzd") {
          dispose()
          disposeTimer()
          games[session.channelId] = false
          await session.send(`${h.at(session.userId)} ${config.phrase_bzd}${nicknames[7]}\n${h.image(image, "image/jpeg")}`)
        } else if (session.content === "重切") {
          if (!config.recrop) {
            return next()
          } else if (cropTimes >= config.max_recrop_times) {
            await session.send(`已经重切了${config.max_recrop_times}次了哦~`)
          } else {
            cropTimes++
            await session.send("正在重新裁剪请稍等...")
            const recropedImages = await randomCropImage(image, config.cutWidth, config.cutLength)
            await session.send(`${h.at(session.userId)}</br>${h.image(recropedImages[0], "image/jpeg")}
${h.image(recropedImages[1], "image/jpeg")}
${h.image(recropedImages[2], "image/jpeg")}`)
          }
        } else {
          return next()
        }
      }, true)

      const disposeTimer = ctx.setTimeout(async () => {
        if (games[session.channelId]) {
          dispose()
          games[session.channelId] = false
          await session.send(`${config.phrase_timeout}${nicknames[7]}\n${h.image(image, "image/jpeg")}`)
        }
      }, config.bbctimeout * 1000)
    })

  function randomCharacter() {
    const characters = JSON.parse(fs.readFileSync(path.join(__dirname, "./../resource/all5_2.json"), "utf-8"))
    return characters[Random.pick(Object.keys(characters))]
  }

  function getNicknames(characterId: string): string[] {
    const allNicknames = JSON.parse(fs.readFileSync(path.join(__dirname, "./../resource/nickname.json"), "utf-8"))
    return allNicknames[characterId]
  }

  async function randomCropImage(imageBuffer: Buffer, cutWidth: number, cutLength: number): Promise<Buffer[]> {
      const image = await Jimp.read(imageBuffer);
      let images: Buffer[] = []
      for (let i = 1; i <= 3; i++) {
        const x = Math.floor(Math.random() * (image.bitmap.width - cutWidth));
        const y = Math.floor(Math.random() * (image.bitmap.height - cutLength));
        images.push(await image
          .clone()
          .crop({ x: x, y: y, w: cutWidth, h: cutLength })
          .getBuffer("image/jpeg"))
      }
      return images
  }
}

