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

### 本插件 旨在使用puppeteer来操作一些有趣的网页，让bot实现网页的部分功能
#### 本插件提供了多个指令，使用方法如下：
<details>
<summary>点击此处查看——包浆</summary>
<p>通过调用 puppeteer 操作网页，模拟图像处理，并可调节图像做旧年份、画质等参数。</p>
<p>如果你需要更详细地了解这个项目，请前往 
<a href="https://github.com/itorr/patina/tree/main" target="_blank">patina 项目主页（github）</a>
</p>
<h2>功能示例</h2>
<pre>
转换 -g -w -y 10 -q 60
</pre>
<p>触发指令后会要求用户单独上传图片。</p>
</details>

<details>
<summary>点击此处查看——蒸汽机</summary>
<p>通过调用 puppeteer 操作网页，模拟图像处理</p>
<p>如果你需要更详细地了解这个项目，请前往 
<a href="https://magiconch.com/vaporwave/" target="_blank">https://magiconch.com/vaporwave/</a>
</p>
<h2>功能示例</h2>
<pre>
蒸汽机 -p 數字信號 -r
</pre>
<p>触发指令后会要求用户单独上传图片。</p>
</details>


<details>
<summary>点击此处查看——斜着看生成器</summary>
<p>通过调用 puppeteer 操作网页，模拟图像处理</p>
<p>如果你需要更详细地了解这个项目，请前往 
<a href="https://lab.magiconch.com/xzk/" target="_blank">https://lab.magiconch.com/xzk/</a>
</p>
<h2>功能示例</h2>
<pre>
斜着看 我喜欢你 我也是 -d 把屏幕放平看
</pre>
<p>触发指令后会返回图片</p>
</details>

---

> 目前就这几个指令 ，以后有什么好玩的再加。

---
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
    }).description('包浆'),
    Schema.object({

        defaultPreset: Schema.union([
            '愈漸升溫', '灼熱苦夏', '褪色老膠', '隔行掃描', '數字信號', '同步失敗', '信號沈默',
            '霓虹泛濫', '壹九零零', '顏色極端', '顛倒黑白', '兩極色溫', '影片光碟', '情迷東京',
            '鮮橙空氣', '核爆夕陽', '夜行生物', '藍調空氣', '嬷嬷糜糜', '公共预设', '夏日阴凉',
            '发霉录像', '信號漂移', '差之毫釐', '风驰电掣', '網上衝浪', '人吉汽車', '燒堿灼傷',
            '盲從狂信', '周期置换', '恭贺千禧', '遊戯人生', '嘎嘎嘎嘎', '春宵苦短', '內股膏藥',
            '恩恩愛愛', '泽林莱尼', '斑驳夏日', '电台司令', '银河影院', '病娇少女', '日落灰原',
            '騎士電台', '黃昏瑪麗', '信号闪烁', '好孙子口', '紀エヴァ', '靈魂列車', '無藥可救',
            '方糖桑巴', '午後蘇打', '過期食品', '電視信號', '國家地理', '落日潮汐', '全部拉满',
            'しし狮狮', 'なにこれ', '露藏西璐', '嘻嘻嘻璐', '刘海体积', '單格漫畫', '老故事会',
            '落入法网', '藍色陷阱', '非流蓝调', '做夢禁止', '赤色反转', '深海绿光', '信号不佳',
            '星河之中', '极限天空', '潮色满盈', '西拉花花', '紫调港情', '愛意夕陽', '霓虹列車',
            '像素陷阱', '粉藍幽光', '苍穹漫画', '甜爱信号', '饶平红产', '彩虹电波', '强烈致幻',
            '粉末冶金', '绵连色彩', '黑白线稿', '石家庄市', 'あめだま', '萨拉热窝', '恩格斯街',
            '花花火火', '阴曹地府', '夢の突撃', '意乱情迷', '少女心事', '赤色沉淀', '粉红漂移',
            '安慰藥劑', '溫蒙煥霧', '夏の泡沫', '老旧监控', '泡沫未来', '恶臭数字', '荒廢監控',
            '全损宇宙', '怪核文化', '理想循环', '废墟信号', '白紙紅印', '情緒氣泡', '白糖年糕',
            '蓝调胶片', '逆转宇宙'
        ]).description('默认预设(滤镜)<br>建议前往 https://magiconch.com/vaporwave/ 查看具体效果').default("黃昏瑪麗"),
        useOriginalImageSize: Schema.boolean().default(true).description("原始尺寸处理（性能差）<br>开启后 画幅比例 、拉伸方案 失效"),
        watermarkEnabled: Schema.boolean().default(false).description("开启水印（默认关闭）"),
        waitTime: Schema.number().default(2).description("处理图像的等待时间（秒）").min(0.5).max(10),
        //aspectRatio: Schema.union(['4:3', '16:9', '21:9', '1:1']).description('画幅比例').default("4:3"), // 用不到，只做预设的滤镜 足够了
        //scalingMode: Schema.union(['填充', '完整', '拉伸']).description('拉伸方案').default("填充"),// 用不到，只做预设的滤镜 足够了
    }).description('蒸 気 機'),
    /*
    Schema.object({
    isRevokeEnabled: Schema.boolean().default(false).description("撤回输入图片"), // 是否执行撤回
    revokeThreshold: Schema.number().role('slider').min(0).max(100).step(1).default(50).description("撤回阈值"), // 撤回阈值
    isTextPromptEnabled: Schema.boolean().default(false).description("文字提示"), // 是否返回文字提示
    textPromptContent: Schema.string().default("不准色色！"), // 文字提示内容        
    }).description('鉴黄'),
    */
    Schema.object({
        default_title: Schema.string().default("从充电口斜着看").description("默认的图片标题"), // 文字提示内容        
    }).description('斜着看生成器'),
    Schema.object({
        loggerinfo: Schema.boolean().default(false).description("日志调试模式"),
    }).description('调试设置'),
]);

