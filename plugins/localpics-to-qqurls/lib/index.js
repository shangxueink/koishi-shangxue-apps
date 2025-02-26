"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.usage = exports.inject = exports.name = void 0;

const fs = require('node:fs');
const url = require("node:url");
const path = require("node:path");
const crypto = require("node:crypto");
const promises = require("node:fs/promises");
const { Schema, Logger, h } = require("koishi");
const logger = new Logger('localpics-to-qqurls');

exports.name = 'localpics-to-qqurls';
exports.usage = `
<body>
    <h2>localpics-to-qqurls 插件使用说明</h2>
    <p>本插件旨在将一个图包文件夹，通过QQ官方机器人上传至QQ频道（文字子频道），并获取返回的链接，从而实现频道图床功能。</p>
    <p>请注意，这里的图包文件夹必须放在 Koishi 实例的 <code>data</code> 文件夹下，以便本插件的 <code>local_PICS_files</code> 配置项能够找到并选择该文件夹。</p>
    <p>本插件适合QQ官方机器人使用。</p>
    <p>官方机器人安装本插件，用以记录每次上传得到的 URL。</p>
</body>

---

生成的json文件位于 ./data/localpics_to_qqurls/qq_local_to_web_url.json

开启插件后即会初始化此JSON内容。
`;

exports.Config = Schema.intersect([
  Schema.object({
    appId: Schema.string().description('QQ官方机器人appId'),
    secret: Schema.string().description('QQ官方机器人secret'),
    QQchannelId: Schema.string().description('`填入QQ频道的频道ID`，将该ID的频道作为中转频道 <br> 频道ID可以用 [inspect插件来查看](/market?keyword=inspect) `频道ID应为纯数字`').experimental().pattern(/^\S+$/),
  }).description('QQ官方bot设置'),

  Schema.object({
    local_PICS_files: Schema.string().role('textarea', { rows: [2, 4] }).description('需要转换的 图片文件夹 绝对路径 <br>`文件夹内需要至少有一张图哦`').required(),
  }).description('本地文件夹设置'),

  Schema.object({
    Start_End_point: Schema.tuple([Number, Number]).default([0, 0]).description('需要上传的图片ID范围 `[起始ID, 结束ID]`，<br>均为0或无效范围则上传全部ID <br>[1, 0] 无效， [1, 10] 则代表只上传ID为1到10的图片。'),
    maxRetries: Schema.number().role('slider').min(0).max(10).step(1).description('上传失败的重试次数').default(5).experimental(),
    sessionTimes: Schema.number().min(0).max(10).step(1).description('对单个`session.messageId`的上传次数').default(1).experimental(),
  }).description('上传频道设置'),

  Schema.object({
    reClear_JSON: Schema.boolean().default(false).description("对json内的每个ID内容都重新上传`关闭后仅对 没有频道URL 的上传`"),
    Clear_JSON_on_every_restart: Schema.boolean().default(false).description("每次重启都恢复默认json`会清空记录的URL哦`"),
    consoleinfo: Schema.boolean().default(false).description("日志调试模式`日常使用无需开启`"),
  }).description('调试设置'),

]);


// 全局队列和处理状态
const uploadQueue = [];
let isProcessingQueue = false;
const processedMessageIds = new Set(); // 存储已处理的 messageId

