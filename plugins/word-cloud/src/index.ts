import { Context, Schema, Universal, h } from 'koishi';
import { } from 'koishi-plugin-puppeteer';
import { } from 'koishi-plugin-cron';
import fs from 'node:fs';
import path from 'node:path';
import nodejieba from 'nodejieba';

export const name = 'word-cloud';

export const inject = ['database', 'puppeteer', "cron"];


const wordcloud2jsPath = path.resolve(__dirname, '../data/wordcloud2.min.js');

let wordcloud2js = '';

// 缓存的消息数据
const messageData: MessageData = {};
// 最后保存时间
let lastSaveTime = Date.now();

try {
  wordcloud2js = fs.readFileSync(wordcloud2jsPath, 'utf8');
} catch (error) {
  console.error('Failed to load wordcloud2.min.js:', error);
}

export const usage = `
---

所需服务：
- database
- puppeteer
- logger
- i18n

---
 
- 你也可以不使用本插件的定时功能，而使用 [command-creator-extender](/market?keyword=command-creator-extender) 来统一管理定时执行的指令

---

本插件未提供渲染所需字体，请自行确认对应字体在puppeteer里可用。（尤其是docker环境）
`;
export const Config: Schema = Schema.intersect([
  Schema.object({
    enabledCommand: Schema.boolean().default(true).description('启用指令触发'),
    enabledCronSend: Schema.boolean().default(true).description('启用定时触发'),
  }).description('基础配置'),
  Schema.union([
    Schema.object({
      enabledCommand: Schema.const(false).required(),
    }),
    Schema.object({
      enabledCommand: Schema.const(true),
      commandName: Schema.string().default("群词云").description("指令名称"),
      commanddDscription: Schema.string().default("查看本群今日发言词云").description("指令描述"),
    }),
  ]),
  Schema.union([
    Schema.object({
      enabledCronSend: Schema.const(false).required(),
    }),
    Schema.object({
      enabledCronSend: Schema.const(true),
      channelToEffact: Schema.array(Schema.object({
        channelId: Schema.string().description('频道ID'),
        BroadcastBotId: Schema.string().description('机器人账号'),
        enableBroadcast: Schema.boolean().description('定时播报').default(true),
        Broadcasttime: Schema.string().role('time').description('每日播报时间'),
      })).role('table').description('应用的群组列表<br>注意定时播报为主动消息').default([
        {
          "Broadcasttime": "23:58:00",
          "BroadcastBotId": "0",
          "enableBroadcast": true,
          "channelId": "114514"
        }
      ]),
    }),
  ]),

  Schema.object({
    trueMiddware: Schema.boolean().description('使用前置中间件 `保持开启 才能完整统计数据`').default(true),
    dataFile: Schema.string().default("data/word-cloud").description("数据存储路径 `对于koishi实例的相对路径`"),
    saveInterval: Schema.number().max(60).min(1).default(5).description('数据保存间隔（分钟）'),
    minWordLength: Schema.number().default(1).description('最小词长度'),
    maxWordCount: Schema.number().default(1000).description('最大词数量'),
    nested: Schema.object({
      stopWords: Schema.array(String).role('table').default([
        '的', '了', '和', '是', '就', '都', '而', '及', '与', '这', '那', '有', '在', '中', '为',
        '吗', '啊', '呢', '吧', '呀', '哦', '嗯', '啥', '么', '嘛', '哈', '哎', '唉', '诶', '哇',
        '我', '你', '他', '她', '它', '我们', '你们', '他们', '她们', '它们', '自己', '什么', '这个',
        '那个', '这些', '那些', '不', '没', '很', '太', '非常', '更', '最', '又', '也', '还', '但',
        '可以', '可能', '应该', '如果', '因为', '所以', '但是', '然后', '现在', '一个', '一些', '一下',
        '一直', '一定', '一样', '一起', '只是', '只有', '就是', '这样', '那样', '这么', '那么', '这种',
        '那种', '不是', '不会', '不能', '不要', '没有', '可以', '可能', '应该', '如果', '因为', '所以',
        '，', '。', '、', '；', '：', '“', '”', '‘', '’', '【', '】', '（', '）', '《', '》', '—', '…',
        '！', '？', '·', '￥', '×', '÷', '℃', '℉',
        ',', '.', '/', ';', ':', '"', "'", '[', ']', '(', ')', '<', '>', '-', '_', '=', '+', '\\',
        '|', '{', '}', '!', '@', '#', '$', '%', '^', '&', '*', '~', '`', '?',
        '…', // 省略号（全角）
        '···', '...', // 省略号（半角组合）
        '—', '——', // 破折号（全角、半角组合）
        '——', // 破折号（全角两个）
        '——', // 破折号（半角两个）
        '~', // 波浪号
        '/', '\\', // 斜杠、反斜杠
        '=', // 等号
        '+', '-', '*', // 运算符
        '<', '>', // 比较符
        '|', // 竖线
        '#', // 井号
        '@', // @符号
        '$', // 美元符号
        '%', // 百分号
        '^', // 幂符号
        '&', // 和符号
        '`', // 反引号
        '~', // 波浪号
        '?', // 问号
        '!'  // 感叹号
      ]),
    }).collapse().description('停用词列表'),

  }).description('进阶设置'),

  Schema.object({
    fontFamily: Schema.union(["微软 YaHei, Arial, sans-serif", "宋体, SimSun, serif", "楷体, KaiTi, serif", "黑体, SimHei, sans-serif"]).description("渲染使用的默认字体").default("微软 YaHei, Arial, sans-serif"),
    rotateRatio: Schema.number().default(0.5).role('slider').min(0).max(1).step(0.1).description("文字旋转比例<br>0表示不旋转，1表示都旋转"),

    backgroundColor: Schema.string().role('color').description("背景色设置").default("rgba(0, 0, 0, 1)"),

    ColorSchemes: Schema.object({
      ColorSchemesTable: Schema.array(Schema.object({
        color: Schema.string().role('color')
      })).role('table').collapse().description('文字配色表（建议提供至少20个颜色，以获得更丰富的效果）').default([
        { "color": "rgba(255, 0, 0, 1)" },    // 红色
        { "color": "rgba(0, 255, 0, 1)" },    // 绿色
        { "color": "rgba(0, 0, 255, 1)" },    // 蓝色
        { "color": "rgba(255, 255, 0, 1)" },  // 黄色
        { "color": "rgba(0, 255, 255, 1)" },  // 青色
        { "color": "rgba(255, 0, 255, 1)" },  // 品红色
        { "color": "rgba(255, 128, 0, 1)" },  // 橙色
        { "color": "rgba(128, 0, 255, 1)" },  // 紫色
        { "color": "rgba(0, 128, 255, 1)" },  // 天蓝色
        { "color": "rgba(255, 0, 128, 1)" },  // 玫瑰红
        { "color": "rgba(128, 255, 0, 1)" },  // 草绿色
        { "color": "rgba(0, 255, 128, 1)" },  // 翡翠绿
        { "color": "rgba(255, 192, 203, 1)" },// 粉色
        { "color": "rgba(173, 216, 230, 1)" },// 浅蓝色
        { "color": "rgba(255, 228, 196, 1)" },// 浅橙色
        { "color": "rgba(152, 251, 152, 1)" },// 浅绿色
        { "color": "rgba(240, 230, 140, 1)" },// 卡其色
        { "color": "rgba(221, 160, 221, 1)" },// 梅红色
        { "color": "rgba(255, 99, 71, 1)" },  // 番茄红
        { "color": "rgba(60, 179, 113, 1)" }   // 中海绿
      ]),
    }).collapse().description('文字配色'),

    scaleFactor: Schema.number().max(3).min(1).default(1).step(0.1).description('缩放因子，越大越清晰，渲染越慢(渲染超时)。推荐1到3。'),
  }).description('词云渲染设置'),

  Schema.object({
    loggerinfo: Schema.boolean().description('启用调试日志输出模式').default(false),
    PromiseTime: Schema.number().default(1000).description("确保词云渲染完成的等待时间（毫秒）"),
    autoClosePage: Schema.boolean().description('自动关闭puppeteer').default(true),
  }).description('开发者选项'),
]);

