import { Schema, h, Context, Session } from "koishi";
import { } from "koishi-plugin-puppeteer";

import { command1Config, applyCommand1 } from "./commands/command1";
import { command2Config, applyCommand2 } from "./commands/command2";
import { command3Config, applyCommand3 } from "./commands/command3";
import { command4Config, applyCommand4 } from "./commands/command4";

export const name = "patina";

export const inject = {
  required: ["http", "logger", "puppeteer"]
};

export const usage = `
<details>
<summary>点击此处查看——幻影坦克</summary>
<p>如果你需要更详细地了解这个项目，请前往 
<a href="https://uyanide.github.io/Mirage_Colored/" target="_blank">https://uyanide.github.io/Mirage_Colored/</a>
<h2>功能示例</h2>
<ul>
<li><code>幻影</code>：指令触发后，系统会提示上传两张图片。</li>
<li><code>幻影 [图片]</code>：上传一张图片作为表图，系统会提示上传里图。</li>
<li><code>幻影 [图片] [图片]</code>：上传两张图片，分别作为表图和里图。</li>
<li><code>幻影 QQ号 QQ号</code>：使用两个 QQ 号的头像作为表图和里图。</li>
<li><code>幻影 @用户 @用户</code>：使用两个用户的头像作为表图和里图。</li>
</ul>
<pre>
幻影坦克  [图片] [图片] -c -s 1200 -w 0.7
</pre>
<p>触发指令后会返回处理后的图片。</p>
<h3>参数说明</h3>
<ul>
<li><code>-c</code>：开启全彩输出，关闭则为黑白图。</li>
<li><code>-s &lt;size&gt;</code>：指定输出图像尺寸，默认值为 1200。</li>
<li><code>-w &lt;weight&gt;</code>：设置里图混合权重，范围为 0 到 1，默认值为 0.7。</li>
</ul>
<p>如果不指定参数，将使用默认配置。</p>
</details>


<details>
<summary>点击此处查看——像素化</summary>
<p>如果你需要更详细地了解这个项目，请前往 
<a href="https://lab.miguelmota.com/pixelate/example/" target="_blank">https://lab.miguelmota.com/pixelate/example/</a>
<h2>功能示例</h2>
<ul>
<li><code>像素化</code>：指令触发后，系统会提示上传图片。</li>
<li><code>像素化 [图片]</code>：上传一张图片，并且返回像素化之后的图。</li>
<li><code>幻影 QQ号</code>：使用 QQ 号的头像，并且返回像素化之后的图。</li>
<li><code>幻影 @用户</code>：使用用户的头像，并且返回像素化之后的图。</li>
</ul>
<pre>
像素化  [图片] -p 90
</pre>
<p>触发指令后会返回处理后的图片。</p>
<h3>参数说明</h3>
<ul>
<li><code>-p</code>：像素化百分比，越高越抽象。</li>
</ul>
<p>如果不指定参数，将使用默认配置。</p>
</details>

<details>
<summary>点击此处查看——相机镜框滤镜</summary>
<h2>功能示例</h2>
<ul>
<li><code>相机镜框</code>：指令触发后，系统会提示上传图片。</li>
<li><code>相机镜框 [图片]</code>：上传一张图片，并且返回添加相机镜框之后的图。</li>
<li><code>相机镜框 QQ号</code>：使用 QQ 号的头像，并且返回添加相机镜框之后的图。</li>
<li><code>相机镜框 @用户</code>：使用用户的头像，并且返回添加相机镜框之后的图。</li>
</ul>
<pre>
相机镜框  [图片]
</pre>
<p>触发指令后会返回处理后的图片。</p>
<h3>参数说明</h3>
<p>此功能目前没有可配置的指令参数，但可以通过插件配置调整图片对齐方式和压缩质量。</p>
</details>

<details>
<summary>点击此处查看——光棱坦克</summary>
<p>如果你需要更详细地了解这个项目，请前往 
<a href="https://prism.uyanide.com/" target="_blank">https://prism.uyanide.com/</a>
<h2>功能示例</h2>
<ul>
<li><code>光棱</code>：指令触发后，系统会提示上传两张图片。</li>
<li><code>光棱 [图片]</code>：上传一张图片作为里图，系统会提示上传表图。</li>
<li><code>光棱 [图片] [图片]</code>：上传两张图片，分别作为里图和表图。</li>
<li><code>光棱 QQ号 QQ号</code>：使用两个 QQ 号的头像作为里图和表图。</li>
<li><code>光棱 @用户 @用户</code>：使用两个用户的头像作为里图和表图。</li>
</ul>
<pre>
光棱  [图片] [图片] -c -s 1200 -it 32 -ct 96
</pre>
<p>触发指令后会返回处理后的图片。通过拉高曝光度和亮度可以看到里图。</p>
<h3>参数说明</h3>
<ul>
<li><code>-c</code>：开启全彩输出，关闭则为黑白图。</li>
<li><code>-s &lt;size&gt;</code>：指定输出图像尺寸，默认值为 1200。</li>
<li><code>-it &lt;threshold&gt;</code>：设置里图色阶端点，范围为 0 到 128，默认值为 32。</li>
<li><code>-ct &lt;threshold&gt;</code>：设置表图色阶端点，范围为 0 到 128，默认值为 96。</li>
<li><code>-ic &lt;contrast&gt;</code>：设置里图对比度，范围为 0 到 100，默认值为 50。</li>
<li><code>-cc &lt;contrast&gt;</code>：设置表图对比度，范围为 0 到 100，默认值为 50。</li>
<li><code>-r</code>：开启反向隐写。</li>
</ul>
<p>如果不指定参数，将使用默认配置。</p>
</details>


---

> 目前就这几个指令 ，以后有什么好玩的再加。

---
</body>
</html>
`;