async function downloadImage(ctx, url, filepath) {
    const response = await ctx.http.get(url);
    const buffer = Buffer.from(await response);
    fs.writeFileSync(filepath, buffer);
}

async function apply(ctx, config) {


    ctx.command("斜着看 [text1] [text2] [title]", "生成斜着看的图")
        .option('default_title', '-d <title:string>', '默认标题')
        .example("斜着看 我喜欢你 我也是 -d 把屏幕放平看")
        .action(async ({ session, options }, text1, text2, title) => {
            const finalTitle = title || options.default_title || config.default_title;

            // 确保 Puppeteer 服务已启动
            if (!ctx.puppeteer) {
                await session.send("没有开启 Puppeteer 服务");
                return;
            }

            const page = await ctx.puppeteer.page();

            try {
                // 打开目标网页
                await page.goto('https://lab.magiconch.com/xzk/', {
                    waitUntil: 'networkidle2'
                });

                // 确保输入的内容为字符串
                const inputText1 = text1 ? String(text1) : '';
                const inputText2 = text2 ? String(text2) : '';
                const inputTitle = String(finalTitle);

                // 输入用户提供的文本
                await page.type('input[name="text1"]', inputText1);
                await page.type('input[name="text2"]', inputText2);
                await page.type('input[name="tip"]', inputTitle);

                // 点击生成按钮
                await page.click('.generate-btn.ui-btn');

                // 等待生成结果
                await page.waitForSelector('.output-box img');

                // 获取生成的图片
                const imageSrc = await page.evaluate(() => {
                    const imgElement = document.querySelector('.output-box img');
                    return imgElement ? imgElement.src : null;
                });

                // 返回图片
                if (imageSrc) {
                    await session.send(h.image(imageSrc));
                } else {
                    await session.send("无法生成图片，请重试。");
                }

            } catch (error) {
                ctx.logger.error('生成图片时出错:', error);
                await session.send("生成图片时出错，请重试。");
            } finally {
                await page.close();
            }
        });



    /*
    ctx.command("鉴黄 [url]", "鉴定色情程度")
    .action(async ({ session, options }) => {
    
    });
    */

    ctx.command("蒸汽机", "蒸汽机滤镜")
        .option('preset', '-p <preset:string>', '预设')
        .option('rawsize', '-r', '使用原图尺寸')
        .example("蒸汽机 -p 數字信號 -r")
        .action(async ({ session, options }) => {
            const watermarkEnabled = config.watermarkEnabled;
            const presetName = options.preset || config.defaultPreset;
            const useOriginalSize = options.rawsize !== undefined ? options.rawsize : config.useOriginalImageSize;
            const waitTime = config.waitTime || 5000; // 默认等待时间为5秒

            await session.send("请发送需要转换的图片：");
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

                // 打开目标网页
                await page.goto('https://magiconch.com/vaporwave/', {
                    waitUntil: 'networkidle2'
                });

                // 选择预设滤镜
                await page.evaluate((presetName) => {
                    const presetElement = Array.from(document.querySelectorAll('.style-list-box .name'))
                        .find(el => el.textContent.trim() === presetName);
                    if (presetElement) {
                        presetElement.parentElement.click();
                    }
                }, presetName);

                // 设置水印状态
                await page.evaluate((watermarkEnabled) => {
                    const watermarkCheckbox = Array.from(document.querySelectorAll('.label-box input[type="checkbox"]'))
                        .find(el => el.nextSibling && el.nextSibling.nodeValue.trim() === '显示蒸汽机水印');
                    if (watermarkCheckbox && watermarkCheckbox.checked !== watermarkEnabled) {
                        watermarkCheckbox.click();
                    }
                }, watermarkEnabled);

                // 判断是否使用原始尺寸
                await page.evaluate((useOriginalSize) => {
                    const checkbox = document.querySelector('.label-box input[type="checkbox"]');
                    if (checkbox && checkbox.checked !== useOriginalSize) {
                        checkbox.click();
                    }
                }, useOriginalSize);

                // 上传文件
                const [fileChooser] = await Promise.all([
                    page.waitForFileChooser(),
                    page.click('.btn-box a.btn.big.wire')
                ]);

                await fileChooser.accept([tempImagePath]);

                // 等待指定时间以确保图像处理完成
                await new Promise(resolve => setTimeout(resolve, waitTime));

                // 获取输出图像
                const outputImageBase64 = await page.evaluate(() => {
                    const outputImage = document.querySelector('.output img');
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
                // 确保在处理完成后再删除临时文件
                if (fs.existsSync(tempImagePath)) {
                    fs.unlinkSync(tempImagePath);
                }
                await page.close();
            }
        });


    ctx.command("包浆", "赛博虚拟包浆器")
        .option('green', '-g', '绿图')
        .option('watermark', '-w', '水印')
        .option('year', '-y <year:number>', '做旧年份')
        .option('quality', '-q <quality:number>', '画质')
        .example("包浆 -g -w -p -y 12 -q 60")
        .action(async ({ session, options }) => {
            const GreenFilter = options.green !== undefined ? options.green : config.enable_GreenFilter;
            const Watermark = options.watermark !== undefined ? options.watermark : config.enable_Watermark;
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
