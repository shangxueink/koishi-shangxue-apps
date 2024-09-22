
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.usage = exports.Config = exports.name = void 0;
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { Schema, Logger, h } = require("koishi");
const path = require("node:path");
const logger = new Logger('keyword-dialogue');

exports.usage = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>插件使用说明</title>
</head>
<body>
<h1>插件使用说明</h1>
<p>本插件是专门为图文教程和问答场景设计的，能让你的机器人根据关键词自动回复内容哦。</p>
<p>如果你使用过云崽的喵喵插件的添加/删除功能，那你会更容易上手本插件的！</p>

<h2>核心功能</h2>
<ul>
<li><strong>关键词管理：</strong>你可以通过指令添加或删除关键词及其回复内容。</li>
<ul>
<li>添加关键词：使用指令 <code>添加 [关键词]</code> 来添加关键词。</li>
<li>删除关键词：使用指令 <code>删除 [关键词]</code> 来删除关键词。</li>
<li>全局添加/删除：使用指令 <code>全局添加 [关键词]</code> 和 <code>全局删除 [关键词]</code> 来在全局范围内管理关键词。</li>
</ul>
<li><strong>回复内容：</strong>支持文本和图片回复，图片会被保存到本地，避免失效。</li>
<li><strong>正则表达式支持：</strong>你可以使用正则表达式来匹配关键词。例如，输入 <code>添加 你好 -x</code>，可以匹配任何包含“你好”的消息，如“你好啊啊啊啊”。</li>
<li><strong>自定义输入时限：</strong>你可以设置添加回复的输入时限，超过时限将视为超时，自动取消添加操作。</li>
<li><strong>多段回复效果：</strong>你可以选择多段输入的回复效果，支持逐条发送或合并为一条消息。</li>
</ul>

<h2>使用示例</h2>
<ul>
<li>添加关键词：<code>添加 你好</code></li>
<li>添加正则关键词：<code>添加 你好 -x</code></li>
<li>删除关键词：<code>删除 你好</code></li>
<li>全局添加关键词：<code>全局添加 你好</code></li>
<li>全局删除关键词：<code>全局删除 你好</code></li>
</ul>

<hr>

<h2>修改插件回复内容</h2>
<p>如果你需要修改这个插件的回复内容，你需要具备一定的编辑json的能力。</p>
<p>你可以在 Koishi 控制台左侧的活动栏找到【资源管理器】页面，</p>
<p>然后依次找到文件夹【data】-&gt;【keyword-dialogue】文件夹下的各种【***（群号）***.json】文件。</p>
<p>你可以在里面编辑和修改 JSON 内容。</p>

<hr>

