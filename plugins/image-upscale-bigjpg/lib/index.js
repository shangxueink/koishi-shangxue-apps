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
  name: () => name,
  usage: () => usage
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var name = "image-upscale-bigjpg";
var usage = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>Bigjpg 图片放大插件使用说明</title>
</head>
<body>
<h2>bigjpg 图片放大</h2>
<ul>
<li>支持将图片通过指定的风格进行放大，支持风格化和降噪处理</li>
<li>支持自动查询任务状态，根据配置返回放大后的图片链接、图片或者原始 JSON 数据</li>
<li>提供灵活的配置选项，包括超时时间、自动查询间隔、自定义提示信息等</li>
<li>提供日志调试功能，帮助用户追踪和解决问题</li>
</ul>

---

<h2>使用方法</h2>
<h3>图片放大指令</h3>
<p>用户可以通过 <code>放大图片</code> 命令来上传并放大图片。可以指定放大风格、降噪程度和放大倍数：</p>
<ul>
<li><strong>指令格式</strong>：</li>
</ul>
<pre><code>/放大图片 -s &lt;style&gt; -n &lt;noise&gt; -x &lt;x2&gt;</code></pre>
<ul>
<li><code>-s &lt;style&gt;</code>：指定放大风格，支持 <code>art</code>（卡通插画）和 <code>photo</code>（照片）。</li>
<li><code>-n &lt;noise&gt;</code>：指定降噪程度，支持 <code>-1</code>（无降噪）、<code>0</code>（低降噪）、<code>1</code>（中降噪）、<code>2</code>（高降噪）、<code>3</code>（最高降噪）。</li>
<li><code>-x &lt;x2&gt;</code>：指定放大倍数，支持 <code>1</code>（2x）、<code>2</code>（4x）、<code>3</code>（8x）、<code>4</code>（16x）。</li>
</ul>
<p>例子：</p>
<pre><code>/放大图片 -s art -n 0 -x 2</code></pre>

<h3>查询任务状态</h3>
<p>用户可以使用 <code>查询任务状态 &lt;taskIds...&gt;</code> 来查询已提交任务的状态。任务状态会根据配置返回图片、链接或者 JSON 数据。</p>
<p>例子：</p>
<pre><code>/查询任务状态 dfed390aaa154bf7a9e10dabf93fd7a9</code></pre>

---

<h2>获取 API 密钥</h2>
<p>在使用本插件之前，你需要前往 <a href="https://bigjpg.com/zh" target="_blank">Bigjpg 官网 https://bigjpg.com/zh</a> 注册并获取 API 密钥。此密钥是调用图片放大服务的必需参数。</p>
<p><a href="https://ghp.ci/https://raw.githubusercontent.com/shangxueink/koishi-shangxue-apps/main/koishi-plugin-image-upscale-bigjpg/2024-09-21_00-23-48.png" target="_blank">点击查看获取 API KEY 图解</a></p>

<p><a href="https://ghp.ci/https://raw.githubusercontent.com/shangxueink/koishi-shangxue-apps/main/koishi-plugin-image-upscale-bigjpg/2024-09-21_00-43-39.png" target="_blank">点击查看 Bigjpg 价格表</a></p>

