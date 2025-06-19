"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.inject = exports.name = void 0;
const { Schema, Logger, h } = require("koishi");

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const nodeurl = require('node:url');

exports.name = "patina";
exports.inject = {
  required: ["http", "logger", "puppeteer"]
};
exports.usage = `
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


---

> 目前就这几个指令 ，以后有什么好玩的再加。

---
</body>
</html>
`;

exports.Config = Schema.intersect([
  Schema.object({
    enablecommand1: Schema.boolean().description("是否启用此功能").default(true),
  }).description('幻影坦克生成器'),
  Schema.union([
    Schema.object({
      enablecommand1: Schema.const(false).required(),
    }),
    Schema.object({
      enablecommand1: Schema.const(true),
      Full_color_output: Schema.boolean().default(false).description("全彩输出，关闭后变成黑白图<br>黑白可能效果更好  可以前往 https://uyanide.github.io/Mirage_Colored/ 体验"),
      Output_Size: Schema.number().default(1200).description("输出尺寸<br>(指 长和宽 中的较大值)<br>(0 即为不指定)"),
      Mixed_Weight: Schema.number().role('slider').min(0).max(1).step(0.02).default(0.7).description("【里图】混合权重<br>数值越大 里图 越隐隐约约可以看见"),
    }),
  ]),

  Schema.object({
    enablecommand2: Schema.boolean().description("是否启用此功能").default(true),
  }).description('像素化'),
  Schema.union([
    Schema.object({
      enablecommand2: Schema.const(false).required(),
    }),
    Schema.object({
      enablecommand2: Schema.const(true),
      pixelate: Schema.number().role('slider').min(0).max(100).step(1).default(80).description("默认像素化百分比<br>原项目地址 https://lab.miguelmota.com/pixelate/example/"),
    }),
  ]),

  Schema.object({
    enablecommand3: Schema.boolean().description("是否启用此功能").default(true),
  }).description('相机镜框滤镜'),
  Schema.union([
    Schema.object({
      enablecommand3: Schema.const(false).required(),
    }),
    Schema.object({
      enablecommand3: Schema.const(true),
      cameraAlignmentLogic: Schema.union([
        Schema.const('居中填充').description('居中填充'),
        Schema.const('拉伸').description('拉伸'),
        Schema.const('适应').description('适应'),
      ]).role('radio').description('输入图片的对齐逻辑').default("居中填充"),
      camerascreenshotquality: Schema.number().role('slider').min(0).max(100).step(1).default(50).description('设置图片压缩质量（%）'),
    }),
  ]),


  Schema.object({
    loggerinfo: Schema.boolean().default(false).description("日志调试模式"),
  }).description('调试设置'),
]);



