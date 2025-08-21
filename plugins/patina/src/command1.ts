import { Schema, h, Context, Session } from "koishi";
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import nodeurl from 'node:url';

export const command1Config = Schema.union([
    Schema.object({
        enablecommand1: Schema.const(false).required(),
    }),
    Schema.object({
        enablecommand1: Schema.const(true),
        enablecommand1Name: Schema.string().default('幻影').description("指令名称"),
        Full_color_output: Schema.boolean().default(false).description("全彩输出，关闭后变成黑白图<br>黑白可能效果更好  可以前往 https://uyanide.github.io/Mirage_Colored/ 体验"),
        Output_Size: Schema.number().default(1200).description("输出尺寸<br>(指 长和宽 中的较大值)<br>(0 即为不指定)"),
        Mixed_Weight: Schema.number().role('slider').min(0).max(1).step(0.02).default(0.7).description("【里图】混合权重<br>数值越大 里图 越隐隐约约可以看见"),
    }),
]);

export function applyCommand1(ctx: Context, config: any, loggerinfo: (...args: any[]) => void, extractImageUrl: (session: Session, input: string) => Promise<string>) {
    if (!config.enablecommand1) return;

    async function downloadImage(ctx: Context, url: string, filepath: string) {
        const response = await ctx.http.get(url);
        const buffer = Buffer.from(await response as ArrayBuffer);
        fs.writeFileSync(filepath, buffer);
    }

    function generateTempFilePath(prefix?: string) {
        const uniqueId = crypto.randomBytes(16).toString('hex');
        const fileName = prefix ? `temp-image-${prefix}-${uniqueId}.jpg` : `temp-image-${uniqueId}.jpg`;
        return path.join(__dirname, fileName);
    }

    ctx.command(`patina/${config.enablecommand1Name} <img1> <img2>`, `制作${config.enablecommand1Name}坦克图片`)
        .example(`${config.enablecommand1Name}`)
        .example(`${config.enablecommand1Name} [图片]`)
        .example(`${config.enablecommand1Name} [图片] [图片]`)
        .example(`${config.enablecommand1Name} QQ号 QQ号`)
        .example(`${config.enablecommand1Name} @用户 @用户`)
        .option('fullColor', '-f 全彩输出')
        .option('size', '-s <size:number> 输出尺寸')
        .option('weight', '-w <weight:number> 里图混合权重')
        .action(async ({ session, options }, img1: string, img2: string) => {
            if (!session) return;
            const miragehtml: string = path.join(__dirname, './../html/mirage/mirage.html');
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

                await page.goto(nodeurl.pathToFileURL(miragehtml).href, { waitUntil: 'networkidle2' });

                // 配置全彩输出
                const fullColor = options?.fullColor !== undefined ? options.fullColor : config.Full_color_output;
                await page.evaluate((fullColor: boolean) => {
                    const checkbox = document.getElementById('isColoredCheckbox') as HTMLInputElement;
                    if (checkbox && checkbox.checked !== fullColor) {
                        checkbox.click();
                    }
                }, fullColor);

                // 配置输出尺寸
                const size = options?.size !== undefined ? options.size : config.Output_Size;
                await page.evaluate((size: number) => {
                    const sizeInput = document.getElementById('maxSizeInput') as HTMLInputElement;
                    if (sizeInput) {
                        sizeInput.value = size.toString();
                        sizeInput.dispatchEvent(new Event('input'));
                    }
                }, size);

                // 配置里图混合权重
                const weight = options?.weight !== undefined ? options.weight : config.Mixed_Weight;
                await page.evaluate((weight: number) => {
                    const weightInput = document.getElementById('innerWeightRange') as HTMLInputElement;
                    if (weightInput) {
                        weightInput.value = weight.toString();
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
                    const canvas = document.getElementById('outputCanvas') as HTMLCanvasElement;
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