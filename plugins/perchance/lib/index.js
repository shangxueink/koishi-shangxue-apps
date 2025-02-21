"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.inject = exports.name = void 0;
const { Schema, Logger, h } = require("koishi");

exports.name = "perchance";
exports.inject = {
    required: ['puppeteer']
};
exports.usage = `
<h1>Perchance Generator 绘画插件</h1>

<section>
<h2>简介</h2>
<p>这是一个用于生成 AI 绘画的插件。你可以使用关键词来生成图像。</p>
</section>

<section>
<h2>使用方法</h2>
<p>使用 <code>perchance</code> 命令，并添加关键词来生成图像。</p>

<h3>示例</h3>
<pre><code>/perchance -n 1 -u 横 -s 动漫 intergalactic spy with a sentient gadget</code></pre>
<pre><code>/perchance -n 3 -u landscape -s Waifu camouflaged vigilante lurking in the mist</code></pre>
<p><strong>参数说明：</strong></p>
<ul>
<li><code>-n</code>: 返回的绘画数量 (这里是 1)</li>
<li><code>-u</code>: 指定图片尺寸 (可以填中文关键词，也可以填英文名称，与配置项可选内容的名称一致)</li>
<li><code>-s</code>: 绘画的风格 (可以填中文关键词，也可以填英文名称，与配置项可选内容的名称一致)</li>
<li><code>keyword</code>: 绘画的tag (这里是 "intergalactic spy with a sentient gadget"，尽可能使用英文tag)</li>
</ul>
</section>

<section>
<h2>注意事项</h2>
<div class="note">
<p><strong>⚠️重要提示：</strong> 注意尽量使用英文tag输入</p>
<p><strong>⚠️重要提示：</strong> 注意确保puppeteer服务可以用</p>
<p><strong>⚠️重要提示：</strong> 本插件需要你的网络环境可以访问外网，否则将无法正常使用。</p>
<p><strong>⚠️重要提示：</strong> VPN 可能导致你无法使用此网站。如果出现<code>Anti-bot verification failed.</code> 请使用puppeteer插件调用一致的浏览器，手动打开网页，直至可以交互！</p>
</div>
</section>

---


相关网址： 

<a target="_blank" href="https://perchance.org/stable-diffusion-ai">➤ https://perchance.org/stable-diffusion-ai</a>

<a target="_blank" href="https://forum.koishi.xyz/t/topic/10422">➤ https://forum.koishi.xyz/t/topic/10422</a>
`;