async function apply(ctx, config) {

  const loggerinfo = (message) => {
    if (config.loggerinfo) {
      ctx.logger.info(message);
    }
  };

  async function downloadImage(ctx, url, filepath) {
    const response = await ctx.http.get(url);
    const buffer = Buffer.from(await response);
    fs.writeFileSync(filepath, buffer);
  }

  function generateTempFilePath() {
    const uniqueId = crypto.randomBytes(16).toString('hex');
    return path.join(__dirname, `temp-image-${uniqueId}.jpg`);
  }

  async function extractImageUrl(session, input) {
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

  ctx.command("patina", "网页小合集")

  if (config.enablecommand3) {
    ctx.command("patina/相机镜框 <image>", "为图片添加相机镜框")
      .alias("相机镜框")
      .example("相机镜框")
      .example("相机镜框 [图片]")
      .example("相机镜框 QQ号")
      .example("相机镜框 @用户")
      .action(async ({ session }, image) => {
        // 检查 puppeteer 是否可用
        if (!ctx.puppeteer) {
          await session.send("没有开启puppeteer服务");
          return;
        }

        // 检查用户是否提供了图片
        if (!image) {
          await session.send("请发送一张图片：");
          image = await session.prompt(30000);
        }

        // 提取图片 URL
        const imageURL = await extractImageUrl(session, image);
        loggerinfo(`图片URL: ${imageURL}`); // 记录日志，方便调试

        try {

          // 将用户图片转换为 Base64
          const userImageBase64 = await ctx.http.get(imageURL)
            .then(buffer => `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`);

          // 读取相机镜框图片
          const cameraFramePath = path.join(__dirname, './../html/pics/camera.png');
          const cameraFrameBuffer = fs.readFileSync(cameraFramePath);
          const cameraFrameBase64 = `data:image/png;base64,${cameraFrameBuffer.toString('base64')}`;

          // 使用 Puppeteer 处理图片
          const page = await ctx.puppeteer.page();

          let objectFitStyle = 'cover'; // 默认居中填充
          if (config.cameraAlignmentLogic === '拉伸') {
            objectFitStyle = 'fill';
          } else if (config.cameraAlignmentLogic === '适应') {
            objectFitStyle = 'contain';
          }

          // 设置 HTML 内容
          const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; }
    #container {
      position: relative;
      width: 1080px;
      height: 2400px;
    }
    #userImage {
      position: absolute;
      top: 9.82%;
      left: 0;
      width: 100%;
      height: 70%;
      object-fit: ${objectFitStyle}; /* 应用对齐逻辑 */
      z-index: 1;
    }
    #cameraFrame {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2;
    }
  </style>
</head>
<body>
  <div id="container">
    <img id="userImage" src="${userImageBase64}" />
    <img id="cameraFrame" src="${cameraFrameBase64}" />
  </div>
</body>
</html>
`;
          await page.setContent(htmlContent, { waitUntil: 'networkidle2' });

          // 截图
          const container = await page.$('#container');
          const outputImageBase64 = await container.screenshot({
            type: "jpeg",  // 使用 JPEG 格式
            encoding: "base64",
            quality: config.camerascreenshotquality  // 设置图片质量
          });

          // 发送图片
          if (outputImageBase64) {
            const imageUrl = `data:image/jpeg;base64,${outputImageBase64}`; // 构建 data URL
            await session.send(h.image(imageUrl)); // 使用 h.image(URL)
          } else {
            await session.send("处理图像时出错，请重试。");
          }

          if (page && !page?.isClosed()) {
            await page?.close();
          }

        } catch (error) {
          ctx.logger.error('处理图像时出错:', error);
          await session.send("处理图像时出错，请重试。");
        }
      });
  }

  if (config.enablecommand2) {
    ctx.command("patina/像素化 <image>", "像素化一张图")
      .alias("像素画")
      .example("像素化")
      .example("像素化 [图片]")
      .example("像素化 QQ号")
      .example("像素化 @用户")
      .option('pixelate', '-p <pixelate:number> 像素化百分比')
      .action(async ({ session, options }, image) => {
        // 检查 puppeteer 是否可用
        if (!ctx.puppeteer) {
          await session.send("没有开启puppeteer服务");
          return;
        }

        // 检查用户是否提供了图片
        if (!image) {
          await session.send("请发送一张图片：");
          image = await session.prompt(30000);
        }

        // 提取图片 URL
        const imageURL = await extractImageUrl(session, image);
        loggerinfo(`图片URL: ${imageURL}`); // 记录日志，方便调试

        try {
          // 将图片转换为 Base64
          const imageBase64 = await ctx.http.get(imageURL)
            .then(buffer => `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`);

          // 打开一个新的 Puppeteer 页面
          const page = await ctx.puppeteer.page();

          // 获取像素化百分比参数
          const pixelateValue = options.pixelate !== undefined ? options.pixelate : config.pixelate;
          loggerinfo(`像素化百分比: ${pixelateValue}`); // 记录日志，方便调试
          // 设置 HTML 内容
          const htmlContent = `
<!DOCTYPE html>
<html lang="en-US">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Pixelate.js</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: "Courier New", Courier, monospace;
      padding: 10px;
    }
    h1 {
      display: block;
      text-align: center;
      padding: 20px;
    }
    .container {
      max-width: 700px;
      margin: 0 auto;
    }
    .image {
      width: 100%;
    }
    .pixelation {
      padding: 10px 0;
    }
    output {
      display: inline-block;
    }
    canvas {
      image-rendering: optimizeSpeed;
      image-rendering: -moz-crisp-edges;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: -o-crisp-edges;
      image-rendering: crisp-edges;
      -ms-interpolation-mode: nearest-neighbor;
    }
  </style>
</head>
<body>
  <h1>Pixelate.js</h1>
  <div class="container">
    <div class="pixelation">
    <div class="pixelation">Pixelation: <input class="slider" type="range" min="0" max="100" value="0"> <output
        id="output">70%</output></div>
    <img class="image"
      src="${imageBase64}"
      alt="Street Image">
    <canvas width="700" height="933" style="image-rendering: pixelated;"></canvas>
  </div>
  <script>
    (function (root) {

      window.URL = window.URL || window.webkitURL || window.mozURL;

      function disableSmoothRendering(ctx) {
        ctx.webkitImageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;
        ctx.imageSmoothingEnabled = false;
        return ctx;
      }

      function Pixelate(image, opts) {
        opts = opts || {};
        this.image = image;
        this.setAmount(opts.amount);

        var imageLoaded = function () {
          this.imageUrl = image.src;
          this.width = image.clientWidth;
          this.height = image.clientHeight;

          this.canvas = document.createElement('canvas');
          this.canvas.style.display = 'none';
          this.canvas.width = this.width;
          this.canvas.height = this.height;

          this.canvas.style.cssText = 'image-rendering: optimizeSpeed;' + // FireFox < 6.0
            'image-rendering: -moz-crisp-edges;' + // FireFox
            'image-rendering: -o-crisp-edges;' +  // Opera
            'image-rendering: -webkit-crisp-edges;' + // Chrome
            'image-rendering: crisp-edges;' + // Chrome
            'image-rendering: -webkit-optimize-contrast;' + // Safari
            'image-rendering: pixelated; ' + // Future browsers
            '-ms-interpolation-mode: nearest-neighbor;'; // IE

          this.ctx = this.canvas.getContext('2d');
          this.ctx = disableSmoothRendering(this.ctx);

          this.image.parentNode.appendChild(this.canvas, this.image);
          this.image.onload = null;

          this.pixelImage = new Image();
          this.pixelImage.onload = function () {
            this.ready = true;
            this.render();
          }.bind(this);
          this.pixelImage.src = this.imageUrl;
        }.bind(this);

        if (this.image.complete) {
          imageLoaded();
        }

        this.image.onload = imageLoaded;

        return this;
      }

      Pixelate.prototype.setAmount = function (amount) {
        this.amount = 1 - (amount || 0);
        return this;
      };

      Pixelate.prototype.setWidth = function (width) {
        var height = (this.height / this.width) * width;
        this.width = width;
        this.height = height;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.ctx = disableSmoothRendering(this.ctx);
        return this;
      };

      Pixelate.prototype.render = function () {
        if (!this.ready) return this;
        var w = this.width * (this.amount <= 0 ? 0.01 : this.amount);
        var h = this.height * (this.amount <= 0 ? 0.01 : this.amount);
        // render smaller image
        this.ctx.drawImage(this.pixelImage, 0, 0, w, h);
        // stretch the smaller image
        this.ctx.drawImage(this.canvas, 0, 0, w, h, 0, 0, this.width, this.height);
        this.image.src = this.canvas.toDataURL('image/png');
        return this;
      };

      if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
          exports = module.exports = Pixelate;
        }
        exports.pixelate = Pixelate;
      } else if (typeof define === 'function' && define.amd) {
        define([], function () {
          return Pixelate;
        });
      } else {
        root.Pixelate = Pixelate;
      }

    })(this);
  </script>
  <script>
    window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame;

    var image = document.querySelector('.image');
    var pixelate = new Pixelate(image);

    var slider = document.querySelector('.slider');
    var output = document.getElementById('output');

    slider.addEventListener('input', function (event) {
      var amount = event.currentTarget.value;

      update(amount);
    });

    function update(amount) {
      output.textContent = Math.round(amount) + '%';
      pixelate.setAmount(amount / 100).render();
    }

    window.onresize = function () {
      pixelate.setWidth(image.parentNode.clientWidth).render();
    };

    update(slider.value)
  </script>
