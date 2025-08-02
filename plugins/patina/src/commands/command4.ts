import { Schema, h, Context, Session } from "koishi";
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import nodeurl from 'node:url';

export const command4Config = Schema.union([
    Schema.object({
        enablecommand4: Schema.const(false).required(),
    }),
    Schema.object({
        enablecommand4: Schema.const(true),
        enablecommand4Name: Schema.string().default('光棱').description("指令名称"),
        enablecommand4Name2: Schema.string().default('光棱取图').description("指令名称"),
        Full_color_output: Schema.boolean().default(true).description("全彩输出，关闭后变成黑白图"),
        Inner_Threshold: Schema.number().default(32).description("里图色阶端点<br>(越小 隐写效果越好，但 里图 质量越差)"),
        Cover_Threshold: Schema.number().default(96).description("表图色阶端点<br>(越大 显形效果越好，但 表图 质量越差)"),
        Inner_Contrast: Schema.number().default(50).description("里图对比度<br>(降低可提高隐写效果)"),
        Cover_Contrast: Schema.number().default(50).description("表图对比度"),
        Output_Size: Schema.number().default(1200).description("输出尺寸<br>(指 长和宽 中的较大值)"),
        Is_Reverse: Schema.boolean().default(false).description("是否反向隐写"),
        Encode_Method: Schema.union([
            Schema.const('chess').description('棋盘布局'),
            Schema.const('gap_2').description('2像素间隔斜线'),
            Schema.const('gap_3').description('3像素间隔斜线'),
            Schema.const('gap_5').description('5像素间隔斜线'),
            Schema.const('col_1').description('1像素间隔竖线'),
            Schema.const('row_1').description('1像素间隔横线'),
        ]).default('chess').description("像素混合方式"),
        Decode_Threshold: Schema.number().default(128).description("取图阈值<br>(用于光棱取图功能)"),
        Decode_Option: Schema.union([
            Schema.const('black').description('置为黑色'),
            Schema.const('white').description('置为白色'),
            Schema.const('trans').description('置为透明'),
            Schema.const('lcopy').description('左侧复制'),
            Schema.const('ucopy').description('上方复制'),
            Schema.const('luavg').description('左上平均'),
        ]).default('white').description("取图像素处理方式<br>(用于光棱取图功能)"),
    }),
]);