export const Config = Schema.intersect([
  Schema.object({
    enablecommand1: Schema.boolean().description("是否启用此功能").default(true),
  }).description('幻影坦克生成器'),
  command1Config,

  Schema.object({
    enablecommand2: Schema.boolean().description("是否启用此功能").default(true),
  }).description('像素化'),
  command2Config,

  Schema.object({
    enablecommand3: Schema.boolean().description("是否启用此功能").default(true),
  }).description('相机镜框滤镜'),
  command3Config,

  Schema.object({
    enablecommand4: Schema.boolean().description("是否启用此功能").default(true),
  }).description('光棱坦克生成器'),
  command4Config,

  Schema.object({
    loggerinfo: Schema.boolean().default(false).description("日志调试模式"),
  }).description('调试设置'),
]);

export function apply(ctx: Context, config: any) {

  ctx.command("patina", "网页小合集")

  applyCommand1(ctx, config, loggerinfo, extractImageUrl);
  applyCommand2(ctx, config, loggerinfo, extractImageUrl);
  applyCommand3(ctx, config, loggerinfo, extractImageUrl);
  applyCommand4(ctx, config, loggerinfo, extractImageUrl);

  function loggerinfo(...args: any[]) {
    if (config.loggerinfo) {
      (ctx.logger.info as (...args: any[]) => void)(...args);
    }
  }

  async function extractImageUrl(session: Session, input: string) {
    const parsedElements = h.parse(input);
    // 遍历解析后的元素
    for (const element of parsedElements) {
      // 检查是否为 'at' 类型
      if (element.type === 'at') {
        const { id } = element.attrs;
        if (id) {
          // 返回 QQ 头像 URL
          if (typeof session.bot.getUser === 'function') {
            const getUserdata = await session.bot.getUser(id)
            loggerinfo(getUserdata)
            return getUserdata.avatar
          } else {
            return `暂不支持通过at获取用户头像哦`;
          }
        }
      }

      // 检查是否为 'img' 类型
      if (element.type === 'img') {
        const { src } = element.attrs;
        if (src) {
          // 返回图片的 src 属性
          return src;
        }
      }
    }

    // 检查输入是否为纯数字（QQ 号）
    if (/^\d+$/.test(input)) {
      return `http://q.qlogo.cn/headimg_dl?dst_uin=${input}&spec=640`;
    }

    // 如果未找到有效的图片 URL，返回原始输入
    return input;
  }

}