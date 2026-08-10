import { Schema, h, Context, Session } from "koishi";
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { createTempDirectory, prepareStaticImage } from './media';

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

  ctx.command(`patina/${config.enablecommand3Name} [image]`, `为图片添加${config.enablecommand3Name}`)
    .example(`${config.enablecommand3Name}`)
    .example(`${config.enablecommand3Name} [图片]`)
    .example(`${config.enablecommand3Name} QQ号`)
    .example(`${config.enablecommand3Name} @用户`)
    .action(async ({ session }, image: string) => {
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

      const tempDir = await createTempDirectory('patina-camera');
      try {
        // 统一先转成静态图片，GIF 会提取第一帧后再作为用户图片源
        const preparedImage = await prepareStaticImage(ctx, imageURL, tempDir);
        const userImageBuffer = await readFile(preparedImage.path);
        const userImageBase64 = `data:${preparedImage.mime};base64,${userImageBuffer.toString('base64')}`;
        loggerinfo(`相机镜框输入 MIME: ${preparedImage.mime}${preparedImage.isGif ? ' (GIF首帧)' : ''}`);

        const cameraFramePath = path.join(__dirname, './../html/pics/camera.png');
        const cameraFrameBuffer = await readFile(cameraFramePath);
        const cameraFrameBase64 = `data:image/png;base64,${cameraFrameBuffer.toString('base64')}`;

        let objectFitStyle = 'cover';
        if (config.cameraAlignmentLogic === '拉伸') {
          objectFitStyle = 'fill';
        } else if (config.cameraAlignmentLogic === '适应') {
          objectFitStyle = 'contain';
        }

        const cameraHtml = await readFile(path.join(__dirname, './../html/camera/camera.html'), 'utf8');
        const htmlContent = cameraHtml
          .replace(/__USER_IMAGE_SRC__/g, userImageBase64)
          .replace(/__CAMERA_FRAME_SRC__/g, cameraFrameBase64)
          .replace(/__OBJECT_FIT_STYLE__/g, objectFitStyle);

        const page = await ctx.puppeteer.page();
        try {
          await page.setContent(htmlContent, { waitUntil: 'networkidle2' });

          const container = await page.$('#container');
          if (!container) throw new Error('页面元素加载失败');

          const outputImageBase64 = await container.screenshot({
            type: "jpeg",
            encoding: "base64",
            quality: config.camerascreenshotquality,
          });

          if (outputImageBase64) {
            const imageUrl = `data:image/jpeg;base64,${outputImageBase64}`;
            await session.send(h.image(imageUrl));
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
