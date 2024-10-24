"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.usage = exports.inject = exports.name = void 0;
const fs = require('node:fs');
const path = require("node:path");
const jrys_json = require("./jrys.json");
const crypto = require("node:crypto");
const { pathToFileURL } = require('node:url');
const { Schema, Logger, h, Random } = require("koishi");
exports.name = 'jrys-prpr';
exports.inject = {
  required: ['puppeteer'],
  optional: ['canvas', "monetary", "database"]
};
exports.usage = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>运势卡片说明</title>
</head>
<body>
<div>
<h1>获取运势卡片 🧧</h1>
<p>发送指令 <code>jrysprpr</code> 即可获取一张个性化的运势卡片。</p>
<p>您还可以使用 <code>--split</code> 选项来获取图文模式的运势，只需发送 <code>jrysprpr -s</code> 即可。</p>
<h3>如果您想获取运势卡的背景图，需要启用<code>原图</code>指令</h3>
<h3>可以直接回复一张已发送的运势卡图片并输入指令 <code>获取原图</code>。</h3>
<p>或者使用 <code>获取原图 ********</code> 来获取对应标识码的背景图。</p>
<p>如果您使用的是QQ官方bot，也可以通过点击markdown运势卡上的“查看原图”按钮来获取。</p>
<hr>
</div>
</body>
</html>
`;
const defaultFortuneProbability =
  [
    { "Fortune": "☆☆☆☆☆☆☆", "luckValue": 0, "Probability": 5 },
    { "Fortune": "★☆☆☆☆☆☆", "luckValue": 14, "Probability": 10 },
    { "Fortune": "★★☆☆☆☆☆", "luckValue": 28, "Probability": 12 },
    { "Fortune": "★★★☆☆☆☆", "luckValue": 42, "Probability": 15 },
    { "Fortune": "★★★★☆☆☆", "luckValue": 56, "Probability": 30 },
    { "Fortune": "★★★★★☆☆", "luckValue": 70, "Probability": 35 },
    { "Fortune": "★★★★★★☆", "luckValue": 84, "Probability": 45 },
    { "Fortune": "★★★★★★★", "luckValue": 98, "Probability": 25 }
  ];
exports.Config =
  Schema.intersect([
    Schema.object({
      command: Schema.string().default('jrysprpr').description("指令自定义"),
      command2: Schema.string().default('查看运势背景图').description("指令自定义"),
      //authority: Schema.number().default(1).description("指令权限设置"),
      GetOriginalImageCommand: Schema.boolean().description("开启后启用`原图`指令，可以获取运势背景原图").default(true),
      autocleanjson: Schema.boolean().description("自动获取原图后，删除对应的json记录信息").default(true),
      GetOriginalImage_Command_HintText: Schema.union([
        Schema.const('1').description('不返回文字提示'),
        Schema.const('2').description('返回文字提示，且为图文消息'),
        Schema.const('3').description('返回文字提示，且为单独发送的文字消息'),
      ]).role('radio').default('2').description("是否返回获取原图的文字提示。开启后，会发送`获取原图，请发送「原图  ******」`这样的文字提示"),
      FortuneProbabilityAdjustmentTable: Schema.array(Schema.object({
        Fortune: Schema.string().description('运势种类'),//.disabled()  // disabled时，Probability拉条拉到0 ，会偶现点不下去的情况，反正就是难交互
        luckValue: Schema.number().description('种类数值').hidden(),
        Probability: Schema.number().role('slider').min(0).max(100).step(1).description('抽取权重'),
      })).role('table').description('运势抽取概率调节表`权重均为0时使用默认配置项`').default(defaultFortuneProbability),
      BackgroundURL: Schema.array(String).description("背景图片，可以写`txt路径（网络图片URL写进txt里）` 或者 `文件夹路径` 或者 `网络图片URL` <br> 建议参考[status-prpr](/market?keyword=status-prpr)与[emojihub-bili](/market?keyword=emojihub-bili)的图片方法 ").role('table')
        .default([
          path.join(__dirname, '/backgroundFolder/魔卡.txt'),
          path.join(__dirname, '/backgroundFolder/ba.txt'),
          path.join(__dirname, '/backgroundFolder/猫羽雫.txt'),
          path.join(__dirname, '/backgroundFolder/miku.txt'),
          path.join(__dirname, '/backgroundFolder/白圣女.txt'),
          //path.join(__dirname, '/backgroundFolder/.txt'),   
        ]),
    }),
    Schema.object({
      HTML_setting: Schema.object({
        UserNameColor: Schema.string().default("rgba(255,255,255,1)").role('color').description('用户名称的颜色').hidden(),    //.hidden(),  暂时用不到了
        MaskColor: Schema.string().default("rgba(0,0,0,0.5)").role('color').description('`蒙版`的颜色'),
        Maskblurs: Schema.number().role('slider').min(0).max(100).step(1).default(10).description('模版模糊半径'),
        HoroscopeTextColor: Schema.string().default("rgba(255,255,255,1)").role('color').description('`运势文字`颜色'),
        luckyStarGradientColor: Schema.boolean().description("开启后`运势星星`使用彩色渐变").default(true),
        HoroscopeDescriptionTextColor: Schema.string().default("rgba(255,255,255,1)").role('color').description('`运势说明文字`颜色'),
        DashedboxThickn: Schema.number().role('slider').min(0).max(20).step(1).default(5).description('`虚线框`的粗细'),
        Dashedboxcolor: Schema.string().default("rgba(255, 255, 255, 0.5)").role('color').description('`虚线框`的颜色'),
        //textfont: Schema.string().description("`请填写.ttf 字体文件的绝对路径`").default(path.join(__dirname, '/font/mark.ttf')),
      }).collapse().description('可自定义各种颜色搭配和字体'),
    }).description('面板调节'),
    Schema.object({
      ///////////////////////////////////////////////JSON按钮////////////////////////////////////////////////////////////////////////////
      JSONswitch: Schema.boolean().description("`总开关，开启后`QQ官方 JSON 配置项才生效<br>不可与 MDswitch 同时开启").default(false),
      json_setting: Schema.object({
        jsonid: Schema.string().description('QQ官方bot 的 json模板ID').pattern(/^\d+_\d+$/),
      }).collapse().description('实现QQ官方bot`再来一张`的按钮效果<br> [适用本插件的QQ官方bot json示例模版 可点击这里参考](https://www.npmjs.com/package/koishi-plugin-jrys-prpr)'),
      ///////////////////////////////////////////////markdown////////////////////////////////////////////////////////////////////////////
      MDswitch: Schema.boolean().description("`总开关，开启后`QQ官方 markdown 配置项才生效<br>此项功能需要 canvas 服务").default(false),
      markdown_setting: Schema.object({
        mdid: Schema.string().description('QQ官方bot 的 MarkDown模板ID').pattern(/^\d+_\d+$/),
        zlmdtext_1: Schema.string().default('text1').description('`指令MD`.`MD参数`MD文字参数--1'),
        zlmdtext_2: Schema.string().default('text2').description('`指令MD`.`MD参数`MD文字参数--2'),
        zltext_1: Schema.array(String).default(["运势来啦~😺", "您的今日运势是：", "这是您的今日运势"]).description('`指令MD`MD显示文字内容--1`每次从下列随机选一个发送`').role('table'),
        zltext_2: Schema.array(String).default(["邦邦咔邦！", "😺😺😺", "哇！"]).description('`指令MD`MD显示文字内容--2`每次从下列随机选一个发送`').role('table'),
        zlmdp_1: Schema.string().default('img').description('`指令MD`.`MD参数`MD图片参数--1 `不需要设定图片宽高`'),
        zlmdp_2: Schema.string().default('url').description('`指令MD`.`MD参数`MD图片参数--2'),
        ButtonText: Schema.string().default('再来一张😺').description('`指令MD`按钮上`再来一张功能`显示的文字'),
        ButtonStyle_Color: Schema.number().role('slider').min(0).max(2).step(1).description('markdown按钮样式'),
      }).collapse().description('实现QQ官方bot`再来一张`的按钮效果，需要`canvas`服务。<br> [适用本插件的QQ官方bot MD示例模版 可点击这里参考](https://www.npmjs.com/package/koishi-plugin-jrys-prpr)'),
      QQchannelId: Schema.string().description('`填入频道ID`，将该频道作为中转频道`必填，作为图床`').experimental().pattern(/^\S+$/),
    }).description('QQ官方bot设置'),
    Schema.object({
      enablecurrency: Schema.boolean().description("开启后，签到获取货币").default(false),
      currency: Schema.string().default('jrysprpr').description('monetary 数据库的 currency 字段名称'),
      maintenanceCostPerUnit: Schema.number().role('slider').min(0).max(1000).step(1).default(100).description("签到获得的货币数量"),
    }).description('monetary·通用货币设置'),
    Schema.object({
      consoleinfo: Schema.boolean().default(false).description("日志调试模式`日常使用无需开启`"),
    }).description('调试功能'),
  ])
exports.logger = new Logger("jrys-prpr");
function apply(ctx, config) {
  const root = path.join(ctx.baseDir, 'data', 'jrys-prpr');
  const jsonFilePath = path.join(root, 'OriginalImageURL_data.json');
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }
  //
  // 检查并创建 JSON 文件
  if (!fs.existsSync(jsonFilePath)) {
    fs.writeFileSync(jsonFilePath, JSON.stringify([]));
  }
  ctx.model.extend("jrysprprdata", {
    userid: "string",
    // 用户ID唯一标识
    channelId: "string",
    // 频道ID
    lastSignIn: "string"
    // 最后签到日期
  }, {
    primary: ["userid", "channelId"]
  });

  var zh_CN_default = {
    commands: {
      [config.command]: {
        description: "查看今日运势",
        messages: {
          Getbackgroundimage: "获取原图，请发送：{0}",
          CurrencyGetbackgroundimage: "签到成功！获得点数: {0}\n获取原图，请发送：{1}",
          CurrencyGetbackgroundimagesplit: "签到成功！获得点数: {0}",
          hasSignedInTodaysplit: "今天已经签到过了，不再获得货币。",
          hasSignedInToday: "今天已经签到过了，不再获得货币。\n获取原图，请发送：{0}",
        }
      },
      [config.command2]: {
        description: "获取运势原图",
        messages: {
          Inputerror: "请回复一张运势图，或者输入运势图的消息ID 以获取原图哦\~",
          QQInputerror: "请输入运势图的消息ID以获取原图哦\~",
          FetchIDfailed: "未能提取到消息ID，请确认回复的消息是否正确。",
          aleadyFetchID: "该消息背景已被获取过啦~ 我已经忘掉了~找不到咯",
          Failedtogetpictures: "获取运势图原图失败，请稍后再试"
        }
      }
    }
  };
  ctx.i18n.define("zh-CN", zh_CN_default);
  function logInfo(message) {
    if (config.consoleinfo) {
      exports.logger.error(message);
    }
  }
  // 删除记录的函数
  async function deleteImageRecord(messageId, imageURL) {
    try {
      const data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
      const index = data.findIndex(record => record.messageId.includes(messageId) && record.backgroundURL === imageURL);
      if (index !== -1) {
        data.splice(index, 1);
        fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2), 'utf-8');
        logInfo(`已删除消息ID ${messageId} 的记录`);
      }
    } catch (error) {
      exports.logger.error("删除记录时出错: ", error);
    }
  }
  if (config.GetOriginalImageCommand) {
    ctx.command(config.command2, { authority: 1 })
      .alias('获取原图')
      .action(async ({ session }, InputmessageId) => {
        try {
          const isQQPlatform = session.platform === 'qq';
          const hasReplyContent = !!session.quote?.content;
          if (!hasReplyContent && !isQQPlatform && !InputmessageId) {
            return session.text(".Inputerror");
          }
          if (isQQPlatform && !InputmessageId) {
            return session.text(".QQInputerror");
          }
          const messageId = hasReplyContent ? session.quote.messageId : InputmessageId;
          logInfo(`尝试获取背景图：\n${messageId}`);
          if (!messageId) {
            return session.text(".FetchIDfailed");
          }
          const originalImageURL = await getOriginalImageURL(messageId);
          logInfo(`运势背景原图链接:\n ${originalImageURL}`);
          if (originalImageURL) {
            await session.send(h.image(originalImageURL));
            if (config.autocleanjson) {
              // 删除对应的JSON记录
              await deleteImageRecord(messageId, originalImageURL);
            }
            return;
          } else if (config.autocleanjson) {
            return session.text(".aleadyFetchID");
          } else {
            return session.text(".FetchIDfailed");
          }
        } catch (error) {
          exports.logger.error("获取运势图原图时出错: ", error);
          return session.text(".Failedtogetpictures");
        }
      });
  }
  ctx.command(config.command, { authority: config.authority || 1 })
    .alias('prpr运势')
    .userFields(["id"])
    .option('split', '-s 以图文输出今日运势')
    .action(async ({ session, options }) => {
      if (options.split) {
        // 如果开启了分离模式，那就只返回图文消息内容。即文字运势内容与背景图片
        const dJson = await getJrys(session);
        let textjrys = `
