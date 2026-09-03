import { Schema, h, Context } from "koishi";
import { writeFile, rm, readFile } from "fs/promises";
import { join } from "path";
import { pathToFileURL } from "node:url";
import { createTempDirectory, prepareStaticImage } from "./media";
import { Command5Config, ExtractImageUrl, LoggerInfo } from "./types";
import { } from 'koishi-plugin-ffmpeg'
import { } from 'koishi-plugin-canvas'

interface CanvasImageSize {
  width?: number
  height?: number
  naturalWidth?: number
  naturalHeight?: number
}

export const command5Config = Schema.union([
  Schema.object({
    enablecommand5: Schema.const(false),
  }),
  Schema.object({
    enablecommand5: Schema.const(true).required(),
    enablecommand5Name: Schema.string().default('原图坦克').description("指令名称"),
    sendAsFile: Schema.boolean().default(true).description("是否以群文件形式发送GIF（开启则发送文件，关闭则发送图片）<br>发群文件才有效。直接发图片看不出效果"),
    loopCount: Schema.number().default(1).description("GIF循环次数").hidden(),
    finalDelay: Schema.number().default(50000).description("最后一帧延迟(毫秒)").hidden(),
  }),
]);

// ffmpeg 默认不会让不透明首帧在第二帧前清屏，
// 这里把首帧 disposal 改为 2，避免透明第二帧透出首帧内容
function findFirstGifGce(buffer: Buffer): number {
  if (buffer.subarray(0, 6).toString('latin1') !== 'GIF89a') return -1
  const hasGlobalTable = (buffer[10] & 0x80) !== 0
  const tableSize = hasGlobalTable ? 3 * (1 << ((buffer[10] & 0x07) + 1)) : 0
  let offset = 6 + 7 + tableSize
  while (offset + 2 < buffer.length) {
    if (buffer[offset] !== 0x21) return -1
    if (buffer[offset + 1] === 0xf9) {
      return buffer[offset + 2] === 0x04 ? offset : -1
    }
    offset += 2
    while (offset < buffer.length && buffer[offset] !== 0) {
      offset += buffer[offset] + 1
    }
    offset += 1
  }
  return -1
}

function clearFirstFrameBeforeSecond(buffer: Buffer): void {
  const gceIndex = findFirstGifGce(buffer)
  if (gceIndex < 0) return;
  const flagIndex = gceIndex + 3
  buffer[flagIndex] = (buffer[flagIndex] & ~0x1c) | (2 << 2);
}

// canvas 插件对本地路径支持不稳定，这里统一转成 base64 data URL 再交给它读取尺寸
async function loadImageSize(ctx: Context, image: { path: string; mime: string }): Promise<CanvasImageSize> {
  const data = await readFile(image.path)
  const loaded = await ctx.canvas.loadImage(`data:${image.mime};base64,${data.toString('base64')}`)
  return loaded as CanvasImageSize
}

export function applyCommand5(ctx: Context, config: Command5Config, loggerinfo: LoggerInfo, extractImageUrl: ExtractImageUrl) {
  if (!config.enablecommand5) return;

  ctx.command(`patina/${config.enablecommand5Name || '原图坦克'}`, '将两张图片合成为GIF')
    .example(`${config.enablecommand5Name || '原图坦克'}`)
    .example(`${config.enablecommand5Name || '原图坦克'} [图片]`)
    .example(`${config.enablecommand5Name || '原图坦克'} [图片] [图片]`)
    .action(async ({ session }, img1?: string, img2?: string) => {
      if (!session) return;

      if (!ctx.ffmpeg) {
        await session.send("没有开启ffmpeg服务");
        return;
      }

      if (!img1) {
        await session.send("请发送第一张图片（表图）");
        img1 = await session.prompt(30000);
      }

      if (!img2) {
        await session.send("请发送第二张图片（里图）");
        img2 = await session.prompt(30000);
      }

      if (!img1 || !img2) {
        return "未检测到有效的图片，请重试。";
      }

      // 两张图都收到后再提取链接，交互阶段不下载图片
      const [image1Url, image2Url] = await Promise.all([
        extractImageUrl(session, img1),
        extractImageUrl(session, img2),
      ]);
      if (!image1Url || !image2Url) {
        return "未检测到有效的图片，请重试。";
      }
      loggerinfo(`第一张图片（表图）URL: ${image1Url}`);
      loggerinfo(`第二张图片（里图）URL: ${image2Url}`);

      await session.send("正在处理图片，请稍候...");

      // 两个链接都已拿到后再开始下载和处理
      const tempDir = await createTempDirectory('patina-original-tank');
      try {
        // 两张输入都统一转成静态图片，GIF 会先取第一帧再合成
        const [image1, image2] = await Promise.all([
          prepareStaticImage(ctx, image1Url, tempDir),
          prepareStaticImage(ctx, image2Url, tempDir),
        ]);
        loggerinfo(`第一张图片 MIME: ${image1.mime}${image1.isGif ? ' (GIF首帧)' : ''}`);
        loggerinfo(`第二张图片 MIME: ${image2.mime}${image2.isGif ? ' (GIF首帧)' : ''}`);

        if (!ctx.canvas) {
          await session.send("没有开启canvas服务");
          return;
        }

        const [image1Size, image2Size] = await Promise.all([
          loadImageSize(ctx, image1),
          loadImageSize(ctx, image2),
        ]);

        const image1Width = image1Size.width ?? image1Size.naturalWidth ?? 0;
        const image1Height = image1Size.height ?? image1Size.naturalHeight ?? 0;
        const image2Width = image2Size.width ?? image2Size.naturalWidth ?? 0;
        const image2Height = image2Size.height ?? image2Size.naturalHeight ?? 0;

        if (!image1Width || !image1Height || !image2Width || !image2Height) {
          await session.send("无法读取图片尺寸，请重试。");
          return;
        }

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
        // 禁止差异裁剪，确保第二帧会整幅重绘
        builder.outputOption('-gifflags', 'none');
        builder.outputOption('-f', 'gif');
        builder.outputOption('-loop', (config.loopCount || 1).toString());
        builder.outputOption('-final_delay', (config.finalDelay || 5000).toString());
        const ffmpegCommand = `ffmpeg -i ${image1.path} -i ${image2.path} -filter_complex "${filterComplex}" -gifflags none -loop ${config.loopCount || 1} -final_delay ${config.finalDelay || 5000} ${outputPath}`;
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

        // 修正 GIF 帧清理方式后再发送，避免透明区域残留上一帧
        clearFirstFrameBeforeSecond(buffer);

        if (config.sendAsFile) {
          await writeFile(outputPath, buffer);
          loggerinfo(`以文件形式发送GIF: ${outputPath}`);
          await session.send(h.file(pathToFileURL(outputPath).href));
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
