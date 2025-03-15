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
var import_koishi = require("koishi");
var import_node_os = require("node:os");
var import_node_path = require("node:path");
var import_promises = require("node:fs/promises");
var import_gifuct_js = require("gifuct-js");
var import_node_fs = require("node:fs");
var { readFile } = import_node_fs.promises;
var name = "gif-reverse";
var inject = {
  required: ["http", "i18n", "logger", "ffmpeg"]
};
var usage = `
---

<table>
<thead>
<tr>
<th>选项</th>
<th>简写</th>
<th>描述</th>
<th>类型</th>
<th>默认值</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>--forward</code></td>
<td><code>-f</code></td>
<td>正向播放 GIF</td>
<td><code>boolean</code></td>
<td><code>true</code></td>
</tr>
<tr>
<td><code>--reverse</code></td>
<td><code>-r</code></td>
<td>倒放 GIF</td>
<td><code>boolean</code></td>
<td></td>
</tr>
<tr>
<td><code>--speed</code></td>
<td><code>-s</code></td>
<td>改变播放速度 (大于 1 为加速，小于则为减速)</td>
<td><code>number</code></td>
<td><code>1</code></td>
</tr>
<tr>
<td><code>--slide</code></td>
<td><code>-l</code></td>
<td>滑动方向 (左/右/上/下)</td>
<td><code>string</code></td>
<td></td>
</tr>
<tr>
<td><code>--rotate</code></td>
<td><code>-o</code></td>
<td>旋转方向 (顺/逆)</td>
<td><code>string</code></td>
<td></td>
</tr>
<tr>
<td><code>--mirror</code></td>
<td><code>-m</code></td>
<td>翻转方向 (上/下/左/右)</td>
<td><code>string</code></td>
<td></td>
</tr>
</tbody>
</table>

---

<h2>使用示例</h2>

<ul>
<li><strong>倒放 GIF:</strong>
<pre><code>gif -r</code></pre>
</li>
<li><strong>两倍速右滑 GIF:</strong>
<pre><code>gif -f -s 2 -l 右</code></pre>
</li>
<li><strong>向左翻转 GIF:</strong>
<pre><code>gif -m 左</code></pre>
</li>
<li><strong>逆时针旋转 GIF:</strong>
<pre><code>gif -o 逆</code></pre>
</li>
</ul>

---
`;
var Config = import_koishi.Schema.intersect([
  import_koishi.Schema.object({
    gifCommand: import_koishi.Schema.string().default("gif-reverse").description("注册的指令名称"),
    waitTimeout: import_koishi.Schema.number().default(50).description("等待用户输入图片的最大时间（秒）")
  }).description("基础设置"),
  import_koishi.Schema.object({
    loggerinfo: import_koishi.Schema.boolean().default(false).description("日志调试模式")
  }).description("高级设置")
]);
function apply(ctx, config) {
  const TMP_DIR = (0, import_node_os.tmpdir)();
  const logger = ctx.logger("gif-reverse");
  function logInfo(...args) {
    if (config.loggerinfo) {
      logger.info(...args);
    }
  }
  __name(logInfo, "logInfo");
  ctx.i18n.define("zh-CN", {
    commands: {
      [config.gifCommand]: {
        arguments: {
          gif: "图片消息"
        },
        description: "GIF 图片处理",
        messages: {
          "invalidPTS": "播放速度必须大于 0",
          "waitprompt": "在 {0} 秒内发送想要处理的 GIF",
          "invalidimage": "未检测到图片输入。",
          "invalidGIF": "无法处理非 GIF 图片。",
          "generatefailed": "图片生成失败。",
          "invalidDirection": "无效的方向参数，请选择：左、右、上、下",
          "invalidRotation": "无效的旋转方向，请选择：顺、逆",
          "invalidMirror": "无效的翻转方向，请选择：上、下、左、右"
        },
        options: {
          help: "查看指令帮助",
          forward: "正向播放 GIF（默认）",
          reverse: " 倒放 GIF",
          speed: " 改变播放速度 (大于 1 为加速，小于则为减速)",
          slide: "滑动方向 (左/右/上/下)",
          rotate: "旋转方向 (顺/逆)",
          mirror: "翻转方向 (上/下/左/右)"
        }
      }
    }
  });
  ctx.command(`${config.gifCommand} [gif:image]`).option("forward", "-f, --forward", { type: "boolean", fallback: true }).option("reverse", "-r, --reverse", { type: "boolean" }).option("speed", "-s <times:number>", { type: "string", fallback: 1 }).option("slide", "-l <direction:string>", { type: "string" }).option("rotate", "-o <direction:string>", { type: "string" }).option("mirror", "-m <direction:string>", { type: "string" }).example(`倒放：${config.gifCommand} -r`).example(`两倍速右滑：${config.gifCommand} -f -s 2 -l 右`).example(`向左翻转：${config.gifCommand} -m 左`).example(`逆时针旋转：${config.gifCommand} -o 逆`).action(async ({ session, options }, gif) => {
    const { reverse, forward, speed, slide, rotate, mirror } = options;
    if (speed <= 0) return session.text(".invalidPTS");
    let src = gif?.src;
    if (!src) {
      const [msgId] = await session.send(session.text(".waitprompt", [config.waitTimeout]));
      const content = await session.prompt(config.waitTimeout * 1e3);
      if (content !== void 0) {
        src = import_koishi.h.select(content, "img")[0]?.attrs.src ?? import_koishi.h.select(content, "mface")[0]?.attrs.url;
      }
      try {
        session.bot.deleteMessage(session.channelId, msgId);
      } catch {
      }
    }
    const quote = import_koishi.h.quote(session.messageId);
    if (!src) return `${quote}${session.text(".invalidimage")}`;
    const file = await ctx.http.file(src);
    if (!["image/gif", "application/octet-stream", "video/mp4"].includes(file.type)) {
      return `${quote}${session.text(".invalidGIF")}`;
    }
    const path = (0, import_node_path.join)(TMP_DIR, `gif-reverse-${Date.now()}`);
    await (0, import_promises.writeFile)(path, Buffer.from(file.data));
    let vf = "";
    const filters = [];
    let gifDuration = 0;
    try {
      const gifData = await readFile(path);
      const gif2 = (0, import_gifuct_js.parseGIF)(gifData);
      const frames = (0, import_gifuct_js.decompressFrames)(gif2, true);
      gifDuration = frames.map((frame) => frame.delay).reduce((a, b) => a + b, 0) / 1e3;
    } catch (error) {
      logger.error("解析 GIF 时发生错误:", error);
      return `${quote}${session.text(".generatefailed")}`;
    }
    if (reverse) {
      filters.push("reverse");
      if (speed !== 1) {
        filters.push(`setpts=PTS/${speed}`);
      }
      logInfo(`应用倒放效果，速度: ${speed}`);
    } else if (forward) {
      if (speed !== 1) {
        filters.push(`setpts=PTS/${speed}`);
      }
      logInfo(`应用正放效果，速度: ${speed}`);
    }
    if (rotate) {
      let rotateAngle = "";
      switch (rotate) {
        case "顺":
          rotateAngle = `rotate=${360 / gifDuration}*t*PI/180`;
          logInfo(`应用顺时针旋转效果, 旋转速度: ${360 / gifDuration} 度/秒`);
          break;
        case "逆":
          rotateAngle = `rotate=-${360 / gifDuration}*t*PI/180`;
          logInfo(`应用逆时针旋转效果, 旋转速度: ${360 / gifDuration} 度/秒`);
          break;
        default:
          return `${quote}${session.text(".invalidRotation")}`;
      }
      filters.push(rotateAngle);
    }
    if (mirror) {
      let mirrorEffect = "";
      switch (mirror) {
        case "上":
        case "下":
          mirrorEffect = "vflip";
          logInfo(`应用上下翻转效果`);
          break;
        case "左":
        case "右":
          mirrorEffect = "hflip";
          logInfo(`应用左右翻转效果`);
          break;
        default:
          return `${quote}${session.text(".invalidMirror")}`;
      }
      filters.push(mirrorEffect);
    }
    if (slide) {
      try {
        const fps = 20;
        const outputDuration = gifDuration / speed;
        const totalFrames = Math.ceil(outputDuration * fps);
        switch (slide) {
          case "左":
            filters.unshift(
              // 使用 unshift 确保拼接操作在最前
              `split[a][b];[a][b]hstack[tiled];[tiled]crop=iw/2:ih:x='t*(iw/2)/${outputDuration}':y=0,setpts=PTS-STARTPTS`
            );
            break;
          case "右":
            filters.unshift(
              `split[a][b];[a][b]hstack[tiled];[tiled]crop=iw/2:ih:x='iw/2 - t*(iw/2)/${outputDuration}':y=0,setpts=PTS-STARTPTS`
            );
            break;
          case "上":
            filters.unshift(
              `split[a][b];[a][b]vstack[tiled];[tiled]crop=iw:ih/2:x=0:y='t*(ih/2)/${outputDuration}',setpts=PTS-STARTPTS`
            );
            break;
          case "下":
            filters.unshift(
              `split[a][b];[a][b]vstack[tiled];[tiled]crop=iw:ih/2:x=0:y='ih/2 - t*(ih/2)/${outputDuration}',setpts=PTS-STARTPTS`
            );
            break;
          default:
            return `${quote}${session.text(".invalidDirection")}`;
        }
        logInfo(`应用${slide}方向滑动效果，总帧数: ${totalFrames}`);
      } catch (error) {
        logger.error("解析 GIF 时发生错误:", error);
        return `${quote}${session.text(".generatefailed")}`;
      }
    }
    filters.push("split[s0][s1];[s0]palettegen=stats_mode=full[p];[s1][p]paletteuse=dither=none");
    vf = filters.filter((f) => f).join(",");
    const builder = ctx.ffmpeg.builder().input(path);
    builder.outputOption("-r", String(20), "-loop", "0");
    if (vf) {
      logInfo(`使用的滤镜: ${vf}`);
      builder.outputOption("-filter_complex", vf, "-f", "gif");
    } else {
      builder.outputOption("-f", "gif");
    }
    let buffer;
    try {
      buffer = await builder.run("buffer");
    } catch (e) {
      logger.error("FFmpeg 执行失败", e);
      (0, import_promises.unlink)(path);
      return `${quote}${session.text(".generatefailed")}`;
    }
    (0, import_promises.unlink)(path);
    if (buffer.length === 0) {
      logger.error("FFmpeg 返回空 buffer");
      return `${quote}${session.text(".generatefailed")}`;
    }
    logInfo(`GIF 处理成功，选项: ${JSON.stringify(options)}`);
    return [quote, import_koishi.h.img(buffer, "image/gif")];
  });
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