exports.Config = Schema.intersect([
    Schema.object({
        command: Schema.string().default("perchance").description("注册的指令名称"),
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
            Schema.const('1990s Photo').description('1990s Photo (1990年代照片)'),
            Schema.const('1980s Photo').description('1980s Photo (1980年代照片)'),
            Schema.const('1970s Photo').description('1970s Photo (1970年代照片)'),
            Schema.const('1960s Photo').description('1960s Photo (1960年代照片)'),
            Schema.const('1950s Photo').description('1950s Photo (1950年代照片)'),
            Schema.const('1940s Photo').description('1940s Photo (1940年代照片)'),
            Schema.const('1930s Photo').description('1930s Photo (1930年代照片)'),
            Schema.const('1920s Photo').description('1920s Photo (1920年代照片)'),
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
        // 目前还没打算写那么好
        // 合并转发也没写
        waitTimeout: Schema.number().description("绘图返回的最大等待时间<br>单位 `秒`").default(45),
    }).description('进阶功能设置'),

    Schema.object({
        loggerinfo: Schema.boolean().default(false).description("日志调试模式<br>`请不要随意开启`").experimental(),
        puppeteerclose: Schema.boolean().default(true).description("自动关闭puppeteer（有头调试时可关闭，便于观察）<br>`请不要随意开启`").experimental(),
        PerchanceGenerator_link: Schema.string().role('link').default('https://perchance.org/stable-diffusion-ai').experimental() // 暂时不兼容别的网站
            .description("前往的`Perchance Generator`网址。（暂不支持更换网站）<br>注意必须是结构一样的网址<br>比如反代地址？"), // 类似的网站还有: `https://perchance.org/vf39q568fb`
    }).description('开发者设置'),
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
                        "nopuppeteer": "没有开启puppeteer服务",
                        "processError": "处理图像时出错，请重试。",
                        "noImages": "没有生成任何图像，请重试。"
                    }
                },
            }
        });
        function loggerinfo(message, message2) {
            if (config.loggerinfo) {
                if (message2) {
                    ctx.logger.info(`${message}${message2}`)
                } else {
                    ctx.logger.info(message);
                }
            }
        }
        // Shape 映射表
        const shapeMap = {
            '竖': '512x768',
            '竖版': '512x768',
            'portrait': '512x768',
            '横': '768x512',
            '横版': '768x512',
            'landscape': '768x512',
            '正': '512x512',
            '正方形': '512x512',
            'square': '512x512',
        };

        // Art Style 映射表 (包含中文描述和英文名称)
        const artStyleMap = {
            'Cinematic': ['Cinematic', '电影感'],
            'Furry - Cinematic': ['Furry - Cinematic', '兽人 - 电影感'],
            'Painted Anime': ['Painted Anime', '手绘动漫'],
            'Casual Photo': ['Casual Photo', '日常照片'],
            'Digital Painting': ['Digital Painting', '数字绘画'],
            'No style': ['No style', '无风格'],
            'Concept Art': ['Concept Art', '概念艺术'],
            '3D Disney Character': ['3D Disney Character', '3D 迪士尼角色'],
            '2D Disney Character': ['2D Disney Character', '2D 迪士尼角色'],
            'Disney Sketch': ['Disney Sketch', '迪士尼草图'],
            'Concept Sketch': ['Concept Sketch', '概念草图'],
            'Painterly': ['Painterly', '绘画风格'],
            'Oil Painting': ['Oil Painting', '油画'],
            'Oil Painting - Realism': ['Oil Painting - Realism', '油画 - 现实主义'],
            'Oil Painting - Old': ['Oil Painting - Old', '油画 - 古旧风格'],
            'Professional Photo': ['Professional Photo', '专业照片'],
            'Anime': ['Anime', '动漫'],
            'Drawn Anime': ['Drawn Anime', '手绘动漫'],
            'Cute Anime': ['Cute Anime', '可爱动漫'],
            'Soft Anime': ['Soft Anime', '柔和动漫'],
            'Fantasy Painting': ['Fantasy Painting', '奇幻绘画'],
            'Fantasy Landscape': ['Fantasy Landscape', '奇幻风景'],
            'Fantasy Portrait': ['Fantasy Portrait', '奇幻肖像'],
            'Studio Ghibli': ['Studio Ghibli', '吉卜力工作室风格'],
            '50s Enamel Sign': ['50s Enamel Sign', '50年代搪瓷招牌'],
            'Vintage Comic': ['Vintage Comic', '复古漫画'],
            'Franco-Belgian Comic': ['Franco-Belgian Comic', '法比漫画'],
            'Tintin Comic': ['Tintin Comic', '丁丁历险记漫画风格'],
            'Medieval': ['Medieval', '中世纪风格'],
            'Pixel Art': ['Pixel Art', '像素艺术'],
            'Furry - Oil': ['Furry - Oil', '兽人 - 油画'],
            'Furry - Painted': ['Furry - Painted', '兽人 - 手绘'],
            'Furry - Drawn': ['Furry - Drawn', '兽人 - 素描'],
            'Cute Figurine': ['Cute Figurine', '可爱手办'],
            '3D Emoji': ['3D Emoji', '3D 表情符号'],
            'Illustration': ['Illustration', '插画'],
            'Flat Illustration': ['Flat Illustration', '扁平插画'],
            'Watercolor': ['Watercolor', '水彩'],
            '1990s Photo': ['1990s Photo', '90年代照片'],
            '1980s Photo': ['1980s Photo', '80年代照片'],
            '1970s Photo': ['1970s Photo', '70年代照片'],
            '1960s Photo': ['1960s Photo', '1960年代照片'],
            '1950s Photo': ['1950s Photo', '1950年代照片'],
            '1940s Photo': ['1940s Photo', '1940年代照片'],
            '1930s Photo': ['1930s Photo', '1930年代照片'],
            '1920s Photo': ['1920s Photo', '1920年代照片'],
            'Vintage Pulp Art': ['Vintage Pulp Art', '复古通俗艺术'],
            '50s Infomercial Anime': ['50s Infomercial Anime', '50年代电视购物动漫'],
            '3D Pokemon': ['3D Pokemon', '3D 宝可梦'],
            'Painted Pokemon': ['Painted Pokemon', '手绘宝可梦'],
            '2D Pokemon': ['2D Pokemon', '2D 宝可梦'],
            'Vintage Anime': ['Vintage Anime', '复古动漫'],
            'Neon Vintage Anime': ['Neon Vintage Anime', '霓虹复古动漫'],
            'Manga': ['Manga', '漫画'],
            'Fantasy World Map': ['Fantasy World Map', '奇幻世界地图'],
            'Fantasy City Map': ['Fantasy City Map', '奇幻城市地图'],
            'Old World Map': ['Old World Map', '旧世界地图'],
            '3D Isometric Icon': ['3D Isometric Icon', '3D 等距图标'],
            'Flat Style Icon': ['Flat Style Icon', '扁平风格图标'],
            'Flat Style Logo': ['Flat Style Logo', '扁平风格 Logo'],
            'Game Art Icon': ['Game Art Icon', '游戏美术图标'],
            'Digital Painting Icon': ['Digital Painting Icon', '数字绘画图标'],
            'Concept Art Icon': ['Concept Art Icon', '概念艺术图标'],
            'Cute 3D Icon': ['Cute 3D Icon', '可爱 3D 图标'],
            'Cute 3D Icon Set': ['Cute 3D Icon Set', '可爱 3D 图标集'],
            'Crayon Drawing': ['Crayon Drawing', '蜡笔画'],
            'Pencil': ['Pencil', '铅笔画'],
            'Tattoo Design': ['Tattoo Design', '纹身设计'],
            'Waifu': ['Waifu', '老婆/二次元美少女'],
            'YuGiOh Art': ['YuGiOh Art', '游戏王卡牌风格'],
            'Traditional Japanese': ['Traditional Japanese', '传统日式风格'],
            'Nihonga Painting': ['Nihonga Painting', '日本画'],
            'Claymation': ['Claymation', '黏土动画'],
            'Cartoon': ['Cartoon', '卡通'],
            'Cursed Photo': ['Cursed Photo', '诅咒照片'],
            'MTG Card': ['MTG Card', '万智牌卡牌风格'],
        };

        function fuzzyMatchStyle(inputStyle) {
            inputStyle = inputStyle || ''; // 确保 inputStyle 不是 undefined 或 null
            if (!inputStyle) return config.ArtStyle; // 默认风格

            const lowerInput = inputStyle.toLowerCase();
            for (const styleKey in artStyleMap) {
                const [englishName, chineseName] = artStyleMap[styleKey];
                if (englishName.toLowerCase() === lowerInput || chineseName.toLowerCase() === lowerInput) {
                    return styleKey; // 精确匹配英文或中文
                }
                if (englishName.toLowerCase().includes(lowerInput) || chineseName.toLowerCase().includes(lowerInput)) {
                    return styleKey; // 模糊匹配英文或中文
                }
            }
            return inputStyle; // 没有匹配到，返回用户输入 // 这里应该返回提示“不存在的风格”
        }

        ctx.command(`${config.command} <keyword:text>`)
            .option('number', '-n <number:number> 返回的绘画数量')
            .option('anti', '-a <anti:string> 不希望出现在绘画中的物品的tag')
            .option('style', '-s <style:string> 绘画风格')
            .option('useshape', '-u <useshape:string> 画布大小')
            .example("perchance -n 1 -u 横 -s 动漫 intergalactic spy with a sentient gadget")
            .example("perchance -n 3 -u landscape -s Waifu camouflaged vigilante lurking in the mist")
            .action(async ({ session, options }, keyword) => {
                const number = options.number !== undefined ? options.number : config.HowMany; // 使用配置中的默认值
                const anti = options.anti !== undefined ? options.anti : config.AntiDescription;
                const style = options.style !== undefined ? options.style : config.ArtStyle;
                const useshape = options.useshape !== undefined ? options.useshape : config.Shape;
                const finalShape = shapeMap[useshape] || useshape; // 应用 shapeMap 映射，如果找不到则使用原始输入
                const finalStyle = fuzzyMatchStyle(style); // 使用 fuzzyMatchStyle 处理风格

                loggerinfo("指定的返回数量：", number);
                loggerinfo("指定违禁词：", anti);
                // loggerinfo("指定风格：",style);
                // loggerinfo("：",useshape);
                loggerinfo("指定画布：", finalShape);
                loggerinfo("指定风格：", finalStyle);
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
                loggerinfo("即将操作puppeteer ... ");
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
                                    //page.setRequestInterception(false); // Stop intercepting after getting enough images
                                    canListenBase64 = false; // 停止监听 base64

                                    // 关闭 page
                                    if (page && config.puppeteerclose && !page.isClosed()) {
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


                    // 填入 Description (逐字符输入)
                    await contentFrame.$eval('textarea[data-name="description"]', async (el, description) => {
                        el.value = ''; // 先清空 textarea
                        for (let i = 0; i < description.length; i++) {
                            el.value += description[i];
                            //  await new Promise(resolve => ctx.setTimeout(resolve, 50)); // 模拟输入间隔 (50ms)
                        }
                        el.dispatchEvent(new Event('input', { bubbles: true })); // 触发 input 事件 (更通用)
                        el.dispatchEvent(new Event('change', { bubbles: true })); // 触发 change 事件 (保险起见)
                    }, description);

                    // 拼接 Anti-Description
                    const antiDescription = anti ? `${config.AntiDescription}, ${anti}` : config.AntiDescription;

                    // 填入 Anti-Description
                    await contentFrame.$eval('input[data-name="negative"]', async (el, antiDescription) => {
                        el.value = ''; // 先清空 input
                        for (let i = 0; i < antiDescription.length; i++) {
                            el.value += antiDescription[i];
                            // await new Promise(resolve => ctx.setTimeout(resolve, 50)); // 模拟输入间隔 (50ms)
                        }
                        el.dispatchEvent(new Event('input', { bubbles: true })); // 触发 input 事件 (更通用)
                        el.dispatchEvent(new Event('change', { bubbles: true })); // 触发 change 事件 (保险起见)
                    }, antiDescription);
                    // 选择 Art Style
                    await contentFrame.$eval('select[data-name="artStyle"]', (el, artStyle) => {
                        // 特殊处理 "No style" 的情况
                        const value = artStyle === "No style" ? "𝗡𝗼 𝘀𝘁𝘆𝗹𝗲" : artStyle;
                        const option = Array.from(el.options).find(o => o.textContent === value);
                        if (option) {
                            el.value = option.value;
                            el.dispatchEvent(new Event('change', { bubbles: true })); // 触发 change 事件
                        }
                    }, finalStyle);

                    // 选择 Shape
                    await contentFrame.$eval('select[data-name="shape"]', (el, shape) => {
                        el.value = shape;
                        el.dispatchEvent(new Event('change', { bubbles: true })); // 触发 change 事件
                    }, finalShape);

                    // 选择 How many? (调整数量)
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


                    await new Promise(resolve => {
                        const checkInterval = ctx.setInterval(() => {
                            if (imageBase64s.length >= number) {
                                clearInterval(checkInterval);
                                resolve();
                            }
                        }, 1000); // Check every 1000 ms
                        ctx.setTimeout(() => {
                            clearInterval(checkInterval);
                            resolve();
                        }, config.waitTimeout * 1000);
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
                    if (page && config.puppeteerclose && !page.isClosed()) {
                        await page.close();
                    }
                }
            });

    });
}

exports.apply = apply;