${dJson.fortuneSummary}
${dJson.luckyStar}\n
${dJson.signText}\n
${dJson.unsignText}\n
`;
        let enablecurrencymessage = "";

        if (config.enablecurrency) {
          if (await hasSignedInToday(ctx, session.userId, session.channelId)) {
            enablecurrencymessage = h.text(session.text(".hasSignedInTodaysplit"))
          } else {
            enablecurrencymessage = h.text(session.text(".CurrencyGetbackgroundimagesplit", [config.maintenanceCostPerUnit]))
          }
        }
        let backgroundImage = getRandomBackground(config);
        let BackgroundURL = backgroundImage.replace(/\\/g, '/');
        let message = [
          h.image(BackgroundURL),
          h.text(textjrys),
          enablecurrencymessage
        ];
        if (config.enablecurrency && !hasSignedInToday(ctx, session.userId, session.channelId)) {
          await updateUserCurrency(session.user.id, config.maintenanceCostPerUnit);
        }
        await recordSignIn(ctx, session.userId, session.channelId)
        await session.send(message);
        return;
      }
      let page;
      try {
        page = await ctx.puppeteer.page();
        await page.setViewport({ width: 1080, height: 1920 });
        let backgroundImage = getRandomBackground(config);
        let BackgroundURL = backgroundImage.replace(/\\/g, '/');
        // 读取 Base64 字体字符串
        const fontPath = path.join(__dirname, '../font/千图马克手写体.txt');
        const fontBase64 = fs.readFileSync(fontPath, 'utf8');  // 从文件中读取 Base64 编码的字体内容
        let insertHTMLuseravatar = session.event.user.avatar;
        let luckyStarHTML = `
