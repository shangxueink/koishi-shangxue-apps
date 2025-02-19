"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.inject = exports.name = void 0;
const { Schema, Logger, h } = require("koishi");

const fs = require('node:fs');
const path = require('node:path');


exports.name = "perchance";
exports.inject = {
    required: ['puppeteer']
};
exports.usage = `
<h1>Perchance AI 绘画插件</h1>

<section>
<h2>简介</h2>
<p>这是一个用于生成 AI 绘画的插件。你可以使用关键词来生成图像。</p>
</section>

<section>
<h2>使用方法</h2>
<p>使用 <code>perchance</code> 命令，并添加关键词来生成图像。</p>

<h3>示例</h3>
<pre><code>/perchance -r -n 1 -u 768x512 -s Waifu  intergalactic spy with a sentient gadget</code></pre>
<p><strong>参数说明：</strong></p>
<ul>
<li><code>-r</code>: 随机 tag</li>
<li><code>-n</code>: 返回的绘画数量 (这里是 1)</li>
<li><code>-u</code>: 指定图片尺寸 (这里是 768x512)</li>
<li><code>-s</code>: 绘画的风格 (这里是 "Waifu")</li>
<li><code>keyword</code>: 绘画的tag (这里是 "intergalactic spy with a sentient gadget")</li>
</ul>
</section>

<section>
<h2>注意事项</h2>
<div class="note">
<p><strong>重要提示：</strong> 注意尽量使用英文tag输入</p>
<p><strong>重要提示：</strong> 注意确保puppeteer服务可以用</p>
<p><strong>重要提示：</strong> 本插件需要你的网络环境可以访问外网，否则将无法正常使用。</p>
</div>
</section>
`;

