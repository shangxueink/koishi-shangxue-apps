"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.usage = exports.inject = exports.name = void 0;
const fs = require('node:fs');
const url = require("node:url");
const path = require("node:path");
const crypto = require("node:crypto");
const promises = require("node:fs/promises");
const { Schema, Logger, h } = require("koishi");
exports.inject = {
  optional: ['canvas']
};
exports.name = 'emojihub-bili';
exports.reusable = true; // 声明此插件可重用
exports.usage = `
<h2><a href="https://www.npmjs.com/package/koishi-plugin-emojihub-bili" target="_blank">如何额外添加自己喜欢的表情包</a></h2>
<p>添加额外的表情包到 <strong>EmojiHub-bili</strong> 中非常简单！只需按照以下步骤操作：</p>
<ol>
<li><strong>安装扩展</strong>：<br>在 Edge 浏览器中添加扩展：<a href="https://greasyfork.org/zh-CN/scripts/456497-bilibili%E4%B8%93%E6%A0%8F%E5%8E%9F%E5%9B%BE%E9%93%BE%E6%8E%A5%E6%8F%90%E5%8F%96" target="_blank">（点击右侧文字查看）Bilibili专栏原图链接提取</a>。</li>
<li><strong>搜索表情包</strong>：<br>开启扩展后，打开<a href="https://search.bilibili.com/article/" target="_blank">哔哩哔哩专栏搜索</a>，在专栏中搜索您需要的表情包。</li>
<li><strong>提取链接</strong>：<br>点击进入具体的某个专栏帖子，屏幕靠近右下角会有一个绿色的【提取链接】按钮。点击该按钮，即可下载包含当前专栏所有图片的 URL 的 txt 文件。</li>
<li><strong>配置 EmojiHub-bili</strong>：<br>将同一类表情包图片的 URL 整合到同一个 txt 文件中。然后，在 Koishi 的配置项中填入相应的指令名称与 txt 文件路径。</li>
<li><strong>保存并重载</strong>：<br>完成配置后，保存您的配置并重载插件，您就可以使用自定义的指令发送表情包啦！🌟📚</li>
</ol>
<p> </p>
<h2>温馨提示：</h2>
<p><br>请勿将自定义的txt文件与本插件放置在同一目录下，以免插件更新导致文件丢失。</p>
<p>目前EmojiHub-bili默认提供<code>43套</code>表情包。若您的配置内容有误差，请点击<code>MoreEmojiHub</code>表格右上角按钮内的<code>恢复默认值</code>。</p>
<p>若开启插件后，指令不出现，<a href="/market?keyword=commands">请重新开关commands插件</a></p>
`;
const logger = new Logger('emojihub-bili');
const defaultMoreEmojiHub = [
  // 下面实际有效为 43套
  { command: '本地图库示例', source_url: path.join(__dirname, 'txts') },
  { command: '网络图片示例', source_url: 'https://i0.hdslb.com/bfs/article/afc31d0e398204d94478473a497028e6352074746.gif' },
  { command: '2233娘小剧场表情包', source_url: path.join(__dirname, 'txts/2233娘小剧场.txt') },
  { command: 'acomu414表情包', source_url: path.join(__dirname, 'txts/acomu414.txt') },
  { command: 'ba表情包', source_url: path.join(__dirname, 'txts/ba.txt') },
  { command: 'capoo表情包', source_url: path.join(__dirname, 'txts/capoo.txt') },
  { command: 'chiikawa表情包', source_url: path.join(__dirname, 'txts/chiikawa.txt') },
  { command: 'downvote表情包', source_url: path.join(__dirname, 'txts/Downvote.txt') },
  { command: 'doro表情包', source_url: path.join(__dirname, 'txts/doro.txt') },
  { command: 'eveonecat表情包', source_url: path.join(__dirname, 'txts/eveonecat.txt') },
  { command: 'fufu表情包', source_url: path.join(__dirname, 'txts/fufu.txt') },
  { command: 'girlsbandcry', source_url: path.join(__dirname, 'txts/GirlsBandCry.txt') },
  { command: 'kemomimi表情包', source_url: path.join(__dirname, 'txts/kemomimi酱表情包.txt') },
  { command: 'koishi-meme表情包', source_url: path.join(__dirname, 'txts/koimeme.txt') },
  { command: 'mygo表情包', source_url: path.join(__dirname, 'txts/mygo.txt') },
  { command: 'seseren表情包', source_url: path.join(__dirname, 'txts/seseren.txt') },
  { command: '阿夸表情包', source_url: path.join(__dirname, 'txts/阿夸.txt') },
  { command: '阿尼亚表情包', source_url: path.join(__dirname, 'txts/阿尼亚.txt') },
  { command: '白圣女表情包', source_url: path.join(__dirname, 'txts/白圣女.txt') },
  { command: '白圣女漫画表情包', source_url: path.join(__dirname, 'txts/白圣女黑白.txt') },
  { command: '败犬女主表情包', source_url: path.join(__dirname, 'txts/败犬女主.txt') },
  { command: '柴郡表情包', source_url: path.join(__dirname, 'txts/柴郡.txt') },
  { command: '初音Q版表情包', source_url: path.join(__dirname, 'txts/初音未来Q.txt') },
  { command: '甘城猫猫表情包', source_url: path.join(__dirname, 'txts/甘城猫猫.txt') },
  { command: '孤独摇滚表情包', source_url: path.join(__dirname, 'txts/孤独摇滚.txt') },
  { command: '狗妈表情包', source_url: path.join(__dirname, 'txts/狗妈.txt') },
  { command: '滑稽表情包', source_url: path.join(__dirname, 'txts/滑稽.txt') },
  { command: '疾旋鼬表情包', source_url: path.join(__dirname, 'txts/疾旋鼬.txt') },
  { command: '卡拉彼丘表情包', source_url: path.join(__dirname, 'txts/卡拉彼丘.txt') },
  { command: '流萤表情包', source_url: path.join(__dirname, 'txts/流萤.txt') },
  { command: '龙图表情包', source_url: path.join(__dirname, 'txts/龙图.txt') },
  { command: '鹿乃子表情包', source_url: path.join(__dirname, 'txts/鹿乃子.txt') },
  { command: '玛丽猫表情包', source_url: path.join(__dirname, 'txts/玛丽猫.txt') },
  { command: '小c表情包', source_url: path.join(__dirname, 'txts/蜜汁工坊.txt') },
  { command: '男娘武器库表情包', source_url: path.join(__dirname, 'txts/男娘武器库.txt') },
  { command: '千恋万花表情包', source_url: path.join(__dirname, 'txts/0721.txt') },
  { command: '赛马娘表情包', source_url: path.join(__dirname, 'txts/赛马娘.txt') },
  { command: '瑟莉亚表情包', source_url: path.join(__dirname, 'txts/瑟莉亚.txt') },
  { command: '藤田琴音表情包', source_url: path.join(__dirname, 'txts/藤田琴音.txt') },
  { command: '小黑子表情包', source_url: path.join(__dirname, 'txts/小黑子.txt') },
  { command: '心海表情包', source_url: path.join(__dirname, 'txts/心海.txt') },
  { command: '绪山真寻表情包', source_url: path.join(__dirname, 'txts/绪山真寻.txt') },
  { command: '亚托莉表情包', source_url: path.join(__dirname, 'txts/亚托莉表情包.txt') },
  { command: '永雏小菲表情包', source_url: path.join(__dirname, 'txts/永雏小菲.txt') },
  { command: '宇佐紀表情包', source_url: path.join(__dirname, 'txts/宇佐紀.txt') },
  // { command: '', source_url: path.join(__dirname, 'txts/.txt') },
  // 以后添加其他的命令...未完待续
];

