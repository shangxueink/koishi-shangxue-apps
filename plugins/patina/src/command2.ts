import { Schema, h, Context, Session } from "koishi";

export const command2Config = Schema.union([
    Schema.object({
        enablecommand2: Schema.const(false).required(),
    }),
    Schema.object({
        enablecommand2: Schema.const(true),
        enablecommand2Name: Schema.string().default('像素化').description("指令名称"),
        pixelate: Schema.number().role('slider').min(0).max(100).step(1).default(80).description("默认${config.enablecommand2Name}百分比<br>原项目地址 https://lab.miguelmota.com/pixelate/example/"),
    }),
]);

export function applyCommand2(ctx: Context, config: any, loggerinfo: (...args: any[]) => void, extractImageUrl: (session: Session, input: string) => Promise<string>) {
    if (!config.enablecommand2) return;

    ctx.command(`patina/${config.enablecommand2Name} <image>`, `${config.enablecommand2Name}一张图`)
        .example(`${config.enablecommand2Name}`)
        .example(`${config.enablecommand2Name} [图片]`)
        .example(`${config.enablecommand2Name} QQ号`)
        .example(`${config.enablecommand2Name} @用户`)
        .option('pixelate', '-p <pixelate:number> ${config.enablecommand2Name}百分比')
        .action(async ({ session, options }, image: string) => {
            if (!session) return;
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
                    .then((buffer: ArrayBuffer) => `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`);

                // 打开一个新的 Puppeteer 页面
                const page = await ctx.puppeteer.page();

                // 获取${config.enablecommand2Name}百分比参数
                const pixelateValue = options?.pixelate !== undefined ? options.pixelate : config.pixelate;
                loggerinfo(`${config.enablecommand2Name}百分比: ${pixelateValue}`); // 记录日志，方便调试
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
export const pixelate = Pixelate;
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

                // 使用 Puppeteer 模拟滑块的${config.enablecommand2Name}操作
                await page.evaluate((pixelateValue: number) => {
                    const slider = document.querySelector('.slider') as HTMLInputElement;
                    if (slider) {
                        slider.value = pixelateValue.toString(); // 设置滑块的值
                        slider.dispatchEvent(new Event('input')); // 触发滑块的值变化事件
                    }
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