export function applyCommand4(ctx: Context, config: any, loggerinfo: (...args: any[]) => void, extractImageUrl: (session: Session, input: string) => Promise<string>) {
    if (!config.enablecommand4) return;

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

    ctx.command(`patina/${config.enablecommand4Name} <img1> <img2>`, `制作${config.enablecommand4Name}坦克图片`)
        .example(`${config.enablecommand4Name}`)
        .example(`${config.enablecommand4Name} [图片]`)
        .example(`${config.enablecommand4Name} [图片] [图片]`)
        .example(`${config.enablecommand4Name} QQ号 QQ号`)
        .example(`${config.enablecommand4Name} @用户 @用户`)
        .option('grayscale', '-g 黑白输出')
        .option('innerThreshold', '-it <threshold:number> 里图色阶端点')
        .option('coverThreshold', '-ct <threshold:number> 表图色阶端点')
        .option('innerContrast', '-ic <contrast:number> 里图对比度')
        .option('coverContrast', '-cc <contrast:number> 表图对比度')
        .option('size', '-s <size:number> 输出尺寸')
        .option('reverse', '-r 反向隐写')
        .option('method', '-m <method:string> 像素混合方式：chess/gap_2/gap_3/gap_5/col_1/row_1')
        .action(async ({ session, options }, img1: string, img2: string) => {
            if (!session) return;
            const prismhtml: string = path.join(__dirname, '../../html/gltank/gltank.html');
            if (img1) loggerinfo(img1);
            if (img2) loggerinfo(img2);
            if (!ctx.puppeteer) {
                await session.send("没有开启puppeteer服务");
                return;
            }

            if (!img1) {
                await session.send("请发送一张图片作为【里图】：");
                img1 = await session.prompt(30000);
            }
            img1 = await extractImageUrl(session, img1);

            if (!img2) {
                await session.send("请发送一张图片作为【表图】：");
                img2 = await session.prompt(30000);
            }
            img2 = await extractImageUrl(session, img2);

            if (!img1 || !img2) {
                await session.send("未检测到有效的图片，请重试。");
                return;
            }
            loggerinfo(`里图URL: ${img1}`);
            loggerinfo(`表图URL: ${img2}`);

            const page = await ctx.puppeteer.page();
            const tempInnerPath = generateTempFilePath('inner');
            const tempCoverPath = generateTempFilePath('cover');

            try {
                await downloadImage(ctx, img1, tempInnerPath);
                await downloadImage(ctx, img2, tempCoverPath);

                await page.goto(nodeurl.pathToFileURL(prismhtml).href, { waitUntil: 'networkidle2' });

                await page.click('#encodeButton');
                await new Promise(resolve => setTimeout(resolve, 1000));

                await page.waitForSelector('#innerSourceFileInput', { timeout: 10000 });
                await page.waitForSelector('#coverSourceFileInput', { timeout: 10000 });

                const [innerFileChooser] = await Promise.all([
                    page.waitForFileChooser(),
                    page.click('label[for="innerSourceFileInput"]'),
                ]);
                await innerFileChooser.accept([tempInnerPath]);

                const [coverFileChooser] = await Promise.all([
                    page.waitForFileChooser(),
                    page.click('label[for="coverSourceFileInput"]'),
                ]);
                await coverFileChooser.accept([tempCoverPath]);

                await new Promise(resolve => setTimeout(resolve, 2000));

                const grayscale = options?.grayscale !== undefined ? options.grayscale : !config.Full_color_output;
                await page.evaluate((grayscale: boolean) => {
                    const checkbox = document.getElementById('isCoverGrayCheckBox') as HTMLInputElement;
                    if (checkbox && checkbox.checked !== grayscale) {
                        checkbox.click();
                    }
                }, grayscale);

                const innerThreshold = options?.innerThreshold !== undefined ? options.innerThreshold : config.Inner_Threshold;
                await page.evaluate((threshold: number) => {
                    const rangeInput = document.getElementById('innerThresholdRange') as HTMLInputElement;
                    const numberInput = document.getElementById('innerThresholdInput') as HTMLInputElement;
                    if (rangeInput) {
                        rangeInput.value = threshold.toString();
                        rangeInput.dispatchEvent(new Event('input'));
                    }
                    if (numberInput) {
                        numberInput.value = threshold.toString();
                        numberInput.dispatchEvent(new Event('input'));
                    }
                }, innerThreshold);

                const coverThreshold = options?.coverThreshold !== undefined ? options.coverThreshold : config.Cover_Threshold;
                await page.evaluate((threshold: number) => {
                    const rangeInput = document.getElementById('coverThresholdRange') as HTMLInputElement;
                    const numberInput = document.getElementById('coverThresholdInput') as HTMLInputElement;
                    if (rangeInput) {
                        rangeInput.value = threshold.toString();
                        rangeInput.dispatchEvent(new Event('input'));
                    }
                    if (numberInput) {
                        numberInput.value = threshold.toString();
                        numberInput.dispatchEvent(new Event('input'));
                    }
                }, coverThreshold);

                const innerContrast = options?.innerContrast !== undefined ? options.innerContrast : config.Inner_Contrast;
                await page.evaluate((contrast: number) => {
                    const contrastInput = document.getElementById('innerContrastRange') as HTMLInputElement;
                    if (contrastInput) {
                        contrastInput.value = contrast.toString();
                        contrastInput.dispatchEvent(new Event('input'));
                    }
                }, innerContrast);

                const coverContrast = options?.coverContrast !== undefined ? options.coverContrast : config.Cover_Contrast;
                await page.evaluate((contrast: number) => {
                    const contrastInput = document.getElementById('coverContrastRange') as HTMLInputElement;
                    if (contrastInput) {
                        contrastInput.value = contrast.toString();
                        contrastInput.dispatchEvent(new Event('input'));
                    }
                }, coverContrast);

                const size = options?.size !== undefined ? options.size : config.Output_Size;
                await page.evaluate((size: number) => {
                    const sizeInput = document.getElementById('encodeSizeInput') as HTMLInputElement;
                    if (sizeInput) {
                        sizeInput.value = size.toString();
                        sizeInput.dispatchEvent(new Event('input'));
                    }
                }, size);

                const reverse = options?.reverse !== undefined ? options.reverse : config.Is_Reverse;
                await page.evaluate((reverse: boolean) => {
                    const checkbox = document.getElementById('isEncodeReverseCheckBox') as HTMLInputElement;
                    if (checkbox && checkbox.checked !== reverse) {
                        checkbox.click();
                    }
                }, reverse);

                const method = options?.method !== undefined ? options.method : config.Encode_Method;
                await page.evaluate((method: string) => {
                    const select = document.getElementById('encodeMethodSelect') as HTMLSelectElement;
                    if (select) {
                        select.value = method;
                        select.dispatchEvent(new Event('change'));
                    }
                }, method);

                await page.waitForSelector('#outputCanvas', { timeout: 15000 });
                await new Promise(resolve => setTimeout(resolve, 3000));

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
                if (fs.existsSync(tempInnerPath)) fs.unlinkSync(tempInnerPath);
                if (fs.existsSync(tempCoverPath)) fs.unlinkSync(tempCoverPath);
                await page.close();
            }
        });

    ctx.command(`patina/${config.enablecommand4Name2} <img>`, `从${config.enablecommand4Name}坦克图片中取出里图`)
        .example(`${config.enablecommand4Name2}`)
        .example(`${config.enablecommand4Name2} [图片]`)
        .example(`${config.enablecommand4Name2} QQ号`)
        .example(`${config.enablecommand4Name2} @用户`)
        .option('threshold', '-t <threshold:number> 取图阈值')
        .option('option', '-o <option:string> 像素处理方式')
        .option('reverse', '-r 反向隐写')
        .option('contrast', '--contrast <contrast:number> 对比度调整')
        .action(async ({ session, options }, img: string) => {
            if (!session) return;
            const prismhtml: string = path.join(__dirname, '../../html/gltank/gltank.html');
            if (img) loggerinfo(img);
            if (!ctx.puppeteer) {
                await session.send("没有开启puppeteer服务");
                return;
            }

            if (!img) {
                await session.send("请发送一张光棱坦克图片：");
                img = await session.prompt(30000);
            }
            img = await extractImageUrl(session, img);

            if (!img) {
                await session.send("未检测到有效的图片，请重试。");
                return;
            }
            loggerinfo(`光棱坦克图片URL: ${img}`);

            const page = await ctx.puppeteer.page();
            const tempImagePath = generateTempFilePath('decode');

            try {
                await downloadImage(ctx, img, tempImagePath);
                await page.goto(nodeurl.pathToFileURL(prismhtml).href, { waitUntil: 'networkidle2' });

                await page.click('#decodeButton');
                await new Promise(resolve => setTimeout(resolve, 1000));

                const option = options?.option !== undefined ? options.option : config.Decode_Option;
                await page.evaluate((option: string) => {
                    const select = document.getElementById('optionSelect') as HTMLSelectElement;
                    if (select) {
                        select.value = option;
                        select.dispatchEvent(new Event('change'));
                    }
                }, option);

                const [fileChooser] = await Promise.all([
                    page.waitForFileChooser(),
                    page.click('label[for="decodeImageFileInput"]'),
                ]);
                await fileChooser.accept([tempImagePath]);

                await page.waitForSelector('#decodeCanvas', { timeout: 10000 });
                await new Promise(resolve => setTimeout(resolve, 2000));

                const threshold = options?.threshold !== undefined ? options.threshold : config.Decode_Threshold;
                await page.evaluate((threshold: number) => {
                    const rangeInput = document.getElementById('decodeThresholdRange') as HTMLInputElement;
                    const numberInput = document.getElementById('decodeThresholdInput') as HTMLInputElement;
                    if (rangeInput) {
                        rangeInput.value = threshold.toString();
                        rangeInput.dispatchEvent(new Event('input'));
                    }
                    if (numberInput) {
                        numberInput.value = threshold.toString();
                        numberInput.dispatchEvent(new Event('input'));
                    }
                }, threshold);

                const reverse = options?.reverse !== undefined ? options.reverse : false;
                await page.evaluate((reverse: boolean) => {
                    const checkbox = document.getElementById('decodeReverseInput') as HTMLInputElement;
                    if (checkbox && checkbox.checked !== reverse) {
                        checkbox.click();
                    }
                }, reverse);

                if (options?.contrast !== undefined) {
                    await page.evaluate((contrast: number) => {
                        const contrastInput = document.getElementById('decodeContrastRange') as HTMLInputElement;
                        if (contrastInput) {
                            contrastInput.value = contrast.toString();
                            contrastInput.dispatchEvent(new Event('input'));
                        }
                    }, options.contrast);
                }

                await new Promise(resolve => setTimeout(resolve, 2000));

                const outputImageBase64 = await page.evaluate(() => {
                    const canvas = document.getElementById('decodeCanvas') as HTMLCanvasElement;
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
                if (fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);
                await page.close();
            }
        });
}