</body>

</html>
            `;

          // 设置 Puppeteer 页面内容
          await page.setContent(htmlContent, { waitUntil: 'networkidle2' });

          // 使用 Puppeteer 模拟滑块的像素化操作
          await page.evaluate((pixelateValue) => {
            const slider = document.querySelector('.slider');
            slider.value = pixelateValue; // 设置滑块的值
            slider.dispatchEvent(new Event('input')); // 触发滑块的值变化事件
          }, pixelateValue);

          // 等待页面中 canvas 元素生成
          await page.waitForSelector('canvas', { timeout: 10000 });

          // 获取目标 canvas 的 Base64 编码数据
          const outputImageBase64 = await page.evaluate(() => {
            // 定位到最后一个 canvas
            const canvases = document.querySelectorAll('canvas');
            const targetCanvas = canvases[canvases.length - 1];
            return targetCanvas ? targetCanvas.toDataURL('image/png') : null; // 获取数据
          });

          // 如果成功获取图像数据，发送到用户
          if (outputImageBase64) {
            await session.send(h.image(outputImageBase64));
          } else {
            await session.send("处理图像时出错，请重试。");
          }
          // 关闭 Puppeteer 页面，释放资源
          await page.close();
        } catch (error) {
          // 捕获错误并记录日志
          ctx.logger.error('处理图像时出错:', error);
          await session.send("处理图像时出错，请重试。");
        }
      });
  }

  if (config.enablecommand1) {
    ctx.command("patina/幻影 <img1> <img2>", "制作幻影坦克图片")
      .alias("幻影坦克")
      .example("幻影").example("幻影 [图片]").example("幻影 [图片] [图片]").example("幻影 QQ号 QQ号").example("幻影 @用户 @用户")
      .option('fullColor', '-f', '全彩输出')
      .option('size', '-s <size:number>', '输出尺寸')
      .option('weight', '-w <weight:number>', '里图混合权重')
      .action(async ({ session, options }, img1, img2) => {
        const miragehtml = path.join(__dirname, '../html/mirage/mirage.html');
        if (img1) loggerinfo(img1);
        if (img2) loggerinfo(img2);
        if (!ctx.puppeteer) {
          await session.send("没有开启puppeteer服务");
          return;
        }
        // 获取表图
        if (!img1) {
          await session.send("请发送一张图片作为【表图】：");
          img1 = await session.prompt(30000);
        }
        img1 = await extractImageUrl(session, img1);
        // 获取里图
        if (!img2) {
          await session.send("请发送一张图片作为【里图】：");
          img2 = await session.prompt(30000);
        }
        img2 = await extractImageUrl(session, img2);
        if (!img1 || !img2) {
          await session.send("未检测到有效的图片，请重试。");
          return;
        }
        loggerinfo(`图片URL1: ${img1}`);
        loggerinfo(`图片URL2: ${img2}`);

        const page = await ctx.puppeteer.page();
        // 将原来的固定路径改为动态生成的临时路径
        const tempCoverPath = generateTempFilePath('cover');
        const tempInnerPath = generateTempFilePath('inner');

        try {
          // 下载并保存图片
          await downloadImage(ctx, img1, tempCoverPath);
          await downloadImage(ctx, img2, tempInnerPath);

          await page.goto(nodeurl.pathToFileURL(miragehtml), { waitUntil: 'networkidle2' });

          // 配置全彩输出
          const fullColor = options.fullColor !== undefined ? options.fullColor : config.Full_color_output;
          await page.evaluate((fullColor) => {
            const checkbox = document.getElementById('isColoredCheckbox');
            if (checkbox && checkbox.checked !== fullColor) {
              checkbox.click();
            }
          }, fullColor);

          // 配置输出尺寸
          const size = options.size !== undefined ? options.size : config.Output_Size;
          await page.evaluate((size) => {
            const sizeInput = document.getElementById('maxSizeInput');
            if (sizeInput) {
              sizeInput.value = size;
              sizeInput.dispatchEvent(new Event('input'));
            }
          }, size);

          // 配置里图混合权重
          const weight = options.weight !== undefined ? options.weight : config.Mixed_Weight;
          await page.evaluate((weight) => {
            const weightInput = document.getElementById('innerWeightRange');
            if (weightInput) {
              weightInput.value = weight;
              weightInput.dispatchEvent(new Event('input'));
            }
          }, weight);

          // 上传表图
          const [coverFileChooser] = await Promise.all([
            page.waitForFileChooser(),
            page.click('label[for="coverFileInput"]'),
          ]);
          await coverFileChooser.accept([tempCoverPath]);

          // 上传里图
          const [innerFileChooser] = await Promise.all([
            page.waitForFileChooser(),
            page.click('label[for="innerFileInput"]'),
          ]);
          await innerFileChooser.accept([tempInnerPath]);

          // 等待生成的输出图像
          await page.waitForSelector('#outputCanvas', { timeout: 10000 });

          const outputImageBase64 = await page.evaluate(() => {
            const canvas = document.getElementById('outputCanvas');
            return canvas ? canvas.toDataURL('image/png') : null;
          });

          if (outputImageBase64) {
            await session.send(h.image(outputImageBase64));
          } else {
            await session.send("处理图像时出错，请重试。");
          }
        } catch (error) {
          ctx.logger.error('处理图像时出错:', error);
          await session.send("处理图像时出错，请重试。");
        } finally {
          if (fs.existsSync(tempCoverPath)) fs.unlinkSync(tempCoverPath);
          if (fs.existsSync(tempInnerPath)) fs.unlinkSync(tempInnerPath);
          await page.close();
        }
      });
  }

}

exports.apply = apply;