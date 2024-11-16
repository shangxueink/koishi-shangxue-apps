"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.inject = exports.name = void 0;
const { Schema, Logger, h } = require("koishi");
const fs = require('node:fs');
const path = require('node:path');

exports.name = "speechless-mind";
exports.inject = {
    required: ['puppeteer', "canvas"]
};

exports.usage = `
---

<h3>插件所需服务</h3>

<ul>
<li><strong>Puppeteer:</strong> 用于渲染最终的输出图像。代码更易于编写。</li>
<li><strong>Canvas:</strong> 用于获取输入图片的分辨率。Canvas 确保处理效率。</li>
</ul>

<p>使用以下格式的指令来触发插件：</p>

<ul>
<li><code>无语</code> - 生成默认的无语思维文本。</li>
<li><code>无语 [文本]</code> - 使用指定的文本生成无语思维内容。</li>
<li><code>无语 [文本] [图片]</code> - 使用指定的文本和图片生成无语思维内容。</li>
</ul>

<h2>使用示例</h2>

<div class="example">
<strong>示例 1:</strong> <code>无语</code><br>
说明: 生成默认的无语思维文本内容。
</div>

<div class="example">
<strong>示例 2:</strong> <code>无语 koishi</code><br>
说明: 使用“koishi”作为文本，生成无语思维内容。
</div>

<div class="example">
<strong>示例 3:</strong> <code>无语 koishi [图片]</code><br>
说明: 使用“koishi”作为文本，并附带一张图片，生成无语思维内容。
</div>

<h2>注意事项</h2>

<ul>
<li>确保图片的分辨率符合插件的要求，否则会提示上传合适的图片。</li>
<li>如果文本内容包含换行符，可以根据配置选择是否允许自动换行。</li>
<li>在使用图片时，请确保图片 URL 可访问。</li>
</ul>

---
`;

exports.Config = Schema.intersect([
    Schema.object({
        fastmakemode: Schema.boolean().default(true).description("快速制作模式<br>开启后仅需输入【什么什么思维】<br>不然要输入完整的文本内容哦"),
        Watermarkposition: Schema.tuple([Number, Number]).default([10, 20]).description("用于调整水滴位置<br>分别代表【水滴】的top位置和right位置"),
        Watermarkpath: Schema.path().description("【水滴】图片素材的路径").default(path.join(__dirname, '../png/1.png')),
        WatermarkScale: Schema.number().role('slider').min(0).max(1).step(0.1).default(0.7).description("水滴图标的缩放比例（0到1）"),
    }).description('基础设置'),

    Schema.object({
        Lowest_resolution: Schema.tuple([Number, Number]).default([50, 50]).description("允许输入图的最小分辨率（需要canvas服务）"),
        Highest_resolution: Schema.tuple([Number, Number]).default([5000, 5000]).description("允许输入图的最大分辨率（需要canvas服务）"),
        Allowable_range_of_picture_scale: Schema.number().default(50).description("允许输入图片的最大比例偏差（理想输入应该为1:1的图，偏差大 影响观感与渲染）<br> 与1:1为100%相比 比如 16:9 = 1.777 误差为77%<br>0 表示取消应用"),
        icontoppx: Schema.number().default(8).description("用户输入图片渲染 距离顶部的空白区大小（顶着头不好看）"),
    }).description('进阶设置'),

    Schema.object({
        loggerinfo: Schema.boolean().default(false).description("日志调试模式"),
    }).description('调试设置'),
]);

async function apply(ctx, config) {
    const log = (message) => {
        if (config.loggerinfo) {
            ctx.logger.info(message);
        }
    };

    // 加载水印图片并获取其尺寸
    const watermarkBase64 = fs.readFileSync(config.Watermarkpath, { encoding: 'base64' });

    ctx.command("无语 [text] [img]", "无语思维插件")
        .alias("思维")
        .example("无语")
        .example("无语 koishi")
        .example("无语 koishi [图片]")
        .action(async ({ session }, text, img) => {
            if (!ctx.puppeteer || !ctx.canvas) {
                await session.send("没有开启puppeteer服务或者canvas服务");
                return;
            }

            if (!text) {
                const promptMessage = config.fastmakemode ? "请输入【什么什么思维】内容：" : "请输入文本内容：";
                await session.send(promptMessage);
                text = await session.prompt(30000);
            }

            if (!img) {
                await session.send("请发送需要转换的图片：");
                img = await session.prompt(30000);
            }

            if (!img) {
                await session.send("未检测到有效的图片，请重试。");
                return;
            }
            img = h.select(img, 'img').map(item => item.attrs.src)[0];
            log(`文本内容: ${text}`);
            log(`图片URL: ${img}`);

            const page = await ctx.puppeteer.page();

            try {
                const canvasImage = await ctx.canvas.loadImage(img);
                const originalWidth = canvasImage.naturalWidth || canvasImage.width;
                const originalHeight = canvasImage.naturalHeight || canvasImage.height;

                log(`图片尺寸: ${originalWidth}x${originalHeight}`);

                if (originalWidth < config.Lowest_resolution[0] || originalHeight < config.Lowest_resolution[1] ||
                    originalWidth > config.Highest_resolution[0] || originalHeight > config.Highest_resolution[1]) {
                    await session.send("图片分辨率不符合要求，请上传合适的图片。");
                    return;
                }

                const aspectRatio = originalWidth / originalHeight;
                const idealAspectRatio = 1;
                const deviation = Math.abs(aspectRatio - idealAspectRatio) / idealAspectRatio * 100;
                log(`图片误差: ${deviation}`);

                if (config.Allowable_range_of_picture_scale > 0 && deviation > config.Allowable_range_of_picture_scale) {
                    await session.send("图片比例偏差过大，请上传接近1:1比例的图片。");
                    return;
                }

                let textContent;
                if (config.fastmakemode) {
                    textContent = `无语，和你说不下去，<br>典型的${text}思维`;
                } else {
                    textContent = text.replace(/\n/g, '<br>');
                }

                await page.setContent(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Layout Example</title>
<style>
body {
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
height: 100vh;
margin: 0;
font-family: Arial, sans-serif;
}
.container {
position: relative;
text-align: center;
display: inline-block;
}
.icon {
top: ${config.icontoppx}px;
position: relative;
}
.icon img {
max-width: 150px;
max-height: 150px;
width: auto;
height: auto;
}
.watermark {
position: absolute;
top: ${config.Watermarkposition[0]}px;
right: ${config.Watermarkposition[1]}px;
transform: scale(${config.WatermarkScale});
transform-origin: top right;
}
.text {
margin-top: 10px;
font-size: 18px;
line-height: 1.5;
white-space: pre-wrap;
}
</style>
</head>
<body>
<div class="container">
<div class="icon">
<img src="${img}" alt="Icon">
<img src="data:image/png;base64,${watermarkBase64}" alt="Watermark" class="watermark">
</div>
<div class="text">${textContent}</div>
</div>
</body>
</html>
`);

                await new Promise(resolve => setTimeout(resolve, 1000));

                const container = await page.$('.container');
                const boundingBox = await container.boundingBox();

                const screenshot = await page.screenshot({
                    encoding: 'base64',
                    clip: {
                        x: boundingBox.x,
                        y: boundingBox.y,
                        width: boundingBox.width,
                        height: boundingBox.height
                    }
                });

                await session.send(h.image(`data:image/png;base64,${screenshot}`));
            } catch (error) {
                ctx.logger.error('处理图像时出错:', error);
                await session.send("处理图像时出错，请重试。");
            } finally {
                await page.close();
            }
        });
}

exports.apply = apply;
