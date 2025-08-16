import { Schema, Context, h } from 'koishi'
import { unlink, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { parseGIF, decompressFrames } from 'gifuct-js'

import { } from 'koishi-plugin-ffmpeg'
import { } from 'koishi-plugin-canvas'

export const name = 'gif-reverse'
export const inject = {
    required: ['http', 'i18n', 'logger', 'ffmpeg', 'canvas']
}

export const usage = `
---

## 开启插件前，请确保以下插件已经安装！

### 所需依赖：

- [ffmpeg服务](/market?keyword=ffmpeg)  （需要额外安装）（此插件可能还需download服务）

- [puppeteer提供的canvas服务](/market?keyword=koishi-plugin-puppeteer+email:shigma10826@gmail.com) 或 [canvas服务](/market?keyword=canvas)  （需要额外安装）

- [http服务](/market?keyword=http+email:shigma10826@gmail.com) （koishi自带）

- [logger服务](/market?keyword=logger+email:shigma10826@gmail.com) （koishi自带）

- i18n服务 （koishi自带）

---

## 支持的图片格式

- **GIF 图片**: 支持所有效果（倒放、回弹、滑动、旋转、转向等）
- **静态图片**: 支持滑动、旋转、转向效果，可将静态图转换为动态GIF
  - 支持格式：JPEG、PNG、WebP
  - 不支持：倒放、回弹效果（静态图无时间序列）

---

<table>
<thead>
<tr>
<th>选项</th>
<th>简写</th>
<th>描述</th>
<th>类型</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>--rebound</code></td>
<td><code>-b</code></td>
<td>回弹效果（正放+倒放）</td>
<td><code>boolean</code></td>
</tr>
<tr>
<td><code>--reverse</code></td>
<td><code>-r</code></td>
<td>倒放 GIF</td>
<td><code>boolean</code></td>
</tr>
<tr>
<td><code>--frame</code></td>
<td><code>-f</code></td>
<td>指定处理gif的平均帧间隔</td>
<td><code>number</code></td>
</tr>
<tr>
<td><code>--slide</code></td>
<td><code>-l</code></td>
<td>滑动方向 (上/下/左/右)</td>
<td><code>string</code></td>
</tr>
<tr>
<td><code>--rotate</code></td>
<td><code>-o</code></td>
<td>旋转方向 (顺/逆)</td>
<td><code>string</code></td>
</tr>
<tr>
<td><code>--turn</code></td>
<td><code>-t</code></td>
<td>转向角度 (上/下/左/右/0-360)</td>
<td><code>string</code></td>
</tr>
<tr>
<td><code>--information</code></td>
<td><code>-i</code></td>
<td>显示 GIF 信息</td>
<td><code>boolean</code></td>
</tr>
</tbody>
</table>

---

<h2>使用示例</h2>

<details>
<summary>点击此处————查看指令使用示例</summary>
    
<ul>
<li><strong>回弹 GIF:</strong>
<pre><code>gif -b</code></pre>
</li>
<li><strong>倒放 GIF:</strong>
<pre><code>gif -r</code></pre>
</li>
<li><strong>指定帧间隔 20ms:</strong>
<pre><code>gif -f 20</code></pre>
</li>
<li><strong>右滑 GIF:</strong>
<pre><code>gif -l 右</code></pre>
</li>
<li><strong>逆时针旋转 GIF:</strong>
<pre><code>gif -o 逆</code></pre>
</li>
<li><strong>转向 30 度:</strong>
<pre><code>gif -t 30</code></pre>
</li>
<li><strong>转向向上:</strong>
<pre><code>gif -t 上</code></pre>
</li>
<li><strong>右上方滑动:</strong>
<pre><code>gif -l 右 -t 45</code></pre>
</li>
<li><strong>顺时针旋转:</strong>
<pre><code>gif -o 顺</code></pre>
</li>
<li><strong>显示 GIF 信息:</strong>
<pre><code>gif -i</code></pre>
</li>
</ul>
</details>

完整使用方法请使用 <code>gif -h</code> 查看指令用法

---

`;


export const Config =
    Schema.intersect([
        Schema.object({
            gifCommand: Schema.string().default("gif-reverse").description("注册的指令名称"),
            waitTimeout: Schema.number().default(50).max(120).min(10).step(1).description("等待输入图片的最大时间（秒）"),
        }).description('基础设置'),
        Schema.object({
            usedReverse: Schema.boolean().default(false).description("开启后，在不指定选项时，默认使用`倒放`效果。<br>关闭后，在不指定选项时，执行`-h`选项查看帮助"),
            outputinformation: Schema.boolean().default(true).description("开启后，在生成图片后，带上图片信息`自动 -i 选项`。<br>否则只会输出处理后的GIF图片"),
            fillcolor: Schema.string().role('color').description("GIF图片的底色。默认透明。").default("rgba(255, 255, 255, 0)"),
            maxFps: Schema.number().default(50).max(50).min(10).step(1).description("限制输出 GIF 的最大帧率，防止卡顿、掉帧。"),
            staticImageFps: Schema.number().default(30).max(50).min(10).step(1).description("静态图默认的FPS。`不影响GIF，GIF使用原始帧率`"),
        }).description('进阶设置'),
        Schema.object({
            loggerinfo: Schema.boolean().default(false).description("日志调试模式"),
        }).description('开发者选项'),
    ])

export function apply(ctx: Context, config) {
    const TMP_DIR = tmpdir()
    const logger = ctx.logger('gif-reverse')

    ctx.i18n.define("zh-CN", {
        commands: {
            [config.gifCommand]: {
                arguments: {
                    gif: "图片消息",
                },
                description: "GIF 图片处理",
                messages: {
                    "invalidFFmpeg": "没有安装 FFmpeg 服务！",
                    "invalidFrame": "帧间隔必须是正整数",
                    "waitprompt": "在 {0} 秒内发送想要处理的图片",
                    "invalidimage": "未检测到图片输入，请重试。",
                    "invalidGIF": "无法处理此图片格式，请使用 GIF、JPEG、PNG 或 WebP 格式。",
                    "generatefailed": "图片生成失败。",
                    "invalidDirection": "无效的方向参数，请选择：左、右、上、下",
                    "invalidRotation": "无效的旋转方向，请选择：顺、逆",
                    "invalidTurn": "无效的转向角度，请输入 0-360 之间的数字，或 上/下/左/右/左上/左下/右上/右下",
                    "information": "\n图片信息：\n文件大小：{0} KB\n图片尺寸：{1}x{2}\n帧数：{3}\n平均帧间隔：{4} 毫秒\n帧率：{5} FPS\n总时长：{6} 秒\n",
                },
                options: {
                    help: "查看指令帮助",
                    rebound: "回弹效果（正放+倒放）",
                    reverse: " 倒放 GIF",
                    frame: "指定处理gif的平均帧间隔（毫秒，必须是正整数）",
                    slide: "滑动方向 (上/下/左/右)",
                    rotate: "旋转方向 (顺/逆)",
                    turn: "转向角度 (上/下/左/右/左上/左下/右上/右下/0-360)",
                    information: "显示图片信息",
                }
            },
        }
    });

    ctx.command(`${config.gifCommand} [...args]`)
        .option('rebound', '-b, --rebound', { type: 'boolean' })
        .option('reverse', '-r, --reverse', { type: 'boolean' })
        .option('frame', '-f <frame:number>', { type: 'number' })
        .option('slide', '-l <direction:string>', { type: 'string' })
        .option('rotate', '-o <direction:string>', { type: 'string' })
        .option('turn', '-t <angle:string>', { type: 'string' })
        .option('information', '-i, --information', { type: 'boolean' })
        .example(`回弹：${config.gifCommand} -b`)
        .example(`倒放：${config.gifCommand} -r`)
        .example(`指定帧间隔：${config.gifCommand} -f 20`)
        .example(`右滑：${config.gifCommand} -l 右`)
        .example(`逆时针旋转：${config.gifCommand} -o 逆`)
        .example(`转向30度：${config.gifCommand} -t 30`)
        .example(`转向向左上：${config.gifCommand} -t 左上`)
        .example(`45度右滑：${config.gifCommand} -l 右 -t 45`)
        .example(`顺时针旋转：${config.gifCommand} -o 顺`)
        .example(`显示图片信息: ${config.gifCommand} -i`)
        .action(async ({ session, options, args }) => {
            let { reverse, rebound, frame, slide, rotate, turn, information } = options
            const fillcolorHex = rgbaToHex(config.fillcolor);
            logInfo(options)
            logInfo("使用的底色：", config.fillcolor, " -> ", fillcolorHex)

            if (!ctx.ffmpeg) {
                await session.send(session.text(".invalidFFmpeg"));
                return
            }
            if (Object.keys(options).length === 0) {
                if (config.usedReverse) {
                    reverse = true
                } else {
                    await session.execute(`${config.gifCommand} -h`)
                    return
                }
            }

            if (frame && (!Number.isInteger(frame) || frame <= 0)) {
                await session.send(session.text(".invalidFrame"));
                return
            }

            // 智能查找图片参数
            let src: string | undefined;

            // 检查参数中是否有图片链接
            for (const arg of args) {
                if (arg && typeof arg === 'string') {
                    const imgSrc = h.select(arg, 'img').map(item => item.attrs.src)[0] ||
                        h.select(arg, 'mface').map(item => item.attrs.url)[0];
                    if (imgSrc) {
                        src = imgSrc;
                        break;
                    }
                }
            }

            // 检查消息内容中是否有图片
            if (!src) {
                src = h.select(session.content, 'img').map(item => item.attrs.src)[0] ||
                    h.select(session.content, 'mface').map(item => item.attrs.url)[0];
            }

            // 检查引用消息中是否有图片
            if (!src && session.quote) {
                src = h.select(session.quote.content, 'img').map(item => item.attrs.src)[0] ||
                    h.select(session.quote.content, 'mface').map(item => item.attrs.url)[0];
            }

            if (!src) {
                logInfo("暂未输入图片，即将交互获取图片输入");
            } else {
                logInfo(src.slice(0, 200));
            }

            if (!src) {
                const [msgId] = await session.send(session.text(".waitprompt", [config.waitTimeout]))
                const promptcontent = await session.prompt(config.waitTimeout * 1000)
                if (promptcontent !== undefined) {
                    src = h.select(promptcontent, 'img')[0]?.attrs.src || h.select(promptcontent, 'mface')[0]?.attrs.url
                }
                try {
                    await session.bot.deleteMessage(session.channelId, msgId)
                } catch {
                    ctx.logger.warn(`在频道 ${session.channelId} 尝试撤回消息ID ${msgId} 失败。`)
                }
            }

            const quote = h.quote(session.messageId)

            if (!src) {
                await session.send(`${quote}${session.text(".invalidimage")}`);
                return
            }

            const file = await ctx.http.file(src)
            logInfo(file)

            // 检查是否为支持的图片格式
            const isGif = ['image/gif', 'application/octet-stream', 'video/mp4'].includes(file.type)
            let isStaticImage = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)

            if (!isGif && !isStaticImage) {
                await session.send(`${quote}${session.text(".invalidGIF")}`);
                return
            }

            // 静态图不支持的选项检查
            if (isStaticImage && (rebound || reverse)) {
                await session.send(`${quote}静态图片不支持回弹和倒放效果，请使用滑动、旋转或转向效果。`);
                return
            }

            let path = join(TMP_DIR, `gif-reverse-${Date.now()}`)
            await writeFile(path, Buffer.from(file.data))

            // 获取图片信息
            let gifDuration = 0;
            let fps = config.staticImageFps; // 静态图默认30fps，GIF使用原始帧率
            let frameCount = 0;
            let frameDelays: number[] = [];
            let fileSizeInKB = (Buffer.from(file.data).length / 1024).toFixed(2);

            let originalWidth = 0;
            let originalHeight = 0;

            try {
                // 获取图片尺寸
                const canvasimage = await ctx.canvas.loadImage(src);
                // @ts-ignore
                originalWidth = canvasimage.naturalWidth || canvasimage.width;
                // @ts-ignore
                originalHeight = canvasimage.naturalHeight || canvasimage.height;

                if (isGif) {
                    // GIF 信息解析
                    const gifData = await readFile(path);
                    const gif = parseGIF(Buffer.from(gifData).buffer.slice(0));
                    const frames = decompressFrames(gif, true);
                    frameCount = frames.length;
                    frameDelays = frames.map(frame => frame.delay);
                    const totalDelay = frameDelays.reduce((a, b) => a + b, 0);
                    gifDuration = totalDelay / 1000; // 转换为秒

                    // 检测是否为单帧GIF
                    if (frameCount <= 1) {
                        // 单帧GIF作为静态图处理
                        logInfo(`检测到单帧GIF，将作为静态图处理`);

                        // 将单帧GIF转换为PNG
                        const pngPath = join(TMP_DIR, `gif-reverse-png-${Date.now()}.png`);

                        try {
                            const pngBuilder = ctx.ffmpeg.builder();
                            pngBuilder.input(path); // 使用本地临时文件路径
                            pngBuilder.outputOption('-vframes', '1'); // 只取第一帧
                            pngBuilder.outputOption('-f', 'image2'); // 指定输出为图片格式
                            pngBuilder.outputOption('-c:v', 'png'); // 强制使用PNG编码器
                            pngBuilder.outputOption('-update', '1'); // 强制更新输出
                            pngBuilder.outputOption('-pix_fmt', 'rgba'); // 确保保留透明度

                            // 运行转换并获取PNG格式的buffer
                            const pngBuffer = await pngBuilder.run('buffer');
                            if (pngBuffer.length === 0) {
                                logger.error('FFmpeg 返回空 buffer')
                                await session.send(`${quote}${session.text(".generatefailed")}`);
                                return
                            }
                            // 写入新文件
                            await writeFile(pngPath, pngBuffer);

                            // 删除原GIF文件
                            await unlink(path);

                            // 更新路径指向新的PNG文件
                            path = pngPath;

                            logInfo(`单帧GIF已提取为PNG: ${pngPath}`);
                        } catch (e) {
                            logger.error('单帧GIF提取失败', e);
                            // 即使转换失败，也继续尝试处理
                        }

                        frameCount = 1;
                        gifDuration = 2; // 静态图默认2秒循环
                        frameDelays = [2000]; // 2秒
                        // 标记为静态图处理
                        isStaticImage = true;
                        // 如果选择了倒放或回弹，提示这些效果不适用于单帧图像
                        if (rebound || reverse) {
                            await session.send(`${quote}检测到单帧GIF，将作为静态图处理。回弹和倒放效果不适用，请使用滑动、旋转或转向效果。`);
                            rebound = false;
                            reverse = false;
                        }
                    } else {
                        // 计算帧率
                        if (gifDuration > 0) {
                            fps = frames.length / gifDuration;
                        }
                        logInfo(`GIF 帧率: ${fps}, 帧数: ${frameCount}`);
                    }
                } else {
                    // 静态图信息
                    frameCount = 1;
                    gifDuration = 2; // 静态图默认2秒循环
                    frameDelays = [2000]; // 2秒
                    logInfo(`静态图片，将生成2秒循环的动画，30fps`);
                }

            } catch (error) {
                logger.error("解析图片时发生错误:", error);
                await session.send(`${quote}${session.text(".generatefailed")}`);
                return;
            }

            if (information) {
                // 显示图片信息
                const totalDelay = frameDelays.reduce((a, b) => a + b, 0);
                const averageFrameDelay = frameCount > 0 ? (totalDelay / frameCount).toFixed(2) : 0;
                await unlink(path);

                const imageType = isGif ? "GIF" : "静态图片";
                const infoText = isGif
                    ? session.text(".information", [fileSizeInKB, originalWidth, originalHeight, frameCount, averageFrameDelay, fps.toFixed(2), gifDuration.toFixed(2)])
                    : `\n${imageType} 信息：\n文件大小：${fileSizeInKB} KB\n图片尺寸：${originalWidth}x${originalHeight}\n图片格式：${file.type}\n`;

                return [infoText];
            }

            let vf = ''
            const filters: string[] = []

            let totalDuration = gifDuration;
            let outputFps = fps;

            // 静态图处理需要特殊的builder配置
            const isStaticProcessing = isStaticImage;

            // 获取命令行参数的原始顺序
            const optionOrder = [];

            // 从原始命令中提取选项顺序
            const rawCommand = session.content || '';
            const optionMatches = rawCommand.match(/\s-[a-z]|\s--[a-z-]+/g) || [];

            for (const match of optionMatches) {
                const option = match.trim();
                if (option === '-l' || option === '--slide') {
                    optionOrder.push('slide');
                } else if (option === '-t' || option === '--turn') {
                    optionOrder.push('turn');
                } else if (option === '-o' || option === '--rotate') {
                    optionOrder.push('rotate');
                } else if (option === '-f' || option === '--frame') {
                    optionOrder.push('frame');
                } else if (option === '-r' || option === '--reverse') {
                    optionOrder.push('reverse');
                } else if (option === '-b' || option === '--rebound') {
                    optionOrder.push('rebound');
                }
            }

            logInfo('选项处理顺序:', optionOrder);

            // 创建效果处理函数映射
            const effectHandlers = {
                // 回弹效果处理 (仅GIF支持)
                rebound: () => {
                    if (rebound && isGif) {
                        totalDuration = gifDuration * 2; // 总时长为原时长两倍
                        filters.push(
                            '[0]split[main][back];' +
                            '[back]reverse[reversed];' +
                            '[main][reversed]concat=n=2:v=1'
                        );
                        logInfo('应用回弹效果');
                    }
                },

                // 倒放效果处理
                reverse: () => {
                    if (reverse && isGif) {
                        filters.push('reverse');
                        logInfo('应用倒放效果');
                    }
                },

                // 应用 frame 效果
                frame: () => {
                    if (frame) {
                        if (isStaticProcessing) {
                            // 静态图的帧间隔处理：直接调整动画时长
                            const targetFrameDelay = frame; // 目标帧间隔(ms)
                            const targetFps = 1000 / targetFrameDelay; // 目标帧率
                            totalDuration = 2; // 保持2秒循环
                            outputFps = Math.min(targetFps, config.maxFps); // 限制最大帧率
                            logInfo(`静态图帧间隔调整，目标帧间隔: ${frame}ms，目标帧率: ${targetFps}，实际帧率: ${outputFps}`);
                        } else {
                            // GIF的帧间隔处理
                            const originalAverageFrameDelay = frameDelays.reduce((a, b) => a + b, 0) / frameCount;
                            const speedRatio = frame / originalAverageFrameDelay; // 计算速度比例
                            totalDuration = gifDuration * speedRatio; // 更新总时长
                            outputFps = fps / speedRatio; // 更新帧率
                            filters.push(`setpts=PTS*${speedRatio}`); // 调整时间戳实现变速
                            logInfo(`GIF帧间隔调整，原帧间隔: ${originalAverageFrameDelay}ms，目标帧间隔: ${frame}ms，速度比例: ${speedRatio}，调整后帧率: ${outputFps}`);
                        }
                    }
                },

                // 应用转向效果
                turn: () => {
                    if (turn) {
                        let angle: number;
                        switch (turn) {
                            case '上':
                                angle = -90;
                                break;
                            case '下':
                                angle = -270;
                                break;
                            case '左':
                                angle = -180;
                                break;
                            case '右':
                                angle = 0;
                                break;
                            case '左上':
                                angle = -135;
                                break;
                            case '左下':
                                angle = -225;
                                break;
                            case '右上':
                                angle = -45;
                                break;
                            case '右下':
                                angle = -315;
                                break;
                            default:
                                const parsedAngle = parseInt(turn);
                                if (isNaN(parsedAngle) || parsedAngle < 0 || parsedAngle > 360) {
                                    throw new Error("invalidTurn");
                                }
                                angle = -parsedAngle;
                                break;
                        }
                        logInfo(`应用转向效果，角度: ${angle}`);
                        filters.push(`rotate=${angle}*PI/180:fillcolor=${fillcolorHex}`);
                    }
                },

                // 应用旋转效果
                rotate: () => {
                    if (rotate) {
                        let rotateAngle = ''
                        const rotationDuration = isStaticProcessing ? totalDuration : gifDuration;

                        switch (rotate) {
                            case '顺':
                                if (isStaticProcessing) {
                                    // 静态图旋转
                                    rotateAngle = `rotate=2*PI*t/${rotationDuration}:fillcolor=${fillcolorHex}`
                                } else {
                                    rotateAngle = `rotate=${360 / rotationDuration}*t*PI/180:fillcolor=${fillcolorHex}`
                                }
                                logInfo(`应用顺时针旋转效果, 旋转周期: ${rotationDuration}秒`)
                                break
                            case '逆':
                                if (isStaticProcessing) {
                                    // 静态图旋转
                                    rotateAngle = `rotate=-2*PI*t/${rotationDuration}:fillcolor=${fillcolorHex}`
                                } else {
                                    rotateAngle = `rotate=-${360 / rotationDuration}*t*PI/180:fillcolor=${fillcolorHex}`
                                }
                                logInfo(`应用逆时针旋转效果, 旋转周期: ${rotationDuration}秒`)
                                break
                            default:
                                throw new Error("invalidRotation");
                        }
                        filters.push(rotateAngle)
                    }
                },

                // 应用滑动效果
                slide: () => {
                    if (slide) {
                        try {
                            const outputDuration = totalDuration; // 滑动效果不改变总时长
                            const totalFrames = Math.ceil(outputDuration * outputFps); // 向上取整
                            logInfo(`输出时长: ${outputDuration}`);
                            let slideFilter = '';

                            if (isStaticProcessing) {
                                // 静态图滤镜
                                switch (slide) {
                                    case '左':
                                        slideFilter = `split[a][b];[a][b]hstack[tiled];[tiled]crop=iw/2:ih:x='t*(iw/2)/${outputDuration}':y=0`;
                                        break;
                                    case '右':
                                        slideFilter = `split[a][b];[a][b]hstack[tiled];[tiled]crop=iw/2:ih:x='iw/2-t*(iw/2)/${outputDuration}':y=0`;
                                        break;
                                    case '上':
                                        slideFilter = `split[a][b];[a][b]vstack[tiled];[tiled]crop=iw:ih/2:x=0:y='t*(ih/2)/${outputDuration}'`;
                                        break;
                                    case '下':
                                        slideFilter = `split[a][b];[a][b]vstack[tiled];[tiled]crop=iw:ih/2:x=0:y='ih/2-t*(ih/2)/${outputDuration}'`;
                                        break;
                                    default:
                                        throw new Error("invalidDirection");
                                }
                            } else {
                                switch (slide) {
                                    case '左':
                                        slideFilter = `split[a][b];[a][b]hstack[tiled];[tiled]crop=iw/2:ih:x='t*(iw/2)/${outputDuration}':y=0,setpts=PTS-STARTPTS`;
                                        break;
                                    case '右':
                                        slideFilter = `split[a][b];[a][b]hstack[tiled];[tiled]crop=iw/2:ih:x='iw/2 - t*(iw/2)/${outputDuration}':y=0,setpts=PTS-STARTPTS`;
                                        break;
                                    case '上':
                                        slideFilter = `split[a][b];[a][b]vstack[tiled];[tiled]crop=iw:ih/2:x=0:y='t*(ih/2)/${outputDuration}',setpts=PTS-STARTPTS`;
                                        break;
                                    case '下':
                                        slideFilter = `split[a][b];[a][b]vstack[tiled];[tiled]crop=iw:ih/2:x=0:y='ih/2 - t*(ih/2)/${outputDuration}',setpts=PTS-STARTPTS`;
                                        break;
                                    default:
                                        throw new Error("invalidDirection");
                                }
                            }

                            filters.push(slideFilter);
                            logInfo(`应用${slide}方向滑动效果，总帧数: ${totalFrames}`);
                        } catch (error) {
                            if (error.message === "invalidDirection") {
                                throw error;
                            }
                            logger.error("处理滑动效果时发生错误:", error);
                            throw new Error("generatefailed");
                        }
                    }
                }
            };

            try {
                // 如果没有检测到选项顺序，使用默认顺序
                if (optionOrder.length === 0) {
                    // 默认顺序：先处理时间相关效果，再处理空间变换
                    if (rebound) effectHandlers.rebound();
                    if (reverse) effectHandlers.reverse();
                    if (frame) effectHandlers.frame();
                    if (turn) effectHandlers.turn();
                    if (rotate) effectHandlers.rotate();
                    if (slide) effectHandlers.slide();
                } else {
                    // 按照输入的选项顺序处理
                    // 先处理时间相关效果（倒放、回弹、帧率）
                    if (optionOrder.includes('rebound')) effectHandlers.rebound();
                    if (optionOrder.includes('reverse')) effectHandlers.reverse();
                    if (optionOrder.includes('frame')) effectHandlers.frame();

                    // 然后按照指定的顺序处理空间变换效果
                    for (const option of optionOrder) {
                        if (['turn', 'rotate', 'slide'].includes(option)) {
                            effectHandlers[option]();
                        }
                    }
                }
            } catch (error) {
                if (error.message === "invalidDirection") {
                    await session.send(`${quote}${session.text(".invalidDirection")}`);
                    return;
                } else if (error.message === "invalidRotation") {
                    await session.send(`${quote}${session.text(".invalidRotation")}`);
                    return;
                } else if (error.message === "invalidTurn") {
                    await session.send(`${quote}${session.text(".invalidTurn")}`);
                    return;
                } else {
                    await session.send(`${quote}${session.text(".generatefailed")}`);
                    return;
                }
            }

            filters.push('split[s0][s1];[s0]palettegen=stats_mode=full:reserve_transparent=on[p];[s1][p]paletteuse=new=1:dither=none')
            vf = filters.filter(f => f).join(',')

            // 限制最大帧率
            if (outputFps > config.maxFps) {
                logInfo(`帧率超过限制(${config.maxFps} FPS)，降至 ${config.maxFps} FPS`);
                outputFps = config.maxFps;
            }

            const builder = ctx.ffmpeg.builder()

            if (isStaticProcessing) {
                // 静态图需要特殊的输入参数
                builder.input(path)
                builder.inputOption('-loop', '1') // 循环读取静态图
                builder.inputOption('-t', String(totalDuration)) // 设置输入时长
                builder.outputOption('-r', String(outputFps.toFixed(2)), '-loop', '0'); // 输出帧率和循环
            } else {
                // GIF使用原有逻辑
                builder.input(path)
                builder.outputOption('-r', String(outputFps.toFixed(2)), '-loop', '0'); // 使用获取到的帧率
            }

            if (vf) {
                logInfo(`使用的滤镜: ${vf}`)
                builder.outputOption('-filter_complex', vf, '-f', 'gif')
            } else {
                builder.outputOption('-f', 'gif')
            }

            let buffer
            try {
                buffer = await builder.run('buffer')
            } catch (e) {
                logger.error('FFmpeg 执行失败', e)
                await unlink(path)
                await session.send(`${quote}${session.text(".generatefailed")}`);
                return
            }

            await unlink(path)

            if (buffer.length === 0) {
                logger.error('FFmpeg 返回空 buffer')
                await session.send(`${quote}${session.text(".generatefailed")}`);
                return
            }
            logInfo(`GIF 处理成功，选项: ${JSON.stringify(options)}`)

            const img = h.img(buffer, 'image/gif');

            if (config.outputinformation) {
                const info = await session.execute(`${config.gifCommand} ${img} -i`, true);
                await session.send([quote, img, `${info}`]);
                return
            } else {
                await session.send([quote, img]);
                return
            }
        })

    // 颜色转换函数
    function rgbaToHex(rgba: string): string {    // rgba(255, 0, 0, 1)
        const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!match) {
            return '0x00000000'; // 默认透明
        }

        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        const a = parseFloat(match[4] || '1'); // 默认不透明

        const rHex = r.toString(16).padStart(2, '0');
        const gHex = g.toString(16).padStart(2, '0');
        const bHex = b.toString(16).padStart(2, '0');
        const aHex = Math.round(a * 255).toString(16).padStart(2, '0');

        return `0x${rHex}${gHex}${bHex}${aHex}`;
    }

    function logInfo(...args: any[]) {
        if (config.loggerinfo) {
            (logger.info as (...args: any[]) => void)(...args);
        }
    }
}