<h2>注意事项</h2>
<ul>
<li>默认情况下，<code>添加/删除</code> 的问答是按群组分隔的。只有 <code>全局添加/删除</code> 才支持多群组同样的回复。</li>
<li>请确保解析到的图片链接是可以访问的。</li>
<li>这个插件需要确保 接入平台 端和 koishi 端运行在同一台机器上，以确保本地图片能够正确保存和发送。</li>
<li>在使用正则表达式时，请确保输入的模式是有效的，以避免匹配错误。</li>
<li>如果你添加了语音/视频消息回复，请确保已经安装了silk、ffmpeg等服务！</li>
</ul>
</body>
</html>
`;

exports.Config = Schema.intersect([
  Schema.object({
    TriggerPrefix: Schema.string().default('添加').description('触发`添加关键词`功能的指令'),
    DeleteKeyword: Schema.string().default('删除').description('触发`删除关键词`功能的指令'),
    KeywordOfEsc: Schema.string().default('取消添加').description('取消`添加关键词`功能的关键词'),
    KeywordOfEnd: Schema.string().default('结束添加').description('退出`添加关键词`功能的关键词'),
    GlobalTriggerPrefix: Schema.string().default('全局添加').description('触发`全局添加关键词`功能的指令（可在全局范围内生效）'),
    GlobalDeleteKeyword: Schema.string().default('全局删除').description('触发`全局删除关键词`功能的指令'),
    KeywordOfSearch: Schema.string().default('查找关键词').description('触发`搜索关键词`功能的关键词'),
    addKeywordTime: Schema.number().role('slider').min(1).max(30).step(1).default(5).description('添加回复的输入时限，超过则视为超时，取消添加。`单位 分钟`'),
    defaultImageExtension: Schema.union(['jpg', 'png', 'gif']).default('png').description('输入图片保存的后缀名'),
  }).description('基础设置'),
  Schema.object({
    Only_admin_auth: Schema.boolean().default(false).description('开启后 仅允许 管理员/群主 使用本插件的指令 `须确保适配器支持获取群员角色`'),
    Treat_all_as_lowercase: Schema.boolean().default(true).description('开启后 英文关键词匹配无视大写字母`解决英文大小写匹配问题`'),
    picture_save_to_local_send: Schema.union([
      Schema.const('1').description('不保存图片，使用平台的图片链接'),
      Schema.const('2').description('保存图片为文件，发送时使用图片文件绝对路径'),
      Schema.const('3').description('保存图片为文件，发送时图片文件转换为base64'),
      Schema.const('4').description('保存图片为base64到json，发送时使用base64 `json会变得好长唔，不推荐`'),
    ]).role('radio').default('2').description('开启后 图片回复保存到本地路径`防止平台图片链接失效`'),

    Prompt: Schema.string().default('请输入回复内容（输入 取消添加 以取消，输入 结束添加 以结束）：').description('添加时，返回的文字提示'),
    MatchPatternForExit: Schema.union([
      Schema.const('1').description('不使用KeywordOfEnd（不使用多段输入），仅接受一次性的输入'),
      Schema.const('2').description('完全匹配KeywordOfEnd时退出'),
      Schema.const('3').description('包含KeywordOfEnd时退出'),
      Schema.const('4').description('包含KeywordOfEnd，或者完全匹配KeywordOfEnd均可退出'),
    ]).role('radio').default('4').description("如何退出添加"),
    AlwayPrompt: Schema.union([
      Schema.const('1').description('不返回文字提示（真的很难用）'),
      Schema.const('2').description('仅返回一次文字提示'),
      Schema.const('3').description('每次输入都返回文字提示（有点太吵了）'),
    ]).role('radio').default('2').description("如何返回文字提示"),
    HandleDuplicateKeywords: Schema.union([
      Schema.const('1').description('不返回文字提示，直接替换/覆盖'),
      Schema.const('2').description('不返回文字提示，直接在原关键词回答上添加并列回答（每次仅从中选择随机一种回复）'),
      Schema.const('3').description('返回文字提示，不允许重复添加（删除后才可添加）'),
    ]).role('radio').default('3').description("如何处理待添加的重复关键词"),
    MultisegmentAdditionRecoveryEffect: Schema.union([
      Schema.const('1').description('按照原版输入，原版输出（多段消息发送）'),
      Schema.const('2').description('合为图文消息/多行消息（一次发出，不是合并转发）'),
      Schema.const('3').description('合并转发发送 `需要适配器支持哦~`'),
    ]).role('radio').default('2').description("多段添加的回复效果"),
  }).description('进阶设置'),
  Schema.object({
    Frequency_limitation: Schema.number().description('同一问答的最小触发间隔 单位：秒').default(0),
    Type_of_restriction: Schema.union([
      Schema.const('1').description('对同一个问题（全部对象）'),
      Schema.const('2').description('仅对同一个频道（不同频道独立记数间隔）'),
    ]).role('radio').default('2').description("最小间隔时间的限制对象"),
  }).description('回复设置'),
  Schema.object({
    Search_Range: Schema.union([
      Schema.const('1').description('仅在当前频道搜索问答'),
      Schema.const('2').description('搜索全部问答'),
    ]).role('radio').default('2').description("搜索范围"),
    Find_Return_Preset: Schema.union([
      Schema.const('1').description('仅返回问答的内容'),
      Schema.const('2').description('仅返回问答所在的频道ID/位置'),
      Schema.const('3').description('返回问答的内容，并且返回问答所在的频道ID/位置'),
    ]).role('radio').default('1').description("返回信息"),
    Return_Limit: Schema.union([
      Schema.const('1').description('返回查找到的全部问答'),
      Schema.const('2').description('仅返回一条问答（模糊匹配）'),
    ]).role('radio').default('2').description("返回限制"),
  }).description('查找问答设置'),
  Schema.object({
    Preposition_middleware: Schema.boolean().default(false).description('开启后 使用前置中间件`匹配到关键词后，不会触发 同实例下 同名称的指令`<br>可以实现回复“指令正在维护中”的效果'),
    consoleInfo: Schema.boolean().default(false).description('日志调试模式')
  }).description('调试设置'),
]);
const lastTriggerTimes = {}; // 用于记录每个关键词的最后触发时间
function apply(ctx, config) {
  const add_command = config.TriggerPrefix; // 添加
  const global_add_command = config.GlobalTriggerPrefix;  //  全局添加
  const delete_command = config.DeleteKeyword;  //  删除
  const global_delete_command = config.GlobalDeleteKeyword; //  全局删除
  const KeywordOfSearch = config.KeywordOfSearch; //  搜索关键词

  const zh_CN_default = {
    commands: {
      [add_command]: {
        description: `添加关键词`,
        messages: {
          "Only_admin_auth": "仅允许群组管理员操作。",
          "no_Valid_Keyword": "请提供一个有效的关键词。",
          "Input_Timeout": "输入超时。",
          "Cancel_operation": "添加操作已取消。",
          "Keyword_exists": "关键词 \"{0}\" 已存在，不能添加重复的关键词。\n或者请删除这个关键词后重新添加。",
          "Reply_added": "关键词 \"{0}\" 的回复已添加。"
        }
      },
      [global_add_command]: {
        description: `添加全局关键词`,
        messages: {
          "Only_admin_auth": "仅允许群组管理员操作。",
          "no_Valid_Keyword": "请提供一个有效的关键词。",
          "Input_Timeout": "输入超时。",
          "Cancel_operation": "添加操作已取消。",
          "Keyword_exists": "关键词 \"{0}\" 已存在，不能添加重复的关键词。\n或者请删除这个关键词后重新添加。",
          "Reply_added": "关键词 \"{0}\" 的回复已添加。"
        }
      },
      [delete_command]: {
        description: `删除关键词`,
        messages: {
          "Only_admin_auth": "仅允许群组管理员操作。",
          "no_Valid_Keyword": "请提供一个有效的关键词。",
          "Keyword_does_not_exist": "关键词 \"{0}\" 不存在。",
          "Reply_deleted": "关键词 \"{0}\" 的回复已删除。"
        }
      },
      [global_delete_command]: {
        description: `删除全局关键词`,
        messages: {
          "Only_admin_auth": "仅允许群组管理员操作。",
          "no_Valid_Keyword": "请提供一个有效的关键词。",
          "Keyword_does_not_exist": "关键词 \"{0}\" 不存在。",
          "Reply_deleted": "关键词 \"{0}\" 的回复已删除。"
        }
      },
      [KeywordOfSearch]: {
        description: `查找关键词`,
        messages: {
          "Only_admin_auth": "仅允许群组管理员操作。",
          "no_Valid_Keyword": "请提供一个有效的关键词。",
          "Keyword_not_found": "未找到关键词 \"{0}\" 的相关问答。",
          "Keyword_found": "在 {0} 下找到：\n关键词：{1}\n回复：\n{2}",
          "Keyword_found_in_channel": "在 {0} 下找到关键词：{1}",
          "Keyword_found_content_only": "关键词：{0}\n回复：\n{1}"
        }
      }
    }
  };
  ctx.i18n.define("zh-CN", zh_CN_default);

  const root = path.join(ctx.baseDir, 'data', 'keyword-dialogue');
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }

  ctx.command("keyword-dialogue")

  function logInfo(message) {
    if (config.consoleInfo) {
      logger.info(message);
    }
  }

  async function parseReplyContent(reply, root, session, isGlobal) {
    const elements = h.parse(reply);
    logInfo('Parsed elements:  ' + elements)
    const replyData = await Promise.all(elements.map(async element => {
      if (element.type === 'img' || element.type === 'image') {
        let localPath;
        switch (config.picture_save_to_local_send) {
          case '1':
            localPath = element.attrs.src;
            break;
          case '2':
            localPath = await downloadImage(element.attrs.src, root, session, isGlobal);
            break;
          case '3':
            localPath = await downloadImage(element.attrs.src, root, session, isGlobal);
            break;
          case '4':
            localPath = await downloadImageAsBase64(element.attrs.src);
            break;
          default:
            localPath = element.attrs.src;
        }
        return {
          type: 'image',
          text: `${localPath}`,
          fileSize: element.attrs.fileSize
        };
      } else if (element.type === 'text') {
        return {
          type: 'text',
          text: element.attrs.content
        };
      } else if (element.type === 'audio') {
        return {
          type: 'audio',
          text: element.attrs.path || element.attrs.url
        };
      } else if (element.type === 'video') {
        return {
          type: 'audio',
          text: element.attrs.src
        };
        /*} else if (element.type === 'mface') {
          return {
            type: 'mface',
            text: element.attrs.url
          };*/
      } else {
        return {
          type: 'unknown',
          text: reply
        };
      }
    })).then(results => results.filter(item => item !== null));
    return replyData;
  }

  // 判断是否为管理员
  function isAdmin(session) {
    const sessionRoles = session.event.member.roles;
    if (sessionRoles && sessionRoles.includes('admin')) {
      return true;
    }
    return false;
  }

  // 删除关键词
  async function deleteKeywordReply(session, filePath, keyword) {
    if (!fs.existsSync(filePath)) {
      await session.send(h.unescape(session.text(`.Keyword_does_not_exist`)));
      return;
    }
    let data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    // 将关键词转换为小写
    if (config.Treat_all_as_lowercase) {
      keyword = keyword.toLowerCase();
    }
    // 查找并删除匹配的关键词（忽略大小写）
    let found = false;
    for (const key in data) {
      const normalizedKey = config.Treat_all_as_lowercase ? key.toLowerCase() : key;
      if (normalizedKey === keyword || normalizedKey === `regex:${keyword}`) {
        delete data[key];
        found = true;
        break;
      }
    }
    if (!found) {
      await session.send(h.unescape(session.text(`.Keyword_does_not_exist`, [keyword])));
      return;
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    await session.send(h.unescape(session.text(`.Reply_deleted`, [keyword])));
  }

  async function addKeywordReply(session, filePath, keyword, config, isRegex, isGlobal) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {
      data = {};
    }
    // 将关键词转换为小写
    if (config.Treat_all_as_lowercase) {
      keyword = keyword.toLowerCase();
    }

    const key = isRegex ? `regex:${keyword}` : keyword;
    if (!data[key]) {
      data[key] = [];
    }
    if (data[key].length > 0 && config.HandleDuplicateKeywords === '3') {
      await session.send(h.unescape(session.text(`.Keyword_exists`, [keyword])));
      return;
    }
    if (config.HandleDuplicateKeywords === '1') {
      data[key] = [];
    }
    if (config.AlwayPrompt === '2' || config.AlwayPrompt === '3') {
      await session.send(h.text(config.Prompt));
    }

    let currentReplies = [];

    // 如果 MatchPatternForExit 为 '1'，则直接等待用户输入一次回复内容
    if (config.MatchPatternForExit === '1') {
      const timeout = config.addKeywordTime * 60000; // 转换为毫秒
      const reply = await session.prompt(timeout);

      if (!reply) {
        await session.send(h.text(session.text(`.Input_Timeout`)));
        return;
      }

      const replyData = await parseReplyContent(reply, root, session, isGlobal);
      currentReplies.push(...replyData);

      // 将回复内容保存到 data 中
      data[key].push(currentReplies);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      await session.send(h.unescape((session.text(`.Reply_added`, [keyword]))));
      return;
    }

    while (true) {
      if (config.AlwayPrompt === '3') {
        await session.send(h.text(config.Prompt));
      }
      const timeout = config.addKeywordTime * 60000; // 转换为毫秒
      const reply = await session.prompt(timeout);
      // 检查是否输入了取消添加的关键词
      if (reply.includes(config.KeywordOfEsc)) {
        await session.send(h.text(session.text(`.Cancel_operation`)));
        return;
      }
      if ((config.MatchPatternForExit === '2' && reply === config.KeywordOfEnd) ||
        (config.MatchPatternForExit === '3' && reply.includes(config.KeywordOfEnd)) ||
        (config.MatchPatternForExit === '4' && (reply === config.KeywordOfEnd || reply.includes(config.KeywordOfEnd)))) {
        break;
      }
      if (!reply) {
        await session.send(h.text(session.text(`.Input_Timeout`)));
        return;
      }

      const replyData = await parseReplyContent(reply, root, session, isGlobal);
      currentReplies.push(...replyData);
    }

    data[key].push(currentReplies);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    await session.send(h.unescape((session.text(`.Reply_added`, [keyword]))));
  }


  async function downloadImage(url, outputPath, session, isGlobal) {
    try {
      let absoluteOutputPath;
      if (isGlobal) {
        absoluteOutputPath = path.resolve(outputPath, 'global');  // 为全局关键词设定专门的文件夹
      } else {
        absoluteOutputPath = path.resolve(outputPath, session.channelId);  // 使用群聊ID作为路径
      }

      // 如果目录不存在，则创建目录
      if (!fs.existsSync(absoluteOutputPath)) {
        fs.mkdirSync(absoluteOutputPath, { recursive: true });
      }

      // 生成文件名，使用时间戳命名
      const timestamp = Date.now();
      let fileName = `${timestamp}.${config.defaultImageExtension}`;
      absoluteOutputPath = path.join(absoluteOutputPath, fileName);

      // 获取图片数据
      const response = await ctx.http.get(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response);

      // 写入文件
      await fs.promises.writeFile(absoluteOutputPath, buffer);

      const imageURL = pathToFileURL(absoluteOutputPath).href;
      logInfo(imageURL)
      // 返回图片的绝对路径
      return imageURL;
    } catch (error) {
      logger.error(`下载图片失败: ${error.message}`);
      throw error;
    }
  }

  async function downloadImageAsBase64(imagePath) {
    try {
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        // 处理网络图片链接
        const response = await ctx.http.get(imagePath, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response);
        const base64String = buffer.toString('base64');
        return base64String;
      } else {
        // 去掉 'file:///'，'file://' 和 'file:/' 前缀
        if (imagePath.startsWith('file:///')) {
          imagePath = imagePath.slice(8);
        } else if (imagePath.startsWith('file://')) {
          imagePath = imagePath.slice(7);
        } else if (imagePath.startsWith('file:/')) {
          imagePath = imagePath.slice(6);
        }
        const imageBuffer = fs.readFileSync(imagePath);
        // 将图片 buffer 转换为 Base64 字符串
        const base64String = imageBuffer.toString('base64');
        return base64String;
      }
    } catch (error) {
      logger.error('Error converting image to base64:', error);
      return null;
    }
  }

  // 搜索关键词
  ctx.command(`keyword-dialogue/${KeywordOfSearch} [Keyword]`)
    .action(async ({ session }, Keyword) => {
      if (config.Only_admin_auth && !isAdmin(session)) {
        await session.send(h.text(session.text(`.Only_admin_auth`)));
        return;
      }

      if (!Keyword) {
        await session.send(h.text(session.text(`.no_Valid_Keyword`)));
        return;
      }

      const searchRange = config.Search_Range;
      const returnPreset = config.Find_Return_Preset;
      const returnLimit = config.Return_Limit;

      const searchFiles = searchRange === '2'
        ? fs.readdirSync(root).filter(file => file.endsWith('.json'))
        : [`${session.channelId}.json`];

      let results = [];

      for (const file of searchFiles) {
        const filePath = path.join(root, file);
        if (fs.existsSync(filePath)) {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          for (const key in data) {
            const normalizedKey = config.Treat_all_as_lowercase ? key.toLowerCase() : key;
            if (normalizedKey.includes(Keyword.toLowerCase())) {
              const channelId = file.replace('.json', '');
              const replies = data[key].map(replyGroup => replyGroup.map(reply => reply.text).join('\n')).join('\n\n');
              if (returnPreset === '1') {
                results.push(session.text(`.Keyword_found_content_only`, [key, replies]));
              } else if (returnPreset === '2') {
                results.push(session.text(`.Keyword_found_in_channel`, [channelId, key]));
              } else if (returnPreset === '3') {
                results.push(session.text(`.Keyword_found`, [channelId, key, replies]));
              }
              if (returnLimit === '2') {
                break;
              }
            }
          }
        }
        if (returnLimit === '2' && results.length > 0) {
          break;
        }
      }

      if (results.length === 0) {
        await session.send(session.text(`.Keyword_not_found`, [Keyword]));
      } else {
        await session.send(results.join('\n\n'));
      }
    });

  // 删除关键词
  ctx.command(`keyword-dialogue/${delete_command} [Keyword]`)
    .alias('删除关键词')
    .action(async ({ session }, Keyword) => {
      if (config.Only_admin_auth && !isAdmin(session)) {
        await session.send(h.text(session.text(`.Only_admin_auth`)));
        return;
      }

      if (!Keyword) {
        await session.send(h.text(session.text(`.no_Valid_Keyword`)));
        return;
      }
      const filePath = path.join(root, `${session.channelId}.json`);
      await deleteKeywordReply(session, filePath, Keyword);
    });

  // 全局删除关键词
  ctx.command(`keyword-dialogue/${global_delete_command} [Keyword]`)
    .alias('全局删除关键词')
    .action(async ({ session }, Keyword) => {
      if (config.Only_admin_auth && !isAdmin(session)) {
        await session.send(h.text(session.text(`.Only_admin_auth`)));
        return;
      }

      if (!Keyword) {
        await session.send(h.text(session.text(`.no_Valid_Keyword`)));
        return;
      }
      const filePath = path.join(root, 'global.json');
      await deleteKeywordReply(session, filePath, Keyword);
    });

  function isValidKeyword(keyword) {
    return keyword && keyword.trim().length > 0;
  }

  // 全局添加关键词
  ctx.command(`keyword-dialogue/${global_add_command} [Keyword]`)
    .alias('全局添加关键词')
    .option('regex', '-x 添加正则关键词')
    .action(async ({ session, options }, Keyword) => {
      if (config.Only_admin_auth && !isAdmin(session)) {
        await session.send(h.text(session.text(`.Only_admin_auth`)));
        return;
      }

      if (!isValidKeyword(Keyword)) {
        await session.send(h.text(session.text(`.no_Valid_Keyword`)));
        return;
      }
      const isGlobal = true;
      const filePath = path.join(root, 'global.json');
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 2), 'utf-8');
      }
      await addKeywordReply(session, filePath, Keyword.trim(), config, options.regex, isGlobal);
    });

  //添加关键词
  ctx.command(`keyword-dialogue/${add_command} [Keyword]`)
    .alias('添加关键词')
    .option('global', '-g 添加全局关键词')
    .option('regex', '-x 添加正则关键词')
    .action(async ({ session, options }, Keyword) => {
      if (config.Only_admin_auth && !isAdmin(session)) {
        await session.send(h.text(session.text(`.Only_admin_auth`)));
        return;
      }

      if (!isValidKeyword(Keyword)) {
        await session.send(h.text(session.text(`.no_Valid_Keyword`)));
        return;
      }

      const filePath = options.global
        ? path.join(root, 'global.json')
        : path.join(root, `${session.channelId}.json`);

      const isGlobal = !!options.global;
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 2), 'utf-8');
      }
      await addKeywordReply(session, filePath, Keyword.trim(), config, options.regex, isGlobal);
    });

  const middlewareFunction = async (session, next) => {
    let { content, channelId, platform } = session;
    let anothercontent = unescapeHtml(content).trim();

    // 将输入内容转换为小写
    if (config.Treat_all_as_lowercase) {
      anothercontent = anothercontent.toLowerCase();
    }

    // 移除前导尖括号内容
    if (platform === 'qq') {
      anothercontent = removeLeadingBrackets(content);
    }

    logInfo(`用户输入内容为\n${anothercontent}`)

    const globalFilePath = path.join(root, 'global.json');
    const channelFilePath = path.join(root, `${channelId}.json`);
    let combinedReply = '';

    const sendReplies = async (session, replyGroup) => {
      if (config.MultisegmentAdditionRecoveryEffect === '1') {
        for (const reply of replyGroup) {
          logInfo(reply);
          const formattedReply = await formatReply(reply, false);
          await session.send(formattedReply.trim());  // 逐条发送
        }
      } else if (config.MultisegmentAdditionRecoveryEffect === '2') {
        let combinedReply = '';
        for (const reply of replyGroup) {
          combinedReply += await formatReply(reply, false);  // 累加
        }
        combinedReply = combinedReply.trim();
        logInfo(combinedReply);
        await session.send(combinedReply); // 发送累加的图文消息
      } else if (config.MultisegmentAdditionRecoveryEffect === '3') {
        const result = (0, h)('figure');
        for (const reply of replyGroup) {
          const formattedReply = await formatReply(reply, true);
          result.children.push(formattedReply);
        }
        logInfo(result);
        await session.send(result); // 发送合并转发消息
      }
    };

    const formatReply = async (reply, returnElement = false) => {
      let formattedReply;
      if (reply.type === 'img' || reply.type === 'image') {
        if (config.picture_save_to_local_send === '3') {
          const base64fileData = await downloadImageAsBase64(reply.text);
          formattedReply = returnElement ?
            (0, h)('image', { url: 'data:image/png;base64,' + base64fileData }) :
            `${h('image', { url: 'data:image/png;base64,' + base64fileData })}\n`;
        } else if (config.picture_save_to_local_send === '4') {
          formattedReply = returnElement ?
            (0, h)('image', { url: 'data:image/png;base64,' + reply.text }) :
            `${h('image', { url: 'data:image/png;base64,' + reply.text })}\n`;
        } else {
          formattedReply = returnElement ?
            (0, h)('image', { url: reply.text }) :
            `${h.image(reply.text)}\n`;
        }
      } else if (reply.type === 'text') {
        formattedReply = returnElement ?
          (0, h)('text', { content: reply.text }) :
          `${h.text(reply.text)}\n`;
      } else if (reply.type === 'audio') {
        formattedReply = returnElement ?
          (0, h)('audio', { url: reply.text }) :
          `${h.audio(reply.text)}\n`;
      } else if (reply.type === 'video') {
        formattedReply = returnElement ?
          (0, h)('video', { url: reply.text }) :
          `${h.video(reply.text)}\n`;
      } else if (reply.type === 'unknown') {
        formattedReply = returnElement ?
          (0, h)('text', { content: reply.text }) :
          `${reply.text}\n`;
      }

      return returnElement ? (0, h)('message', {}, formattedReply) : formattedReply;
    };


    const checkAndSendRandomReply = async (filePath) => {
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        for (const keyword in data) {
          const replies = data[keyword];
          let isMatch = false;
          if (keyword.startsWith('regex:')) {
            const regexPattern = keyword.substring(6);
            const regex = new RegExp(regexPattern);
            isMatch = regex.test(anothercontent);
          } else {
            isMatch = anothercontent === keyword;
          }
          if (isMatch) {
            const now = Date.now();
            const key = config.Type_of_restriction === '2' ? `${keyword}:${channelId}` : keyword;
            if (lastTriggerTimes[key] && now - lastTriggerTimes[key] < config.Frequency_limitation * 1000) {
              logInfo("间隔时间未到，不触发回复");
              return true; // 间隔时间未到，不触发回复
            }
            lastTriggerTimes[key] = now;
            const randomReplyGroup = replies[Math.floor(Math.random() * replies.length)];
            await sendReplies(session, randomReplyGroup);
            return true;
          }
        }
      }
      return false;
    };

    if (await checkAndSendRandomReply(globalFilePath) || await checkAndSendRandomReply(channelFilePath)) {
      return;
    }
    return next();
  };

  const unescapeHtml = (str) => {
    return str.replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, (match) => {
      const unescapeMap = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#039;': "'"
      };
      return unescapeMap[match];
    });
  };

  const removeLeadingBrackets = (str) => {
    const bracketRegex = /^<[^>]*>\s*/;
    return str.replace(bracketRegex, '').trim();
  };

  if (config.Preposition_middleware) {
    ctx.middleware(middlewareFunction, true); // 使用前置中间件
  } else {
    ctx.middleware(middlewareFunction); // 使用普通中间件
  }
}
exports.apply = apply;