<hr>
</body>
</html>
`;
var Config = import_koishi.Schema.intersect([
  import_koishi.Schema.object({
    apiKey: import_koishi.Schema.string().description("API 密钥").required(),
    timeout: import_koishi.Schema.number().description("等待上传图片的超时时间（单位：秒）").default(30).min(5).max(90),
    wait_text_tip: import_koishi.Schema.string().description("提交任务后返回的 文字提示").default("已经提交任务咯~ 任务ID为： ")
  }).description("基础设置"),
  import_koishi.Schema.object({
    bigjpg_style: import_koishi.Schema.union([
      import_koishi.Schema.const("art").description("卡通插画"),
      import_koishi.Schema.const("photo").description("照片")
    ]).role("radio").default("art").description("指定放大风格"),
    bigjpg_noise: import_koishi.Schema.union([
      import_koishi.Schema.const("-1").description("无降噪"),
      import_koishi.Schema.const("0").description("低降噪"),
      import_koishi.Schema.const("1").description("中降噪"),
      import_koishi.Schema.const("2").description("高降噪"),
      import_koishi.Schema.const("3").description("最高降噪")
    ]).role("radio").default("0").description("指定降噪程度"),
    bigjpg_x2: import_koishi.Schema.union([
      import_koishi.Schema.const("1").description("2x"),
      import_koishi.Schema.const("2").description("4x"),
      import_koishi.Schema.const("3").description("8x"),
      import_koishi.Schema.const("4").description("16x")
    ]).role("radio").default("2").description("指定放大倍数")
  }).description("默认请求设置"),
  import_koishi.Schema.object({
    auto_query: import_koishi.Schema.boolean().default(true).description("开启后，提交放大任务后，自动检查任务，返回图片"),
    auto_query_time: import_koishi.Schema.number().description("自动检查任务的时间间隔（单位：秒）").default(10).min(1).max(600),
    query_response_mode: import_koishi.Schema.union([
      import_koishi.Schema.const("text").description("仅返回放大后的图片链接（这个可能安全点）"),
      import_koishi.Schema.const("image").description("直接为发送放大后的图片（可能会被平台压缩等）"),
      import_koishi.Schema.const("raw").description("返回API的原始json数据（不是人用的）")
    ]).role("radio").default("text")
  }).description("返回设置"),
  import_koishi.Schema.object({
    loggerinfo: import_koishi.Schema.boolean().default(false).description("日志调试模式")
  }).description("调试设置")
]);
function apply(ctx, config) {
  const API_KEY = config.apiKey;
  const UPSCALE_URL = "https://bigjpg.com/api/task/";
  function logInfo(message) {
    if (config.loggerinfo) {
      ctx.logger.info(message);
    }
  }
  __name(logInfo, "logInfo");
  async function upscaleImage(style, noise, x2, input) {
    logInfo(`开始放大图片，参数: style=${style}, noise=${noise}, x2=${x2}, input=${input}`);
    try {
      const response = await fetch(UPSCALE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": API_KEY
        },
        body: JSON.stringify({
          style,
          noise,
          x2,
          input
        })
      });
      const result = await response.json();
      logInfo(`放大图片响应: ${JSON.stringify(result)}`);
      if (response.ok && result.tid) {
        return `任务提交成功！任务ID：${result.tid}`;
      } else {
        return `提交失败：${result.error || "未知错误"}`;
      }
    } catch (error) {
      logInfo(`放大图片请求失败: ${error.message}`);
      return `请求失败：${error.message}`;
    }
  }
  __name(upscaleImage, "upscaleImage");
  async function queryTaskStatus(taskIds) {
    logInfo(`查询任务状态，任务ID: ${taskIds.join(",")}`);
    try {
      const url = `${UPSCALE_URL}${taskIds.join(",")}`;
      const response = await fetch(url);
      const result = await response.json();
      logInfo(`查询任务状态响应: ${JSON.stringify(result)}`);
      if (response.ok) {
        return result;
      } else {
        return `查询失败：${result.error || "未知错误"}`;
      }
    } catch (error) {
      logInfo(`查询任务状态请求失败: ${error.message}`);
      return `查询失败：${error.message}`;
    }
  }
  __name(queryTaskStatus, "queryTaskStatus");
  ctx.command("bigjpg", "图片放大相关指令");
  ctx.command("bigjpg/放大图片", "放大图片").option("style", "-s <style:string> 指定放大风格。参数有 art, photo 分别表示 卡通插画, 照片", {
    fallback: config.bigjpg_style
  }).option("noise", "-n <noise:string> 指定降噪程度。参数有 -1, 0, 1, 2, 3 分别表示降噪程度 无, 低, 中, 高, 最高", {
    fallback: config.bigjpg_noise
  }).option("x2", "-x <x2:string> 指定放大倍数。参数有 1, 2, 3, 4 分别表示 2x, 4x, 8x, 16x", {
    fallback: config.bigjpg_x2
  }).action(async ({ session, options }) => {
    logInfo("等待用户发送图片...");
    await session.send("请发送一个图片");
    const inputImage = await session.prompt(config.timeout * 1e3);
    const input = import_koishi.h.select(inputImage, "img").map((item) => item.attrs.src)[0];
    if (!input) {
      logInfo("未检测到有效的图片");
      return "未检测到有效的图片，请重新发送。";
    }
    logInfo(`用户发送的图片链接: ${input}`);
    logInfo(`放大参数：风格：${options.style}，降噪程度：${options.noise}，放大倍数：${options.x2}`);
    const response = await upscaleImage(
      options.style,
      options.noise,
      options.x2,
      input
    );
    if (response.startsWith("任务提交成功")) {
      const taskId = response.split("：")[1];
      logInfo(`自动查询任务状态，任务ID：${taskId}`);
      await session.send(`${config.wait_text_tip}${taskId}`);
      if (config.auto_query) {
        let taskStatus;
        let attempts = 0;
        do {
          await new Promise((resolve) => setTimeout(resolve, config.auto_query_time * 1e3));
          taskStatus = await queryTaskStatus([taskId]);
          attempts++;
        } while (taskStatus[taskId]?.status !== "success" && attempts < 10);
        if (taskStatus[taskId]?.status === "success") {
          const imageUrl = taskStatus[taskId].url;
          if (config.query_response_mode === "text") {
            return `放大后的图片链接：${imageUrl}`;
          } else if (config.query_response_mode === "image") {
            await session.send(import_koishi.h.image(imageUrl));
            return;
          } else if (config.query_response_mode === "raw") {
            return JSON.stringify(taskStatus, null, 2);
          }
        } else {
          return `任务查询失败或超时，请稍后重试。任务ID：${taskId}`;
        }
      } else {
        return response;
      }
    } else {
      return response;
    }
  });
  ctx.command("bigjpg/查询任务状态 <taskIds...>", "查询任务状态").action(async ({ session }, ...taskIds) => {
    if (taskIds.length === 0) {
      return "请提供至少一个任务ID。";
    }
    const response = await queryTaskStatus(taskIds);
    if (Object.keys(response).length === 0) {
      return "未找到对应的任务，请检查任务ID是否正确。";
    }
    for (const taskId in response) {
      if (response[taskId].status === "success") {
        const imageUrl = response[taskId].url;
        if (config.query_response_mode === "text") {
          await session.send(`任务ID：${taskId}，放大后的图片链接：${imageUrl}`);
        } else if (config.query_response_mode === "image") {
          await session.send(import_koishi.h.image(imageUrl));
        } else if (config.query_response_mode === "raw") {
          await session.send(JSON.stringify(response, null, 2));
        }
      } else {
        await session.send(`任务ID：${taskId}，状态：${response[taskId].status}`);
      }
    }
  });
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  name,
  usage
});