exports.Config = Schema.intersect([

  Schema.object({
    emojihub_bili_command: Schema.string().default('emojihub-bili').description('`父级指令`的指令名称').pattern(/^\S+$/),

    MoreEmojiHub: Schema.array(Schema.object({
      command: Schema.string().description('注册的指令名称'),
      //enable: Schema.boolean().description('隐藏指令'),
      source_url: Schema.string().description('表情包文件地址'),
    })).role('table').description('表情包指令映射 当前默认`43套`txt文件`点击右方按钮 可以恢复到默认值`<br>`表情包文件地址`可以填入`txt文件绝对路径`或者`文件夹绝对路径`或者`图片直链`或者`图片文件绝对路径`').default(defaultMoreEmojiHub),

    searchSubfolders: Schema.boolean().description("是否递归搜索文件夹。`开启后 对于本地文件夹地址 会搜索其子文件夹内全部的图片`").default(true),

    deleteMsg: Schema.boolean().description("`开启后`自动撤回表情"),

  }).description('表情包设置'),
  Schema.union([
    Schema.object({
      deleteMsg: Schema.const(true).required(),
      deleteMsgtime: Schema.number().default(30).description('若干`秒`后 撤回表情').min(1),
    }),
    Schema.object({}),
  ]),

  Schema.object({
    autoEmoji: Schema.boolean().description("进阶设置总开关。打开后，开启自动表情包功能 `达到一定消息数量 自动触发表情包`"),
  }).description('进阶设置'),
  Schema.union([
    Schema.object({
      autoEmoji: Schema.const(true).required(),
      count: Schema.number().default(30).description('触发自动表情包的消息数量的阈值。`不建议过低`'),
      triggerprobability: Schema.percent().default(0.6).description('达到消息数量阈值时，发送表情包的概率 `范围为 0 到 1 `'),

      groupListmapping: Schema.array(Schema.object({
        groupList: Schema.string().description('开启自动表情包的群组ID').pattern(/^\S+$/),
        defaultemojicommand: Schema.string().description('表情包指令名称 `应与下方指令表格对应`'),
        enable: Schema.boolean().description('勾选后 屏蔽该群 的自动表情包'),
      })).role('table').description('表情包指令映射 `注意群组ID不要多空格什么的`')
        .default([
          { groupList: '114514', defaultemojicommand: 'koishi-meme，白圣女表情包，男娘武器库', enable: false },
          { groupList: '1919810', defaultemojicommand: '随机emojihub表情包', enable: true },
        ]),

      allgroupautoEmoji: Schema.boolean().description("`全部群组` 开启自动表情包").default(false),

      allgroupemojicommand: Schema.string().role('textarea', { rows: [2, 4] }).description('`全部群组的` 表情包指令映射`一行一个指令 或者 逗号分隔`   <br> 可以同时在`groupListmapping`指定群组的表情包内容')
        .default(`宇佐紀表情包\n白圣女表情包\n白圣女漫画表情包`),

    }),
    Schema.object({}),
  ]),

  // Alin---ba-plugin 配置项
  Schema.object({
    qqmodeswitch: Schema.union([
      Schema.const('json').description('json按钮'),
      Schema.const('markdown').description('被动md模板'),
      Schema.const('raw').description('原生markdown'),
    ]).role('radio').description("请选择QQ官方bot的响应模式："),
  }).description('QQ官方bot设置'),
  Schema.union([
    Schema.object({
      qqmodeswitch: Schema.const("json").required(),
      //------------------------------------json按钮---------20个群-------------------------------------------------------------------------------
      json_button_switch: Schema.boolean().description("`被动json按钮总开关`开启后以生效JSON按钮配置项（json按钮）<br>注意不要与下面的其他模式同时开，优先发送json按钮").default(false),
      json_setting: Schema.object({

        json_button_mdid_emojilist: Schema.string().description('展示表情包列表的按钮<br>QQ官方bot 的 JSON按钮模板ID<br>20个群即可使用的按钮！使用方法请见[README](https://www.npmjs.com/package/koishi-plugin-emojihub-bili)').pattern(/^\d+_\d+$/), // 102069859_1725953918
        json_button_mdid_command: Schema.string().description('触发具体表情后发送的按钮<br>QQ官方bot 的 JSON按钮模板ID<br>20个群即可使用的按钮！使用方法请见[README](https://www.npmjs.com/package/koishi-plugin-emojihub-bili)').pattern(/^\d+_\d+$/), // 102069859_1725953918

      }).collapse().description('实现QQ官方bot `再来一张`和`返回列表`的按钮效果（JSON 按钮）'),
    }),
    Schema.object({
      qqmodeswitch: Schema.const("markdown").required(),
      //--------------------------------------------被动md模板---2000上行消息人数-----------------------------------------------------------------------------

      MDswitch: Schema.boolean().description("`被动模板md总开关 `开启后以生效被动md配置项（被动markdown，模板md发送的）").default(false),
      markdown_setting: Schema.object({

        mdid: Schema.string().description('QQ官方bot 的 MarkDown模板ID').pattern(/^\d+_\d+$/),
        json_button_mdid_emojilist: Schema.string().description('展示表情包列表的按钮<br>QQ官方bot 的 JSON按钮模板ID<br>搭配md模板，一起发送！使用方法请见[README](https://www.npmjs.com/package/koishi-plugin-emojihub-bili)').pattern(/^\d+_\d+$/), // 102069859_1725953918
        json_button_mdid_command: Schema.string().description('触发具体表情后发送的按钮<br>QQ官方bot 的 JSON按钮模板ID<br>搭配md模板，一起发送！使用方法请见[README](https://www.npmjs.com/package/koishi-plugin-emojihub-bili)').pattern(/^\d+_\d+$/), // 102069859_1725953918

        zllbmdtext_1: Schema.string().default('text1').description('`指令列表MD`.`MD参数`MD文字参数--1'),
        zllbmdtext_2: Schema.string().default('text2').description('`指令列表MD`.`MD参数`MD文字参数--2'),
        zllbtext_1: Schema.array(String).default(["表情包列表", "emoji表情列表", "表情列表："]).description('`指令列表MD`MD显示文字内容--1`每次从下列随机选一个发送`').role('table'),
        zllbtext_2: Schema.array(String).default(["点击按钮即可触发哦~", "😻列表如下：点击按钮触发哦！", "点击即可查看对应表情哦！😽"]).description('`指令列表MD`MD显示文字内容--2`每次从下列随机选一个发送`').role('table'),

        zlmdtext_1: Schema.string().default('text1').description('`指令MD`.`MD参数`MD文字参数--1'),
        zlmdtext_2: Schema.string().default('text2').description('`指令MD`.`MD参数`MD文字参数--2'),
        zltext_1: Schema.array(String).default(["emoji~😺", "表情包！", "这是您的表情包~"]).description('`指令MD`MD显示文字内容--1`每次从下列随机选一个发送`').role('table'),
        zltext_2: Schema.array(String).default(["邦邦咔邦！", "😺😺😺", "😽来了哦！"]).description('`指令MD`MD显示文字内容--2`每次从下列随机选一个发送`').role('table'),

        zlmdp_1: Schema.string().default('img').description('`指令MD`.`MD参数`MD图片参数--1 `不需要设定图片宽高`'),
        zlmdp_2: Schema.string().default('url').description('`指令MD`.`MD参数`MD图片参数--2'),

        ButtonText1: Schema.string().default('再来一张😺').description('`指令MD`按钮上`再来一张功能`显示的文字'),
        ButtonText2: Schema.string().default('返回列表😽').description('`指令MD`按钮上`返回列表功能`显示的文字'),

        MinimumBoundary: Schema.number().default(200).description('`指令MD`过小图片的界限，宽或者高小于这个值就会自动放大到`Magnifymultiple`'),
        Magnifymultiple: Schema.number().default(1000).description('`指令MD`对于过小图片（宽/高小于`MinimumBoundary`）的放大目标的标准，默认放大到1000px'),

      }).collapse().description('实现QQ官方bot `再来一张`和`返回列表`的按钮效果，需要`canvas`服务。<br> [适用本插件的QQ官方bot MD示例模版 可点击这里参考](https://www.npmjs.com/package/koishi-plugin-emojihub-bili)'),
      QQPicToChannelUrl: Schema.boolean().description("`开启后` 本地图片通过频道URL作为群聊MD的图片链接`须填写下方的 QQchannelId`").experimental().default(false),

      QQchannelId: Schema.string().description('`填入QQ频道的频道ID`，将该ID的频道作为中转频道 <br> 频道ID可以用[inspect插件来查看](/market?keyword=inspect) `频道ID应为纯数字`').experimental().pattern(/^\S+$/),

    }),
    Schema.object({
      qqmodeswitch: Schema.const("raw").required(),
      //----------------------------------------原生md-------10000上行消息人数-------钻石机器人----------------------------------------------------------------------
      RAW_MD_switch: Schema.boolean().description("`原生md总开关` 开启后以生效原生markdown配置项").default(false),
      RAW_MD_setting: Schema.object({

        RAW_MD_emojilist_markdown: Schema.path({
          filters: ['.json', '.JSON'],
        }).description('原生markdown表情包指令列表<br>建议参考原文件，重写该文件').default(path.join(__dirname, 'qq/raw_markdown/RAW_MD_emojilist_markdown.json')),

        RAW_MD_command_markdown: Schema.path({
          filters: ['.json', '.JSON'],
        }).description('原生markdown返回的表情包内容<br>建议参考原文件，重写该文件').default(path.join(__dirname, 'qq/raw_markdown/RAW_MD_command_markdown.json')),
      }).collapse().description('实现QQ官方bot `再来一张`和`返回列表`的按钮效果'),
      QQPicToChannelUrl: Schema.boolean().description("`开启后` 本地图片通过频道URL作为群聊MD的图片链接`须填写下方的 QQchannelId`").experimental().default(false),

      QQchannelId: Schema.string().description('`填入QQ频道的频道ID`，将该ID的频道作为中转频道 <br> 频道ID可以用[inspect插件来查看](/market?keyword=inspect) `频道ID应为纯数字`').experimental().pattern(/^\S+$/),

    }),
    Schema.object({}),
  ]),

  Schema.object({
    //LocalSendNetworkPictures: Schema.boolean().description("`开启后` 将网络URL下载至本地，作为本地图片发送").experimental().default(false),
    LocalSendNetworkPicturesList: Schema.string().role('textarea', { rows: [2, 4] }).description('将`下列指令`对应的内容下载至本地，作为本地图片发送').default().experimental(),
    deletePictime: Schema.number().default(10).description('若干`秒`后 删除下载的本地临时文件').experimental(),

    localPicToBase64: Schema.boolean().description("`开启后`本地图片以base64发出 `日常使用无需开启，且不建议官方bot使用`").experimental().default(false),

    consoleinfo: Schema.boolean().default(false).description("日志调试模式`日常使用无需开启`"),
  }).description('调试选项'),
  Schema.union([
    Schema.object({
      consoleinfo: Schema.const(true).required(),
      allfileinfo: Schema.boolean().description("输出allfile调试内容`MoreEmojiHub 列表详细内容`"),
    }),
    Schema.object({})
  ]),

])