async function apply(ctx, config) {
  processedMessageIds.clear();
  uploadQueue.length = 0;
  isProcessingQueue = false;

  ctx.on('ready', async () => {

    const rootpath = path.join(ctx.baseDir, 'data', 'localpics_to_qqurls');
    if (!fs.existsSync(rootpath)) {
      fs.mkdirSync(rootpath, { recursive: true });
    }

    let rootpath_PICS_files = config.local_PICS_files;
    if (config.local_PICS_files.startsWith('file://')) {
      rootpath_PICS_files = url.fileURLToPath(config.local_PICS_files);
    }

    const rootpath_json = path.join(rootpath, `qq_local_to_web_url.json`);

    function loggerinfo(message, message2) {
      if (config.consoleinfo) {
        if (message2) {
          logger.info(`${message} ${message2}`)
        } else {
          logger.info(message);
        }
      }
    }

    loggerinfo(`插件数据文件夹: `, rootpath);
    loggerinfo(`config.local_PICS_files: `, config.local_PICS_files);
    loggerinfo(`等待上传的图库文件夹: `, rootpath_PICS_files);
    loggerinfo(`输出JSON路径: `, rootpath_json);


    // 检查图片文件夹是否存在和是否有图片
    if (!fs.existsSync(rootpath_PICS_files) || !fs.lstatSync(rootpath_PICS_files).isDirectory()) {
      logger.error('图片文件夹路径无效。');
      return;
    }

    const img_files = (await promises.readdir(rootpath_PICS_files)).filter(file => file.endsWith('.jpg')).sort();
    if (img_files.length === 0) {
      logger.error('图片文件夹内没有图片。');
      return;
    }

    let json_data;
    if (config.Clear_JSON_on_every_restart || !fs.existsSync(rootpath_json)) {
      // 生成新的 JSON 文件
      json_data = img_files.map((img_file, index) => ({
        id: (index + 1).toString(),
        localURL: url.pathToFileURL(path.join(rootpath_PICS_files, img_file)).toString(),
        webURL: ""
      }));
      await promises.writeFile(rootpath_json, JSON.stringify(json_data, null, 4), 'utf-8');
      loggerinfo(`json已生成于 `, rootpath_json);
    } else {
      // 读取现有的 JSON 文件
      json_data = JSON.parse(await promises.readFile(rootpath_json, 'utf-8'));
    }

    // 根据配置决定上传哪些图片
    let imagesToUpload;
    const [startID, endID] = config.Start_End_point;

    if (config.reClear_JSON) {
      imagesToUpload = [...json_data]; // 重新上传所有图片
    } else {
      imagesToUpload = json_data.filter(img => !img.webURL); // 仅上传没有 webURL 的图片
    }

    if (startID > 0 && endID > 0 && startID < endID) {
      imagesToUpload = imagesToUpload.filter(img => {
        const id = parseInt(img.id, 10);
        return id >= startID && id <= endID;
      });
    }

    async function processUploadQueue() {
      if (isProcessingQueue) return;
      isProcessingQueue = true;

      while (uploadQueue.length > 0) {
        const task = uploadQueue.shift();
        if (!task) continue; // 避免 undefined task
        const { session, currentImage } = task;

        loggerinfo(`由 session.messageId: ${session.messageId} 上传 ID为 ${currentImage.id} 的图片：`, currentImage.localURL);

        let retries = 0;
        const maxRetries = config.maxRetries;
        let uploaded = false;

        while (retries < maxRetries && !uploaded) {
          try {
            const uploadedImageURL = await uploadImageToChannel(currentImage.localURL);
            currentImage.webURL = uploadedImageURL.url;

            //  上传成功后立即写入 JSON
            await promises.writeFile(rootpath_json, JSON.stringify(json_data, null, 4), 'utf-8');
            loggerinfo(`ID为 ${currentImage.id} 的图片URL已更新至json`);
            uploaded = true;

          } catch (error) {
            retries++;
            logger.error(`转换失败 文件名: ${path.basename(currentImage.localURL)} 错误信息: ${error.message} 尝试次数: ${retries}`);
            if (retries >= maxRetries) {
              logger.error(`已达到最大重试次数，跳过 文件名: ${path.basename(currentImage.localURL)}`);
            }
          }
        }
      }
      isProcessingQueue = false;
    }


    ctx.on("message", async session => {
      if (processedMessageIds.has(session.messageId)) {
        loggerinfo(`messageId: ${session.messageId} 已处理，跳过`);
        return; // 避免重复处理相同 messageId 的消息
      }
      processedMessageIds.add(session.messageId);

      const sessionUploadTimes = config.sessionTimes || 1;
      for (let i = 0; i < sessionUploadTimes; i++) {
        if (imagesToUpload.length > 0) {
          const currentImage = imagesToUpload.shift(); // Get the first image and remove from array
          uploadQueue.push({ session, currentImage }); // 将任务添加到队列
        } else {
          loggerinfo(`无可上传图片，跳出 messageId: ${session.messageId} 的上传`);
          break; // No more images to upload
        }
      }
      processUploadQueue(); // 尝试启动队列处理
    });


    async function uploadImageToChannel(data) {
      const appId = config.appId;
      const secret = config.secret;
      const channelId = config.QQchannelId;

      async function refreshToken(bot) {
        const { access_token: accessToken, expires_in: expiresIn } = await ctx.http.post('https://bots.qq.com/app/getAppAccessToken', {
          appId: bot.appId,
          clientSecret: bot.secret
        });
        bot.token = accessToken;
        ctx.setTimeout(() => refreshToken(bot), (expiresIn - 30) * 1000);
      }

      // 临时的bot对象
      const bot = { appId, secret, channelId };

      // 刷新令牌
      await refreshToken(bot);

      // 处理图片数据
      if (typeof data === 'string') {
        if (new URL(data).protocol === 'file:') {
          data = await promises.readFile(url.fileURLToPath(data));
        } else {
          data = await ctx.http.get(data, { responseType: 'arraybuffer' });
          data = Buffer.from(data);
        }
      }

      const payload = new FormData();
      payload.append('msg_id', '0');
      payload.append('file_image', new Blob([data], { type: 'image/png' }), 'image.jpg');

      await ctx.http.post(`https://api.sgroup.qq.com/channels/${bot.channelId}/messages`, payload, {
        headers: {
          Authorization: `QQBot ${bot.token}`,
          'X-Union-Appid': bot.appId
        }
      });

      // 计算MD5并返回图片URL
      const md5 = crypto.createHash('md5').update(data).digest('hex').toUpperCase();
      if (channelId !== undefined) {
        loggerinfo(`转换URL成功： `, `https://gchat.qpic.cn/qmeetpic/0/0-0-${md5}/0`)
      };
      return { url: `https://gchat.qpic.cn/qmeetpic/0/0-0-${md5}/0` };
    }
  });
}

exports.apply = apply;