declare module 'koishi' {
  interface Tables {
    message_analytics_records: MessageAnalyticsRecord;
  }
}

interface MessageAnalyticsRecord {
  id: number;
  channelId: string;
  userId: string;
  totalcontentnumber: number;
  totalcontentlength: number;
  totalimagenumber: number;
  recordtime: string;
}

interface MessageData {
  [channelId: string]: {
    [userId: string]: {
      words: Map<string, number>;
      totalcontentnumber: number;
      totalcontentlength: number;
      totalimagenumber: number;
    }
  }
}

export async function apply(ctx: Context, config) {

  ctx.on('ready', async () => {
    // 确保数据目录存在
    const dataDir = path.join(ctx.baseDir, config.dataFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 初始化数据库表
    ctx.model.extend('message_analytics_records', {
      id: 'unsigned',
      channelId: 'string',
      userId: 'string',
      totalcontentnumber: 'integer',
      totalcontentlength: 'integer',
      totalimagenumber: 'integer',
      recordtime: 'string',
    }, {
      primary: 'id',
      autoInc: true,
    });

    // 国际化配置
    ctx.i18n.define("zh-CN", {
      commands: {
        [config.commandName]: {
          description: `${config.commanddDscription}`,
          messages: {
            "imageGenerationFailed": "生成词云失败，请检查 puppeteer 服务是否正常。",
            "getUserFailed": "指定的用户不可用。",
            "noData": "该用户暂无数据，快让ta多水群吧~。",
          }
        },
      }
    });

    // 定时保存数据
    ctx.setInterval(async () => {
      if (Date.now() - lastSaveTime >= config.saveInterval * 60 * 1000) { // 每saveInterval分钟保存一次
        await saveDataToFiles();
      }
    }, 60 * 1000);

    // 每天凌晨重置数据
    ctx.cron('0 0 * * *', async () => {
      // 先保存当前数据
      await saveDataToFiles();

      // 重置内存数据
      for (const channelId in messageData) {
        for (const userId in messageData[channelId]) {
          messageData[channelId][userId] = {
            words: new Map(),
            totalcontentnumber: 0,
            totalcontentlength: 0,
            totalimagenumber: 0
          };
        }
      }

      // 清空文件系统中的数据
      const dataDir = path.join(ctx.baseDir, config.dataFile);
      if (fs.existsSync(dataDir)) {
        const channelDirs = fs.readdirSync(dataDir);
        for (const channelId of channelDirs) {
          const channelPath = path.join(dataDir, channelId);
          if (fs.statSync(channelPath).isDirectory()) {
            // 删除该频道目录下的所有CSV文件
            const files = fs.readdirSync(channelPath);
            for (const file of files) {
              if (file.endsWith('.csv')) {
                fs.unlinkSync(path.join(channelPath, file));
              }
            }
          }
        }
      }

      // 获取昨天的日期（因为我们是在凌晨执行，所以清理的是昨天的数据）
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // 清空数据库表中昨天的记录
      try {
        await ctx.database.remove('message_analytics_records', { recordtime: yesterdayStr });
        ctx.logger.info(`已清空数据库中 ${yesterdayStr} 的记录`);
      } catch (error) {
        ctx.logger.error(`清空数据库记录失败:`, error);
      }

      ctx.logger.info('今日数据已重置，文件系统和数据库中的昨日数据已清空');
    });

    // 设置定时发送词云
    if (config.enabledCronSend) {
      config.channelToEffact.forEach(channel => {
        if (channel.enableBroadcast && channel.Broadcasttime) {
          const cronTime = timeToCron(channel.Broadcasttime);
          ctx.cron(cronTime, async () => {
            logInfo(`定时发送词云到频道 ${channel.channelId}`);
            const page = await ctx.puppeteer?.page();
            try {
              const imageBuffer = await generateWordCloudImage(page, channel.channelId);
              if (imageBuffer) {
                const bot = Object.values(ctx.bots).find(b => b.selfId === channel.BroadcastBotId || b.user?.id === channel.BroadcastBotId);
                if (!bot || bot.status !== Universal.Status.ONLINE) {
                  ctx.logger.error(`[定时发送] 机器人离线或未找到: ${channel.BroadcastBotId}`);
                  return;
                } else {
                  ctx.logger.info(`[定时发送] 将由 ${channel.BroadcastBotId} 执行`);
                }
                if (bot == null) return;
                await bot.sendMessage(channel.channelId, h.image(imageBuffer, 'image/png'));
              }
            } catch (error) {
              ctx.logger.error(`[定时发送] 发送词云到频道 ${channel.channelId} 失败:`, error);
            } finally {
              if (page && !page.isClosed()) {
                page.close();
              }
            }
          });
          logInfo(`已设置定时任务：将由 ${channel.BroadcastBotId} 在 ${cronTime}（${channel.Broadcasttime}） 发送词云图片到频道 ${channel.channelId}`);
        }
      });
    }

    // 中间件监听消息
    ctx.middleware(async (session, next) => {
      const channelId = session.channelId;
      const userId = session.userId;
      const content = session.stripped.content;

      if (!channelId || !userId || !content) {
        return next();
      }

      // 检查当前频道是否在配置的生效列表中
      const isChannelEffected = config.channelToEffact.some(c => c.channelId === channelId);
      if (!isChannelEffected) {
        return next();
      }

      if (!content === config.commandName) {
        return next();
      }

      // 初始化数据结构
      if (!messageData[channelId]) {
        messageData[channelId] = {};
      }
      if (!messageData[channelId][userId]) {
        messageData[channelId][userId] = {
          words: new Map(),
          totalcontentnumber: 0,
          totalcontentlength: 0,
          totalimagenumber: 0
        };
      }

      const userData = messageData[channelId][userId];

      // 提取纯文本内容并分词
      const textContent = h.parse(content)
        .filter(node => node.type === 'text')
        .map(node => node.data.content)
        .join('');

      const imageCount = h.parse(content).filter(node => node.type === 'image').length;

      userData.totalcontentnumber++;
      userData.totalcontentlength += textContent.length;
      userData.totalimagenumber += imageCount;

      if (textContent) {
        logInfo()
        const words = nodejieba.cut(textContent, true); // 精确模式分词
        words.forEach(word => {
          const trimmedWord = word.trim();
          // 过滤停用词和过短的词
          if (trimmedWord && trimmedWord.length >= config.minWordLength && !config.nested.stopWords.includes(trimmedWord)) {
            userData.words.set(trimmedWord, (userData.words.get(trimmedWord) || 0) + 1);
          }
        });
      }

      return next();
    }, config.trueMiddware);

    // 指令触发
    if (config.enabledCommand) {
      ctx.command(`${config.commandName} [target]`)
        .userFields(['id'])
        .usage(`${config.commandName} 查看本群的词云`)
        .usage(`${config.commandName} @用户 在本群查看指定用户的词云`)
        .action(async ({ session, options }, target) => {
          if (!session.channelId) {
            return session.text('.noData');
          }

          let targetUserId = session.userId;
          // let targetUserName = session.user.id || session.username;

          if (target) {
            const parsedUser = h.parse(target)[0];
            if (parsedUser?.type === 'at') {
              const { id, name } = parsedUser.attrs;
              if (!id) {
                return session.text('.getUserFailed');
              }
              targetUserId = id;
              //  targetUserName = name || (typeof session.bot.getUser === 'function' ? ((await session.bot.getUser(targetUserId))?.name || targetUserId) : targetUserId) // 使用名字或ID

            } else {
              return session.text('.getUserFailed');
            }
          }

          const page = await ctx.puppeteer?.page();
          try {
            const imageBuffer = await generateWordCloudImage(page, session.channelId, targetUserId === session.userId ? undefined : targetUserId);
            if (imageBuffer) {
              await session.send(h.image(imageBuffer, 'image/png'));
            } else {
              await session.text('.noData');
            }
          } catch (error) {
            ctx.logger.error('生成词云失败:', error);
            if (error.message === 'No data available') {
              return session.text('.noData');
            }
            return session.text('.imageGenerationFailed');
          } finally {
            if (page && !page.isClosed()) {
              page.close();
            }
          }
        });
    }

    // 将时间字符串转换为cron表达式
    function timeToCron(timeStr: string): string {
      const [hours, minutes, seconds] = timeStr.split(':').map(Number);
      return `${seconds || 0} ${minutes} ${hours} * * *`;
    }

    // 保存数据到文件
    async function saveDataToFiles() {
      for (const channelId in messageData) {
        const channelDir = path.join(dataDir, channelId);
        if (!fs.existsSync(channelDir)) {
          fs.mkdirSync(channelDir, { recursive: true });
        }

        for (const userId in messageData[channelId]) {
          const userData = messageData[channelId][userId];
          const userFilePath = path.join(channelDir, `${userId}.csv`);

          // 先读取现有文件数据（如果存在）
          let existingWords = new Map<string, number>();
          if (fs.existsSync(userFilePath)) {
            try {
              const existingContent = fs.readFileSync(userFilePath, 'utf8');
              existingContent.split('\n').forEach(line => {
                if (line.trim()) {
                  const [word, countStr] = line.split(',');
                  if (word && countStr) {
                    const count = parseInt(countStr, 10);
                    if (!isNaN(count)) {
                      existingWords.set(word, count);
                    }
                  }
                }
              });
            } catch (error) {
              ctx.logger.error(`读取用户数据文件失败 ${userFilePath}:`, error);
            }
          }

          // 合并内存中的数据和文件中的数据
          for (const [word, count] of userData.words.entries()) {
            existingWords.set(word, (existingWords.get(word) || 0) + count);
          }

          // 将合并后的Map转换为数组并按词频排序
          const sortedWords = [...existingWords.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, config.maxWordCount);

          // 生成CSV内容
          const csvContent = sortedWords
            .map(([word, count]) => `${word},${count}`)
            .join('\n');

          // 写入文件
          fs.writeFileSync(userFilePath, csvContent, 'utf8');

          // 更新数据库记录
          const today = new Date().toISOString().split('T')[0];
          const existingRecord = await ctx.database.get('message_analytics_records', {
            channelId,
            userId,
            recordtime: today
          });

          if (existingRecord.length > 0) {
            // 更新现有记录
            await ctx.database.set('message_analytics_records', {
              channelId,
              userId,
              recordtime: today
            }, {
              totalcontentnumber: existingRecord[0].totalcontentnumber + userData.totalcontentnumber,
              totalcontentlength: existingRecord[0].totalcontentlength + userData.totalcontentlength,
              totalimagenumber: existingRecord[0].totalimagenumber + userData.totalimagenumber
            });
          } else {
            // 创建新记录
            await ctx.database.create('message_analytics_records', {
              channelId,
              userId,
              totalcontentnumber: userData.totalcontentnumber,
              totalcontentlength: userData.totalcontentlength,
              totalimagenumber: userData.totalimagenumber,
              recordtime: today
            });
          }

          // 保存完成后，清空内存中的计数器，但保留词频数据
          userData.totalcontentnumber = 0;
          userData.totalcontentlength = 0;
          userData.totalimagenumber = 0;
          userData.words.clear();
        }
      }

      lastSaveTime = Date.now();
      logInfo('数据已保存到文件');
    }

    // 读取用户词云数据
    async function getUserWordCloudData(channelId: string, userId?: string): Promise<string> {
      // 保存当前数据，确保最新
      await saveDataToFiles();

      let csvData = '';

      if (userId) {
        // 读取特定用户的数据
        const userFilePath = path.join(dataDir, channelId, `${userId}.csv`);
        if (fs.existsSync(userFilePath)) {
          csvData = fs.readFileSync(userFilePath, 'utf8');
        }
      } else {
        // 读取所有用户的数据并合并
        const channelDir = path.join(dataDir, channelId);
        if (fs.existsSync(channelDir)) {
          const wordCount = new Map<string, number>();

          const files = fs.readdirSync(channelDir);
          for (const file of files) {
            if (file.endsWith('.csv')) {
              const filePath = path.join(channelDir, file);
              const content = fs.readFileSync(filePath, 'utf8');

              content.split('\n').forEach(line => {
                if (line.trim()) {
                  const [word, countStr] = line.split(',');
                  if (word && countStr) {
                    const count = parseInt(countStr, 10);
                    if (!isNaN(count)) {
                      wordCount.set(word, (wordCount.get(word) || 0) + count);
                    }
                  }
                }
              });
            }
          }

          // 转换为CSV格式
          csvData = [...wordCount.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, config.maxWordCount)
            .map(([word, count]) => `${word},${count}`)
            .join('\n');
        }
      }

      return csvData;
    }

    // 生成词云图像
    async function generateWordCloudImage(page: any, channelId: string, userId?: string): Promise<Buffer> {
      const csvData = await getUserWordCloudData(channelId, userId);

      if (!csvData.trim()) {
        throw new Error('No data available');
      }

      const generateWordCloudHTML = `
<!DOCTYPE html>
<html lang="zh-CN">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>词云生成器</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }

        #word-cloud-container {
            width: 800px;
            height: 600px;
            position: relative;
            background-color: white;
        }

        #word-cloud-canvas {
            display: block; /* 避免canvas底部的小间隙 */
        }

        #screenshot-frame {
            position: absolute;
            top: 0;
            left: 0;
            width: 800px;
            height: 600px;
            border: 1px solid transparent;
            pointer-events: none;
            z-index: 10;
        }
    </style>
</head>

<body>
    <div id="word-cloud-container">
        <canvas id="word-cloud-canvas"></canvas>
        <div id="screenshot-frame"></div>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            generateWordCloud();
        });

        function generateWordCloud() {
            // CSV数据
            const csvData = \`${csvData}\`;

            const words = parseCSV(csvData);

            // 获取容器和canvas元素
            const canvas = document.getElementById('word-cloud-canvas');
            const container = document.getElementById('word-cloud-container');
            
            // 获取容器的实际显示尺寸
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;
            
            // 设置缩放因子为scaleFactor
            const scaleFactor = ${config.scaleFactor};
            
            // 设置Canvas的实际像素尺寸为容器的scaleFactor倍
            canvas.width = containerWidth * scaleFactor;
            canvas.height = containerHeight * scaleFactor;
            
            // 通过CSS将Canvas缩放回原始显示尺寸
            canvas.style.width = containerWidth + 'px';
            canvas.style.height = containerHeight + 'px';

            // 配置选项
            const options = {
                list: words,

                // 字体设置
                fontFamily: '${config.fontFamily}', 
                fontWeight: 'normal',

                // 颜色设置 - 使用多彩方案
                color: getColorFunction('colorful'),

                // 背景色设置为白色
                backgroundColor: '${config.backgroundColor}',

                // 词云布局和大小设置
                minSize: 5 * scaleFactor, // 最小字体大小乘以缩放因子
                weightFactor: 20 * scaleFactor, // 权重因子乘以缩放因子
                rotateRatio: ${config.rotateRatio}, // 0表示不旋转，1表示都旋转
                rotationSteps: 2,
                shape: 'circle', // 可选: 'cardioid', 'diamond', 'square', 'triangle-forward', 'triangle', 'pentagon', 'star'

                // 性能和布局设置
                shrinkToFit: true,
                gridSize: 8 / scaleFactor, // 网格大小除以缩放因子，使布局更精细
                drawOutOfBound: false,

                // 禁用动画
                wait: 0,
                abortThreshold: 0,
                abort: function () { return false; }
            };

            // 立即渲染词云
            WordCloud(canvas, options);
        }

        // 解析CSV数据
        function parseCSV(csvText) {
            const lines = csvText.trim().split('\\n');
            return lines.map(line => {
                // 使用正则表达式替换中文逗号为英文逗号，然后按英文逗号分割
                const parts = line.replace(/，/g, ',').split(',');
                const text = parts[0].trim();
                const weightStr = parts[1] ? parts[1].trim() : '';
                const weight = parseInt(weightStr, 10);
                if (text && !isNaN(weight)) {
                    return [text, weight]; // wordcloud2.js需要[text, weight]格式
                }
                return null;
            }).filter(item => item !== null);
        }

        // 获取颜色函数
        function getColorFunction(scheme) {
            // 颜色配置
            const colorSchemes = {
                colorful: ${JSON.stringify(config.ColorSchemes.ColorSchemesTable.map(item => item.color))}
            };

            const colors = colorSchemes[scheme] || colorSchemes.colorful;

            return function (word, weight, fontSize, distance, theta) {
                return colors[Math.floor(Math.random() * colors.length)];
            };
        }
    </script>

    <script>
        //  https://cdnjs.cloudflare.com/ajax/libs/wordcloud2.js/1.2.3/wordcloud2.min.js
        ${wordcloud2js}
    </script>


</body>

</html>
`;
      //  logInfo(generateWordCloudHTML)
      await page.setContent(generateWordCloudHTML, { waitUntil: 'networkidle2' });

      // 等待PromiseTime秒，确保词云渲染完成
      await new Promise(resolve => setTimeout(resolve, config.PromiseTime));

      const wordCloudContainer = await page.$('#word-cloud-container');
      if (!wordCloudContainer) {
        await page.close();
        throw new Error('Word cloud container not found.');
      }

      const boundingBox = await wordCloudContainer.boundingBox();
      if (!boundingBox) {
        await page.close();
        throw new Error('Failed to get bounding box of word cloud container.');
      }

      await page.setViewport({
        width: Math.ceil(boundingBox.width),
        height: Math.ceil(boundingBox.height),
      });

      const imgBuf = await wordCloudContainer.screenshot({
      });
      if (config.autoClosePage) await page.close();
      return imgBuf;
    }

    function logInfo(...args: any[]) {
      if (config.loggerinfo) {
        (ctx.logger.info as (...args: any[]) => void)(...args);
      }
    }
  });
}