/**
 * 刷新机器人的令牌并上传图片到指定频道
 * @param ctx 
 * @param data - 图片数据或者文件路径
 * @param appId - 机器人AppID
 * @param secret - 机器人Secret
 * @param channelId - 频道ID
 * @returns {Promise<{ url: string }>} - 上传图片后的URL
 */
async function uploadImageToChannel(ctx, consoleinfo, data, appId, secret, channelId) {

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
  if (channelId !== undefined && consoleinfo) {
    logger.info(`使用本地图片*QQ频道  发送URL为： https://gchat.qpic.cn/qmeetpic/0/0-0-${md5}/0`)
  };
  return { url: `https://gchat.qpic.cn/qmeetpic/0/0-0-${md5}/0` };
}

async function getImageAsBase64(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    // 将图片 buffer 转换为 Base64 字符串
    const base64String = imageBuffer.toString('base64');
    return base64String;
  } catch (error) {
    logger.error('Error converting image to base64:', error);
    return null;
  }
}


async function determineImagePath(txtPath, config, channelId, command, ctx, local_picture_name = null) {
  // 判断是否是直接的图片链接
  if (txtPath.startsWith('http://') || txtPath.startsWith('https://')) {
    logInfo(config, channelId, command, `直接的图片链接: ${txtPath}`);
    return { imageUrl: txtPath, isLocal: false };
  }

  // 判断是否是本地图片的绝对路径
  if (isLocalImagePath(txtPath)) {
    if (!fs.existsSync(txtPath)) {
      logError(`错误:路径不存在： ${txtPath}`);
      return { imageUrl: null, isLocal: false };
    }
    logInfo(config, channelId, command, `本地图片的绝对路径: ${txtPath}`);
    return { imageUrl: txtPath, isLocal: true };
  }

  // 判断是否是本地文件夹的绝对路径
  if (isLocalDirectory(txtPath)) {
    return await getRandomImageFromFolder(txtPath, config, channelId, command, ctx, local_picture_name);
  }

  // 判断是否是本地txt文件的绝对路径
  if (isLocalTextFile(txtPath)) {
    return await getRandomImageUrlFromFile(txtPath, config, channelId, command, ctx);
  }

  // 默认处理逻辑：随机选择一个表情包
  const allValidPaths = getAllValidPaths(config);
  if (config.consoleinfo && config.allfileinfo) {
    logger.info(allValidPaths);
  }
  if (allValidPaths.length > 0) {
    txtPath = allValidPaths[Math.floor(Math.random() * allValidPaths.length)];
  } else {
    // 如果没有有效的路径，则返回null
    return { imageUrl: null, isLocal: false };
  }

  // 重新判断随机选择的路径类型
  if (txtPath.startsWith('http://') || txtPath.startsWith('https://')) {
    logInfo(config, channelId, command, `随机选择的网络图片链接: ${txtPath}`);
    return { imageUrl: txtPath, isLocal: false };
  } else if (isLocalDirectory(txtPath)) {
    return await getRandomImageFromFolder(txtPath, config, channelId, command, ctx, local_picture_name);
  } else if (isLocalTextFile(txtPath)) {
    return await getRandomImageUrlFromFile(txtPath, config, channelId, command, ctx);
  } else if (isLocalImagePath(txtPath)) {
    logInfo(config, channelId, command, `随机选择的本地图片路径: ${txtPath}`);
    return { imageUrl: txtPath, isLocal: true };
  }
}