.lucky-star {
font-size: 60px; 
margin-bottom: 10px;
}
`;
        if (config.HTML_setting.luckyStarGradientColor) {
          luckyStarHTML = `
.lucky-star {
font-size: 60px;
margin-bottom: 10px;
background: linear-gradient(to right, 
#fcb5b5, 
#fcd6ae, 
#fde8a6,
#c3f7b1, 
#aed6fa, 
#c4aff5, 
#f1afcc);
-webkit-background-clip: text;
background-clip: text;
color: transparent;
}
`;
        }
        const dJson = await getJrys(session);
        const formattedDate = await getFormattedDate();
        let HTMLsource = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>运势卡片</title>
<style>
@font-face {
font-family: "千图马克手写体";
src: url('data:font/ttf;base64,${fontBase64}') format('truetype');
}
body, html {
height: 100%;
margin: 0;
overflow: hidden; 
font-family: "千图马克手写体"; 
}
.background {
background-image: url('${BackgroundURL}');
background-size: cover;
background-position: center;
position: relative;
width: 1080px;
height: 1920px;
}
.overlay {
position: absolute;
bottom: 0;
left: 0;
width: 100%;
min-height: 1%;
background-color: ${config.HTML_setting.MaskColor};
backdrop-filter: blur(${config.HTML_setting.Maskblurs}px);
border-radius: 20px 20px 0 0;
overflow: visible;
}
.user-info {
display: flex;
align-items: center;
padding: 10px 20px;
position: relative;
}
.user-avatar {
width: 120px; 
height: 120px;
border-radius: 60px; 
background-image: url('${insertHTMLuseravatar}');
background-size: cover;
background-position: center;
margin-left: 20px;
position: absolute; 
top: 40px; 
}
.username {
margin-left: 10px; 
color: ${config.HTML_setting.UserNameColor};
font-size: 50px; 
padding-top: 28px; 
}
.fortune-info1 {
display: flex;
color: ${config.HTML_setting.HoroscopeTextColor};
flex-direction: column;
align-items: center;
position: relative;
width: 100%; 
justify-content: center; /* 居中 */
margin-top: 0px; /* 上边距 */
}
.fortune-info1 > * {
margin: 10px; /* 元素之间的间距 */
}
.fortune-info2 {
color: ${config.HTML_setting.HoroscopeDescriptionTextColor};
padding: 0 20px;
margin-top: 40px; 
}
.lucky-star, .sign-text, .unsign-text {
margin-bottom: 12px;
font-size: 42px;
}
.fortune-summary {
font-size: 60px; 
}
${luckyStarHTML}
.sign-text, .unsign-text {
font-size: 32px;
line-height: 1.6;
padding: 10px;
border: ${config.HTML_setting.DashedboxThickn}px dashed ${config.HTML_setting.Dashedboxcolor};
border-radius: 15px;
margin-top: 10px;
}
.today-text {
font-size: 45px;
margin-bottom: 10px;
background: linear-gradient(to right, 
#fcb5b5, 
#fcd6ae, 
#fde8a6,
#c3f7b1, 
#aed6fa, 
#c4aff5, 
#f1afcc);
-webkit-background-clip: text;
background-clip: text;
color: transparent;
}
</style>
</head>
<body>
<div class="background">
<div class="overlay">
<div class="user-info">
<div class="user-avatar"></div>
<!--span class="username">上学大人</span-->
</div>
<div class="fortune-info1">
<div class="today-text">${formattedDate}</div>
<div class="fortune-summary">${dJson.fortuneSummary}</div>
<div class="lucky-star">${dJson.luckyStar}</div>
</div>
<div class="fortune-info2">           
<div class="sign-text">${dJson.signText}</div>
<div class="unsign-text">
${dJson.unsignText}
</div>
<!-- 不要迷信哦 -->
<div style="text-align: center; font-size: 24px; margin-bottom: 15px;">
仅供娱乐 | 相信科学 | 请勿迷信
</div>
</div>
</div>
</div>
</body>
</html>
`;
        logInfo(`触发用户: ${session.event.user?.id}`);
        if (session.platform === 'qq') {
          logInfo(`QQ官方：bot: ${session.bot.config.id}`);
          logInfo(`QQ官方：用户头像: http://q.qlogo.cn/qqapp/${session.bot.config.id}/${session.event.user?.id}/640`);
        }
        logInfo(`使用背景URL: ${BackgroundURL}`);
        logInfo(`蒙版颜色: ${config.HTML_setting.MaskColor}`);
        logInfo(`虚线框粗细: ${config.HTML_setting.DashedboxThickn}`);
        logInfo(`虚线框颜色: ${config.HTML_setting.Dashedboxcolor}`);
        await page.setContent(HTMLsource);
        // 等待网络空闲
        await page.waitForNetworkIdle();
        const element = await page.$('body');
        const imageBuffer = await element.screenshot({ encoding: "binary" });
        const encodeTimestamp = (timestamp) => {
          // 将日期和时间部分分开
          let [date, time] = timestamp.split('T');
          // 替换一些字符
          date = date.replace(/-/g, '');
          time = time.replace(/:/g, '').replace(/\..*/, ''); // 去掉毫秒部分
          // 加入随机数
          const randomNum = Math.floor(Math.random() * 10000); // 生成一个0到9999的随机数
          // 重排字符顺序
          return `${time}${date}${randomNum}`;
        };

        if (config.enablecurrency && !hasSignedInToday(ctx, session.userId, session.channelId)) {
          await updateUserCurrency(session.user.id, config.maintenanceCostPerUnit);
        }
        // 发送图片消息并处理响应
        const sendImageMessage = async (imageBuffer) => {
          let sentMessage;
          //let markdownmessageId;
          const messageTime = new Date().toISOString(); // 获取当前时间的ISO格式
          const encodedMessageTime = encodeTimestamp(messageTime); // 对时间戳进行简单编码
          if (config.MDswitch && !config.JSONswitch && config.markdown_setting.mdid && session.platform === 'qq') {
            // 保存截图并上传
            const screenshotPath = path.resolve(__dirname, 'temp_screenshot.png');
            fs.writeFileSync(screenshotPath, imageBuffer);
            const uploadedImageURL = await uploadImageToChannel(screenshotPath, session.bot.config.id, session.bot.config.secret, config.QQchannelId);
            const qqmarkdownmessage = await markdown(session, uploadedImageURL.url, encodedMessageTime);
            //logInfo(session.event.guild?.id)  // 是群聊，markdown  
            //sentMessage = await session.qq.sendMessage(session.channelId, qqmarkdownmessage);
            if (session.event.guild?.id) {
              sentMessage = await session.qq.sendMessage(session.channelId, qqmarkdownmessage);
            } else {
              sentMessage = await session.qq.sendPrivateMessage(session.event.user?.id, qqmarkdownmessage);
            }
          } else {
            // 根据不同的配置发送不同类型的消息
            const imageMessage = h.image(imageBuffer, "image/png");
            switch (config.GetOriginalImage_Command_HintText) {
              case '2': // 返回文字提示，且为图文消息
                const hintText2_encodedMessageTime = `${config.command2} ${encodedMessageTime}`;
                let hintText2;
                if (config.enablecurrency) {
                  if (!hasSignedInToday(ctx, session.userId, session.channelId)) {
                    hintText2 = session.text(".CurrencyGetbackgroundimage", [config.maintenanceCostPerUnit, hintText2_encodedMessageTime]);
                  } else {
                    hintText2 = session.text(".hasSignedInToday", [hintText2_encodedMessageTime]);
                  }
                } else {
                  hintText2 = session.text(".Getbackgroundimage", [hintText2_encodedMessageTime]);
                }
                const combinedMessage2 = `${imageMessage}\n${hintText2}`;
                logInfo(`获取原图：\n${encodedMessageTime}`);
                sentMessage = await session.send(combinedMessage2);
                break;
              case '3': // 返回文字提示，且为单独发送的文字消息
                const hintText3_encodedMessageTime = `${config.command2} ${encodedMessageTime}`;
                let hintText3;
                if (config.enablecurrency) {
                  if (!hasSignedInToday(ctx, session.userId, session.channelId)) {
                    hintText2 = session.text(".CurrencyGetbackgroundimage", [config.maintenanceCostPerUnit, hintText3_encodedMessageTime]);
                  } else {
                    hintText2 = session.text(".hasSignedInToday", [hintText3_encodedMessageTime]);
                  }
                } else {
                  hintText2 = session.text(".Getbackgroundimage", [hintText3_encodedMessageTime]);
                }
                logInfo(`获取原图：\n${encodedMessageTime}`);
                sentMessage = await session.send(imageMessage); // 先发送图片消息
                await session.send(hintText3); // 再单独发送提示
                break;
              default: '1'//不返回文字提示，只发送图片
                sentMessage = await session.send(imageMessage);
                break;
            }
          }
          if (config.JSONswitch && config.json_setting.jsonid && session.platform === 'qq') {
            let markdownMessage = {
              msg_id: session.event.message.id,
              msg_type: 2,
              content: "", // content可传入不进去哦~  只能发按钮
              keyboard: {
                id: config.json_setting.jsonid
              },
            }
            if (session.event.guild?.id) {
              await session.qq.sendMessage(session.channelId, markdownMessage);
            } else {
              await session.qq.sendPrivateMessage(session.event.user?.id, markdownMessage);
            }

          }

          // 记录日志
          if (config.consoleinfo && !session.platform === 'qq') {
            if (Array.isArray(sentMessage)) {
              sentMessage.forEach((messageId, index) => {
                exports.logger.info(`发送图片消息ID [${index}]: ${messageId}`);
              });
            } else {
              exports.logger.info(`发送的消息对象: ${JSON.stringify(sentMessage, null, 2)}`);
            }
          }
          // 记录消息ID和背景图URL到JSON文件
          if (config.GetOriginalImageCommand) {
            const imageData = {
              // 使用 encodedMessageTime 作为唯一标识符的一部分
              messageId: session.platform === 'qq' ? [encodedMessageTime] : (Array.isArray(sentMessage) ? sentMessage : [sentMessage]),
              messageTime: encodedMessageTime, // 使用预先获取的时间戳
              backgroundURL: BackgroundURL
            };
            try {
              let data = [];
              if (fs.existsSync(jsonFilePath)) {
                // 读取JSON文件内容
                const fileContent = fs.readFileSync(jsonFilePath, 'utf8');
                if (fileContent.trim()) {
                  data = JSON.parse(fileContent);
                }
              }
              // 检查数据是否已存在
              const exists = data.some(item => item.messageId.includes(imageData.messageId));
              if (!exists) {
                // 添加新数据
                data.push(imageData);
                fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2));
              }
            } catch (error) {
              exports.logger.error(`处理JSON文件时出错 [${encodedMessageTime}]: `, error); // 记录错误信息并包含时间戳
            }
          }
          return sentMessage;
        };
        await recordSignIn(ctx, session.userId, session.channelId)
        // 调用函数发送消息
        await sendImageMessage(imageBuffer);
      } catch (e) {
        const errorTime = new Date().toISOString(); // 获取错误发生时间的ISO格式
        exports.logger.error(`状态渲染失败 [${errorTime}]: `, e); // 记录错误信息并包含时间戳
        return "渲染失败" + e.message;
      } finally {
        page?.close();
      }
    });
  async function uploadImageToChannel(data, appId, secret, channelId) {
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
      if (fs.existsSync(data)) {
        data = fs.readFileSync(data);
      } else {
        data = await ctx.http.file(data, { responseType: 'arraybuffer' });
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
    if (channelId !== undefined && config.consoleinfo) {
      exports.logger.info(`使用本地图片*QQ频道  发送URL为： https://gchat.qpic.cn/qmeetpic/0/0-0-${md5}/0`)
    };
    return { url: `https://gchat.qpic.cn/qmeetpic/0/0-0-${md5}/0` };
  }
  async function markdown(session, imageUrl, messageIdOrTime) {
    //imageUrl = "https://i0.hdslb.com/bfs/article/bd7aeef3c2811fcedbe6fc0ca6a20671354558777.gif" 调试放大px的调试URL
    const mdid = config.markdown_setting.mdid;
    const mdkey1 = config.markdown_setting.zlmdp_1;
    const mdkey2 = config.markdown_setting.zlmdp_2;
    const zltext_1_options = config.markdown_setting.zltext_1;
    const zltext_2_options = config.markdown_setting.zltext_2;
    const zltext_1 = zltext_1_options[Math.floor(Math.random() * zltext_1_options.length)];
    const zltext_2 = zltext_2_options[Math.floor(Math.random() * zltext_2_options.length)];
    let zlmdtext_1 = config.markdown_setting.zlmdtext_1;
    let zlmdtext_2 = config.markdown_setting.zlmdtext_2;
    const ButtonText = config.markdown_setting.ButtonText;
    const ButtonStyle_Color = config.markdown_setting.ButtonStyle_Color
    const canvasimage = await ctx.canvas.loadImage(imageUrl);
    let originalWidth = canvasimage.naturalWidth || canvasimage.width;
    let originalHeight = canvasimage.naturalHeight || canvasimage.height;
    return {
      msg_type: 2,
      msg_id: session.messageId,
      markdown: {
        custom_template_id: mdid, //md的模版id
        params: [
          {
            key: zlmdtext_1,
            values: [`${zltext_1}`],//这是第一段文字
          },
          {
            key: zlmdtext_2,
            values: [`${zltext_2}`],//这是第二段文字
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
        content: {
          rows: [
            {
              buttons: [
                {
                  render_data: { label: `${ButtonText}`, style: ButtonStyle_Color },// 按钮显示的文字。style是按钮样式，有0、1、2
                  action: {
                    type: 2, // 指令按钮
                    permission: { type: 2 }, // 所有人可点击
                    data: `/${config.command}`, // 点击后发送
                    enter: true, // 若 false 则填入输入框
                  },
                },
                {
                  render_data: { label: `查看原图`, style: ButtonStyle_Color },// 按钮显示的文字。style是按钮样式，有0、1、2
                  action: {
                    type: 2, // 指令按钮
                    permission: { type: 2 }, // 所有人可点击
                    data: `/${config.command2} ${messageIdOrTime}`, // 点击后发送
                    enter: true, // 若 false 则填入输入框
                  },
                },
              ]
            },
          ],
        },
      },
    }
  }
  function getRandomBackground(config) {
    let backgroundPath = config.BackgroundURL[Math.floor(Math.random() * config.BackgroundURL.length)];
    // 网络URL
    if (backgroundPath.includes('http://') || backgroundPath.includes('https://')) {
      return backgroundPath;
    }
    // 文本文件路径
    else if (backgroundPath.includes('.txt')) {
      let lines = fs.readFileSync(backgroundPath, 'utf-8').split('\n').filter(Boolean);
      let randomLine = lines[Math.floor(Math.random() * lines.length)].trim().replace(/\\/g, '/');
      return randomLine;
    }
    // 本地文件夹路径
    else {
      const files = fs.readdirSync(backgroundPath)
        .filter(file => /\.(jpg|png|gif|bmp|webp)$/i.test(file));
      if (files.length === 0) {
        throw new Error("文件夹中未找到有效图片文件");
      }
      let randomFile = files[Math.floor(Math.random() * files.length)];
      let fullPath = path.join(backgroundPath, randomFile).replace(/\\/g, '/');
      const imageURL = pathToFileURL(fullPath).href;
      return imageURL;
    }
  }
  // 定义获取原图URL的函数
  async function getOriginalImageURL(messageIdOrTime) {
    try {
      // 使用 fs.promises 读取JSON文件内容      
      //const jsonFilePath = path.join(root, 'OriginalImageURL_data.json');
      const data = await fs.promises.readFile(jsonFilePath, { encoding: 'utf-8' });
      const images = JSON.parse(data);
      // 确保输入参数为字符串
      const input = messageIdOrTime.toString();
      // 检查输入参数是消息ID还是时间戳
      const isTimestamp = /^\d{15,}$/.test(input);
      // 定义变量来存储匹配结果
      let matchedImage = null;
      // 查找对应的背景图URL
      for (const image of images) {
        if (isTimestamp) {
          // 匹配时间戳
          if (image.messageTime === input) {
            matchedImage = image;
            break;
          }
        } else {
          // 匹配消息ID
          if (Array.isArray(image.messageId) && image.messageId.includes(input)) {
            matchedImage = image;
            break;
          }
          // 处理 messageId 是空字符串的情况
          if (image.messageId.length === 0 && image.messageTime === input) {
            matchedImage = image;
            break;
          }
        }
      }
      // 返回匹配的背景图URL
      if (matchedImage) {
        return matchedImage.backgroundURL;
      } else {
        // 如果未找到对应的URL，返回null
        return null;
      }
    } catch (error) {
      exports.logger.error('读取或解析JSON文件时出错: ', error);
      throw error;
    }
  }
  async function getJrys(session) {
    const md5 = crypto.createHash('md5');
    const hash = crypto.createHash('sha256');
    // 获取当前时间
    let now = new Date();
    let etime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); // 使用当天的0点时间戳
    let userId;
    // 获取用户ID
    if (!isNaN(Number(session.event.user.id))) {
      userId = session.event.user.id;
    } else if (session.event.user.id) {
      hash.update(session.event.user.id + String(etime));
      const hashHexDigest = hash.digest('hex');
      userId = Number(parseInt(hashHexDigest, 16)) % 1000000001;
    } else {
      md5.update(session.username + String(etime));
      const hexDigest = md5.digest('hex');
      userId = parseInt(hexDigest, 16) % 1000000001;
    }
    // 获取运势概率表
    let fortuneProbabilityTable = config.FortuneProbabilityAdjustmentTable || defaultFortuneProbability;
    // 检查所有概率是否都为0，如果是则使用默认配置
    const allProbabilitiesZero = fortuneProbabilityTable.every(entry => entry.Probability === 0);
    if (allProbabilitiesZero) {
      fortuneProbabilityTable = defaultFortuneProbability;
    }
    // 使用种子来确保随机结果的一致性
    const seedInput = String(userId) + String(etime) + now.toDateString(); // 加入当前日期字符串
    const seed = parseInt(md5.update(seedInput).digest('hex').slice(0, 8), 16);
    const random = new Random(() => (seed / 0xffffffff));
    // 使用 Random.weightedPick 选择运势
    const weights = {};
    fortuneProbabilityTable.forEach(entry => {
      if (entry.Probability > 0) {
        weights[entry.luckValue] = entry.Probability;
      }
    });
    const fortuneCategory = random.weightedPick(weights);
    const todayJrys = jrys_json[fortuneCategory];
    // 随机选择当前幸运值类别下的一个文案
    const randomIndex = (((etime / 100000) * userId % 1000001) * 2333) % todayJrys.length;
    logInfo(`今日运势文案:\n ${JSON.stringify(todayJrys[randomIndex], null, 2)}`);
    return new Promise(resolve => {
      resolve(todayJrys[randomIndex]);
    });
  }
  async function getFormattedDate() {
    const today = new Date();
    let year = today.getFullYear();  // 获取年份
    let month = today.getMonth() + 1;  // 获取月份，月份是从0开始的，所以需要加1
    let day = today.getDate();  // 获取日
    // 格式化日期
    month = month < 10 ? '0' + month : month;
    day = day < 10 ? '0' + day : day;
    let formattedDate = `${year}/${month}/${day}`;
    return formattedDate;
  }
  async function updateUserCurrency(uid, amount, currency = config.currency) {
    try {
      const numericUserId = Number(uid); // 将 userId 转换为数字类型

      //  通过 ctx.monetary.gain 为用户增加货币，
      //  或者使用相应的 ctx.monetary.cost 来减少货币
      if (amount > 0) {
        await ctx.monetary.gain(numericUserId, amount, currency);
        logInfo(`为用户 ${uid} 增加了 ${amount} ${currency}`);
      } else if (amount < 0) {
        await ctx.monetary.cost(numericUserId, -amount, currency);
        logInfo(`为用户 ${uid} 减少了 ${-amount} ${currency}`);
      }

      return `用户 ${uid} 成功更新了 ${Math.abs(amount)} ${currency}`;
    } catch (error) {
      ctx.logger.error(`更新用户 ${uid} 的货币时出错: ${error}`);
      return `更新用户 ${uid} 的货币时出现问题。`;
    }
  }
  async function getUserCurrency(uid, currency = config.currency) {
    try {
      const numericUserId = Number(uid);
      const [data] = await ctx.database.get('monetary', {
        uid: numericUserId,
        currency,
      }, ['value']);

      return data ? data.value : 0;
    } catch (error) {
      ctx.logger.error(`获取用户 ${uid} 的货币时出错: ${error}`);
      return 0; // Return 0 
    }
  }
  async function updateIDbyuserId(userId, platform) {
    // 查询数据库的 binding 表
    const [bindingRecord] = await ctx.database.get('binding', {
      pid: userId,
      platform: platform,
    });

    // 检查是否找到了匹配的记录
    if (!bindingRecord) {
      throw new Error('未找到对应的用户记录。');
    }

    // 返回 aid 字段作为对应的 id
    return bindingRecord.aid;
  }
  // 记录用户签到时间
  async function recordSignIn(ctx, userId, channelId) {
    const currentTime = new Date();
    const dateString = currentTime.toISOString().split('T')[0]; // 获取当前日期字符串

    const [record] = await ctx.database.get('jrysprprdata', { userid: userId, channelId });

    if (record) {
      // 更新用户签到时间
      await ctx.database.set('jrysprprdata', { userid: userId, channelId }, { lastSignIn: dateString });
    } else {
      // 创建新的签到记录
      await ctx.database.create('jrysprprdata', { userid: userId, channelId, lastSignIn: dateString });
    }
  }
  // 检查用户是否已签到
  async function hasSignedInToday(ctx, userId, channelId) {
    const currentTime = new Date();
    const dateString = currentTime.toISOString().split('T')[0]; // 获取当前日期字符串

    const [record] = await ctx.database.get('jrysprprdata', { userid: userId, channelId });

    if (record) {
      // 检查最后签到日期是否是今天
      return record.lastSignIn === dateString;
    }

    // 如果没有记录，表示未签到
    return false;
  }
}
exports.apply = apply;