exports.Config = Schema.intersect([
    Schema.object({
        command: Schema.string().default("perchance").description("注册的指令名称"),
        PerchanceGenerator_link: Schema.string().role('link').default('https://perchance.org/stable-diffusion-ai').disabled().hidden() // 暂时不兼容别的网站
            .description("前往的`Perchance Generator`网址。（暂不支持更换网站）<br>注意必须是结构一样的网址<br>类似的网站还有: `https://perchance.org/vf39q568fb`"),
    }).description('插件设置'),

    Schema.object({
        Description: Schema.union([
            Schema.const().description('不加全局tag'),
            Schema.string().description('填写指定的全局tag'),
        ]).description("Description<br>追加的全局tag，会在用户输入的tag里加入此配置项的内容").default(null),
        AntiDescription: Schema.string().role('textarea', { rows: [4, 4] }).description("Anti-Description (optional)<br>`things you 𝗱𝗼𝗻'𝘁 want in the image`<br>不希望出现在绘画中的物品的tag（可选）")
            .default("nsfw, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry"),
        ArtStyle: Schema.union([
            Schema.const('Cinematic').description('Cinematic (电影感)'),
            Schema.const('Furry - Cinematic').description('Furry - Cinematic (兽人 - 电影感)'),
            Schema.const('Painted Anime').description('Painted Anime (手绘动漫)'),
            Schema.const('Casual Photo').description('Casual Photo (日常照片)'),
            Schema.const('Digital Painting').description('Digital Painting (数字绘画)'),
            Schema.const('No style').description('No style (无风格)'),
            Schema.const('Concept Art').description('Concept Art (概念艺术)'),
            Schema.const('3D Disney Character').description('3D Disney Character (3D 迪士尼角色)'),
            Schema.const('2D Disney Character').description('2D Disney Character (2D 迪士尼角色)'),
            Schema.const('Disney Sketch').description('Disney Sketch (迪士尼草图)'),
            Schema.const('Concept Sketch').description('Concept Sketch (概念草图)'),
            Schema.const('Painterly').description('Painterly (绘画风格)'),
            Schema.const('Oil Painting').description('Oil Painting (油画)'),
            Schema.const('Oil Painting - Realism').description('Oil Painting - Realism (油画 - 现实主义)'),
            Schema.const('Oil Painting - Old').description('Oil Painting - Old (油画 - 古旧风格)'),
            Schema.const('Professional Photo').description('Professional Photo (专业照片)'),
            Schema.const('Anime').description('Anime (动漫)'),
            Schema.const('Drawn Anime').description('Drawn Anime (手绘动漫)'),
            Schema.const('Cute Anime').description('Cute Anime (可爱动漫)'),
            Schema.const('Soft Anime').description('Soft Anime (柔和动漫)'),
            Schema.const('Fantasy Painting').description('Fantasy Painting (奇幻绘画)'),
            Schema.const('Fantasy Landscape').description('Fantasy Landscape (奇幻风景)'),
            Schema.const('Fantasy Portrait').description('Fantasy Portrait (奇幻肖像)'),
            Schema.const('Studio Ghibli').description('Studio Ghibli (吉卜力工作室风格)'),
            Schema.const('50s Enamel Sign').description('50s Enamel Sign (50年代搪瓷招牌)'),
            Schema.const('Vintage Comic').description('Vintage Comic (复古漫画)'),
            Schema.const('Franco-Belgian Comic').description('Franco-Belgian Comic (法比漫画)'),
            Schema.const('Tintin Comic').description('Tintin Comic (丁丁历险记漫画风格)'),
            Schema.const('Medieval').description('Medieval (中世纪风格)'),
            Schema.const('Pixel Art').description('Pixel Art (像素艺术)'),
            Schema.const('Furry - Oil').description('Furry - Oil (兽人 - 油画)'),
            Schema.const('Furry - Painted').description('Furry - Painted (兽人 - 手绘)'),
            Schema.const('Furry - Drawn').description('Furry - Drawn (兽人 - 素描)'),
            Schema.const('Cute Figurine').description('Cute Figurine (可爱手办)'),
            Schema.const('3D Emoji').description('3D Emoji (3D 表情符号)'),
            Schema.const('Illustration').description('Illustration (插画)'),
            Schema.const('Flat Illustration').description('Flat Illustration (扁平插画)'),
            Schema.const('Watercolor').description('Watercolor (水彩)'),
            Schema.const('1990s Photo').description('1990s Photo (90年代照片)'),
            Schema.const('1980s Photo').description('1980s Photo (80年代照片)'),
            Schema.const('1970s Photo').description('1970s Photo (70年代照片)'),
            Schema.const('1960s Photo').description('1960年代照片)'),
            Schema.const('1950s Photo').description('1950年代照片)'),
            Schema.const('1940s Photo').description('1940年代照片)'),
            Schema.const('1930s Photo').description('1930年代照片)'),
            Schema.const('1920s Photo').description('1920年代照片)'),
            Schema.const('Vintage Pulp Art').description('Vintage Pulp Art (复古通俗艺术)'),
            Schema.const('50s Infomercial Anime').description('50s Infomercial Anime (50年代电视购物动漫)'),
            Schema.const('3D Pokemon').description('3D Pokemon (3D 宝可梦)'),
            Schema.const('Painted Pokemon').description('Painted Pokemon (手绘宝可梦)'),
            Schema.const('2D Pokemon').description('2D Pokemon (2D 宝可梦)'),
            Schema.const('Vintage Anime').description('Vintage Anime (复古动漫)'),
            Schema.const('Neon Vintage Anime').description('Neon Vintage Anime (霓虹复古动漫)'),
            Schema.const('Manga').description('Manga (漫画)'),
            Schema.const('Fantasy World Map').description('Fantasy World Map (奇幻世界地图)'),
            Schema.const('Fantasy City Map').description('Fantasy City Map (奇幻城市地图)'),
            Schema.const('Old World Map').description('Old World Map (旧世界地图)'),
            Schema.const('3D Isometric Icon').description('3D Isometric Icon (3D 等距图标)'),
            Schema.const('Flat Style Icon').description('Flat Style Icon (扁平风格图标)'),
            Schema.const('Flat Style Logo').description('Flat Style Logo (扁平风格 Logo)'),
            Schema.const('Game Art Icon').description('Game Art Icon (游戏美术图标)'),
            Schema.const('Digital Painting Icon').description('Digital Painting Icon (数字绘画图标)'),
            Schema.const('Concept Art Icon').description('Concept Art Icon (概念艺术图标)'),
            Schema.const('Cute 3D Icon').description('Cute 3D Icon (可爱 3D 图标)'),
            Schema.const('Cute 3D Icon Set').description('Cute 3D Icon Set (可爱 3D 图标集)'),
            Schema.const('Crayon Drawing').description('Crayon Drawing (蜡笔画)'),
            Schema.const('Pencil').description('Pencil (铅笔画)'),
            Schema.const('Tattoo Design').description('Tattoo Design (纹身设计)'),
            Schema.const('Waifu').description('Waifu (老婆/二次元美少女)'),
            Schema.const('YuGiOh Art').description('YuGiOh Art (游戏王卡牌风格)'),
            Schema.const('Traditional Japanese').description('Traditional Japanese (传统日式风格)'),
            Schema.const('Nihonga Painting').description('Nihonga Painting (日本画)'),
            Schema.const('Claymation').description('Claymation (黏土动画)'),
            Schema.const('Cartoon').description('Cartoon (卡通)'),
            Schema.const('Cursed Photo').description('Cursed Photo (诅咒照片)'),
            Schema.const('MTG Card').description('MTG Card (万智牌卡牌风格)'),
        ]).description("Art Style<br>默认的绘画风格").default("Waifu"),

        Shape: Schema.union([
            Schema.const('512x768').description('Portrait (竖版)（512x768）'),
            Schema.const('512x512').description('Square (正方形)（512x512）'),
            Schema.const('768x512').description('Landscape (横版)（768x512）'),
        ]).role('radio').description("Shape<br>选择图片形状").default("512x768"),

        HowMany: Schema.number().description("How many?<br>返回的几张绘画？<br>注意：网页只能选择绘画3、6、9张<br>因此，如果选择8，那么网页端会返回9张，插件会随机取8张返回").min(1).max(9).step(1).default(1),

    }).description('`Perchance Generator`绘画设置'),

    Schema.object({
        // proloadPuppeteer: Schema.boolean().default(false).description("预加载网页：在启动插件后直接打开网页等待交互。<br>关闭后，只会在每次触发指令后才打开网页 进行交互").experimental(),
        waitTimeout: Schema.number().description("绘图返回的最大等待时间<br>单位 `秒`").default(45),
    }).description('进阶功能设置'),

    Schema.object({
        loggerinfo: Schema.boolean().default(false).description("日志调试模式"),
    }).description('调试设置'),
]);




