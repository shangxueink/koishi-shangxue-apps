import { Schema, h, Context } from "koishi";
import { rm } from 'node:fs/promises';
import path from 'node:path';
import nodeurl from 'node:url';
import { createTempDirectory, prepareStaticImage } from './media';
import { Command1Config, ExtractImageUrl, LoggerInfo } from './types';
import { createPage } from './browser';

export const command1Config = Schema.union([
  Schema.object({
    enablecommand1: Schema.const(false),
  }),
  Schema.object({
    enablecommand1: Schema.const(true).required(),
    enablecommand1Name: Schema.string().default('幻影').description("指令名称"),
    enablecommand1Name2: Schema.string().default('幻影解图').description("解图指令名称"),
    Full_color_output: Schema.boolean().default(false).description("全彩输出，关闭后变成黑白图<br>黑白可能效果更好  可以前往 https://uyanide.github.io/Mirage_Colored/ 体验"),
    Output_Size: Schema.number().default(1200).description("输出尺寸<br>(指 长和宽 中的较大值)<br>(0 即为不指定)"),
    Mixed_Weight: Schema.number().role('slider').min(0).max(1).step(0.02).default(0.7).description("【里图】混合权重<br>数值越大 里图 越隐隐约约可以看见"),
  }),
]);

export function applyCommand1(ctx: Context, config: Command1Config, loggerinfo: LoggerInfo, extractImageUrl: ExtractImageUrl, browserTimeout: number) {
  if (!config.enablecommand1) return;

  ctx.command(`patina/${config.enablecommand1Name} [img1] [img2]`, `制作${config.enablecommand1Name}坦克图片`)
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

      // 获取里图
      if (!img2) {
        await session.send("请发送一张图片作为【里图】：");
        img2 = await session.prompt(30000);
      }

      if (!img1 || !img2) {
        await session.send("未检测到有效的图片，请重试。");
        return;
      }

      // 两张图都收到后再提取链接，交互阶段不下载图片
      const [coverUrl, innerUrl] = await Promise.all([
        extractImageUrl(session, img1),
        extractImageUrl(session, img2),
      ]);
      if (!coverUrl || !innerUrl) {
        await session.send("未检测到有效的图片，请重试。");
        return;
      }
      loggerinfo(`图片URL1: ${img1}`);
      loggerinfo(`图片URL2: ${img2}`);

      // 交互阶段只收集链接，等两张图都拿到后再统一下载
      const tempDir = await createTempDirectory('patina-mirage');
      try {
        // 统一先转成静态图片，GIF 会在这里提取第一帧
        const [coverImage, innerImage] = await Promise.all([
          prepareStaticImage(ctx, coverUrl, tempDir),
          prepareStaticImage(ctx, innerUrl, tempDir),
        ]);
        loggerinfo(`表图 MIME: ${coverImage.mime}${coverImage.isGif ? ' (GIF首帧)' : ''}`);
        loggerinfo(`里图 MIME: ${innerImage.mime}${innerImage.isGif ? ' (GIF首帧)' : ''}`);

        const page = await createPage(ctx, browserTimeout);
        try {
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
          await coverFileChooser.accept([coverImage.path]);

          // 上传里图
          const [innerFileChooser] = await Promise.all([
            page.waitForFileChooser(),
            page.click('label[for="innerFileInput"]'),
          ]);
          await innerFileChooser.accept([innerImage.path]);

          // 等待生成的输出图像
          await page.waitForSelector('#outputCanvas');

          const outputImageBase64 = await page.evaluate(() => {
            const canvas = document.getElementById('outputCanvas') as HTMLCanvasElement;
            return canvas ? canvas.toDataURL('image/png') : null;
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

  ctx.command(`patina/${config.enablecommand1Name2} [img]`, `将${config.enablecommand1Name}坦克图片拆成黑底和白底两张图`)
    .example(`${config.enablecommand1Name2}`)
    .example(`${config.enablecommand1Name2} [图片]`)
    .example(`${config.enablecommand1Name2} QQ号`)
    .example(`${config.enablecommand1Name2} @用户`)
    .action(async ({ session }, img: string) => {
      if (!session) return;
      const splitHtml: string = path.join(__dirname, './../html/mirage/split.html');
      if (img) loggerinfo(img);
      if (!ctx.puppeteer) {
        await session.send("没有开启puppeteer服务");
        return;
      }

      if (!img) {
        await session.send("请发送一张幻影坦克图片：");
        img = await session.prompt(30000);
      }
      img = await extractImageUrl(session, img);

      if (!img) {
        await session.send("未检测到有效的图片，请重试。");
        return;
      }
      loggerinfo(`幻影坦克图片URL: ${img}`);

      const tempDir = await createTempDirectory('patina-mirage-split');
      try {
        const preparedImage = await prepareStaticImage(ctx, img, tempDir);
        loggerinfo(`拆分输入 MIME: ${preparedImage.mime}${preparedImage.isGif ? ' (GIF首帧)' : ''}`);

        const page = await createPage(ctx, browserTimeout);
        try {
          await page.goto(nodeurl.pathToFileURL(splitHtml).href, { waitUntil: 'networkidle2' });

          // 通过 file chooser 传入本地原始文件，避免 data URL 或聊天转码破坏透明通道
          const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            page.click('#imageFileInput'),
          ]);
          await fileChooser.accept([preparedImage.path]);

          await page.waitForFunction(() => {
            const black = document.getElementById('black') as HTMLCanvasElement;
            const white = document.getElementById('white') as HTMLCanvasElement;
            return black.width > 0 && white.width > 0;
          });

          const blackHandle = await page.$('#black');
          const whiteHandle = await page.$('#white');
          if (!blackHandle || !whiteHandle) throw new Error('找不到黑底或白底画布');

          // 截图画布元素，输出的是已经合成到纯色背景上的位图
          const blackBuffer = await blackHandle.screenshot({ type: 'png' });
          const whiteBuffer = await whiteHandle.screenshot({ type: 'png' });

          await session.send(h.image(blackBuffer, 'image/png'));
          await session.send(h.image(whiteBuffer, 'image/png'));
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
