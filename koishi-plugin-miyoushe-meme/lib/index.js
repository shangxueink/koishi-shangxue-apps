"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { segment } = require('koishi');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); 
const koishi_1 = require("koishi");
const logger = new koishi_1.Logger('miyoushe-meme');

module.exports = {
    apply(ctx) {
        // 命令: 请求特定编号的表情或随机表情
        ctx.command('miyoushe-meme [id:number]')
        .alias('米游社表情')
        .action(async (_, id) => {
          const imageList = readImageList();
          // 如果未提供id，则随机选择一个表情
          const image = id ? imageList.find(image => image.id === id) : imageList[Math.floor(Math.random() * imageList.length)];
          if (!image) {
            // 如果找不到指定编号的表情
            return '未找到对应的表情，请输入有效的编号。\n输入【米-表情包预览列表】可以查看所有表情包的预览哦';
          }
          
 
          const imageUrl = image.url; 
          const imageSegment = segment.image(imageUrl);
        
          // 返回图片段和可选的提示信息
          return [imageSegment, id ? '' : '可以获取指定表情包哦\~ \n【指令 [表情编号]】'];
        });
        

        // 命令: 显示表情包预览列表
        ctx.command('miyoushe-meme/表情包预览列表').alias('米-表情包预览列表')
            .action(async () => {
                //logger.info("Preparing miyoushe-meme preview list");
                // 相对路径操作，确保跨平台兼容性
                const relativePath = path.join('..', '..', '..', '..','..','..', 'data', 'instances', 'default', 'data', 'miyoushe-meme');
                const imageDirPath = path.resolve(__dirname, relativePath);
                if (!fs.existsSync(imageDirPath)) {
                    fs.mkdirSync(imageDirPath, { recursive: true });
                }
                const pics = ['1.png', '2.png', '3.png'];
                const picsUrls = [
                    'https://i0.hdslb.com/bfs/article/72e302562e682baa30b421b20eb5dd2c3493298333289018.png',
                    'https://i0.hdslb.com/bfs/article/6b0014cb41e33b0627dbf78c757443f33493298333289018.png',
                    'https://i0.hdslb.com/bfs/article/4025cc4d532f978a870d1fe8b290cd453493298333289018.png'
                ];

                // 检查图片是否存在，若不存在则下载
                for (let i = 0; i < pics.length; i++) {
                    const picPath = path.join(imageDirPath, pics[i]);
                    if (!fs.existsSync(picPath)) {
                        logger.info(`未找到本地文件，下载预览图: ${picsUrls[i]}`);
                        const response = await axios.get(picsUrls[i], { responseType: 'arraybuffer' });
                        fs.writeFileSync(picPath, response.data);
                    }
                }

                // 使用本地图片
                // 使用 Promise.all 确保所有图片都被处理完
                const segmentsPromises = pics.map(pic => sendLocalImage(ctx, path.join(imageDirPath, pic)));
                const segments = await Promise.all(segmentsPromises); // 等待所有 Promise 解决

                const text = "请输入【指令 [表情编号]】来获取指定表情哦\~";
                return [...segments, text];
            });
    }
};

function readImageList() {
    const imageListPath = path.resolve(__dirname, '2.json');
    return JSON.parse(fs.readFileSync(imageListPath, 'utf8'));
}

// 发送本地图片的函数
async function sendLocalImage(ctx, localImagePath) {
    const imageUrl = `file:///${path.resolve(localImagePath)}`;
    return segment.image(imageUrl);
}