async function apply(ctx, config) {
    ctx.on('ready', async () => {

        ctx.i18n.define("zh-CN", {
            commands: {
                [config.command]: {
                    description: `AI绘画`,
                    messages: {
                        "notags": "请输入关键词。\n➣示例：/perchance lovely girl",
                        "waitTime": "正在处理中，请稍后...",
                        "nopuppeteer": "没有开启puppeteer服务，请检查puppeteer插件是否已安装并启用。",
                        "processError": "处理图像时出错，请重试。",
                        "noImages": "没有生成任何图像，请重试。",
                        "invalidShape": "无效的图片形状，请选择 '竖', '横', 或 '正'。",
                        "invalidStyle": "无效的绘画风格，请检查输入是否正确。",
                        "styleNotFound": "未找到匹配的绘画风格：{style}。",
                    }
                },
            }
        });

        function loggerinfo(message, message2) {
            if (config.loggerinfo) {
                if (message2) {
                    ctx.logger.info(`[Perchance] ${message} ${message2}`);
                } else {
                    ctx.logger.info(`[Perchance] ${message}`);
                }
            }
        }

        ctx.command(`${config.command} <keyword:text>`)
            .option('number', '-n <number:number> 返回的绘画数量')
            .option('anti', '-a <anti:string> 不希望出现在绘画中的物品的tag')
            .option('style', '-s <style:string> 绘画风格')
            .option('useshape', '-u <useshape:string> 画布大小 (竖, 横, 正)')
            .example("perchance -u 横 -s Waifu -a nsfw -n 1  intergalactic spy with a sentient gadget")
            .action(async ({ session, options }, keyword) => {
                const number = options.number !== undefined ? options.number : config.HowMany; // 使用配置中的默认值
                const anti = options.anti !== undefined ? options.anti : config.AntiDescription;
                let style = options.style !== undefined ? options.style : config.ArtStyle;
                let useshape = options.useshape !== undefined ? options.useshape : config.Shape;

                if (!keyword) {
                    await session.send(session.text(`.notags`));
                    return;
                } else {
                    await session.send(session.text(`.waitTime`));
                }

                if (!ctx.puppeteer) {
                    await session.send(session.text(`.nopuppeteer`));
                    return;
                }

                let page;
                let imageBase64s = [];
                let downloadUrlFound = false;
                let downloadUrls = [];
                let downloadImageCounter = 0;
                let firstDownloadUrlFound = false;
                let canListenBase64 = false; // 标志变量，控制是否监听 base64 数据
                const sentBase64s = new Set(); // 用于存储已发送的 base64 数据，实现去重


                try {
                    page = await ctx.puppeteer.page();
                    await page.goto(config.PerchanceGenerator_link, {
                        waitUntil: 'networkidle2',
                    });

                    // Intercept network requests.
                    await page.setRequestInterception(true);

                    page.on('request', (request) => {
                        request.continue();
                    });

                    page.on('response', async (response) => {
                        const url = response.url();

                        if (url.startsWith('https://image-generation.perchance.org/api/downloadTemporaryImage?imageId=')) {
                            downloadUrls.push(url);
                            loggerinfo(`找到 标志性请求： ${url}`);
                            downloadUrlFound = true;
                            canListenBase64 = true; // 监听到 downloadTemporaryImage 后，开始监听 base64

                            if (!firstDownloadUrlFound) {
                                firstDownloadUrlFound = true;
                            }
                        }

                        // 监听 base64 编码的图片数据
                        if (canListenBase64 && (url.startsWith('data:image/jpeg;base64,') || url.startsWith('data:image/png;base64,'))) {
                            try {
                                if (sentBase64s.has(url)) {
                                    loggerinfo(`重复的base64，跳过。`);
                                    return; // 如果已经发送过，则跳过
                                }

                                imageBase64s.push(url);
                                sentBase64s.add(url); // 将 base64 数据添加到 Set 中
                                loggerinfo(`已找到base64图片数据！`);

                                downloadImageCounter++;
                                loggerinfo(`即将发送base64图片！`);
                                await session.send(h.image(url))
                                loggerinfo(`--------------------------------`);
                                if (downloadImageCounter >= number) {
                                    page.setRequestInterception(false); // Stop intercepting after getting enough images
                                    canListenBase64 = false; // 停止监听 base64

                                    // 关闭 page
                                    if (page && !page.isClosed()) {
                                        await page.close();
                                    }

                                    return; // 提前结束函数
                                }
                            } catch (e) {
                                ctx.logger.error(e)
                            }
                        }


                    });

                    // 获取 iframe 元素
                    const iframe = await page.$('#outputIframeEl');
                    if (!iframe) {
                        throw new Error('找不到 iframe 元素');
                    }

                    // 获取 iframe 的 contentFrame
                    const contentFrame = await iframe.contentFrame();
                    if (!contentFrame) {
                        throw new Error('无法获取 iframe 的 contentFrame');
                    }

                    // 拼接 Description
                    const description = config.Description ? `${config.Description}, ${keyword}` : keyword;

                    // 填入 Description
                    await contentFrame.$eval('textarea[data-name="description"]', (el, description) => {
                        el.value = description;
                    }, description);

                    // 拼接 Anti-Description
                    const antiDescription = anti ? `${config.AntiDescription}, ${anti}` : config.AntiDescription;

                    // 填入 Anti-Description
                    await contentFrame.$eval('input[data-name="negative"]', (el, antiDescription) => {
                        el.value = antiDescription;
                    }, antiDescription);

                    // Shape 转换
                    if (options.useshape) {
                        const shapeMap = {
                            '竖': '512x768',
                            '横': '768x512',
                            '正': '512x512',
                        };
                        if (shapeMap[options.useshape]) {
                            useshape = shapeMap[options.useshape];
                        } else {
                            await session.send(session.text(`.invalidShape`));
                            return;
                        }
                    }

                    // Art Style 转换
                    if (options.style) {
                        let foundStyle = null;

                        // 尝试精确匹配
                        foundStyle = Object.values(config.Config.dict.ArtStyle.elements).find(s => s.value === options.style);

                        // 尝试中文模糊匹配
                        if (!foundStyle) {
                            foundStyle = Object.values(config.Config.dict.ArtStyle.elements).find(s => ctx.i18n.render(`perchance.config.ArtStyle.${s.value}`)?.includes(options.style));
                        }

                        //尝试英文模糊匹配
                        if (!foundStyle) {
                            foundStyle = Object.values(config.Config.dict.ArtStyle.elements).find(s => s.value.toLowerCase().includes(options.style.toLowerCase()));
                        }

                        if (foundStyle) {
                            style = foundStyle.value;
                        } else {
                            await session.send(session.text(`.styleNotFound`, { style: options.style }));
                            return;
                        }
                    }


                    // 选择 Art Style
                    await contentFrame.$eval('select[data-name="artStyle"]', (el, artStyle) => {
                        // 特殊处理 "No style" 的情况
                        const value = artStyle === "No style" ? "𝗡𝗼 𝘀𝘁𝘆𝗹𝗲" : artStyle;
                        const option = Array.from(el.options).find(o => o.textContent === value);
                        if (option) {
                            el.value = option.value;
                            el.dispatchEvent(new Event('change', { bubbles: true })); // 触发 change 事件
                        }
                    }, style);

                    // 选择 Shape
                    await contentFrame.$eval('select[data-name="shape"]', (el, shape) => {
                        el.value = shape;
                        el.dispatchEvent(new Event('change', { bubbles: true })); // 触发 change 事件
                    }, useshape);

                    // 选择 How many? (如果需要调整数量)
                    const howManyOptions = [3, 6, 9];
                    const closestHowMany = howManyOptions.reduce((prev, curr) =>
                        (Math.abs(curr - number) < Math.abs(prev - number) ? curr : prev)
                    );

                    await contentFrame.$eval('select[data-name="numImages"]', (el, howMany) => {
                        el.value = howMany.toString();
                        el.dispatchEvent(new Event('change', { bubbles: true })); // 触发 change 事件
                    }, closestHowMany);


                    // 点击 Generate 按钮
                    await contentFrame.click('#generateButtonEl');

                    // Wait for images to be generated (adjust timeout as needed)
                    await new Promise(resolve => {
                        const checkInterval = setInterval(() => {
                            if (imageBase64s.length >= number) {
                                clearInterval(checkInterval);
                                resolve();
                            }
                        }, 1000); // Check every 1000 ms
                        ctx.setTimeout(() => {
                            clearInterval(checkInterval);
                            resolve(); // Resolve even if not all images are found within the timeout
                        }, config.waitTimeout * 1000); // Timeout after config.waitTimeout seconds
                    });


                    if (imageBase64s.length === 0) {
                        await session.send(session.text(`.noImages`));
                        return;
                    }

                    // 如果在response里没有直接返回，就走这里的逻辑兜底
                    // 随机选择图片
                    let numToReturn = Math.min(number, imageBase64s.length); // 确保不会超出实际生成的图片数量
                    let selectedImages = [];

                    for (let i = 0; i < numToReturn; i++) {
                        const randomIndex = Math.floor(Math.random() * imageBase64s.length);
                        selectedImages.push(imageBase64s[randomIndex]);
                        imageBase64s.splice(randomIndex, 1); // 避免重复选择
                    }

                    // 发送图片
                    for (const base64 of selectedImages) {
                        // await session.send(h.image(base64)); // 这里已经发送过了
                    }


                } catch (error) {
                    ctx.logger.error('处理图像时出错:', error);
                    await session.send(session.text(`.processError`));
                } finally {
                    if (page && !page.isClosed()) {
                        await page.close();
                    }
                    if (page) {
                        await page.setRequestInterception(false); // 确保在出错时也停止拦截
                    }
                }
            });

    });
}















exports.apply = apply;


