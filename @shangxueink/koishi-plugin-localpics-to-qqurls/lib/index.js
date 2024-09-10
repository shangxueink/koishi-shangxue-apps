"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.usage = exports.inject = exports.name = void 0;

const fs = require('node:fs');
const url_1 = require("node:url");
const koishi_1 = require("koishi");
const path_1 = require("node:path");
const path = require("node:path");
const crypto_1 = require("node:crypto");
const promises_1 = require("node:fs/promises");
const logger = new koishi_1.Logger('localpics-to-qqurls');

exports.name = 'localpics-to-qqurls';
exports.usage = `
<!DOCTYPE html>
<html>
<head>
    <title>localpics-to-qqurls 插件使用说明</title>
</head>
<body>
    <h1>localpics-to-qqurls 插件使用说明</h1>
    <p>本插件旨在将一个图包文件夹，通过QQ官方机器人上传至QQ频道（文字子频道），并获取返回的链接，从而实现频道图床功能。</p>
    <p>请注意，这里的图包文件夹必须放在 Koishi 实例的 <code>data</code> 文件夹下，以便本插件的 <code>local_PICS_files</code> 配置项能够找到并选择该文件夹。</p>
    <p>本插件适合QQ官方机器人使用。</p>    
    <p>官方机器人安装本插件，用以记录每次上传得到的 URL。</p>
</body>
</html>
`;

exports.Config = koishi_1.Schema.intersect([
  koishi_1.Schema.object({
    appId: koishi_1.Schema.string().description('机器人appId'),
    secret: koishi_1.Schema.string().description('机器人secret'),
    QQchannelId: koishi_1.Schema.string().description('`填入QQ频道的频道ID`，将该ID的频道作为中转频道 <br> 频道ID可以用[inspect插件来查看](/market?keyword=inspect) `频道ID应为纯数字`').experimental().pattern(/^\S+$/),

  }).description('QQ官方bot设置'),

  koishi_1.Schema.object({
    local_PICS_files: koishi_1.Schema.path({
      filters: ['directory'],
    }).description('需要转换的图片文件夹 `文件夹内需要至少有一张图哦`').required(),
    Start_End_point: koishi_1.Schema.tuple([Number, Number]).default([0, 0]).description('需要上传的json始末ID。正整数有效。`无效则代表全部id`'),
    reClear_JSON: koishi_1.Schema.boolean().default(false).description("对json内的每个本地图都上传`关闭后仅对 没有webURL 的上传`"),
    Clear_JSON_on_every_restart: koishi_1.Schema.boolean().default(false).description("每次重启都恢复默认json`会清空记录的URL哦`"),
  }).description('本地文件夹设置'),

  koishi_1.Schema.object({
    maxRetries: koishi_1.Schema.number().role('slider').min(0).max(10).step(1).description('上传失败的重试次数').default(5).experimental(),
    consoleinfo: koishi_1.Schema.boolean().default(false).description("日志调试模式`日常使用无需开启`"),
  }).description('调试设置'),

]);

async function apply(ctx, config) {
  const rootpath = path.join(ctx.baseDir, 'data', 'localpics_to_qqurls');
  if (!fs.existsSync(rootpath)) {
    fs.mkdirSync(rootpath, { recursive: true });
  }

  const rootpath_PICS_files = path.join(ctx.baseDir, config.local_PICS_files);
  const rootpath_json = path.join(ctx.baseDir, config.local_PICS_files, `qq_local_to_web_url.json`);

  if (config.consoleinfo) {
    logger.info(`rootpath: ` + rootpath);
    logger.info(`config.local_PICS_files: ` + config.local_PICS_files);
    logger.info(`rootpath_PICS_files: ` + rootpath_PICS_files);
    logger.info(`rootpath_json: ` + rootpath_json);
  }

  // 检查图片文件夹是否存在和是否有图片
  if (!fs.existsSync(rootpath_PICS_files) || !fs.lstatSync(rootpath_PICS_files).isDirectory()) {
    logger.error('图片文件夹路径无效。');
    return;
  }

  const img_files = (await promises_1.readdir(rootpath_PICS_files)).filter(file => file.endsWith('.jpg')).sort();
  if (img_files.length === 0) {
    logger.error('图片文件夹内没有图片。');
    return;
  }

  let json_data;
  if (config.Clear_JSON_on_every_restart || !fs.existsSync(rootpath_json)) {
    // 生成新的 JSON 文件
    json_data = img_files.map((img_file, index) => ({
      id: (index + 1).toString(),
      localURL: `file://${path_1.join(rootpath_PICS_files, img_file).replace(/\\/g, '/')}`,
      webURL: ""
    }));
    await promises_1.writeFile(rootpath_json, JSON.stringify(json_data, null, 4), 'utf-8');
    logger.info(`json已生成于 ` + rootpath_json);
  } else {
    // 读取现有的 JSON 文件
    json_data = JSON.parse(await promises_1.readFile(rootpath_json, 'utf-8'));
  }

  // 根据配置决定上传哪些图片
  let imagesToUpload;
  const [startID, endID] = config.Start_End_point;

  if (config.reClear_JSON) {
    imagesToUpload = json_data; // 重新上传所有图片
  } else {
    imagesToUpload = json_data.filter(img => !img.webURL); // 仅上传没有 webURL 的图片
  }

  if (startID > 0 && endID > 0 && startID < endID) {
    imagesToUpload = imagesToUpload.filter(img => {
      const id = parseInt(img.id, 10);
      return id >= startID && id <= endID;
    });
  }

  const queue = []; // 用于存储待处理任务的队列
  let processing = false; // 标记是否正在处理任务

  ctx.on("message", async session => {
    queue.push(async () => {
      for (const currentImage of imagesToUpload) {
        let retries = 0;
        const maxRetries = config.maxRetries;

        while (retries < maxRetries) {
          try {
            const uploadedImageURL = await uploadImageToChannel(currentImage.localURL);
            currentImage.webURL = uploadedImageURL.url;
            await promises_1.writeFile(rootpath_json, JSON.stringify(json_data, null, 4), 'utf-8');
            break; // 成功则跳出循环
          } catch (error) {
            retries++;
            logger.error(`转换失败 文件名: ${path_1.basename(currentImage.localURL)} 错误信息: ${error.message} 尝试次数: ${retries}`);
            if (retries >= maxRetries) {
              logger.error(`已达到最大重试次数，跳过 文件名: ${path_1.basename(currentImage.localURL)}`);
            }
          }
        }
      }
    });

    // 处理队列中的任务
    if (!processing) {
      processing = true;
      while (queue.length > 0) {
        const task = queue.shift();
        await task();
      }
      processing = false;
    }
  });

  async function uploadImageToChannel(data) {
    const appId = config.appId;
    const secret = config.secret;
    const channelId = config.QQchannelId;
    const consoleinfo = config.consoleinfo;

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
        data = await promises_1.readFile(url_1.fileURLToPath(data));
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
    const md5 = crypto_1.createHash('md5').update(data).digest('hex').toUpperCase();
    if (channelId !== undefined && consoleinfo) {
      logger.info(`转换URL成功： https://gchat.qpic.cn/qmeetpic/0/0-0-${md5}/0`)
    };
    return { url: `https://gchat.qpic.cn/qmeetpic/0/0-0-${md5}/0` };
  }
}

exports.apply = apply;
