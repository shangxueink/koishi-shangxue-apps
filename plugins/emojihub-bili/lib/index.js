"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.usage = exports.inject = exports.name = void 0;
const fs = require('node:fs');
const url = require("node:url");
const path = require("node:path");
const crypto = require("node:crypto");
const { Schema, Logger, h, Universal } = require("koishi");
exports.inject = {
  optional: ['canvas', "cron"]
};
exports.name = 'emojihub-bili';
exports.reusable = true; // 声明此插件可重用
exports.usage = `
<h2><a href="https://www.npmjs.com/package/koishi-plugin-emojihub-bili" target="_blank">如何额外添加自己喜欢的表情包</a></h2>
<p>添加额外的表情包到 <strong>EmojiHub-bili</strong> 中非常简单！只需按照以下步骤操作：</p>
<ol>
<li><strong>安装扩展（用户脚本管理器）</strong>：<br>在浏览器中添加扩展：<a href="https://docs.scriptcat.org/" target="_blank">ScriptCat---脚本猫</a>。</li>
<li><strong>安装脚本</strong>：<br>在用户脚本管理器中添加脚本：<a href="https://greasyfork.org/zh-CN/scripts/521666-bilibili%E4%B8%93%E6%A0%8F%E5%8E%9F%E5%9B%BE%E9%93%BE%E6%8E%A5%E6%8F%90%E5%8F%962024%E6%94%B9%E7%89%88" target="_blank">（点击右侧文字查看）Bilibili专栏原图链接提取2024改版</a>。</li>
<li><strong>搜索表情包</strong>：<br>开启扩展后，打开<a href="https://search.bilibili.com/article/" target="_blank">哔哩哔哩专栏搜索</a>，在专栏中搜索您需要的表情包。</li>
<li><strong>提取链接</strong>：<br>点击进入具体的某个专栏帖子，屏幕靠近右下角会有一个绿色的【提取链接】按钮。点击该按钮，即可下载包含当前专栏所有图片的 URL 的 txt 文件。并且按下一次后会变成红色，防止误触，不可二次触发。如需再次下载，请刷新页面。</li>
<li><strong>配置 EmojiHub-bili</strong>：<br>将同一类表情包图片的 URL 整合到同一个 txt 文件中。然后，在 Koishi 的配置项中填入相应的指令名称与 txt 文件路径。（无需像自带的txt一样省略前缀，写完整URL即可）</li>
<li><strong>保存并重载</strong>：<br>完成配置后，保存您的配置并重载插件，您就可以使用自定义的指令发送表情包啦！🌟📚</li>
</ol>
<p> </p>
<h2>温馨提示：</h2>
<p><br>请勿将自定义的txt文件与本插件放置在同一目录下，以免插件更新导致文件丢失。</p>
<p>目前EmojiHub-bili默认提供 <code>43套</code> 表情包。若您的配置内容有误差，请点击 <code>MoreEmojiHubList</code> 表格右上角按钮内的 <code>恢复默认值</code>。</p>
<p>若开启插件后，指令不出现，<a href="/market?keyword=commands">请重新开关commands插件</a></p>
`;
const logger = new Logger('emojihub-bili');
const defaultMoreEmojiHubList = [
  // 下面实际有效为 43套
  { command: '随机emojihub表情包', source_url: "无效路径/内容会调用随机表情包。注意与【随机表情包】指令的功能一致，但【随机表情包】不可被填入表格使用，【随机emojihub表情包】可以，因为在这个配置项里。" },
  { command: '本地图库示例', source_url: path.join(__dirname, 'txts') },
  { command: '网络图片示例', source_url: 'https://i0.hdslb.com/bfs/article/afc31d0e398204d94478473a497028e6352074746.gif' },
  { command: '2233娘小剧场表情包', source_url: path.join(__dirname, '../txts/2233娘小剧场.txt') },
  { command: 'acomu414表情包', source_url: path.join(__dirname, '../txts/acomu414.txt') },
  { command: 'ba表情包', source_url: path.join(__dirname, '../txts/ba.txt') },
  { command: 'capoo表情包', source_url: path.join(__dirname, '../txts/capoo.txt') },
  { command: 'chiikawa表情包', source_url: path.join(__dirname, '../txts/chiikawa.txt') },
  { command: 'downvote表情包', source_url: path.join(__dirname, '../txts/Downvote.txt') },
  { command: 'doro表情包', source_url: path.join(__dirname, '../txts/doro.txt') },
  { command: 'eveonecat表情包', source_url: path.join(__dirname, '../txts/eveonecat.txt') },
  { command: 'fufu表情包', source_url: path.join(__dirname, '../txts/fufu.txt') },
  { command: 'girlsbandcry', source_url: path.join(__dirname, '../txts/GirlsBandCry.txt') },
  { command: 'kemomimi表情包', source_url: path.join(__dirname, '../txts/kemomimi酱表情包.txt') },
  { command: 'koishi-meme表情包', source_url: path.join(__dirname, '../txts/koimeme.txt') },
  { command: 'mygo表情包', source_url: path.join(__dirname, '../txts/mygo.txt') },
  { command: 'seseren表情包', source_url: path.join(__dirname, '../txts/seseren.txt') },
  { command: '阿夸表情包', source_url: path.join(__dirname, '../txts/阿夸.txt') },
  { command: '阿尼亚表情包', source_url: path.join(__dirname, '../txts/阿尼亚.txt') },
  { command: '白圣女表情包', source_url: path.join(__dirname, '../txts/白圣女.txt') },
  { command: '白圣女漫画表情包', source_url: path.join(__dirname, '../txts/白圣女黑白.txt') },
  { command: '败犬女主表情包', source_url: path.join(__dirname, '../txts/败犬女主.txt') },
  { command: '柴郡表情包', source_url: path.join(__dirname, '../txts/柴郡.txt') },
  { command: '初音Q版表情包', source_url: path.join(__dirname, '../txts/初音未来Q.txt') },
  { command: '甘城猫猫表情包', source_url: path.join(__dirname, '../txts/甘城猫猫.txt') },
  { command: '孤独摇滚表情包', source_url: path.join(__dirname, '../txts/孤独摇滚.txt') },
  { command: '狗妈表情包', source_url: path.join(__dirname, '../txts/狗妈.txt') },
  { command: '滑稽表情包', source_url: path.join(__dirname, '../txts/滑稽.txt') },
  { command: '疾旋鼬表情包', source_url: path.join(__dirname, '../txts/疾旋鼬.txt') },
  { command: '卡拉彼丘表情包', source_url: path.join(__dirname, '../txts/卡拉彼丘.txt') },
  { command: '流萤表情包', source_url: path.join(__dirname, '../txts/流萤.txt') },
  { command: '龙图表情包', source_url: path.join(__dirname, '../txts/龙图.txt') },
  { command: '鹿乃子表情包', source_url: path.join(__dirname, '../txts/鹿乃子.txt') },
  { command: '玛丽猫表情包', source_url: path.join(__dirname, '../txts/玛丽猫.txt') },
  { command: '小c表情包', source_url: path.join(__dirname, '../txts/蜜汁工坊.txt') },
  { command: '男娘武器库表情包', source_url: path.join(__dirname, '../txts/男娘武器库.txt') },
  { command: '千恋万花表情包', source_url: path.join(__dirname, '../txts/0721.txt') },
  { command: '赛马娘表情包', source_url: path.join(__dirname, '../txts/赛马娘.txt') },
  { command: '瑟莉亚表情包', source_url: path.join(__dirname, '../txts/瑟莉亚.txt') },
  { command: '藤田琴音表情包', source_url: path.join(__dirname, '../txts/藤田琴音.txt') },
  { command: '小黑子表情包', source_url: path.join(__dirname, '../txts/小黑子.txt') },
  { command: '心海表情包', source_url: path.join(__dirname, '../txts/心海.txt') },
  { command: '绪山真寻表情包', source_url: path.join(__dirname, '../txts/绪山真寻.txt') },
  { command: '亚托莉表情包', source_url: path.join(__dirname, '../txts/亚托莉表情包.txt') },
  { command: '永雏小菲表情包', source_url: path.join(__dirname, '../txts/永雏小菲.txt') },
  { command: '宇佐紀表情包', source_url: path.join(__dirname, '../txts/宇佐紀.txt') },
  // { command: '', source_url: path.join(__dirname, '../txts/.txt') },
  // 以后添加其他的命令...未完待续
];

