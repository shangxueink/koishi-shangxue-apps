import { Schema, h, Context, Session } from "koishi";
import { writeFile, rm } from "fs/promises";
import { join } from "path";
import { pathToFileURL } from "node:url";
import { createTempDirectory, prepareStaticImage } from "./media";
import { } from 'koishi-plugin-ffmpeg'
import { } from 'koishi-plugin-canvas'

export const command5Config = Schema.union([
  Schema.object({
    enablecommand5: Schema.const(false).required(),
  }),
  Schema.object({
    enablecommand5: Schema.const(true),
    enablecommand5Name: Schema.string().default('原图坦克').description("指令名称"),
    sendAsFile: Schema.boolean().default(true).description("是否以群文件形式发送GIF（开启则发送文件，关闭则发送图片）<br>发群文件才有效。直接发图片看不出效果"),
    loopCount: Schema.number().default(1).description("GIF循环次数").hidden(),
    finalDelay: Schema.number().default(50000).description("最后一帧延迟(毫秒)").hidden(),
  }),
]);

export function applyCommand5(ctx: Context, config: any, loggerinfo: (...args: any[]) => void, extractImageUrl: (session: Session, input: string) => Promise<string>) {
  if (!config.enablecommand5) return;

  ctx.command(`patina/${config.enablecommand5Name || '原图坦克'}`, '将两张图片合成为GIF')
    .example(`${config.enablecommand5Name || '原图坦克'}`)
    .example(`${config.enablecommand5Name || '原图坦克'} [图片]`)
    .example(`${config.enablecommand5Name || '原图坦克'} [图片] [图片]`)
    .action(async ({ session }, img1?: string, img2?: string) => {
      if (!session) return;

      if (session.platform !== 'onebot') {
        await session.send("暂时仅支持onebot平台使用此功能。");
        return;
      }

      if (!ctx.ffmpeg) {
        await session.send("没有开启ffmpeg服务");
        return;
      }

      if (!img1) {
        await session.send("请发送第一张图片（表图）");
        img1 = await session.prompt(30000);
      }

      const image1Url = await extractImageUrl(session, img1);
      if (!image1Url) {
        return "未检测到有效的图片，请重试。";
      }
      loggerinfo(`第一张图片（表图）URL: ${image1Url}`);

      if (!img2) {
        await session.send("请发送第二张图片（里图）");
        img2 = await session.prompt(30000);
      }

      const image2Url = await extractImageUrl(session, img2);
      if (!image2Url) {
        return "未检测到有效的图片，请重试。";
      }
      loggerinfo(`第二张图片（里图）URL: ${image2Url}`);

      await session.send("正在处理图片，请稍候...");

      const tempDir = await createTempDirectory('patina-original-tank');
      try {
        // 两张输入都统一转成静态图片，GIF 会先取第一帧再合成
        const image1 = await prepareStaticImage(ctx, image1Url, tempDir);
        const image2 = await prepareStaticImage(ctx, image2Url, tempDir);
        loggerinfo(`第一张图片 MIME: ${image1.mime}${image1.isGif ? ' (GIF首帧)' : ''}`);
        loggerinfo(`第二张图片 MIME: ${image2.mime}${image2.isGif ? ' (GIF首帧)' : ''}`);

        if (!ctx.canvas) {
          await session.send("没有开启canvas服务");
          return;
        }

        const canvasImage1 = await ctx.canvas.loadImage(pathToFileURL(image1.path).href);
        const canvasImage2 = await ctx.canvas.loadImage(pathToFileURL(image2.path).href);

        const image1Width = canvasImage1.naturalWidth;
        const image1Height = canvasImage1.naturalHeight;
        const image2Width = canvasImage2.naturalWidth;
        const image2Height = canvasImage2.naturalHeight;

        await Promise.all([canvasImage1.dispose(), canvasImage2.dispose()]);

        loggerinfo(`第一张图片尺寸: ${image1Width}x${image1Height}`);
        loggerinfo(`第二张图片尺寸: ${image2Width}x${image2Height}`);

        const maxWidth = Math.max(image1Width, image2Width);
        const maxHeight = Math.max(image1Height, image2Height);

        const filterComplex = `[1]scale=${maxWidth}:${maxHeight},setsar=1[s0];[0]scale=${maxWidth}:${maxHeight},setsar=1[s1];[s0][s1]concat=n=2:v=1:a=0,split[v1][v2];[v1]palettegen[p];[v2][p]paletteuse`;

        const outputPath = join(tempDir, 'output.gif');
        const builder = ctx.ffmpeg.builder();

        builder.input(image1.path);
        builder.inputOption('-i', image2.path);
        builder.outputOption('-filter_complex', filterComplex);
        builder.outputOption('-f', 'gif');
        builder.outputOption('-loop', (config.loopCount || 1).toString());
        builder.outputOption('-final_delay', (config.finalDelay || 5000).toString());
        const ffmpegCommand = `ffmpeg -i ${image1.path} -i ${image2.path} -filter_complex "${filterComplex}" -loop ${config.loopCount || 1} -final_delay ${config.finalDelay || 5000} ${outputPath}`;
        loggerinfo(`完整的FFmpeg命令: ${ffmpegCommand}`);

        const buffer = await builder.run('buffer');

        if (buffer.length === 0) {
          ctx.logger.error('FFmpeg 返回空 buffer');
          try {
            const errorInfo = await builder.run('info');
            ctx.logger.error('FFmpeg 错误信息:', errorInfo.toString());
          } catch (e) {
            ctx.logger.error('获取FFmpeg错误信息失败:', e);
          }
          await session.send(`FFmpeg 处理失败，请检查日志`);
          return;
        }

        if (config.sendAsFile) {
          await writeFile(outputPath, buffer);
          loggerinfo(`以文件形式发送GIF: ${outputPath}`);
          await session.bot.internal.uploadGroupFile(session.channelId, outputPath, "output.JPG");
        } else {
          loggerinfo(`以图片形式发送GIF`);
          await session.send(h.image(buffer, 'image/gif'));
        }
      } catch (error) {
        ctx.logger.error('处理图片时出错:', error);
        return `处理图片时出错: ${error.message}`;
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
}
