import { Schema, h, Context, Session } from "koishi";
import fs from 'node:fs';
import path from 'node:path';

export const command3Config = Schema.union([
    Schema.object({
        enablecommand3: Schema.const(false).required(),
    }),
    Schema.object({
        enablecommand3: Schema.const(true),
        enablecommand3Name: Schema.string().default('相机镜框').description("指令名称"),
        cameraAlignmentLogic: Schema.union([
            Schema.const('居中填充').description('居中填充'),
            Schema.const('拉伸').description('拉伸'),
            Schema.const('适应').description('适应'),
        ]).role('radio').description('输入图片的对齐逻辑').default("居中填充"),
        camerascreenshotquality: Schema.number().role('slider').min(0).max(100).step(1).default(50).description('设置图片压缩质量（%）'),
    }),
]);

export function applyCommand3(ctx: Context, config: any, loggerinfo: (...args: any[]) => void, extractImageUrl: (session: Session, input: string) => Promise<string>) {
    if (!config.enablecommand3) return;

    ctx.command(`patina/${config.enablecommand3Name} <image>`, `为图片添加${config.enablecommand3Name}`)
        .example(`${config.enablecommand3Name}`)
        .example(`${config.enablecommand3Name} [图片]`)
        .example(`${config.enablecommand3Name} QQ号`)
        .example(`${config.enablecommand3Name} @用户`)
        .action(async ({ session }, image: string) => {
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

                // 将用户图片转换为 Base64
                const userImageBase64 = await ctx.http.get(imageURL)
                    .then((buffer: ArrayBuffer) => `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`);

                // 读取${config.enablecommand3Name}图片
                const cameraFramePath = path.join(__dirname, './../../html/pics/camera.png');
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
                if (!container) {
                    await session.send("页面元素加载失败，请重试。");
                    return;
                }

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