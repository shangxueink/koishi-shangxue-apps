import path from "node:path";
import fs from "node:fs/promises";

import { Schema, Logger, h, Context, Session, Dict, Schema as S } from "koishi";
import { } from "koishi-plugin-puppeteer";

const logger = new Logger('certificate-achievement');

export const name = "certificate-achievement";

export const inject = ['puppeteer'];

export interface Config {
  customText: string
  defaultClassname: string
}

export const Config: Schema<Config> = S.object({
  customText: S.string().default("   在本学年第一学期中表现优秀，被本群决定\n评为").role('textarea', { rows: [2, 4] }).description('奖状中间的自定义文字'),
  defaultClassname: S.string().default('本群指定授奖处').description('默认的授奖单位')
});

export const usage = `
<p>这是一个奖状插件</p>

<p>只需要发【生成奖状  昵称  奖项  单位】即可生成</p>

<code>昵称长度：请使用2~3个汉字或者适当长度的英文</code></p>

<code>本地渲染，需要使用puppeteer服务</code></p>
`;

async function getImageDataURL(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const base64 = buffer.toString('base64');
  return `data:image/jpeg;base64,${base64}`;
}

export async function apply(ctx: Context, config: Config) {
  ctx.command("生成奖状 <name> <title> <classname?>")
    .example("生成奖状  李四  优秀学生  本群授奖处")
    .action(async ({ session }: { session: Session }, name?: string, title?: string, classname?: string) => {
      if (!name || !title) {
        await session.send(h.text('输入的参数不足\~请至少输入姓名和标题~指令示例【指令名 姓名 标题 单位】'))
        return;
      }
      if (!classname) {
        classname = config.defaultClassname;
      }
      await session.send('生成奖状中......');
      try {
        const imageBuffer = await renderImage(name, title, classname);
        await session.send(h.image(imageBuffer, `image/png`))
        return;
      } catch (error) {
        logger.error(error);
        await session.send('获取奖状失败');
      }
    });


  async function renderImage(name: string, title: string, classname: string): Promise<Buffer> {
    const page = await ctx.puppeteer.page();
    await page.setViewport({ width: 1214, height: 902, deviceScaleFactor: 1 });
    const filePath = path.join(__dirname, './../data/certificate-new.jpg');
    const imageDataURL = await getImageDataURL(filePath);

    // 处理自定义文本，保留换行和缩进
    const processedText = config.customText.replace(/\\n\s*/g, '\n');

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Image Text Overlay</title>
<style>
body { margin: 0; height: 100vh; display: flex; justify-content: center; align-items: center; background-color: #f0f0f0; }
#image-container { position: relative; display: inline-block; max-width: 100%; height: auto; }
#image-container img { display: block; width: 100%; height: auto; max-width: 1219px; max-height: 902px; }
.name-text-overlay { position: absolute; color: black; font-size: 40px; font-family: Arial, sans-serif; }
.bottom-text-overlay { position: absolute; color: black; font-size: 30px; font-family: Arial, sans-serif; }
.centered-text-overlay { position: absolute; color: black; font-size: 60px; font-family: Arial, sans-serif; }
.bold-text { font-weight: bold; }
.left-center { top: 37%; left: 22%; transform: translate(-50%, -50%); }
.custom-text { 
  position: absolute; 
  top: 44%; 
  left: 50%; 
  transform: translateX(-50%); 
  font-size: 36px; 
  width: 70%; 
  text-align: left; 
  white-space: pre-wrap; 
  padding-left: 100px;
}
.title-text { top: 62%; left: 50%; transform: translate(-50%, -50%); }
.right-bottom { bottom: 18%; right: 25%; }
</style>
</head>
<body>
<div id="image-container">
<img src="${imageDataURL}" alt="Certificate">
<div class="name-text-overlay left-center">${name}</div>
<div class="custom-text">${processedText}</div>
<div class="centered-text-overlay title-text">${title}</div>
<div class="bottom-text-overlay right-bottom">${classname}</div>
</div>
</body>
</html>`;

    await page.setContent(htmlContent, { waitUntil: 'load' });

    const imageBuffer = await page.screenshot({ fullPage: true, type: 'png' });
    await page.close();
    return imageBuffer;
  }
}