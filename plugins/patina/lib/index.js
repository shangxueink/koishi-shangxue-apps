"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.inject = exports.name = void 0;
const { Schema, Logger, h } = require("koishi");

const fs = require('node:fs');
const path = require('node:path');


exports.name = "patina";
exports.inject = {
    required: ['puppeteer']
};
exports.usage = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>插件说明</title>
</head>
<body>
<h1>插件说明</h1>
<p>本插件通过调用 puppeteer 操作网页，模拟图像处理，并可调节图像做旧年份、画质等参数。</p>
<p>如果你需要更详细地了解这个项目，请前往 
<a href="https://github.com/itorr/patina/tree/main" target="_blank">patina 项目主页（github）</a>
</p>
<h2>功能示例</h2>
<pre>
转换 -g -w -y 10 -q 60
</pre>
<p>触发指令后会要求用户单独上传图片。</p>
</body>
</html>
`;

exports.Config = Schema.intersect([
    Schema.object({
        enable_GreenFilter: Schema.boolean().default(true).description("绿图"),
        enable_Watermark: Schema.boolean().default(true).description("水印"),
        //enable_PopArtEffect: Schema.boolean().default(false).description("波普").hidden(), // 不做了
        vintageEffectYears: Schema.number().role('slider').min(1).max(12).step(1).default(5).description("做旧年份"),
        imageQuality: Schema.number().role('slider').min(0).max(60).step(1).default(50).description("画质（百分比）"),
        //uuname: Schema.string().role('textarea', { rows: [2, 4] }).description("水印用户名们<br>换行分割，0000替代随机数字、_半角下划线替代-_+~!^&、.。”“\"'|随机字符"), // 有点麻烦，算了
    }).description('默认生成设置'),
    /*Schema.object({
    loggerinfo: Schema.boolean().default(false).description("日志调试模式"),
    }).description('调试设置'),*/
]);

async function downloadImage(ctx, url, filepath) {
    const response = await ctx.http.get(url);
    const buffer = Buffer.from(await response);
    fs.writeFileSync(filepath, buffer);
}

async function apply(ctx, config) {
    ctx.command("包浆", "赛博虚拟包浆器")
        .option('green', '-g', '绿图')
        .option('watermark', '-w', '水印')
        //.option('popArtEffect', '-p', '波普')
        .option('year', '-y <year:number>', '做旧年份')
        .option('quality', '-q <quality:number>', '画质')
        .example("包浆 -g -w -p -y 12 -q 60")
        .action(async ({ session, options }) => {
            const GreenFilter = options.green !== undefined ? options.green : config.enable_GreenFilter;
            const Watermark = options.watermark !== undefined ? options.watermark : config.enable_Watermark;
            //const PopArtEffect = options.popArtEffect !== undefined ? options.popArtEffect : config.enable_PopArtEffect;
            const VintageYears = options.year !== undefined ? options.year : config.vintageEffectYears;
            const ImageQuality = options.quality !== undefined ? options.quality : config.imageQuality;

            await session.send(h.text("请发送需要转换的图片："));
            const inputImage = await session.prompt(30000);
            const inputImageUrl = h.select(inputImage, 'img').map(item => item.attrs.src)[0];

            if (!inputImageUrl) {
                await session.send("未检测到有效的图片，请重试。");
                return;
            }

            if (!ctx.puppeteer) {
                await session.send("没有开启puppeteer服务");
                return;
            }

            const page = await ctx.puppeteer.page();
            const tempImagePath = path.join(__dirname, 'temp-image.jpg');

            try {
                await downloadImage(ctx, inputImageUrl, tempImagePath);

                await page.goto('https://app.container-z.art/tools/patina/', {
                    waitUntil: 'networkidle2'
                });

                const [fileChooser] = await Promise.all([
                    page.waitForFileChooser(),
                    page.click('button'),
                ]);

                await fileChooser.accept([tempImagePath]);

                // 绿色
                await page.evaluate((GreenFilter) => {
                    const checkbox = Array.from(document.querySelectorAll('label')).find(label => label.textContent.includes('绿图')).querySelector('input[type="checkbox"]');
                    if (checkbox && checkbox.checked !== GreenFilter) {
                        checkbox.click();
                    }
                }, GreenFilter);

                // 水印
                await page.evaluate((Watermark) => {
                    const checkbox = Array.from(document.querySelectorAll('label')).find(label => label.textContent.includes('水印')).querySelector('input[type="checkbox"]');
                    if (checkbox && checkbox.checked !== Watermark) {
                        checkbox.click();
                    }
                }, Watermark);

                /*
                在这里实现【水印用户名们】的逻辑
                有点麻烦，还是算了吧
                */

                await page.evaluate((VintageYears) => {
                    const labels = Array.from(document.querySelectorAll('h4'));
                    const targetLabel = labels.find(label => label.textContent.includes('做旧年份'));
                    if (targetLabel) {
                        const rangeInput = targetLabel.nextElementSibling;
                        if (rangeInput && rangeInput.type === 'range') {
                            rangeInput.value = VintageYears;
                            rangeInput.dispatchEvent(new Event('input'));
                            console.log('设置做旧年份:', VintageYears, '当前滑动条值:', rangeInput.value);
                        }
                    }
                }, VintageYears);

                await page.evaluate((ImageQuality) => {
                    const labels = Array.from(document.querySelectorAll('h4'));
                    const targetLabel = labels.find(label => label.textContent.includes('画质'));
                    if (targetLabel) {
                        const rangeInput = targetLabel.nextElementSibling;
                        if (rangeInput && rangeInput.type === 'range') {
                            rangeInput.value = ImageQuality;
                            rangeInput.dispatchEvent(new Event('input'));
                            console.log('设置画质:', ImageQuality, '当前滑动条值:', rangeInput.value);
                        }
                    }
                }, ImageQuality);



                // 等一会
                await page.waitForSelector('img.output-image', { timeout: 5000 });

                const outputImageBase64 = await page.evaluate(() => {
                    const outputImage = document.querySelector('img.output-image');
                    return outputImage ? outputImage.src : null;
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
                if (fs.existsSync(tempImagePath)) {
                    fs.unlinkSync(tempImagePath); // 删除临时文件
                }
                await page.close();
            }
        });
}

exports.apply = apply;
