"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.inject = exports.name = void 0;
const { Schema, Logger, h } = require("koishi");

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

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
> 推荐的 [puppeteer插件](/market?keyword=puppeteer+shangxue) 
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

<details>
<summary>点击此处查看——福音战士</summary>
<p>通过调用 puppeteer 操作网页，模拟图像处理</p>
<p>如果你需要更详细地了解这个项目，请前往 
<a href="https://lab.magiconch.com/eva-title/" target="_blank">https://lab.magiconch.com/eva-title/</a>
</p>
<h2>功能示例</h2>
<pre>
福音战士 小学 来感觉 第一集 -l e1 -c 黑黄 -a 3:3
</pre>
<p>触发指令后会返回图片</p>
</details>

<details>
<summary>点击此处查看——鉴黄</summary>
<p>通过调用 puppeteer 操作网页，模拟图像处理</p>
<p>如果你需要更详细地了解这个项目，请前往 
<a href="https://magiconch.com/nsfw/" target="_blank">https://magiconch.com/nsfw/</a>
</p>
<h2>功能示例</h2>
<pre>
鉴黄 [图片]
</pre>
<p>触发指令后会进行鉴黄判断 可能需要10秒左右</p>
</details>

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
        useOriginalImageSize: Schema.boolean().default(false).description("原始尺寸处理（性能差）<br>开启后 画幅比例 、拉伸方案 失效"),
        watermarkEnabled: Schema.boolean().default(false).description("开启水印（默认关闭）"),
        waitTime: Schema.number().default(2).description("处理图像的每一步的等待时间（秒）<br>实际会花费三倍此时间，因为有三步").min(0.5).max(10),
        //aspectRatio: Schema.union(['4:3', '16:9', '21:9', '1:1']).description('画幅比例').default("4:3"), // 用不到，只做预设的滤镜 足够了
        //scalingMode: Schema.union(['填充', '完整', '拉伸']).description('拉伸方案').default("填充"),// 用不到，只做预设的滤镜 足够了
    }).description('蒸 気 機'),

    Schema.object({
        waittime: Schema.number().default(5).description("上传图片后等待的鉴定时间。单位 秒<br>（推荐不低于2秒，初次可能时间长 需要7秒左右） <br>建议前往 https://magiconch.com/nsfw/ 查看具体效果"),
        loadmode: Schema.boolean().default(false).description("是否开启预加载模式（保持页面一直开启，以减少加载时间。否则每次检测都打开/关闭页面）").hidden(), // 暂时还没做好 预载模式的高并发情况
        //isRevokeEnabled: Schema.boolean().default(false).description("撤回输入图片"), // 是否执行撤回
        tagname: Schema.array(String).role('table').description("需要检测的图片【违规tag】").default(
            [
                "变态",
                "色情",
                "性感"
            ]
        ),
        revokeThreshold: Schema.number().role('slider').min(0).max(100).step(1).default(20).description("撤回阈值（即 违规tag 词条的百分数达到多少的时候进行撤回）"), // 撤回阈值        
        isTextPromptEnabled: Schema.boolean().default(true).description("文字提示，关闭后进入藏匿模式 不会返回任何文字提示（包括检测结果、禁止色色、报错的提示）"), // 是否返回文字提示
        textPromptContent: Schema.string().default("不准色色！").description("违规图片的文字提示内容"), // 文字提示内容
    }).description('指令鉴黄'),
    Schema.object({
        isenablegrouplist: Schema.boolean().default(false).description("是否开启中间件检测图片 并且自动执行鉴黄"),
        enablegrouplist: Schema.array(String).role('table').description("要检测的频道ID").default(
            [
                "114514"
            ]
        ),
    }).description('中间件鉴黄'),

    Schema.object({
        default_title: Schema.string().default("从充电口斜着看").description("默认的图片标题"), // 文字提示内容        
    }).description('斜着看生成器'),

    Schema.object({
        layout: Schema.union(['e1', 'e13', 'e25', 'e12', 'e3', 'e25-2', 'e4', 'air', 'e24', 'e26', 'anno-kandoku', 'e15', 'eng-title', 'do-you-love-me', 'e20', 'e10']).default("e1").description("默认排版<br>建议前往 https://lab.magiconch.com/eva-title/ 查看"),
        colorScheme: Schema.union(['黑白', '白黑', '黑红', '红白', '黑黄']).default("黑白").description("色彩样式。默认文字颜色样式"),
        aspectRatio: Schema.union(['4:3', '16:9', '3:3', '5:4', '3:2']).default("4:3").description("画面比例。默认输出的图片比例"),
    }).description('福音戰士標題生成器'),

    Schema.object({
        Full_color_output: Schema.boolean().default(false).description("全彩输出，关闭后变成黑白图<br>黑白可能效果更好  可以前往 https://uyanide.github.io/Mirage_Colored/ 体验"),
        Output_Size: Schema.number().default(1200).description("输出尺寸<br>(指 长和宽 中的较大值)<br>(0 即为不指定)"),
        Mixed_Weight: Schema.number().role('slider').min(0).max(1).step(0.02).default(0.7).description("【里图】混合权重<br>数值越大 里图 越隐隐约约可以看见"),
    }).description('幻影坦克生成器'),

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
    function extractImageUrl(input) {
        const parsedElements = h.parse(input);
        // 遍历解析后的元素
        for (const element of parsedElements) {
            // 检查是否为 'at' 类型
            if (element.type === 'at') {
                const { id } = element.attrs;
                if (id) {
                    // 返回 QQ 头像 URL
                    return `http://q.qlogo.cn/headimg_dl?dst_uin=${id}&spec=640`;
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
    // 这些都是海螺的
    // https://lab.magiconch.com/
    const pagePool = [];

    async function getPage(ctx) {
        if (pagePool.length > 0) {
            return pagePool.pop();
        }
        return await ctx.puppeteer.page();
    }

    async function releasePage(page) {
        if (!config.loadmode) {
            await page.close();
        } else {
            pagePool.push(page);
        }
    }

    ctx.command("patina/幻影 <img1> <img2>", "制作幻影坦克图片")
        .alias("幻影坦克")
        .example("幻影").example("幻影 [图片]").example("幻影 [图片] [图片]").example("幻影 QQ号 QQ号").example("幻影 @用户 @用户")
        .option('fullColor', '-f', '全彩输出')
        .option('size', '-s <size:number>', '输出尺寸')
        .option('weight', '-w <weight:number>', '里图混合权重')
        .action(async ({ session, options }, img1, img2) => {
            const miragehtml = path.join(__dirname, '../html/mirage.html');
            loggerinfo(img1);
            loggerinfo(img2);
            if (!ctx.puppeteer) {
                await session.send("没有开启puppeteer服务");
                return;
            }
            // 获取表图
            if (!img1) {
                await session.send("请发送一张图片作为【表图】：");
                img1 = await session.prompt(30000);
            }
            img1 = extractImageUrl(img1);
            // 获取里图
            if (!img2) {
                await session.send("请发送一张图片作为【里图】：");
                img2 = await session.prompt(30000);
            }
            img2 = extractImageUrl(img2);
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

                await page.goto(`file://${miragehtml}`, { waitUntil: 'networkidle2' });

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

    if (config.isenablegrouplist) {
        ctx.middleware(async (session, next) => {
            await next();

            const channelId = session.channelId;
            // 检查群组ID是否在启用列表中
            if (!config.enablegrouplist.includes(channelId)) {
                return next();
            }

            const userMessagePic = session.content;
            const imageLinks = h.select(userMessagePic, 'img').map(item => item.attrs.src);

            if (config.consoleinfo && imageLinks.length > 0) {
                loggerinfo(`收到图片消息：\n${userMessagePic}\n提取到链接：\n${imageLinks}`);
            }

            if (!imageLinks.length) {
                return next();
            }

            for (const link of imageLinks) {
                await session.execute(`鉴黄 ${link}`);
            }

            return next();
        });
    }

    ctx.command("patina/鉴黄 [url]", "鉴定色情程度")
        .action(async ({ session }, url) => {
            if (!ctx.puppeteer) {
                if (config.isTextPromptEnabled) {
                    await session.send("没有开启puppeteer服务");
                }
                return;
            }

            const inputImageUrl = h.select(session.quote?.content || session.content, 'img').map(item => item.attrs.src)[0] || url;
            if (!inputImageUrl) {
                if (config.isTextPromptEnabled) {
                    await session.send("未检测到有效的图片，请重试。");
                }
                return;
            }

            const tempImagePath = generateTempFilePath();

            let page;
            try {
                page = await getPage(ctx);
                await page.goto('https://magiconch.com/nsfw/', { waitUntil: 'networkidle2' });

                await downloadImage(ctx, inputImageUrl, tempImagePath);

                const [fileChooser] = await Promise.all([
                    page.waitForFileChooser(),
                    page.click('#up')
                ]);

                await fileChooser.accept([tempImagePath]);

                await new Promise(resolve => setTimeout(resolve, config.waittime * 1000));

                const results = await page.evaluate(() => {
                    const outputElements = document.querySelectorAll('#output p');
                    return Array.from(outputElements).map(element => {
                        const name = element.getAttribute('data-name');
                        const spanElement = element.querySelector('span');
                        const percentage = spanElement ? spanElement.textContent : '0%';
                        return { name, percentage };
                    });
                });

                let isViolation = false;
                let violationDetails = '';

                for (const result of results) {
                    const { name, percentage } = result;
                    const percentageValue = parseInt(percentage, 10);

                    loggerinfo(`检测结果：${name} ${percentage}`);

                    if (config.tagname.includes(name) && percentageValue > config.revokeThreshold) {
                        isViolation = true;
                        violationDetails += `检测结果：${name} ${percentage}\n`;
                    }
                }

                if (isViolation) {
                    if (config.isTextPromptEnabled) {
                        await session.send(violationDetails + config.textPromptContent);
                    }
                    await session.bot.deleteMessage(session.channelId, session.messageId); // 撤回输入图片
                } else {
                    if (config.isTextPromptEnabled) {
                        await session.send("未检测到违规内容");
                    }
                }
            } catch (error) {
                ctx.logger.error('检测图片时出错:', error);
                if (config.isTextPromptEnabled) {
                    await session.send("检测图片时出错，请重试。");
                }
            } finally {
                if (fs.existsSync(tempImagePath)) {
                    setTimeout(() => {
                        fs.unlink(tempImagePath, (err) => {
                            if (err) {
                                ctx.logger.error('删除临时文件时出错:', err);
                            }
                        });
                    }, 1000);
                }
                if (page) {
                    await releasePage(page);
                }
            }
        });


    ctx.command("patina/福音战士 [text1] [text2] [text3]", "福音戰士標題生成器")
        .option('layout', '-l <layout:string>', '默认排版')
        .option('colorScheme', '-c <colorScheme:string>', '默认文字颜色样式')
        .option('aspectRatio', '-a <aspectRatio:string>', '默认输出的图片比例')
        .example("福音战士 小学 来感觉 第一集 -l e1 -c 黑黄 -a 3:3")
        .action(async ({ session, options }, text1, text2, text3) => {
            if (!text1 && !text2) {
                await session.execute("福音战士 -h");
                return;
            }

            const layout = options.layout || config.layout || "e1";
            const colorScheme = options.colorScheme || config.colorScheme;
            const aspectRatio = options.aspectRatio || config.aspectRatio;

            const layoutOptions = ['e1', 'e13', 'e25', 'e12', 'e3', 'e25-2', 'e4', 'air', 'e24', 'e26', 'anno-kandoku', 'e15', 'eng-title', 'do-you-love-me', 'e20', 'e10'];
            const colorSchemeOptions = ['黑白', '白黑', '黑红', '红白', '黑黄'];
            const aspectRatioOptions = ['4:3', '16:9', '3:3', '5:4', '3:2'];

            function validateInput(value, allowedValues, name) {
                if (!allowedValues.includes(value)) {
                    throw new Error(`不可用的 ${name} 值: ${value} \n允许的内容: ${allowedValues.join(', ')}`);
                }
            }

            try { // 检查输入
                validateInput(layout, layoutOptions, 'layout');
                validateInput(colorScheme, colorSchemeOptions, 'colorScheme');
                validateInput(aspectRatio, aspectRatioOptions, 'aspectRatio');
            } catch (error) {
                await session.send(error.message);
                return;
            }

            if (!text1 && !text2) {
                await session.execute("福音战士 -h");
                return;
            } else {
                await session.send("正在处理中，请稍后...");
            }

            if (!ctx.puppeteer) {
                await session.send("没有开启 Puppeteer 服务");
                return;
            }

            const page = await ctx.puppeteer.page();

            try {
                // 打开目标网页
                await page.goto(`https://lab.magiconch.com/eva-title/?layout=${layout}`, {
                    waitUntil: 'networkidle2'
                });

                // 输入文本到对应的输入框
                const inputBoxes = await page.$$('.inputs-box .input-item input');
                const texts = [text1, text2, text3];
                for (let i = 0; i < inputBoxes.length; i++) {
                    if (texts[i]) {
                        await inputBoxes[i].type(texts[i], { delay: 100 });
                    }
                }

                // 点击页面空白处，完成输入
                await page.click('h2');

                // 检查并处理不匹配字形
                const mismatchButton = await page.$('button[data-text="尝试替换不匹配字形"]');
                if (mismatchButton) {
                    await mismatchButton.click();
                }

                await page.evaluate((colorScheme) => {
                    const colorElements = Array.from(document.querySelectorAll('.config-item .ui-tabs-box a'));
                    colorElements.forEach(el => {
                        //loggerinfo('Element data-text:', el.getAttribute('data-text'));
                    });

                    const colorElement = colorElements.find(el => el.getAttribute('data-text') === colorScheme);
                    if (colorElement) {
                        //loggerinfo(`Clicking on color scheme: ${colorScheme}`);
                        colorElement.click();
                    } else {
                        //loggerinfo(`Color scheme "${colorScheme}" not found.`);
                    }
                }, colorScheme);



                // 设置画面比例
                await page.evaluate((aspectRatio) => {
                    const ratioElement = Array.from(document.querySelectorAll('.config-item .ui-tabs-box a'))
                        .find(el => el.getAttribute('data-text') === aspectRatio);
                    if (ratioElement) {
                        ratioElement.click();
                    }
                }, aspectRatio);

                // 点击生成按钮
                await page.click('.ctrl-box button[data-text="生成"]');

                // 等待输出的图像渲染完成
                await page.waitForSelector('section.output-box canvas', { visible: true });

                // 使用 setTimeout 等待一段时间确保图像渲染完成
                await new Promise(resolve => setTimeout(resolve, 2000));

                // 从 canvas 获取图像数据
                const imageData = await page.evaluate(() => {
                    const canvas = document.querySelector('section.output-box canvas');
                    return canvas.toDataURL('image/png');
                });


                await session.send(h.image(imageData));

            } catch (error) {
                ctx.logger.error('生成图片时出错:', error);
                await session.send("生成图片时出错，请重试。");
            } finally {
                await page.close();
            }
        });

    ctx.command("patina/斜着看 [text1] [text2] [title]", "生成斜着看的图")
        .option('default_title', '-d <title:string>', '默认标题')
        .example("斜着看 我喜欢你 我也是 -d 把屏幕放平看")
        .action(async ({ session, options }, text1, text2, title) => {
            const finalTitle = title || options.default_title || config.default_title;

            if (!text1 && !text2) {
                await session.execute("斜着看 -h");
                return;
            } else {
                await session.send("正在处理中，请稍后...");
            }

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

    ctx.command("patina/蒸汽机", "蒸汽机滤镜")
        .option('preset', '-p <preset:string>', '预设')
        .option('rawsize', '-r', '使用原图尺寸')
        .example("蒸汽机 -p 數字信號 -r")
        .action(async ({ session, options }) => {
            const watermarkEnabled = config.watermarkEnabled;
            const presetName = options.preset || config.defaultPreset;
            const useOriginalSize = options.rawsize !== undefined ? options.rawsize : config.useOriginalImageSize;
            const waitTime = config.waitTime * 1000 || 5000; // 默认等待时间为5秒

            await session.send("请发送需要转换的图片：");
            const inputImage = await session.prompt(30000);
            const inputImageUrl = h.select(inputImage, 'img').map(item => item.attrs.src)[0];

            if (!inputImageUrl) {
                await session.send("未检测到有效的图片，请重试。");
                return;
            } else {
                await session.send("正在处理中，请稍后...");
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


                // 上传文件
                const [fileChooser] = await Promise.all([
                    page.waitForFileChooser(),
                    page.click('.btn-box a.btn.big.wire')
                ]);

                await fileChooser.accept([tempImagePath]);

                // 选择预设滤镜
                await page.evaluate((presetName) => {
                    const presetElement = Array.from(document.querySelectorAll('.style-list-box .name'))
                        .find(el => el.textContent.trim() === presetName);
                    if (presetElement) {
                        presetElement.parentElement.click();
                    }
                }, presetName);

                // 等待指定时间以确保图像处理完成
                await new Promise(resolve => setTimeout(resolve, waitTime)); // 等待 

                // 判断是否使用原始尺寸
                await page.evaluate((useOriginalSize) => {
                    const checkbox = document.querySelector('.label-box input[type="checkbox"]');
                    if (checkbox && checkbox.checked !== useOriginalSize) {
                        checkbox.click();
                    }
                }, useOriginalSize);

                // 等待指定时间以确保图像处理完成
                await new Promise(resolve => setTimeout(resolve, waitTime)); // 等待 

                // 设置水印状态
                await page.evaluate((watermarkEnabled) => {
                    const watermarkCheckbox = Array.from(document.querySelectorAll('.label-box input[type="checkbox"]'))
                        .find(el => el.nextSibling && el.nextSibling.nodeValue.trim() === '显示蒸汽机水印');
                    if (watermarkCheckbox && watermarkCheckbox.checked !== watermarkEnabled) {
                        watermarkCheckbox.click();
                    }
                }, watermarkEnabled);


                // 等待指定时间以确保图像处理完成
                await new Promise(resolve => setTimeout(resolve, waitTime)); // 等待 


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


    ctx.command("patina/包浆", "赛博虚拟包浆器")
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
            } else {
                await session.send("正在处理中，请稍后...");
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
                            //loggerinfo('设置做旧年份:', VintageYears, '当前滑动条值:', rangeInput.value);
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
                            //loggerinfo('设置画质:', ImageQuality, '当前滑动条值:', rangeInput.value);
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
