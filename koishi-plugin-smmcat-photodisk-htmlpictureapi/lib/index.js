"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const koishi = require("koishi");
const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');
const app = express();

exports.name = 'smmcat-photodisk-htmlpictureapi';
const logger = new koishi.Logger('smmcat-photodisk-htmlpictureapi');
exports.usage = `

配置说明：

默认情况下，您需要在 smmcat-photodisk 插件内的 htmlServerAddress 填入以下地址：
http://127.0.0.1:24688/screenshot
- 注意：确保地址中没有多余的空格，且末尾不带斜杠

---

临时存储说明：

本插件的临时存储文件夹位于 data/smmcat-photodisk-htmlpictureapi/temp 文件夹下。
您可以在活动栏的【资源管理器】中找到该目录，并查看格式为 screenshot_1154151919810.png 的图片。

这些文件是临时文件，可以删除。（请注意：仅限删除该文件夹中的文件，其他文件夹中的数据文件是重要的，不要删除。）

`;

exports.Config = koishi.Schema.object({
    serverport: koishi.Schema.number().description('运行端口').default('24688'),
});



async function apply(ctx, Config) {
    const rootpath = path.join(ctx.baseDir, 'data', 'smmcat-photodisk-htmlpictureapi');
    try {
        fs.mkdirSync(rootpath, { recursive: true });
    } catch (error) {
        logger.error(`Error creating directory: ${error}`);
    }
    const PORT = Config.serverport;

    app.use(cors());
    const temppath = path.join(rootpath, 'temp')
    try {
        fs.mkdirSync(temppath, { recursive: true });
    } catch (error) {
        logger.error(`Error creating directory: ${error}`);
    }
    app.use('/file', express.static(temppath));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    app.post('/screenshot', async (req, res) => {
        const { html } = req.body;

        try {
            const browser = await puppeteer.launch();
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });

            // 等待页面中的某个元素加载完成
            await page.waitForSelector('body');

            const screenshotBuffer = await page.screenshot({
                fullPage: true,
                omitBackground: true,
                type: 'png'
            });

            await browser.close();

            // 压缩截图
            const compressedScreenshotBuffer = await sharp(screenshotBuffer)
                .resize({ width: 800 }) // 调整宽度为800像素，可以根据需要进行修改
                .toBuffer();

            // 保存截图到本地文件系统的 temp 文件夹中
            const fileName = `screenshot_${Date.now()}.png`;
            const filePath = path.join(rootpath, 'temp', fileName);
            fs.writeFileSync(filePath, compressedScreenshotBuffer);

            // 构建图片的网络地址
            const imageUrl = `http://127.0.0.1:${PORT}/file/${fileName}`;

            res.send(imageUrl);
        } catch (error) {
            logger.error('生成截图失败：', error);
            res.status(500).send('生成截图失败');
        }
    });

    app.listen(PORT, () => {
        logger.info(`服务器部署在了 http://127.0.0.1:${PORT}/screenshot`);
        logger.info(`你需要在 smmcat-photodisk 插件内的 htmlServerAddress 填入 http://127.0.0.1:${PORT}/screenshot`);
        logger.info(`注意 千万不要多空格 不要末尾斜杠`);
    });

}


exports.apply = apply;