function getRandomEmojiHubCommand(config) {
  const commands = config.MoreEmojiHub.map(emoji => emoji.command);
  if (commands.length > 0) {
    return commands[Math.floor(Math.random() * commands.length)];
  } else {
    return null;
  }
}

function isLocalImagePath(txtPath) {
  return path.isAbsolute(txtPath) && (txtPath.endsWith('.jpg') || txtPath.endsWith('.png') || txtPath.endsWith('.gif') || txtPath.endsWith('.bmp') || txtPath.endsWith('.webp'));
}

function isLocalDirectory(txtPath) {
  return path.isAbsolute(txtPath) && fs.lstatSync(txtPath).isDirectory();
}

function isLocalTextFile(txtPath) {
  return path.isAbsolute(txtPath) && txtPath.endsWith('.txt');
}

function getAllValidPaths(config) {
  return config.MoreEmojiHub.filter(emoji => {
    const sourceUrl = emoji.source_url;
    return path.isAbsolute(sourceUrl) || sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://');
  }).map(emoji => emoji.source_url);
}

// 递归获取文件夹及其子文件夹中的所有文件
// 用于实现searchSubfolders配置项的功能
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      fileList = getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });

  return fileList;
}

async function getRandomImageFromFolder(folderPath, config, channelId, command, ctx, local_picture_name) {
  if (!fs.existsSync(folderPath)) {
    logError(`错误:路径不存在： ${folderPath}`);
    return { imageUrl: null, isLocal: false };
  }

  let files = config.searchSubfolders
    ? getAllFiles(folderPath)
    : fs.readdirSync(folderPath).map(file => path.join(folderPath, file));

  files = files.filter(file => file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.gif') || file.endsWith('.bmp') || file.endsWith('.webp'));

  if (files.length === 0) {
    logError("文件夹中未找到有效图片文件（jpg,png,gif,webp,bmp）");
    return { imageUrl: null, isLocal: false };
  }

  // 如果提供了 local_picture_name ，则根据关键词进行匹配
  if (local_picture_name) {
    const keyword = local_picture_name.toLowerCase();
    files = files.filter(file => path.basename(file).toLowerCase().includes(keyword));
    if (files.length === 0) {
      logError(`未找到匹配关键词 "${local_picture_name}" 的图片文件`);
      return { imageUrl: null, isLocal: false };
    }
  }

  // 输出文件夹下的全部文件
  if (config.consoleinfo && config.allfileinfo) {
    logger.info(`文件夹 ${folderPath} 下的所有文件: \n${files.join('\n')}`);
  }

  const imageUrl = files[Math.floor(Math.random() * files.length)];
  logInfo(config, channelId, command, `使用文件夹 ${folderPath} 发送本地图片为 ${imageUrl}`);
  return { imageUrl: imageUrl, isLocal: true };
}

async function getRandomImageUrlFromFile(txtPath, config, channelId, command, ctx) {
  let urls, imageUrl;
  try {
    urls = fs.readFileSync(txtPath, 'utf8').split('\n').filter(url => url.trim() !== ''); // 过滤空行
  } catch (error) {
    if (error instanceof Error && error.code === 'ENOENT') {
      return { imageUrl: null, isLocal: false };
    } else {
      logError(error);
      return { imageUrl: null, isLocal: false };
    }
  }

  // 检查是否有有效的URL
  if (urls.length === 0) {
    logError(`错误！无有效URL可用：${txtPath}`);
    return { imageUrl: null, isLocal: false };
  }

  // 随机选择URL
  const index = Math.floor(Math.random() * urls.length);
  let txtUrl = urls[index].trim();

  // 移除多余的前缀
  /*
    多余的前缀 是由于浏览器脚本模式二所产生的，会出现链接重复https：的bug，比如
    https:https://i0.hdslb.com/bfs/new_dyn/c5196e99b284901ba699d609ced3446673456403.gif

    可用于测试 模式二提取的帖子
    https://www.bilibili.com/read/cv35076823
  */
  const extraPrefix = 'https:';
  const bilibiliPrefix = "https://i0.hdslb.com/bfs/";
  if (txtUrl.startsWith(extraPrefix + bilibiliPrefix)) {
    txtUrl = txtUrl.replace(extraPrefix, '');
  }

  // 没有前缀 "https://" ，添加前缀
  if (!txtUrl.startsWith("https://") && !txtUrl.startsWith("http://")) {
    //const koishiPrefix = "https://koishi-meme.itzdrli.com/meme/";
    const koishiPrefix = "https://memes.none.bot/meme/";
    const prefix = txtPath.includes("koimeme.txt") ? koishiPrefix : bilibiliPrefix;
    txtUrl = prefix + txtUrl;
  }

  imageUrl = txtUrl.trim();

  // 将这些指令下载至本地，进行本地发图的逻辑
  if (config.LocalSendNetworkPicturesList && config.LocalSendNetworkPicturesList.length > 0) {
    const normalizedList = config.LocalSendNetworkPicturesList.split(/\n|,|，/).map(item => item.trim().toLowerCase());
    const lowerCaseCommand = command.toLowerCase();
    if (normalizedList.includes(lowerCaseCommand)) { // 如果配置了需要下载到本地
      const outputPath = path.join(__dirname, `${Date.now()}.png`); // 临时文件
      try {
        imageUrl = await downloadImage(txtUrl, outputPath, ctx);
        setTimeout(() => {
          fs.unlinkSync(imageUrl);
          logInfo(config, null, null, `临时文件已删除：${imageUrl}`);
        }, config.deletePictime * 1000);
        logInfo(config, channelId, command, `下载并发送本地图片: ${imageUrl}`);
        return { imageUrl: imageUrl, isLocal: true };
      } catch (downloadError) {
        logError(`图片下载失败：${downloadError.message}`);
        return { imageUrl: null, isLocal: false };
      }
    }
  }

  logInfo(config, channelId, command, `使用文件 ${txtPath} 发送URL为 ${imageUrl}`);
  return { imageUrl: imageUrl, isLocal: false };
}

async function downloadImage(url, outputPath, ctx) {
  try {
    const response = await ctx.http.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response);
    await fs.promises.writeFile(outputPath, buffer);
    return outputPath;
  } catch (error) {
    logError(`下载图片失败: ${error.message}`);
    throw error;
  }
}

