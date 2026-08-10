import { Schema, h, Context, Session } from "koishi";
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { createTempDirectory, prepareStaticImage } from './media';

export const command2Config = Schema.union([
  Schema.object({
    enablecommand2: Schema.const(false).required(),
  }),
  Schema.object({
    enablecommand2: Schema.const(true),
    enablecommand2Name: Schema.string().default('像素化').description("指令名称"),
    pixelate: Schema.number().role('slider').min(0).max(100).step(1).default(80).description("默认${config.enablecommand2Name}百分比<br>原项目地址 https://lab.miguelmota.com/pixelate/example/"),
  }),
]);

export function applyCommand2(ctx: Context, config: any, loggerinfo: (...args: any[]) => void, extractImageUrl: (session: Session, input: string) => Promise<string>) {
  if (!config.enablecommand2) return;

  ctx.command(`patina/${config.enablecommand2Name} <image>`, `${config.enablecommand2Name}一张图`)
    .example(`${config.enablecommand2Name}`)
    .example(`${config.enablecommand2Name} [图片]`)
    .example(`${config.enablecommand2Name} QQ号`)
    .example(`${config.enablecommand2Name} @用户`)
    .option('pixelate', '-p <pixelate:number> ${config.enablecommand2Name}百分比')
    .action(async ({ session, options }, image: string) => {
      if (!session) return;
      if (!ctx.puppeteer) {
        await session.send("没有开启puppeteer服务");
        return;
      }

      if (!image) {
        await session.send("请发送一张图片：");
        image = await session.prompt(30000);
      }

      const imageURL = await extractImageUrl(session, image);
      loggerinfo(`图片URL: ${imageURL}`);

      const tempDir = await createTempDirectory('patina-pixelate');
      try {
        // 统一转成静态图片，GIF 会提取第一帧后再作为页面图片源
        const preparedImage = await prepareStaticImage(ctx, imageURL, tempDir);
        const imageBuffer = await readFile(preparedImage.path);
        const imageBase64 = `data:${preparedImage.mime};base64,${imageBuffer.toString('base64')}`;
        loggerinfo(`像素化输入 MIME: ${preparedImage.mime}${preparedImage.isGif ? ' (GIF首帧)' : ''}`);

        const pixelateHtml = await readFile(path.join(__dirname, './../html/pixelate/pixelate.html'), 'utf8');
        const htmlContent = pixelateHtml.replace(/__IMAGE_SRC__/g, imageBase64);

        const page = await ctx.puppeteer.page();
        try {
          await page.setContent(htmlContent, { waitUntil: 'networkidle2' });

          const pixelateValue = options?.pixelate !== undefined ? options.pixelate : config.pixelate;
          loggerinfo(`${config.enablecommand2Name}百分比: ${pixelateValue}`);

          await page.evaluate((pixelateValue: number) => {
            const slider = document.querySelector('.slider') as HTMLInputElement;
            if (slider) {
              slider.value = pixelateValue.toString();
              slider.dispatchEvent(new Event('input'));
            }
          }, pixelateValue);

          await page.waitForSelector('canvas', { timeout: 10000 });

          const outputImageBase64 = await page.evaluate(() => {
            const canvases = document.querySelectorAll('canvas');
            const targetCanvas = canvases[canvases.length - 1];
            return targetCanvas ? targetCanvas.toDataURL('image/png') : null;
          });

          if (outputImageBase64) {
            await session.send(h.image(outputImageBase64));
          } else {
            await session.send("处理图像时出错，请重试。");
          }
        } finally {
          await page.close();
        }
      } catch (error) {
        ctx.logger.error('处理图像时出错:', error);
        await session.send("处理图像时出错，请重试。");
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
}
