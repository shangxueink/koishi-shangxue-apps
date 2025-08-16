import { Schema, h, Context, Session } from "koishi";
import { resolve, join } from "path";
import { mkdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
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

      const outputDir = join(ctx.baseDir, 'data', 'patina', 'temp');
      if (!existsSync(outputDir)) {
        await mkdir(outputDir, { recursive: true });
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

      // 下载图片
      await session.send("正在处理图片，请稍候...");

      try {
        const mimeToExtension = {
          'image/jpeg': 'jpg',
          'image/jpg': 'jpg',
          'image/png': 'png',
          'image/gif': 'gif',
          'image/webp': 'webp',
          'image/bmp': 'bmp',
          'image/tiff': 'tiff',
          'image/svg+xml': 'svg'
        };

        // 使用canvas加载图片获取尺寸
        const canvasImage1 = await ctx.canvas.loadImage(image1Url);
        const canvasImage2 = await ctx.canvas.loadImage(image2Url);

        // 获取图片尺寸
        // @ts-ignore
        const image1Width = canvasImage1.naturalWidth || canvasImage1.width;
        // @ts-ignore
        const image1Height = canvasImage1.naturalHeight || canvasImage1.height;
        // @ts-ignore
        const image2Width = canvasImage2.naturalWidth || canvasImage2.width;
        // @ts-ignore
        const image2Height = canvasImage2.naturalHeight || canvasImage2.height;

        loggerinfo(`第一张图片尺寸: ${image1Width}x${image1Height}`);
        loggerinfo(`第二张图片尺寸: ${image2Width}x${image2Height}`);

        // 下载第一张图片
        const image1Data = await ctx.http.file(image1Url);
        const image1Mime = image1Data.mime || 'image/jpeg';
        const image1Ext = mimeToExtension[image1Mime] || 'jpg';
        const image1Path = resolve(outputDir, `1.${image1Ext}`);
        await writeFile(image1Path, Buffer.from(image1Data.data));

        // 下载第二张图片
        const image2Data = await ctx.http.file(image2Url);
        const image2Mime = image2Data.mime || 'image/png';
        const image2Ext = mimeToExtension[image2Mime] || 'png';
        const image2Path = resolve(outputDir, `2.${image2Ext}`);
        await writeFile(image2Path, Buffer.from(image2Data.data));

        // 取两张图片的最大尺寸
        const maxWidth = Math.max(image1Width, image2Width);
        const maxHeight = Math.max(image1Height, image2Height);

        // 动态生成filter_complex参数
        const filterComplex = `[1]scale=${maxWidth}:${maxHeight},setsar=1[s0];[0]scale=${maxWidth}:${maxHeight},setsar=1[s1];[s0][s1]concat=n=2:v=1:a=0,split[v1][v2];[v1]palettegen[p];[v2][p]paletteuse`;

        // 使用 ffmpeg 合成 GIF
        const outputPath = resolve(outputDir, 'output.gif');

        const builder = ctx.ffmpeg.builder();

        builder.input(image1Path);
        builder.inputOption('-i', image2Path);
        builder.outputOption('-filter_complex', filterComplex);
        builder.outputOption('-f', 'gif');
        builder.outputOption('-loop', (config.loopCount || 1).toString());
        builder.outputOption('-final_delay', (config.finalDelay || 5000).toString());
        const ffmpegCommand = `ffmpeg -i ${image1Path} -i ${image2Path} -filter_complex "${filterComplex}" -loop ${config.loopCount || 1} -final_delay ${config.finalDelay || 5000} ${outputPath}`;
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
          try {
            // 使用bot.internal.uploadGroupFile发送文件
            loggerinfo(`以文件形式发送GIF: ${outputPath}`);
            await session.bot.internal.uploadGroupFile(session.channelId, outputPath, "output.JPG");
          } catch (error) {
            ctx.logger.error('发送文件失败: ', error);
          }
        } else {
          loggerinfo(`以图片形式发送GIF`);
          await session.send(h.image(buffer, 'image/gif'));
        }
        return
      } catch (error) {
        ctx.logger.error('处理图片时出错:', error);
        return `处理图片时出错: ${error.message}`;
      }
    });

}