function logInfo(config, channelId, command, message) {
  if (config.consoleinfo) {
    if (channelId) {
      logger.info(`\n${channelId} 触发表情包\n使用指令： ${command}\n${message}`);
    } else {
      logger.info(message);
    }
  }
}

function logError(message) {
  logger.error(message);
}

/**
* 列出所有表情包指令名称。
* @param config 配置对象，包含 MoreEmojiHub 数组
* @returns {string[]} 所有表情包指令的列表
*/
function listAllCommands(config) {
  // 使用 map 方法来提取每个表情包的指令名称
  const allCommands = config.MoreEmojiHub.map(emoji => emoji.command);

  // 检查结果是否为空
  if (allCommands.length === 0) {
    logger.error("未找到任何表情包指令。");
  }

  // 返回命令列表
  return allCommands;
}

function apply(ctx, config) {
  const emojihub_bili_codecommand = config.emojihub_bili_command;
  function applyI18n(emojihub_bili_codecommand) {
    const applyI18nresult = {
      commands: {
        [emojihub_bili_codecommand]: {
          description: `${emojihub_bili_codecommand}表情包功能`,
          messages: {
            "notfound_txt": "ERROR！找不到文件或文件为空！指令：{0}",
            "List_of_emojis": "表情包列表：",
            //"emojihub_bili_codecommand_usage" : "emojihub父级指令 触发后列出全部的子指令"
          }
        },
        '再来一张': {
          description: `再来一张表情包`,
          messages: {
            "nocommand": "没有找到上一个命令，请先执行一个命令！\n➣例如： 再来一张 白圣女表情包",
          }
        },
        '随机表情包': {
          description: `从全部表情包里随机抽一张`,
          messages: {
            "noemoji": "没有任何表情包配置，请检查插件配置项！",
          }
        }
      }
    };
    //logger.error(applyI18nresult)
    return applyI18nresult;
  }
  var zh_CN_default = applyI18n(emojihub_bili_codecommand)
  ctx.i18n.define("zh-CN", zh_CN_default);

  const lastCommandByChannel = {};

  function updateLastCommand(channelId, command) {
    lastCommandByChannel[channelId] = command;
    logInfomessage('记录到command为： ' + command + ' 在频道： ' + channelId);
  }

  function logInfomessage(message) {
    if (config.consoleinfo) {
      logger.info(message);
    }
  }


  /**
 * 发送列表按钮
 * @param session 
 * @returns 
 */
  function command_list_markdown(session) {
    if (config.MDswitch && !config.RAW_MD_switch) {
      const mdid = config.markdown_setting.mdid;
      let zllbmdtext_1 = config.markdown_setting.zllbmdtext_1;
      let zllbmdtext_2 = config.markdown_setting.zllbmdtext_2;

      //const json_button_mdid_command = config.markdown_setting.json_button_mdid_command;
      const json_button_mdid_emojilist = config.markdown_setting.json_button_mdid_emojilist;

      const zllbtext_1_options = config.markdown_setting.zllbtext_1;
      const zllbtext_2_options = config.markdown_setting.zllbtext_2;

      const zllbtext_1 = zllbtext_1_options[Math.floor(Math.random() * zllbtext_1_options.length)];
      const zllbtext_2 = zllbtext_2_options[Math.floor(Math.random() * zllbtext_2_options.length)];

      return {
        msg_type: 2,
        msg_id: session.messageId,
        markdown: {
          custom_template_id: mdid,//mdid
          params: [
            {
              key: zllbmdtext_1,
              values: [zllbtext_1],//这是第一段文字
            },
            {
              key: zllbmdtext_2,
              values: [zllbtext_2],//这是第二段文字
            },
          ]
        },
        keyboard: {
          id: json_button_mdid_emojilist
        },
      }
    }
    if (config.RAW_MD_switch && !config.MDswitch) { // 原生 markdown  //RAW_MD_emojilist_markdown

      try {
        // 读取 JSON 文件内容
        const rawMarkdownFilePath = config.RAW_MD_setting.RAW_MD_emojilist_markdown;
        const rawMarkdownData = fs.readFileSync(rawMarkdownFilePath, 'utf-8');
        // 使用正则表达式替换占位符
        const replacedMarkdownData = rawMarkdownData
          .replace(/\$\{session\.messageId\}/g, session.messageId);

        // 将替换后的字符串转换回对象
        const rawMarkdownCommand = JSON.parse(replacedMarkdownData);

        logInfomessage(rawMarkdownCommand);
        // 返回最终的结果
        return rawMarkdownCommand
      } catch (error) {
        logInfomessage(`解析 RAW_MD_emojilist_markdown 出错: ${error}`);
        return null;
      }
    }
  }

  /**
   * 发送md
   * @param session 
   * @param command 用户输入的指令
   * @param imageUrl 图片的链接，带上https://
   * @returns 
   */
  async function markdown(session, command, imageUrl) {
    if (config.MDswitch && !config.RAW_MD_switch) {  // 被动markdown发送
      const mdid = config.markdown_setting.mdid;
      const mdkey1 = config.markdown_setting.zlmdp_1;
      const mdkey2 = config.markdown_setting.zlmdp_2;

      const json_button_mdid_command = config.markdown_setting.json_button_mdid_command;
      //const json_button_mdid_emojilist = config.markdown_setting.json_button_mdid_emojilist;

      const zltext_1_options = config.markdown_setting.zltext_1;
      const zltext_2_options = config.markdown_setting.zltext_2;

      const zltext_1 = zltext_1_options[Math.floor(Math.random() * zltext_1_options.length)];
      const zltext_2 = zltext_2_options[Math.floor(Math.random() * zltext_2_options.length)];

      let zlmdtext_1 = config.markdown_setting.zlmdtext_1;
      let zlmdtext_2 = config.markdown_setting.zlmdtext_2;

      //const ButtonText1 = config.markdown_setting.ButtonText1;
      //const ButtonText2 = config.markdown_setting.ButtonText2;

      //const emojihub_bili_command = config.emojihub_bili_command;

      const canvasimage = await ctx.canvas.loadImage(imageUrl);
      let originalWidth = canvasimage.naturalWidth || canvasimage.width;
      let originalHeight = canvasimage.naturalHeight || canvasimage.height;

      const MinimumTarget = config.markdown_setting.MinimumBoundary;
      const magnifyTarget = config.markdown_setting.Magnifymultiple;
      // 等比放大图片
      if (originalWidth < MinimumTarget || originalHeight < MinimumTarget) {
        const scale = magnifyTarget / Math.min(originalWidth, originalHeight);
        originalWidth = Math.round(originalWidth * scale);
        originalHeight = Math.round(originalHeight * scale);
        logInfomessage(`宽度放大到了 ${originalWidth} 高度放大到了 ${originalHeight}`);
      }

      const functionmarkdownreturn = {
        msg_type: 2,
        msg_id: session.messageId,
        markdown: {
          custom_template_id: mdid, //md的模版id
          params: [
            {
              key: zlmdtext_1,
              values: [zltext_1],//这是第一段文字
            },
            {
              key: zlmdtext_2,
              values: [zltext_2],//这是第二段文字
            },
            {
              key: mdkey1,  //md参数1
              values: [`![img#${originalWidth}px #${originalHeight}px]`],
            },
            {
              key: mdkey2,  //md参数2
              values: [`(${imageUrl})`],
            },
          ]
        },
        keyboard: {
          id: json_button_mdid_command
        },
      }
      logInfomessage(functionmarkdownreturn)
      return functionmarkdownreturn

    }
    if (config.RAW_MD_switch && !config.MDswitch) { // 原生 markdown
      const canvasimage = await ctx.canvas.loadImage(imageUrl);
      let originalWidth = canvasimage.naturalWidth || canvasimage.width;
      let originalHeight = canvasimage.naturalHeight || canvasimage.height;
      const MinimumTarget = config.markdown_setting.MinimumBoundary;
      const magnifyTarget = config.markdown_setting.Magnifymultiple;

      // 等比放大图片
      if (originalWidth < MinimumTarget || originalHeight < MinimumTarget) {
        const scale = magnifyTarget / Math.min(originalWidth, originalHeight);
        originalWidth = Math.round(originalWidth * scale);
        originalHeight = Math.round(originalHeight * scale);
        logInfomessage(`宽度放大到了 ${originalWidth} 高度放大到了 ${originalHeight}`);
      }

      try {
        // 读取 JSON 文件内容
        const rawMarkdownFilePath = config.RAW_MD_setting.RAW_MD_command_markdown;
        const rawMarkdownData = fs.readFileSync(rawMarkdownFilePath, 'utf-8');
        // 使用正则表达式替换占位符
        const replacedMarkdownData = rawMarkdownData
          .replace(/\$\{session\.messageId\}/g, session.messageId)
          .replace(/\$\{imageurl\}/g, imageUrl)
          .replace(/\$\{originalWidth\}/g, originalWidth)
          .replace(/\$\{originalHeight\}/g, originalHeight)
          .replace(/\$\{command\}/g, command)
          .replace(/\$\{config\.emojihub_bili_command\}/g, config.emojihub_bili_command);

        // 将替换后的字符串转换回对象
        const rawMarkdownCommand = JSON.parse(replacedMarkdownData);

        logInfomessage(rawMarkdownCommand);
        // 返回最终的结果
        return rawMarkdownCommand
      } catch (error) {
        logInfomessage(`解析 RAW_MD_command_markdown 出错: ${error}`);
        return null;
      }
    }
  }


  let acmd = []
  config.MoreEmojiHub.forEach(({ command, source_url }) => {
    acmd.push(command)
    ctx.command(config.emojihub_bili_command)
      .action(async ({ session }) => {
        const txtCommandList = listAllCommands(config);
        logInfomessage(`指令列表txtCommandList：  ` + txtCommandList);
        if (config.json_button_switch && config.json_setting.json_button_mdid_emojilist) {
          let markdownMessage = {
            msg_id: session.event.message.id,
            msg_type: 2,
            content: "", // content可传入不进去哦~  只能发按钮
            keyboard: {
              id: config.json_setting.json_button_mdid_emojilist
            },
          }

          if (session.event.guild?.id) {
            await session.qq.sendMessage(session.channelId, markdownMessage);
          } else {
            await session.qq.sendPrivateMessage(session.event.user?.id, markdownMessage);
          }

        } else if ((config.MDswitch && config.markdown_setting.mdid &&
          config.markdown_setting.zlmdp_1 && config.markdown_setting.zlmdp_2 &&
          session.platform === 'qq') || config.RAW_MD_switch) {
          // 使用 Markdown 发送命令列表 

          let markdownMessage = command_list_markdown(session);
          if (session.event.guild?.id) {
            await session.qq.sendMessage(session.channelId, markdownMessage);
          } else {
            await session.qq.sendPrivateMessage(session.event.user?.id, markdownMessage);
          }
        } else {
          // 否则，发送文本列表
          const commandText = txtCommandList.join('\n');
          await session.send(h.text(session.text(`commands.${emojihub_bili_codecommand}.messages.List_of_emojis`) + `\n` + commandText));
        }
      }
      );

    ctx.command(`${config.emojihub_bili_command}/${command} <local_picture_name:text>`)
      .action(async ({ session }, local_picture_name) => {
        //const imageResult = {  isLocal: true };   // [如果没有图片返回，发送错误消息]的测试
        const imageResult = await determineImagePath(source_url, config, session.channelId, command, ctx, local_picture_name);

        if (!imageResult.imageUrl) {
          // 如果没有图片返回，发送错误消息
          await session.send(h.text(session.text(`commands.${emojihub_bili_codecommand}.messages.notfound_txt`, [command])));
          return;
        }
        // 更新频道的最后一个命令
        updateLastCommand(session.channelId, command);
        try {
          let message;
          if ((config.MDswitch && config.markdown_setting.mdid &&
            config.markdown_setting.zlmdp_1 && config.markdown_setting.zlmdp_2 &&
            session.platform === 'qq') || config.RAW_MD_switch) {
            // MD发送图片的逻辑
            //logger.info(`MD发送图片`);
            if (imageResult.isLocal) {
              // 如果是本地图片，使用本地图片的逻辑
              if (config.localPicToBase64) {
                //本地base64发图
                let imagebase64 = await getImageAsBase64(imageResult.imageUrl);
                //logger.info(imagebase64)

                let MDimagebase64 = 'data:image/png;base64,' + imagebase64;

                if (session.event.guild?.id) {
                  message = session.qq.sendMessage(session.channelId, await markdown(session, command, MDimagebase64));
                } else {
                  message = session.qq.sendPrivateMessage(session.event.user?.id, await markdown(session, command, MDimagebase64));
                }

              } else if (config.markdown_setting.QQPicToChannelUrl) {

                const uploadedImageURL = await uploadImageToChannel(ctx, config.consoleinfo, url.pathToFileURL(imageResult.imageUrl).href, session.bot.config.id, session.bot.config.secret, config.markdown_setting.QQchannelId);

                if (session.event.guild?.id) {
                  message = session.qq.sendMessage(session.channelId, await markdown(session, command, uploadedImageURL.url));
                } else {
                  message = session.qq.sendPrivateMessage(session.event.user?.id, await markdown(session, command, uploadedImageURL.url));
                }

              } else {
                //正常本地文件发图
                const imageUrl = url.pathToFileURL(imageResult.imageUrl).href;
                if (session.event.guild?.id) {
                  message = session.qq.sendMessage(session.channelId, await markdown(session, command, imageUrl));
                } else {
                  message = session.qq.sendPrivateMessage(session.event.user?.id, await markdown(session, command, imageUrl));
                }
              }
            } else {
              // 网络URL
              if (session.event.guild?.id) {
                message = session.qq.sendMessage(session.channelId, await markdown(session, command, imageResult.imageUrl));
              } else {
                message = session.qq.sendPrivateMessage(session.event.user?.id, await markdown(session, command, imageResult.imageUrl));
              }
            }
          } else {
            //logger.info(`正常情况`);
            // 根据图片是否为本地图片选择发送方式
            if (imageResult.isLocal) {
              // 如果是本地图片，使用本地图片的逻辑
              if (config.localPicToBase64) {
                //本地base64发图
                let imagebase64 = await getImageAsBase64(imageResult.imageUrl);
                //logger.info(imagebase64)
                message = await session.send(h('image', { url: 'data:image/png;base64,' + imagebase64 }));

                if (config.json_button_switch && config.json_setting.json_button_mdid_command && session.platform === 'qq') { // 发送图片后，发送json按钮
                  let markdownMessage = {
                    msg_id: session.event.message.id,
                    msg_type: 2,
                    content: "", // content可传入不进去哦~  只能发按钮
                    keyboard: {
                      id: config.json_setting.json_button_mdid_command
                    },
                  }
                  if (session.event.guild?.id) {
                    await session.qq.sendMessage(session.channelId, markdownMessage);
                  } else {
                    await session.qq.sendPrivateMessage(session.event.user?.id, markdownMessage);
                  }
                }
              } else {
                //正常本地文件发图
                const imageUrl = url.pathToFileURL(imageResult.imageUrl).href;
                message = await session.send(h.image(imageUrl));
                if (config.json_button_switch && config.json_setting.json_button_mdid_command && session.platform === 'qq') { // 发送图片后，发送json按钮
                  let markdownMessage = {
                    msg_id: session.event.message.id,
                    msg_type: 2,
                    content: "", // content可传入不进去哦~  只能发按钮
                    keyboard: {
                      id: config.json_setting.json_button_mdid_command
                    },
                  }
                  if (session.event.guild?.id) {
                    await session.qq.sendMessage(session.channelId, markdownMessage);
                  } else {
                    await session.qq.sendPrivateMessage(session.event.user?.id, markdownMessage);
                  }
                }
              }
            } else {
              // 网络URL
              message = await session.send(h.image(imageResult.imageUrl));
              if (config.json_button_switch && config.json_setting.json_button_mdid_command && session.platform === 'qq') { // 发送图片后，发送json按钮
                let markdownMessage = {
                  msg_id: session.event.message.id,
                  msg_type: 2,
                  content: "", // content可传入不进去哦~  只能发按钮
                  keyboard: {
                    id: config.json_setting.json_button_mdid_command
                  },
                }
                if (session.event.guild?.id) {
                  await session.qq.sendMessage(session.channelId, markdownMessage);
                } else {
                  await session.qq.sendPrivateMessage(session.event.user?.id, markdownMessage);
                }
              }
            }
          }
          if (config.deleteMsg) {
            setTimeout(async () => {
              try {
                await session.bot.deleteMessage(session.channelId, message);
              } catch (error) {
                logger.error(`撤回消息失败: ${error}`);
              }
            }, config.deleteMsgtime * 1000);
          }
        } catch (error) {
          logger.error(`Error sending image:  ${error}`);
        }
      });


    ctx.command(`${config.emojihub_bili_command}/再来一张`)
      .action(async ({ session }) => {
        const lastCommand = lastCommandByChannel[session.channelId];
        logInfomessage('尝试在频道 ' + session.channelId + ' 中执行最后一个命令： ' + lastCommand);
        if (lastCommand) {
          await session.execute(`${lastCommand}`);
        } else {
          await session.send(session.text(".nocommand"));
        }
      });

    ctx.command(`${config.emojihub_bili_command}/随机表情包`)
      .action(async ({ session }) => {
        const randomEmojiHubCommand = getRandomEmojiHubCommand(config);
        if (randomEmojiHubCommand) {
          await session.execute(randomEmojiHubCommand);
          logInfo(config, session.channelId, randomEmojiHubCommand, `随机表情包`);
          return;
        } else {
          await session.send(session.text(".noemoji"));
        }
      });
  });



  if (config.autoEmoji && (config.groupListmapping.length || config.allgroupautoEmoji)) {
    const groups = {};

    // 初始化特定群组的配置
    config.groupListmapping.forEach(({ groupList, defaultemojicommand, enable }) => {
      // 只有当enable为false或未定义时，才将群组添加到启用列表中
      if (enable === false) {
        groups[groupList] = { count: 0, emojicommand: defaultemojicommand };
      } else {
        // 如果enable为true，则将该群组标记为黑名单
        groups[groupList] = { blacklisted: true };
      }
    });

    ctx.middleware(async (session, next) => {
      const channelId = session.channelId;

      // 确定当前群组是否在特定配置中并且是否被黑名单
      let groupConfig = groups[channelId];

      // 如果当前群组标记为黑名单，则直接跳过处理
      if (groupConfig && groupConfig.blacklisted) {
        return next();
      }

      // 如果当前群组没有特定配置，并且开启了全部群组自动表情包
      if (!groupConfig && config.allgroupautoEmoji) {
        // 初始化为全部群组的配置
        groupConfig = { count: 0, emojicommand: config.allgroupemojicommand };
        // 如果此群组被黑名单，则不记录配置
        if (!groups[channelId] || !groups[channelId].blacklisted) {
          groups[channelId] = groupConfig;
        }
      }

      // 如果当前群组没有特定配置，并且开启了全部群组自动表情包
      if (!groupConfig && config.allgroupautoEmoji) {
        // 初始化为全部群组的配置
        groupConfig = { count: 0, emojicommand: config.allgroupemojicommand };
        groups[channelId] = groupConfig; // 记录配置以供后续使用
      }

      // 如果存在配置，处理表情包逻辑
      if (groupConfig) {
        groupConfig.count++; // 增加消息计数

        // 达到触发条件
        if (groupConfig.count >= config.count) {
          const randomNumber = Math.random();
          // 触发概率判断
          if (randomNumber <= config.triggerprobability) {
            let emojicommands = groupConfig.emojicommand.split(/\n|,|，/).map(cmd => cmd.trim());
            const randomCommand = emojicommands[Math.floor(Math.random() * emojicommands.length)];
            const emojiConfig = config.MoreEmojiHub.find(({ command }) => command === randomCommand);
            if (emojiConfig) {
              const imageResult = await determineImagePath(emojiConfig.source_url, config, channelId, emojiConfig.command, ctx);
              if (imageResult.imageUrl) {
                try {
                  groupConfig.count = 0; // 重置消息计数
                  let message;
                  if (imageResult.isLocal) { //本地图片
                    //const imageUrl = url.pathToFileURL(imageResult.imageUrl).href;
                    //message = h.image(imageUrl);
                    if (config.localPicToBase64) {
                      //本地base64发图
                      let imagebase64 = await getImageAsBase64(imageResult.imageUrl);
                      //logger.info(imagebase64)
                      message = h('image', { url: 'data:image/png;base64,' + imagebase64 });
                    } else {
                      //正常本地文件发图
                      const imageUrl = url.pathToFileURL(imageResult.imageUrl).href;
                      message = h.image(imageUrl);
                    }
                  } else {
                    message = h.image(imageResult.imageUrl);
                  }
                  let sentMessage = await session.send(message);
                  // 如果需要撤回消息
                  if (config.deleteMsg) {
                    setTimeout(async () => {
                      try {
                        await session.bot.deleteMessage(session.channelId, sentMessage);
                      } catch (error) {
                        logger.error(`撤回消息失败: ${error}`);
                      }
                    }, config.deleteMsgtime * 1000);
                  }
                } catch (error) {
                  logger.error(`发送图片错误: ${error}`);
                }
              } else {
                groupConfig.count = 0; // 图片不存在，重置计数
              }
            }
          } else {
            groupConfig.count = 0; // 没有触发表情包，重置计数
          }
        }
      }
      return next();
    }, true);
  }

}

exports.apply = apply;