exports.Config = Schema.intersect([

  Schema.object({
    emojihub_bili_command: Schema.string().default('emojihub-bili').description('`父级指令`的指令名称').pattern(/^\S+$/),
    emojihub_onemore: Schema.string().default('再来一张').description('`再来一张`的指令名称').pattern(/^\S+$/),
    emojihub_randompic: Schema.string().default('随机表情包').description('`随机表情包`的指令名称').pattern(/^\S+$/),

    MoreEmojiHubList: Schema.array(Schema.object({
      command: Schema.string().description('注册的指令名称'),
      source_url: Schema.string().description('表情包文件地址'),
    })).role('table').default(defaultMoreEmojiHubList)
      .description('表情包指令映射表<br>▶ 若丢失了旧版本`MoreEmojiHub`配置 请先回退到 1.3.0 版本<br>▶ 若出现配置问题 请点击右方按钮 可以恢复到默认值<br>右列`文件地址`可以填入`txt绝对路径`、`文件夹绝对路径`、`图片直链`、`图片文件绝对路径`。支持格式 详见[➩项目README](https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/emojihub-bili)'),

    deleteMsg: Schema.boolean().description("`开启后`自动撤回表情").default(false),

    optionsname: Schema.string().description('多图返回的 选项名称').default("n"),
    maxexecutetime: Schema.number().description('`-n 选项`指定 允许单次返回的 表情包最大数<br>例如默认10 ：`ba表情包 -n 30`，可以返回10张').default(10),
  }).description('表情包设置'),

  Schema.union([
    Schema.object({
      deleteMsg: Schema.const(true).required(),
      deleteMsgtime: Schema.number().default(30).description('若干`秒`后 撤回表情').min(1),
    }),
    Schema.object({}),
  ]),

  Schema.object({
    repeatCommandDifferentiation: Schema.union([
      Schema.const('channelId').description('按频道ID区分'),
      Schema.const('userId').description('按用户ID区分'),
    ]).role('radio').default("channelId").description('`再来一张`指令的区分逻辑。<br>按频道ID区分：触发指令后发送当前频道最后触发的表情包<br>按用户ID区分：触发指令后发送当前用户最后触发的表情包'),

    searchSubfolders: Schema.boolean().description("本地发图，输入文件名称参数时，是否递归搜索文件夹。<br>`开启后 对于本地文件夹地址 会搜索其子文件夹内全部的图片`").default(true),
    searchSubfoldersWithfilename: Schema.boolean().description("递归搜索时，是否把`子文件夹`的名称纳入名称匹配范围<br>例如：`C:/中文/456.png`被视作`中文456.png`文件名处理匹配").default(false),
    localPictureToName: Schema.string().role('textarea', { rows: [4, 4] })
      .description("对于本地图片/文件，是否输出文件名<br>仅图片：`${IMAGE}`<br>图+文件名：`${IMAGE}\\n${NAME}`<br>文件名+图：`${NAME}\\n${IMAGE}`<br>文本+变量：`今天你的幸运神：${NAME}\\n${IMAGE}`<br>全部变量示例：`${IMAGE}\\n文件名称：${NAME}\\n文件大小：${SIZE}\\n修改日期：${TIME}\\n文件路径：${PATH}`<br>其中`\\n`就是换行，可以写字也可以直接回车。<br>可用替换变量有：IMAGE、 NAME、 SIZE、 TIME、 PATH<br>仅对指令发送本地图片有效。<br>更多说明，详见[➩项目README](https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/emojihub-bili)")
      .default("${IMAGE}"),
  }).description('进阶设置'),

  Schema.object({
    autoEmoji: Schema.union(["取消应用", '定量消息发送', '定时发送']).description("打开后，开启自动表情包功能 <br>▶ 定量消息发送: `达到一定消息数量 自动触发表情包`<br>▶ 定时发送: `使用cron表达式定时触发表情包`此项需要`cron`服务").default("取消应用"),
  }).description('自动表情包设置'),
  Schema.union([
    Schema.object({
      autoEmoji: Schema.const("定量消息发送").required(),
      middleware: Schema.boolean().description('开启后使用前置中间件').default(true),
      triggerprobability: Schema.percent().default(0.8).description('达到消息数量阈值时，发送表情包的概率 `范围为 0 到 1 `'),
      groupListmapping: Schema.array(Schema.object({
        groupList: Schema.string().description('开启自动表情包的群组ID'),
        defaultemojicommand: Schema.string().description('表情包指令名称 `应与上方指令表格对应`'),
        count: Schema.number().description('触发自动表情包的消息数量的阈值').default(30),
        enable: Schema.boolean().description('勾选后 屏蔽该群 的自动表情包').default(false),
      })).role('table').description('表情包指令映射 `注意群组ID不要多空格什么的`<br>私聊频道有`private:`前缀<br>表情包名称请通过逗号分隔')
        .default([
          {
            "groupList": "114514",
            "defaultemojicommand": "koishi-meme，白圣女表情包，男娘武器库",
            "enable": false
          },
          {
            "groupList": "private:1919810",
            "defaultemojicommand": "随机emojihub表情包",
            "enable": true
          }
        ]),
      allgroupautoEmoji: Schema.boolean().description("`全部群组` 开启自动表情包").default(false),
      count: Schema.number().description('`全部群组` 触发自动表情包的消息数量的阈值').default(30),
      allgroupemojicommand: Schema.string().role('textarea', { rows: [2, 4] })
        .description('`全部群组的` 表情包指令映射`一行一个指令 或者 逗号分隔`   <br> 可以同时在`groupListmapping`指定群组的表情包内容').default(`宇佐紀表情包\n白圣女表情包\n白圣女漫画表情包`),
    }),
    Schema.object({
      autoEmoji: Schema.const("定时发送").required(),
      botId: Schema.string().description('定时消息由哪个bot发出？▶ 填入bot对应的Id'),
      triggerprobability: Schema.percent().default(0.8).description('达到预定时间时，发送表情包的概率 `范围为 0 到 1 `'),
      groupListmapping: Schema.array(Schema.object({
        groupList: Schema.string().description('开启自动表情包的群组ID'),
        defaultemojicommand: Schema.string().description('表情包指令名称 `应与上方指令表格对应`'),
        cronTime: Schema.string().description('定时设置:cron语法'),
        enable: Schema.boolean().description('勾选后 屏蔽该群 的自动表情包').default(false),
      })).role('table').description('表情包指令映射 `注意群组ID不要多空格什么的`<br>私聊频道有`private:`前缀<br>表情包名称请通过逗号分隔<br>▶ cron 定时语法 见 https://cron.koishi.chat/')
        .default([
          {
            "groupList": "114514",
            "defaultemojicommand": "白圣女表情包，白圣女漫画表情包",
            "enable": false,
            "cronTime": "15,45 * * * *"
          },
          {
            "groupList": "private:1919810",
            "defaultemojicommand": "白圣女表情包",
            "enable": true,
            "cronTime": "15,45 * * * *"
          }
        ]),
    }),
    Schema.object({}),
  ]),


  Schema.object({
    markdown_button_mode: Schema.union([
      Schema.const('unset').description('取消应用此配置项'),
      Schema.const('json').description('json按钮-----------20 群（频道不可用）'),
      Schema.const('markdown').description('被动md模板--------2000 DAU / 私域'),
      Schema.const('markdown_raw_json').description('被动md模板--------2000 DAU - 原生按钮'),
      Schema.const('raw').description('原生md------------10000 DAU'),
    ]).role('radio').description('markdown/按钮模式选择').default("unset"),
  }).description('QQ官方按钮设置'),
  Schema.union([
    Schema.object({
      markdown_button_mode: Schema.const("json").required(),
      markdown_button_mode_initiative: Schema.boolean().description("开启后，使用 主动消息 发送markdown。<br>即开启后不带`messageId`发送<br>适用于私域机器人频道使用。私域机器人需要使用`被动md模板、json模板`并且开启此配置项").default(false),
      markdown_button_mode_keyboard: Schema.boolean().description("开启后，markdown加上按钮。关闭后，不加按钮内容哦<br>不影响markdown发送，多用于调试功能使用").default(true).experimental(),
      markdown_button_mode_without_emojilist_keyboard: Schema.boolean().description("开启后，表情包列表使用下方`nestedlist`配置的表情包列表按钮。关闭后，仅发送普通的文字列表").default(true).experimental(),

      nested: Schema.object({
        json_button_template_id: Schema.string().description("模板ID<br>形如 `123456789_1234567890` 的ID编号<br>更多说明，详见[➩项目README](https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/emojihub-bili)").pattern(/^\d+_\d+$/),
      }).collapse().description('➢表情包--按钮设置<br>更多说明，详见[➩项目README](https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/emojihub-bili)<hr style="border: 2px solid red;"><hr style="border: 2px solid red;">'),
      nestedlist: Schema.object({
        json_button_template_id: Schema.string().description("模板ID<br>形如 `123456789_1234567890` 的ID编号<br>更多说明，详见[➩项目README](https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/emojihub-bili)").pattern(/^\d+_\d+$/),
      }).collapse().description('➣表情包列表--按钮设置<br>更多说明，详见[➩项目README](https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/emojihub-bili)<hr style="border: 2px solid red;"><hr style="border: 2px solid red;">'),
    }),
    Schema.object({
      markdown_button_mode: Schema.const("markdown").required(),
      markdown_button_mode_initiative: Schema.boolean().description("开启后，使用 主动消息 发送markdown。<br>即开启后不带`messageId`发送<br>适用于私域机器人频道使用。私域机器人需要使用`被动md模板、json模板`并且开启此配置项").default(false),
      markdown_button_mode_keyboard: Schema.boolean().description("开启后，markdown加上按钮。关闭后，不加按钮内容哦<br>不影响markdown发送，多用于调试功能使用").default(true).experimental(),
      markdown_button_mode_without_emojilist_keyboard: Schema.boolean().description("开启后，表情包列表使用下方`nestedlist`配置的表情包列表按钮。关闭后，仅发送普通的文字列表").default(true).experimental(),

      nested: Schema.object({
        markdown_button_template_id: Schema.string().description("md模板ID<br>形如 `123456789_1234567890` 的ID编号，发送markdown").pattern(/^\d+_\d+$/),
        markdown_button_keyboard_id: Schema.string().description("按钮模板ID<br>形如 `123456789_1234567890` 的ID编号，发送按钮").pattern(/^\d+_\d+$/),
        markdown_button_content_table: Schema.array(Schema.object({
          raw_parameters: Schema.string().description("原始参数名称"),
          replace_parameters: Schema.string().description("替换参数名称"),
        })).role('table').default([
          {
            "raw_parameters": "your_markdown_text_1",
            "replace_parameters": "表情包来啦！"
          },
          {
            "raw_parameters": "your_markdown_text_2",
            "replace_parameters": "这是你的表情包哦😽"
          },
          {
            "raw_parameters": "your_markdown_img",
            "replace_parameters": "${img_pxpx}"
          },
          {
            "raw_parameters": "your_markdown_url",
            "replace_parameters": "${img_url}"
          }
        ]).description("替换参数映射表<br>本插件会替换模板变量，请在左侧填入模板变量，右侧填入真实变量值。<br>本插件提供的参数有`command`、`img_pxpx`、`img_url`、`ctx`、`session`、`config`<br>`img_pxpx`会被替换为`img#...px #...px`<br>`img_url`会被替换为`一个链接`，其中img_pxpx参数需要使用`canvas`服务<br>▶比如你可以使用`{{.session.userId}}`，这会被本插件替换为`真实的userId值`，若无匹配变量，则视为文本<br>更多说明，详见[➩项目README](https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/emojihub-bili)"),

      }).collapse().description('➢表情包--按钮设置<br>更多说明，详见[➩项目README](https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/emojihub-bili)<hr style="border: 2px solid red;"><hr style="border: 2px solid red;">'),
      nestedlist: Schema.object({
        markdown_button_template_id: Schema.string().description("md模板ID<br>形如 `123456789_1234567890` 的ID编号，发送markdown").pattern(/^\d+_\d+$/),
        markdown_button_keyboard_id: Schema.string().description("按钮模板ID<br>形如 `123456789_1234567890` 的ID编号，发送按钮").pattern(/^\d+_\d+$/),
        markdown_button_content_table: Schema.array(Schema.object({
          raw_parameters: Schema.string().description("原始参数名称"),
          replace_parameters: Schema.string().description("替换参数名称"),
        })).role('table').default([
          {
            "raw_parameters": "your_markdown_text_1",
            "replace_parameters": "表情包列表~"
          },
          {
            "raw_parameters": "your_markdown_text_2",
            "replace_parameters": "点击下面的按钮触发哦！"
          }
        ]).description("替换参数映射表<br>本插件会替换模板变量，请在左侧填入模板变量，右侧填入真实变量值。<br>本插件提供的参数有`command`、`img_pxpx`、`img_url`、`ctx`、`session`、`config`<br>`img_pxpx`会被替换为`img#...px #...px`<br>`img_url`会被替换为`一个链接`，其中img_pxpx参数需要使用`canvas`服务<br>▶比如你可以使用`{{.session.userId}}`，这会被本插件替换为`真实的userId值`，若无匹配变量，则视为文本<br>更多说明，详见[➩项目README](https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/emojihub-bili)"),

      }).collapse().description('➣表情包列表--按钮设置<br>更多说明，详见[➩项目README](https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/emojihub-bili)<hr style="border: 2px solid red;"><hr style="border: 2px solid red;">'),
    }),

    Schema.object({
      markdown_button_mode: Schema.const("markdown_raw_json").required(),
      markdown_button_mode_initiative: Schema.boolean().description("开启后，使用 主动消息 发送markdown。<br>即开启后不带`messageId`发送<br>适用于私域机器人频道使用。私域机器人需要使用`被动md模板、json模板`并且开启此配置项").default(false),
      markdown_button_mode_keyboard: Schema.boolean().description("开启后，markdown加上按钮。关闭后，不加按钮内容哦<br>不影响markdown发送，多用于调试功能使用").default(true).experimental(),
      markdown_button_mode_without_emojilist_keyboard: Schema.boolean().description("开启后，表情包列表使用下方`nestedlist`配置的表情包列表按钮。关闭后，仅发送普通的文字列表").default(true).experimental(),

      nested: Schema.object({
        markdown_raw_json_button_template_id: Schema.string().description("markdown模板ID。**注意不是按钮模板ID**<br>形如 `123456789_1234567890` 的ID编号，发送markdown").pattern(/^\d+_\d+$/),
        markdown_raw_json_button_content_table: Schema.array(Schema.object({
          raw_parameters: Schema.string().description("原始参数名称"),
          replace_parameters: Schema.string().description("替换参数名称"),
        })).role('table').default([
          {
            "raw_parameters": "your_markdown_text_1",
            "replace_parameters": "表情包来啦！"
          },
          {
            "raw_parameters": "your_markdown_text_2",
            "replace_parameters": "这是你的表情包哦😽"
          },
          {
            "raw_parameters": "your_markdown_img",
            "replace_parameters": "${img_pxpx}"
          },
          {
            "raw_parameters": "your_markdown_url",
            "replace_parameters": "${img_url}"
          }
        ]).description("替换参数映射表<br>本插件会替换模板变量，请在左侧填入模板变量，右侧填入真实变量值。<br>本插件提供的参数有`command`、`img_pxpx`、`img_url`、`ctx`、`session`、`config`<br>`img_pxpx`会被替换为`img#...px #...px`<br>`img_url`会被替换为`一个链接`，其中img_pxpx参数需要使用`canvas`服务<br>▶比如你可以使用`{{.session.userId}}`，这会被本插件替换为`真实的userId值`，若无匹配变量，则视为文本<br>更多说明，详见[➩项目README](https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/emojihub-bili)"),
        markdown_raw_json_button_keyboard: Schema.string().role('textarea', { rows: [12, 12] }).collapse()
          .default("{\n    \"rows\": [\n        {\n            \"buttons\": [\n                {\n                    \"render_data\": {\n                        \"label\": \"再来一张😺\",\n                        \"style\": 2\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/${command}\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"返回列表😽\",\n                        \"style\": 2\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/${config.emojihub_bili_command}\",\n                        \"enter\": true\n                    }\n                }\n            ]\n        }\n    ]\n}")
          .description('实现QQ官方bot的按钮效果<br>在这里填入你的按钮内容，注意保持json格式，推荐在编辑器中编辑好后粘贴进来'),
      }).collapse().description('➢表情包--按钮设置<br>更多说明，详见[➩项目README](https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/emojihub-bili)<hr style="border: 2px solid red;"><hr style="border: 2px solid red;">'),
      nestedlist: Schema.object({
        markdown_raw_json_button_template_id: Schema.string().description("markdown模板ID。**注意不是按钮模板ID**<br>形如 `123456789_1234567890` 的ID编号，发送markdown").pattern(/^\d+_\d+$/),
        markdown_raw_json_button_content_table: Schema.array(Schema.object({
          raw_parameters: Schema.string().description("原始参数名称"),
          replace_parameters: Schema.string().description("替换参数名称"),
        })).role('table').default([
          {
            "raw_parameters": "your_markdown_text_1",
            "replace_parameters": "表情包列表~"
          },
          {
            "raw_parameters": "your_markdown_text_2",
            "replace_parameters": "点击下面的按钮触发哦！"
          }
        ]).description("替换参数映射表<br>本插件会替换模板变量，请在左侧填入模板变量，右侧填入真实变量值。<br>本插件提供的参数有`command`、`img_pxpx`、`img_url`、`ctx`、`session`、`config`<br>`img_pxpx`会被替换为`img#...px #...px`<br>`img_url`会被替换为`一个链接`，其中img_pxpx参数需要使用`canvas`服务<br>▶比如你可以使用`{{.session.userId}}`，这会被本插件替换为`真实的userId值`，若无匹配变量，则视为文本<br>更多说明，详见[➩项目README](https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/emojihub-bili)"),
        markdown_raw_json_button_keyboard: Schema.string().role('textarea', { rows: [12, 12] }).collapse()
          .default("{\n    \"rows\": [\n        {\n            \"buttons\": [\n                {\n                    \"render_data\": {\n                        \"label\": \"随机emojihub表情包\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/随机emojihub表情包\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"acomu414\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/acomu414\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"ba表情包\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/ba表情包\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"downvote\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/downvote\",\n                        \"enter\": true\n                    }\n                }\n            ]\n        },\n        {\n            \"buttons\": [\n                {\n                    \"render_data\": {\n                        \"label\": \"doro\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/doro\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"eveonecat\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/eveonecat\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"fufu\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/fufu\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"mygo\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/mygo\",\n                        \"enter\": true\n                    }\n                }\n            ]\n        },\n        {\n            \"buttons\": [\n                {\n                    \"render_data\": {\n                        \"label\": \"seseren\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/seseren\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"白圣女\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/白圣女\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"白圣女漫画\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/白圣女漫画\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"柴郡\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/柴郡\",\n                        \"enter\": true\n                    }\n                }\n            ]\n        },\n        {\n            \"buttons\": [\n                {\n                    \"render_data\": {\n                        \"label\": \"初音Q版\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/初音Q版\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"甘城猫猫\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/甘城猫猫\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"疾旋鼬\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/疾旋鼬\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"流萤\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/流萤\",\n                        \"enter\": true\n                    }\n                }\n            ]\n        },\n        {\n            \"buttons\": [\n                {\n                    \"render_data\": {\n                        \"label\": \"赛马娘\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/赛马娘\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"瑟莉亚\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/瑟莉亚\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"藤田琴音\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/藤田琴音\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"亚托莉\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/亚托莉\",\n                        \"enter\": true\n                    }\n                }\n            ]\n        }\n    ]\n}")
          .description('实现QQ官方bot的按钮效果<br>在这里填入你的按钮内容，注意保持json格式，推荐在编辑器中编辑好后粘贴进来'),
      }).collapse().description('➣表情包列表--按钮设置<br>更多说明，详见[➩项目README](https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/emojihub-bili)<hr style="border: 2px solid red;"><hr style="border: 2px solid red;">'),
    }),

    Schema.object({
      markdown_button_mode: Schema.const("raw").required(),
      markdown_button_mode_initiative: Schema.boolean().description("开启后，使用 主动消息 发送markdown。<br>即开启后不带`messageId`发送<br>适用于私域机器人频道使用。私域机器人需要使用`被动md模板、json模板`并且开启此配置项").default(false),
      markdown_button_mode_keyboard: Schema.boolean().description("开启后，markdown加上按钮。关闭后，不加按钮内容哦<br>不影响markdown发送，多用于调试功能使用").default(true).experimental(),
      markdown_button_mode_without_emojilist_keyboard: Schema.boolean().description("开启后，表情包列表使用下方`nestedlist`配置的表情包列表按钮。关闭后，仅发送普通的文字列表").default(true).experimental(),

      nested: Schema.object({
        raw_markdown_button_content: Schema.string().role('textarea', { rows: [6, 6] }).collapse().default("## **表情包~😺**\n### 😽来了哦！\n![${img_pxpx}](${img_url})")
          .description('实现QQ官方bot的按钮效果，需要`canvas`服务。<br>在这里填入你的markdown内容。本插件会替换形如`{{.xxx}}`或`${xxx}`的参数为`xxx`。<br>本插件提供的参数有`command`、`img_pxpx`、`img_url`、`ctx`、`session`、`config`<br>`img_pxpx`会被替换为`img#...px #...px`<br>`img_url`会被替换为`一个链接`更多说明，详见[➩项目README](https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/emojihub-bili)'),
        raw_markdown_button_keyboard: Schema.string().role('textarea', { rows: [12, 12] }).collapse()
          .default("{\n    \"rows\": [\n        {\n            \"buttons\": [\n                {\n                    \"render_data\": {\n                        \"label\": \"再来一张😺\",\n                        \"style\": 2\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/${command}\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"返回列表😽\",\n                        \"style\": 2\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/${config.emojihub_bili_command}\",\n                        \"enter\": true\n                    }\n                }\n            ]\n        }\n    ]\n}")
          .description('实现QQ官方bot的按钮效果<br>在这里填入你的按钮内容，注意保持json格式，推荐在编辑器中编辑好后粘贴进来'),
      }).collapse().description('➢表情包--按钮设置<br>更多说明，详见[➩项目README](https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/emojihub-bili)<hr style="border: 2px solid red;"><hr style="border: 2px solid red;">'),
      nestedlist: Schema.object({
        raw_markdown_button_content: Schema.string().role('textarea', { rows: [6, 6] }).collapse().default("## **表情包列表**\n### 😻列表如下：点击按钮触发哦！")
          .description('实现QQ官方bot的按钮效果，需要`canvas`服务。<br>在这里填入你的markdown内容。本插件会替换形如`{{.xxx}}`或`${xxx}`的参数为`xxx`。<br>本插件提供的参数有`command`、`img_pxpx`、`img_url`、`ctx`、`session`、`config`<br>`img_pxpx`会被替换为`img#...px #...px`<br>`img_url`会被替换为`一个链接`更多说明，详见[➩项目README](https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/emojihub-bili)'),
        raw_markdown_button_keyboard: Schema.string().role('textarea', { rows: [12, 12] }).collapse()
          .default("{\n    \"rows\": [\n        {\n            \"buttons\": [\n                {\n                    \"render_data\": {\n                        \"label\": \"随机emojihub表情包\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/随机emojihub表情包\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"acomu414\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/acomu414\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"ba表情包\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/ba表情包\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"downvote\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/downvote\",\n                        \"enter\": true\n                    }\n                }\n            ]\n        },\n        {\n            \"buttons\": [\n                {\n                    \"render_data\": {\n                        \"label\": \"doro\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/doro\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"eveonecat\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/eveonecat\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"fufu\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/fufu\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"mygo\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/mygo\",\n                        \"enter\": true\n                    }\n                }\n            ]\n        },\n        {\n            \"buttons\": [\n                {\n                    \"render_data\": {\n                        \"label\": \"seseren\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/seseren\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"白圣女\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/白圣女\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"白圣女漫画\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/白圣女漫画\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"柴郡\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/柴郡\",\n                        \"enter\": true\n                    }\n                }\n            ]\n        },\n        {\n            \"buttons\": [\n                {\n                    \"render_data\": {\n                        \"label\": \"初音Q版\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/初音Q版\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"甘城猫猫\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/甘城猫猫\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"疾旋鼬\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/疾旋鼬\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"流萤\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/流萤\",\n                        \"enter\": true\n                    }\n                }\n            ]\n        },\n        {\n            \"buttons\": [\n                {\n                    \"render_data\": {\n                        \"label\": \"赛马娘\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/赛马娘\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"瑟莉亚\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/瑟莉亚\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"藤田琴音\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/藤田琴音\",\n                        \"enter\": true\n                    }\n                },\n                {\n                    \"render_data\": {\n                        \"label\": \"亚托莉\",\n                        \"style\": 1\n                    },\n                    \"action\": {\n                        \"type\": 2,\n                        \"permission\": {\n                            \"type\": 2\n                        },\n                        \"data\": \"/亚托莉\",\n                        \"enter\": true\n                    }\n                }\n            ]\n        }\n    ]\n}")
          .description('实现QQ官方bot的按钮效果<br>在这里填入你的按钮内容，注意保持json格式，推荐在编辑器中编辑好后粘贴进来'),
      }).collapse().description('➣表情包列表--按钮设置<br>更多说明，详见[➩项目README](https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/emojihub-bili)<hr style="border: 2px solid red;"><hr style="border: 2px solid red;">'),
    }),
    Schema.object({}),
  ]),

  Schema.object({
    LocalSendNetworkPicturesList: Schema.string().role('textarea', { rows: [2, 4] }).description('将`下列指令`对应的内容下载至本地，作为本地图片发送<br>请使用逗号分隔指令').default().experimental(),
    deletePictime: Schema.number().default(10).description('若干`秒`后 删除下载的本地临时文件').experimental(),
    localPicToBase64: Schema.boolean().description("`开启后`本地图片以base64发出 `日常使用无需开启，且不建议发送markdown的时候使用（直接发图还是可以考虑的）`").experimental().default(false),
    QQPicToChannelUrl: Schema.boolean().description("`开启后`， `img_url`会先上传QQ频道，拿到频道URL，用于发送markdown<br>被动md需要URL白名单，仅对原生发本地文件夹的图有意义。").experimental().default(false),
    QQchannelId: Schema.string().description('`填入QQ频道的频道ID`，将该ID的频道作为中转频道 <br> 频道ID可以用[inspect插件来查看](/market?keyword=inspect) `频道ID应为纯数字`').experimental().pattern(/^\S+$/),
  }).description('调试选项'),

  Schema.object({
    consoleinfo: Schema.boolean().default(false).description("日志调试模式`日常使用无需开启`"),
  }).description('日志调试选项'),
  Schema.union([
    Schema.object({
      consoleinfo: Schema.const(true).required(),
      allfileinfo: Schema.boolean().description("输出allfile调试内容`MoreEmojiHubList 列表详细内容`"),
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
      data = await fs.promises.readFile(url.fileURLToPath(data));
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
    let filePath = imagePath;
    // 检查 imagePath 是否是 file:// URL
    if (imagePath.startsWith('file://')) {
      // 如果是，则转换为本地文件路径
      filePath = url.fileURLToPath(imagePath);
    }
    const imageBuffer = fs.readFileSync(filePath);
    // 将图片 buffer 转换为 Base64 字符串
    const base64String = imageBuffer.toString('base64');
    return base64String;
  } catch (error) {
    logger.error('Error converting image to base64:', error);
    return null;
  }
}

async function determineImagePath(txtPath, config, channelId, command, ctx, local_picture_name = null) {
  // 判断是否是本地文件夹的绝对路径 (优先判断文件夹，解决linux路径识别问题)
  if (isLocalDirectory(txtPath)) {
    let filePath = txtPath;
    if (txtPath.startsWith('file:///')) {
      filePath = decodeURIComponent(txtPath.substring(8)); // 去除 file:/// 并解码 URL
    }
    return await getRandomImageFromFolder(filePath, config, channelId, command, ctx, local_picture_name);
  }

  // 判断是否是直接的图片链接
  if (txtPath.startsWith('http://') || txtPath.startsWith('https://')) {
    logInfoformat(config, channelId, command, `直接的图片链接: ${txtPath}`);
    return { imageUrl: txtPath, isLocal: false };
  }

  // 判断是否是本地图片的绝对路径
  if (isLocalImagePath(txtPath)) {
    let filePath = txtPath;
    if (txtPath.startsWith('file:///')) {
      filePath = decodeURIComponent(txtPath.substring(8)); // 去除 file:/// 并解码 URL
    }
    if (!fs.existsSync(filePath)) {
      logError(`错误:路径不存在： ${txtPath}`);
      return { imageUrl: null, isLocal: false };
    }
    logInfoformat(config, channelId, command, `本地图片的绝对路径: ${txtPath}`);
    const stats = fs.statSync(filePath);
    return {
      imageUrl: url.pathToFileURL(filePath).href,
      isLocal: true,
      imageName: path.basename(filePath), // 文件名称
      imageTime: stats.mtime, // 修改时间
      imageSize: stats.size,   // 文件大小
      imagePath: filePath     // 文件路径 
    };
  }


  // 判断是否是本地txt文件的绝对路径
  if (isLocalTextFile(txtPath)) {
    let filePath = txtPath;
    if (txtPath.startsWith('file:///')) {
      filePath = decodeURIComponent(txtPath.substring(8)); // 去除 file:/// 并解码 URL
    }
    return await getRandomImageUrlFromFile(filePath, config, channelId, command, ctx);
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
    logInfoformat(config, channelId, command, `随机选择的网络图片链接: ${txtPath}`);
    return { imageUrl: txtPath, isLocal: false };
  } else if (isLocalDirectory(txtPath)) {
    let filePath = txtPath;
    if (txtPath.startsWith('file:///')) {
      filePath = decodeURIComponent(txtPath.substring(8)); // 去除 file:/// 并解码 URL
    }
    return await getRandomImageFromFolder(filePath, config, channelId, command, ctx, local_picture_name);
  } else if (isLocalTextFile(txtPath)) {
    let filePath = txtPath;
    if (txtPath.startsWith('file:///')) {
      filePath = decodeURIComponent(txtPath.substring(8)); // 去除 file:/// 并解码 URL
    }
    return await getRandomImageUrlFromFile(filePath, config, channelId, command, ctx);
  } else if (isLocalImagePath(txtPath)) {
    let filePath = txtPath;
    if (txtPath.startsWith('file:///')) {
      filePath = decodeURIComponent(txtPath.substring(8)); // 去除 file:/// 并解码 URL
    }
    logInfoformat(config, channelId, command, `随机选择的本地图片路径: ${txtPath}`);
    const stats = fs.statSync(imageUrl);
    return {
      imageUrl: url.pathToFileURL(imageUrl).href,
      isLocal: true,
      imageName: path.basename(imageUrl),
      imageTime: stats.mtime, // 修改时间
      imageSize: stats.size,   // 文件大小
      imagePath: imageUrl      // 文件路径
    };
  }
}





function getRandomEmojiHubCommand(config) {
  const commands = config.MoreEmojiHubList.map(emoji => emoji.command);
  if (commands.length > 0) {
    return commands[Math.floor(Math.random() * commands.length)];
  } else {
    return null;
  }
}

function isLocalImagePath(txtPath) {
  // 修改：同时判断 file:/// 开头的路径
  const lowerCasePath = txtPath.toLowerCase(); // 转换为小写
  return (path.isAbsolute(txtPath) || txtPath.startsWith('file:///')) &&
    (lowerCasePath.endsWith('.jpg') || lowerCasePath.endsWith('.png') || lowerCasePath.endsWith('.gif') || lowerCasePath.endsWith('.bmp') || lowerCasePath.endsWith('.webp'));
}


function isLocalDirectory(txtPath) {
  // 修改：同时判断 file:/// 开头的路径
  if (txtPath.startsWith('file:///')) {
    try {
      const filePath = decodeURIComponent(txtPath.substring(8)); // 去除 file:/// 并解码 URL
      return fs.lstatSync(filePath).isDirectory();
    } catch (e) {
      return false; // 路径不存在或不是目录
    }
  }

  return path.isAbsolute(txtPath) && fs.lstatSync(txtPath).isDirectory();
}

function isLocalTextFile(txtPath) {
  // 修改：同时判断 file:/// 开头的路径
  if (txtPath.startsWith('file:///')) {
    return txtPath.endsWith('.txt');
  }
  return path.isAbsolute(txtPath) && txtPath.endsWith('.txt');
}

function getAllValidPaths(config) {
  return config.MoreEmojiHubList.filter(emoji => {
    const sourceUrl = emoji.source_url;
    return path.isAbsolute(sourceUrl) || sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://') || sourceUrl.startsWith('file:///');
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

// 获取虚拟文件名，包含子文件夹名称
function getVirtualFilename(filePath, rootFolderPath) {
  const relativePath = path.relative(rootFolderPath, filePath);
  const parts = relativePath.split(path.sep);
  const filename = parts.join(''); // 使用点号连接路径部分
  return filename;
}

async function getRandomImageFromFolder(folderPath, config, channelId, command, ctx, local_picture_name) {
  if (!fs.existsSync(folderPath)) {
    logError(`错误:路径不存在： ${folderPath}`);
    return { imageUrl: null, isLocal: false };
  }

  let files = config.searchSubfolders
    ? getAllFiles(folderPath)
    : fs.readdirSync(folderPath).map(file => path.join(folderPath, file));

  files = files.filter(file => {
    const lowerCaseFile = file.toLowerCase(); // 转换为小写
    return lowerCaseFile.endsWith('.jpg') || lowerCaseFile.endsWith('.png') || lowerCaseFile.endsWith('.gif') || lowerCaseFile.endsWith('.bmp') || lowerCaseFile.endsWith('.webp');
  });

  if (files.length === 0) {
    logError("文件夹中未找到有效图片文件（jpg,png,gif,webp,bmp）");
    return { imageUrl: null, isLocal: false };
  }

  // 如果提供了 local_picture_name 数组，则根据关键词进行匹配
  if (local_picture_name?.length > 0) {
    files = files.filter(file => {
      let filenameToMatch;
      if (config.searchSubfoldersWithfilename && config.searchSubfolders) {
        // 获取虚拟文件名，包含子文件夹名称
        filenameToMatch = getVirtualFilename(file, folderPath);
      } else {
        // 默认情况下只匹配文件名
        filenameToMatch = path.basename(file);
      }
      const filenameLower = filenameToMatch.toLowerCase();
      // 检查文件名是否包含所有关键词
      return local_picture_name.every(keyword => filenameLower.includes(keyword.toLowerCase()));
    });
    if (files.length === 0) {
      logError(`未找到匹配关键词 "${local_picture_name.join(' ')}" 的图片文件`);
      return { imageUrl: null, isLocal: false };
    }
  }

  // 输出文件夹下的全部文件
  if (config.consoleinfo && config.allfileinfo) {
    logger.info(`文件夹 ${folderPath} 下的所有文件: \n${files.join('\n')}`);
  }

  const imageUrl = files[Math.floor(Math.random() * files.length)];
  logInfoformat(config, channelId, command, `使用文件夹 ${folderPath} \n发送本地图片为 ${imageUrl}`);
  const stats = fs.statSync(imageUrl);
  return {
    imageUrl: url.pathToFileURL(imageUrl).href,
    isLocal: true,
    imageName: path.basename(imageUrl),
    imageTime: stats.mtime, // 修改时间
    imageSize: stats.size,   // 文件大小
    imagePath: imageUrl      // 文件路径
  };
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
        ctx.setTimeout(() => {
          fs.unlinkSync(imageUrl);
          logInfoformat(config, null, null, `临时文件已删除：${imageUrl}`);
        }, config.deletePictime * 1000);
        logInfoformat(config, channelId, command, `下载并发送本地图片: ${imageUrl}`);
        return { imageUrl: imageUrl, isLocal: true };
      } catch (downloadError) {
        logError(`图片下载失败：${downloadError.message}`);
        return { imageUrl: null, isLocal: false };
      }
    }
  }

  logInfoformat(config, channelId, command, `使用文件 ${txtPath} \n发送URL为 ${imageUrl}`);
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

function logInfoformat(config, USER, command, message) {
  if (config.consoleinfo) {
    if (USER) {
      logger.info(`\n${USER} 频道触发表情包\n使用指令： ${command}\n${message}`);
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
* @param config 配置对象，包含 MoreEmojiHubList 数组
* @returns {string[]} 所有表情包指令的列表
*/
function listAllCommands(config) {
  // 使用 map 方法来提取每个表情包的指令名称
  const allCommands = config.MoreEmojiHubList.map(emoji => emoji.command);

  // 检查结果是否为空
  if (allCommands.length === 0) {
    logError("未找到任何表情包指令。");
  }

  // 返回命令列表
  return allCommands;
}

function apply(ctx, config) {
  const emojihub_bili_codecommand = config.emojihub_bili_command;

  ctx.i18n.define("zh-CN",
    {
      commands: {
        [emojihub_bili_codecommand]: {
          description: `表情包功能`,
          messages: {
            "notfound_txt": "ERROR！找不到文件或文件为空！指令：{0}",
            "List_of_emojis": "可用的表情包指令：{0}",
            "notallowednum": `{0}次超出单次返回最大值\n请使用指令：{1} -${config.optionsname} {2}`,
          }
        },
        [config.emojihub_onemore]: {
          description: `触发上次的表情包`,
          messages: {
            "nocommand": `没有找到上一个命令，请先执行一个命令！\n➣例如： ${config.emojihub_randompic}`,
          }
        },
        [config.emojihub_randompic]: {
          description: `从全部表情包里随机抽`,
          messages: {
            "noemoji": "没有任何表情包配置，请检查插件配置项！",
          }
        }
      }
    }
  );

  const lastCommandByChannel = {};

  function updateLastCommand(differentiationID, command) {
    lastCommandByChannel[differentiationID] = command;
    logInfo('记录到command为： ' + command + ' 区别ID： ' + differentiationID);
  }

  function logInfo(message, message2) {
    if (config.consoleinfo) {
      if (message2) {
        logger.info(`${message} ${message2}`)
      } else {
        logger.info(message);
      }
    }
  }

  function replacePlaceholders(content, context, isRawMode = false) {
    // 如果 content 是字符串，直接替换占位符
    if (typeof content === 'string') {
      if (!/\{\{\.([^}]+)\}\}|\$\{([^}]+)\}/.test(content)) {
        return isRawMode ? content : [content];
      }

      const value = content.replace(/\{\{\.([^}]+)\}\}|\$\{([^}]+)\}/g, (match, p1, p2) => {
        const key = p1 || p2;
        // 从 context 中查找占位符对应的值
        const replacement = key.split('.').reduce((obj, k) => obj?.[k], context) || match;
        return replacement;
      });

      return isRawMode ? value : [value];
    }

    // 如果 content 是对象或数组，递归处理
    if (typeof content === 'object' && content !== null) {
      if (Array.isArray(content)) {
        return content.map(item => replacePlaceholders(item, context, isRawMode));
      } else {
        const result = {};
        for (const key in content) {
          result[key] = replacePlaceholders(content[key], context, isRawMode);
        }
        return result;
      }
    }

    // 其他情况直接返回
    return content;
  }



  function command_list_markdown(session) {
    let markdownMessage = {
      msg_id: "",
      msg_type: 2,
      markdown: {},
      keyboard: {},
    };

    if (!config.markdown_button_mode_initiative) {
      markdownMessage.msg_id = session.messageId;
    }

    if (config.markdown_button_mode === "json" && !config.markdown_button_mode_initiative) {
      if (!config.markdown_button_mode_initiative) {
        markdownMessage = {
          msg_id: session.messageId, // 被动消息
          msg_type: 2,
          // markdown: {}, // json情况里不允许传入这个字段，但是其他情况都有。
          keyboard: {},
        }
      } else {
        markdownMessage = { // 主动消息
          msg_type: 2,
          // markdown: {}, // json情况里不允许传入这个字段，但是其他情况都有。
          keyboard: {},
        }
      }
      const keyboardId = config.nestedlist.json_button_template_id;
      if (config.markdown_button_mode_keyboard) {
        markdownMessage.keyboard = {
          id: keyboardId,
        };
      }
    }
    else if (config.markdown_button_mode === "markdown") {
      const templateId = config.nestedlist.markdown_button_template_id;
      const keyboardId = config.nestedlist.markdown_button_keyboard_id;
      const contentTable = config.nestedlist.markdown_button_content_table;

      const params = contentTable.map(item => ({
        key: item.raw_parameters,
        values: replacePlaceholders(item.replace_parameters, { session, config }),
      }));

      markdownMessage.markdown = {
        custom_template_id: templateId,
        params: params,
      };
      if (config.markdown_button_mode_keyboard) {
        markdownMessage.keyboard = {
          id: keyboardId,
        };
      }

    } else if (config.markdown_button_mode === "markdown_raw_json") {
      const templateId = config.nestedlist.markdown_raw_json_button_template_id;
      const contentTable = config.nestedlist.markdown_raw_json_button_content_table;
      let keyboard = JSON.parse(config.nestedlist.markdown_raw_json_button_keyboard);

      keyboard = replacePlaceholders(keyboard, { session, config }, true);

      const params = contentTable.map(item => ({
        key: item.raw_parameters,
        values: replacePlaceholders(item.replace_parameters, { session, config }),
      }));

      markdownMessage.markdown = {
        custom_template_id: templateId,
        params: params,
      };
      if (config.markdown_button_mode_keyboard) {
        markdownMessage.keyboard = {
          content: keyboard,
        };
      }
    } else if (config.markdown_button_mode === "raw") {
      try {
        const rawMarkdownContent = config.nestedlist.raw_markdown_button_content;
        const rawMarkdownKeyboard = config.nestedlist.raw_markdown_button_keyboard;

        const replacedMarkdownContent = replacePlaceholders(rawMarkdownContent, { session, config }, true);
        const replacedMarkdownKeyboard = replacePlaceholders(rawMarkdownKeyboard, { session, config }, true)
          .replace(/^[\s\S]*?"keyboard":\s*/, '')
          .replace(/\\n/g, '')
          .replace(/\\"/g, '"')
          .trim();

        const keyboard = JSON.parse(replacedMarkdownKeyboard);

        markdownMessage.markdown = {
          content: replacedMarkdownContent,
        };
        if (config.markdown_button_mode_keyboard) {
          markdownMessage.keyboard = {
            content: keyboard,
          };
        }
      } catch (error) {
        logError(`解析原生 Markdown 出错: ${error}`);
        return null;
      }
    }

    logInfo(`Markdown 模板参数: ${JSON.stringify(markdownMessage, null, 2)}`);
    return markdownMessage;
  }


  async function markdown(session, command, imageUrl, localimage) {
    const markdownMessage = {
      msg_id: "",
      msg_type: 2,
      markdown: {},
      keyboard: {},
    };

    if (!config.markdown_button_mode_initiative) {
      markdownMessage.msg_id = session.messageId;
    }

    const canvasimage = await ctx.canvas.loadImage(localimage); // 使用本地图片加载 无需上传后二次请求加载
    let originalWidth = canvasimage.naturalWidth || canvasimage.width;
    let originalHeight = canvasimage.naturalHeight || canvasimage.height;

    if (config.markdown_button_mode === "markdown") {
      const templateId = config.nested.markdown_button_template_id;
      const keyboardId = config.nested.markdown_button_keyboard_id;
      const contentTable = config.nested.markdown_button_content_table;

      const params = contentTable.map(item => ({
        key: item.raw_parameters,
        values: replacePlaceholders(item.replace_parameters, { session, config, img_pxpx: `img#${originalWidth}px #${originalHeight}px`, img_url: imageUrl, command }),
      }));

      markdownMessage.markdown = {
        custom_template_id: templateId,
        params: params,
      };
      if (config.markdown_button_mode_keyboard) {
        markdownMessage.keyboard = {
          id: keyboardId,
        };
      }
    } else if (config.markdown_button_mode === "markdown_raw_json") {
      const templateId = config.nested.markdown_raw_json_button_template_id;
      const contentTable = config.nested.markdown_raw_json_button_content_table;
      let keyboard = JSON.parse(config.nested.markdown_raw_json_button_keyboard);

      keyboard = replacePlaceholders(keyboard, { session, config, img_pxpx: `img#${originalWidth}px #${originalHeight}px`, img_url: imageUrl, command }, true);

      const params = contentTable.map(item => ({
        key: item.raw_parameters,
        values: replacePlaceholders(item.replace_parameters, { session, config, img_pxpx: `img#${originalWidth}px #${originalHeight}px`, img_url: imageUrl, command }),
      }));

      markdownMessage.markdown = {
        custom_template_id: templateId,
        params: params,
      };
      if (config.markdown_button_mode_keyboard) {
        markdownMessage.keyboard = {
          content: keyboard,
        };
      }
    } else if (config.markdown_button_mode === "raw") {
      try {
        const rawMarkdownContent = config.nested.raw_markdown_button_content;
        const rawMarkdownKeyboard = config.nested.raw_markdown_button_keyboard;

        const replacedMarkdownContent = replacePlaceholders(rawMarkdownContent, { session, config, img_pxpx: `img#${originalWidth}px #${originalHeight}px`, img_url: imageUrl, command }, true);
        const replacedMarkdownKeyboard = replacePlaceholders(rawMarkdownKeyboard, { session, config, command }, true)
          .replace(/^[\s\S]*?"keyboard":\s*/, '')
          .replace(/\\n/g, '')
          .replace(/\\"/g, '"')
          .trim();

        const keyboard = JSON.parse(replacedMarkdownKeyboard);

        markdownMessage.markdown = {
          content: replacedMarkdownContent,
        };
        if (config.markdown_button_mode_keyboard) {
          markdownMessage.keyboard = {
            content: keyboard,
          };
        }
      } catch (error) {
        logError(`解析原生 Markdown 出错: ${error}`);
        return null;
      }
    }

    logInfo(`Markdown 模板参数: ${JSON.stringify(markdownMessage, null, 2)}`);
    return markdownMessage;
  }
  // 提取消息发送逻辑为函数
  async function sendmarkdownMessage(session, message) {
    logInfo("正在调用sendmarkdownMessage发送md")
    try {
      const { guild, user } = session.event;
      const { qq, qqguild, channelId } = session;

      if (guild?.id) {
        if (qq) {
          await qq.sendMessage(channelId, message);
        } else if (qqguild) {
          await qqguild.sendMessage(channelId, message);
        }
      } else if (user?.id && qq) {
        await qq.sendPrivateMessage(user.id, message);
      }
    } catch (error) {
      ctx.logger.error(`发送markdown消息时出错:`, error);
    }
  }

  async function sendMultipleEmojis(session, command, num) {
    const maxAllowed = config.maxexecutetime || 10; // 使用配置中的最大数量，默认为10
    if (num > maxAllowed) {
      await session.send(h.text(session.text(`commands.${emojihub_bili_codecommand}.messages.notallowednum`, [num, command, maxAllowed])));
      return; // 不继续执行
    }
    const numToSend = Math.min(num || 1, maxAllowed); // 确定要发送的数量，不超过最大值
    for (let i = 0; i < numToSend; i++) {
      // 如果是“再来一张”指令，则需要特殊处理
      if (command === config.emojihub_onemore) {
        const identifier = config.repeatCommandDifferentiation === 'userId' ? session.userId : session.channelId;
        const lastCommand = lastCommandByChannel[identifier];
        if (lastCommand) {
          await session.execute(lastCommand);
        } else {
          await session.send(session.text(".nocommand"));
          return; // 如果没有上一个命令，则直接返回，不再继续循环
        }
      } else {
        // 对于其他指令，直接执行
        await session.execute(command);
      }
    }
  }

  ctx.command(config.emojihub_bili_command)
    .action(async ({ session }) => {
      const txtCommandList = listAllCommands(config);
      logInfo(`指令列表txtCommandList：  ` + txtCommandList);

      if (config.markdown_button_mode_without_emojilist_keyboard && (config.markdown_button_mode === "markdown" || config.markdown_button_mode === "raw" || config.markdown_button_mode === "json" || config.markdown_button_mode === "markdown_raw_json")) {
        let markdownMessage = command_list_markdown(session);
        await sendmarkdownMessage(session, markdownMessage);
      } else {
        const commandText = txtCommandList.join('\n');
        await session.send(h.text(session.text(`commands.${emojihub_bili_codecommand}.messages.List_of_emojis`, [`\n${commandText}`])));
      }
    });

  ctx.on('ready', () => {
    config.MoreEmojiHubList.forEach(({ command, source_url }) => {
      ctx.command(`${config.emojihub_bili_command}/${command} [local_picture_name...]`)
        .example(`${command} 关键词1 关键词2 关键词3`)
        .option('numpics', `-${config.optionsname} <numpics:number> 指定返回数量`)
        .action(async ({ session, options }, ...local_picture_name) => {
          if (options?.numpics) {
            await sendMultipleEmojis(session, `${command} ${local_picture_name.join(' ')}`.trim(), options.numpics);
            return;
          }
          const imageResult = await determineImagePath(source_url, config, session.channelId, command, ctx, local_picture_name);

          if (!imageResult.imageUrl) {
            await session.send(h.text(session.text(`commands.${emojihub_bili_codecommand}.messages.notfound_txt`, [command])));
            return;
          }

          // 根据 config.repeatCommandDifferentiation 的值选择合适的 ID
          const identifier = config.repeatCommandDifferentiation === 'userId' ? session.userId : session.channelId;
          updateLastCommand(identifier, command);

          try {
            let message;
            if ((session.platform === "qq" || session.platform === "qqguild") && (config.markdown_button_mode === "markdown" || config.markdown_button_mode === "raw" || config.markdown_button_mode === "markdown_raw_json")) {
              if (imageResult.isLocal) {
                if (config.localPicToBase64) {
                  let imagebase64 = await getImageAsBase64(imageResult.imageUrl);
                  let MDimagebase64 = 'data:image/png;base64,' + imagebase64;
                  message = await markdown(session, command, MDimagebase64);
                  await sendmarkdownMessage(session, message);
                } else if ((session.platform === "qq" || session.platform === "qqguild") && config.QQPicToChannelUrl) {
                  const localfilepath = url.pathToFileURL(imageResult.imageUrl).href
                  let imagebase64 = await getImageAsBase64(imageResult.imageUrl);
                  let MDimagebase64 = 'data:image/png;base64,' + imagebase64;
                  const uploadedImageURL = await uploadImageToChannel(ctx, config.consoleinfo, localfilepath, session.bot.config.id, session.bot.config.secret, config.QQchannelId);
                  message = await markdown(session, command, uploadedImageURL.url, MDimagebase64);
                  await sendmarkdownMessage(session, message);
                } else {
                  const imageUrl = url.pathToFileURL(imageResult.imageUrl).href;
                  message = await markdown(session, command, imageUrl);
                  await sendmarkdownMessage(session, message);
                }
              } else {
                message = await markdown(session, command, imageResult.imageUrl);
                await sendmarkdownMessage(session, message);
              }
            } else {
              if (imageResult.isLocal && config.localPicToBase64) {// 本地图片 + base64发出
                const format = config.localPictureToName;
                logInfo(imageResult.imageUrl)
                // 格式化文件大小
                const fileSizeKB = (imageResult.imageSize / 1024).toFixed(2);
                const fileSizeMB = (imageResult.imageSize / (1024 * 1024)).toFixed(2);
                const formattedSize = imageResult.imageSize < 1024 * 1024 ? `${fileSizeKB} KB` : `${fileSizeMB} MB`;
                // 格式化时间
                const formattedTime = imageResult.imageTime.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\//g, '-');

                let imagebase64 = await getImageAsBase64(imageResult.imageUrl);
                const context = {
                  IMAGE: h('image', { url: 'data:image/png;base64,' + imagebase64 }),
                  NAME: imageResult.imageName,
                  TIME: formattedTime,
                  SIZE: formattedSize,
                  PATH: imageResult.imagePath,
                };
                const messageContent = replacePlaceholders(format, context);
                logInfo("变量替换本地文件名称，messageContent： base64太长了不打印了")
                // logInfo(messageContent)

                try {
                  message = await session.send(h.unescape(`${messageContent}`.replace(/\\n/g, '\n')));
                } catch (error) {
                  ctx.logger.error("发送本地图片失败：", error)
                }
              } else if (imageResult.isLocal) {// 本地图片 + 绝对路径
                const format = config.localPictureToName;
                logInfo(imageResult.imageUrl)
                // 格式化文件大小
                const fileSizeKB = (imageResult.imageSize / 1024).toFixed(2);
                const fileSizeMB = (imageResult.imageSize / (1024 * 1024)).toFixed(2);
                const formattedSize = imageResult.imageSize < 1024 * 1024 ? `${fileSizeKB} KB` : `${fileSizeMB} MB`;
                // 格式化时间
                const formattedTime = imageResult.imageTime.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\//g, '-');

                const context = {
                  IMAGE: h.image(imageResult.imageUrl),
                  NAME: imageResult.imageName,
                  TIME: formattedTime,
                  SIZE: formattedSize,
                  PATH: imageResult.imagePath,
                };
                const messageContent = replacePlaceholders(format, context);
                logInfo("变量替换本地文件名称，messageContent：")
                logInfo(messageContent)
                try {
                  message = await session.send(h.unescape(`${messageContent}`.replace(/\\n/g, '\n')));
                } catch (error) {
                  ctx.logger.error("发送本地图片失败：", error)
                }

              } else { // 网络图片
                try {
                  message = await session.send(h.image(imageResult.imageUrl));
                } catch (error) {
                  ctx.logger.error("发送网络图片失败：", error)
                }
              }

              if ((session.platform === "qq" || session.platform === "qqguild") && config.markdown_button_mode === "json") {
                const keyboardId = config.nested.json_button_template_id;
                let markdownMessage = {
                  msg_id: session.messageId,
                  msg_type: 2,
                  content: "",
                  keyboard: {
                    id: keyboardId,
                  },
                };
                logInfo(markdownMessage);
                await sendmarkdownMessage(session, markdownMessage);
              }
            }

            if (config.deleteMsg) {
              ctx.setTimeout(async () => {
                try {
                  await session.bot.deleteMessage(session.channelId, message);
                } catch (error) {
                  logError(`撤回消息失败: ${error}`);
                  logError(error);
                }
              }, config.deleteMsgtime * 1000);
            }
          } catch (error) {
            logError(`Error sending image:  ${error}`);
            logError(error)
          }
        });
    })
  });

  ctx.command(`${config.emojihub_bili_command}/${config.emojihub_onemore}`)
    .action(async ({ session, options }) => {
      // 根据 config.repeatCommandDifferentiation 的值选择合适的 ID
      const identifier = config.repeatCommandDifferentiation === 'userId' ? session.userId : session.channelId;
      const lastCommand = lastCommandByChannel[identifier];

      logInfo('尝试在区分ID ' + identifier + ' 中执行最后一个命令： ' + lastCommand);
      if (lastCommand) {
        await session.execute(`${lastCommand}`);
      } else {
        await session.send(session.text(".nocommand"));
      }
    });

  ctx.command(`${config.emojihub_bili_command}/${config.emojihub_randompic}`)
    .action(async ({ session, options }) => {

      const randomEmojiHubCommand = getRandomEmojiHubCommand(config);
      if (randomEmojiHubCommand) {
        await session.execute(randomEmojiHubCommand);
        logInfoformat(config, session.channelId, randomEmojiHubCommand, config.emojihub_randompic);
        return;
      } else {
        await session.send(session.text(".noemoji"));
      }
    });



  if (config.autoEmoji === "定量消息发送" && (config.groupListmapping.length || config.allgroupautoEmoji)) {
    const groups = {};
    // 初始化特定群组的配置
    config.groupListmapping.forEach(({ groupList, defaultemojicommand, count, enable }) => {
      // 只有当enable为false或未定义时，才将群组添加到启用列表中
      if (enable === true) {
        // 如果enable为true，则将该群组标记为黑名单
        groups[groupList] = { blacklisted: true };
      } else {
        groups[groupList] = { emojicommand: defaultemojicommand, threshold: count };
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
        groupConfig = {
          count: 0,
          emojicommand: config.allgroupemojicommand,
          threshold: config.count
        };
        groups[channelId] = groupConfig; // 记录配置以供后续使用
      }

      // 如果存在配置，处理表情包逻辑
      if (groupConfig) {
        groupConfig.count = (groupConfig.count || 0) + 1; // 增加消息计数
        logInfo(`${channelId} ：${groupConfig.count} ：${session.content}`)
        // 达到触发条件
        if (groupConfig.count >= groupConfig.threshold) {
          const randomNumber = Math.random();
          // 触发概率判断
          if (randomNumber <= config.triggerprobability) {
            logInfo(`定量消息发送：概率判断：${randomNumber} <= ${config.triggerprobability} 触发表情包`) // 打印触发日志
            let emojicommands = groupConfig.emojicommand.split(/\n|,|，/).map(cmd => cmd.trim());
            const randomCommand = emojicommands[Math.floor(Math.random() * emojicommands.length)];
            logInfo(`随机选择的指令: ${randomCommand}`);
            //logInfo(`MoreEmojiHubList: ${JSON.stringify(config.MoreEmojiHubList)}`);
            const emojiConfig = config.MoreEmojiHubList.find(({ command }) => command === randomCommand);
            if (emojiConfig) {
              const imageResult = await determineImagePath(emojiConfig.source_url, config, channelId, emojiConfig.command, ctx);
              if (imageResult.imageUrl) {
                try {
                  groupConfig.count = 0; // 重置消息计数
                  let message;
                  if (imageResult.isLocal) { //本地图片
                    if (config.localPicToBase64) {
                      //本地base64发图
                      let imagebase64 = await getImageAsBase64(imageResult.imageUrl);
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
                    ctx.setTimeout(async () => {
                      try {
                        await session.bot.deleteMessage(session.channelId, sentMessage);
                      } catch (error) {
                        logError(`撤回消息失败: ${error}`);
                      }
                    }, config.deleteMsgtime * 1000);
                  }
                } catch (error) {
                  logError(`发送图片错误: ${error}`);
                }
              } else {
                groupConfig.count = 0; // 图片不存在，重置计数
              }
            }
          } else {
            groupConfig.count = 0; // 没有触发表情包，重置计数
            const comparisonSymbol = randomNumber <= config.triggerprobability ? "<=" : ">"; // 根据比较结果设置比较符号
            logInfo(`定量消息发送：概率判断：${randomNumber} ${comparisonSymbol} ${config.triggerprobability}\n此次不发送表情包，并且重置计数。`)
          }
        }
      }
      return next();
    }, config.middleware);
  }


  ctx.on('ready', () => {
    if (config.autoEmoji === "定时发送" && config.groupListmapping.length && ctx.cron) {
      // const bot = ctx.bots[config.bot];
      const bot = Object.values(ctx.bots).find(b => b.selfId === config.botId || b.user?.id === config.botId);
      if (!bot || bot.status !== Universal.Status.ONLINE) {
        ctx.logger.error(`[定时发送] 机器人离线或未找到: ${config.botId}`);
        return;
      } else {
        ctx.logger.info(`定时成功：将由 ${config.botId} 执行`);
      }
      if (bot == null) return;

      const groups = {};
      // 初始化特定群组的配置
      config.groupListmapping.forEach(({ groupList, defaultemojicommand, cronTime, enable }) => {
        // 只有当enable为false或未定义时，才将群组添加到启用列表中
        if (enable === true) {
          // 如果enable为true，则将该群组标记为黑名单
          groups[groupList] = { blacklisted: true };
        } else {
          groups[groupList] = { emojicommand: defaultemojicommand, cronTime };
        }
      });

      // 定时触发表情包
      for (const channelId in groups) {
        const groupConfig = groups[channelId];

        // 如果当前群组标记为黑名单，则跳过处理
        if (groupConfig && groupConfig.blacklisted) {
          continue;
        }

        // 如果当前群组没有特定配置，则跳过
        if (!groupConfig) {
          continue;
        }

        // 如果存在配置，设置定时任务
        if (groupConfig) {
          ctx.cron(groupConfig.cronTime, async () => {
            const randomNumber = Math.random();
            // 触发概率判断
            if (randomNumber <= config.triggerprobability) {
              logInfo(`尝试向 ${channelId} 定时发送表情包中...`)
              let emojicommands = groupConfig.emojicommand.split(/\n|,|，/).map(cmd => cmd.trim());
              const randomCommand = emojicommands[Math.floor(Math.random() * emojicommands.length)];
              const emojiConfig = config.MoreEmojiHubList.find(({ command }) => command === randomCommand);
              if (emojiConfig) {
                const imageResult = await determineImagePath(emojiConfig.source_url, config, channelId, emojiConfig.command, ctx);
                if (imageResult.imageUrl) {
                  try {
                    let message;
                    if (imageResult.isLocal) { //本地图片
                      if (config.localPicToBase64) {
                        //本地base64发图
                        let imagebase64 = await getImageAsBase64(imageResult.imageUrl);
                        message = h('image', { url: 'data:image/png;base64,' + imagebase64 });
                      } else {
                        //正常本地文件发图
                        const imageUrl = url.pathToFileURL(imageResult.imageUrl).href;
                        message = h.image(imageUrl);
                      }
                    } else {
                      message = h.image(imageResult.imageUrl);
                    }

                    // 判断是群聊还是私聊
                    if (!channelId.includes("private")) {
                      await bot.sendMessage(channelId, message);
                    } else {
                      const userId = channelId.replace("private:", "");
                      await bot.sendPrivateMessage(userId, message);
                    }

                    // 如果需要撤回消息
                    if (config.deleteMsg) {
                      ctx.setTimeout(async () => {
                        try {
                          await bot.deleteMessage(channelId, message);
                        } catch (error) {
                          logError(`撤回消息失败: ${error}`);
                        }
                      }, config.deleteMsgtime * 1000);
                    }
                  } catch (error) {
                    logError(`发送图片错误: ${error}`);
                  }
                }
              }
            } else {
              const comparisonSymbol = randomNumber <= config.triggerprobability ? "<=" : ">"; // 根据比较结果设置比较符号
              logInfo(`定时发送：概率判断结果：${randomNumber} ${comparisonSymbol} ${config.triggerprobability}\n此次不发送表情包。`)
            }
          });
        }
      }
    } else if (config.autoEmoji === "定时发送" && config.groupListmapping.length && !ctx.cron) {
      ctx.logger.error("cron 服务加载失败！")
    }
  })
}

exports.apply = apply;