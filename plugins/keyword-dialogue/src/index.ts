import { Schema, Logger, h, Context, Session, } from "koishi";
import URL from 'node:url';
import path from "node:path";
import fs from 'node:fs';

// 单个回复项的接口
interface ReplyItem {
  type: 'text' | 'image' | 'at' | 'audio' | 'video' | 'mface' | 'unknown';
  text: string;
  fileSize?: any;
  replyway: string;
}

type ReplyGroup = ReplyItem[];

// 关键词数据结构
interface KeywordData {
  [keyword: string]: ReplyGroup[];
}

// 命令选项的接口
interface Options {
  question?: number;
  regex?: boolean;
  global?: boolean;
  unescape?: boolean;
  forward?: number;
}

export const name = 'keyword-dialogue'

const lastTriggerTimes: Record<string, number> = {}; // 用于记录每个关键词的最后触发时间
const logger = new Logger('keyword-dialogue');

export const inject = {
  optional: ['puppeteer']
};

export const usage = `
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
<li>删除关键词：使用指令 <code>删除 [关键词]</code> 来删除关键词。<code>删除 -q 2 你好 </code>来删除“你好”的第二条回复</li>
<li>全局添加/删除：使用指令 <code>全局添加 [关键词]</code> 和 <code>全局删除 [关键词]</code> 来在全局范围内管理关键词。<code>全局删除 -q 2 你好 </code>来删除“你好”的第二条回复。</li>
</ul>
<li><strong>回复内容：</strong>支持文本和图片回复，图片会被保存到本地，避免失效。</li>
<li><strong>正则表达式支持：</strong>你可以使用正则表达式来匹配关键词。例如，输入 <code>添加 你好 -x</code>，可以匹配任何包含“你好”的消息，如“你好，包含了你好的句子就可以触发哦”。</li>
<li><strong>自定义输入时限：</strong>你可以设置添加回复的输入时限，超过时限将视为超时，自动取消添加操作。</li>
<li><strong>多段回复效果：</strong>你可以选择多段输入的回复效果，支持逐条发送或合并为一条消息。</li>
<li><strong>后缀支持空格匹配：</strong>使用数字指定回复序号，空格和无空格都能正常匹配。例如，<code>你好 2</code> 和 <code>你好2</code> 都会触发【你好】的第二个回复。</li>
<li><strong>修改指定序号的回复内容：</strong>使用 <code>修改 [关键词] -q [序号]</code>，可以修改某个关键词的指定回复。例如，输入 <code>修改 你好 -q 2</code>，将会修改“你好”的第二条回复，并显示当前内容，供你确认后再输入新的回复内容。暂时仅支持修改指令一次性输入回复，暂不支持多段添加。</li>

<h2>使用示例</h2>
<ul>
<li>添加关键词：<code>添加 你好</code></li>
<li>添加正则关键词：<code>添加 你好 -x</code></li>
<li>删除关键词：<code>删除 你好</code>、<code>删除 -q 2 你好 </code>（删除“你好”的第二条回复）</li>
<li>全局添加关键词：<code>全局添加 你好</code></li>
<li>全局删除关键词：<code>全局删除 你好</code>、<code>全局删除 -q 2 你好 </code>（删除“你好”的第二条回复）</li>
<li>修改指定回复：<code>修改 -q 2 你好 </code>（修改“你好”的第二条回复）</li>
</ul>

<hr>
<h2>修改插件回复内容</h2>
<p>如果你需要修改这个插件的回复内容，你需要具备一定的编辑 JSON 文件的能力。</p>
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
<li>如果你添加了语音/视频消息回复，请确保已经安装了 silk、ffmpeg 等服务！</li>
</ul>
</body>
</html>

`;

export interface Config {
  command: {
    TriggerPrefix: string;
    DeleteKeyword: string;
    KeywordOfEsc: string;
    KeywordOfEnd: string;
    GlobalTriggerPrefix: string;
    GlobalDeleteKeyword: string;
    KeywordOfSearch: string;
    KeywordOfFix: string;
    ViewKeywordList: string;
  };
  addKeywordTime: number;
  defaultImageExtension: 'jpg' | 'png' | 'gif';
  admin_list: {
    adminID: string;
    allowcommand: ('添加' | '删除' | '全局添加' | '全局删除' | '查找关键词' | '修改' | '查看关键词列表')[];
  }[];
  channel_admin_auth: boolean;
  Delete_Branch_Only: boolean;
  Treat_all_as_lowercase: boolean;
  Prompt: string;
  picture_save_to_local_send: '1' | '2' | '3' | '4';
  MatchPatternForExit: '1' | '2' | '3' | '4';
  AlwayPrompt: '1' | '2' | '3';
  HandleDuplicateKeywords: '1' | '2' | '3';
  MultisegmentAdditionRecoveryEffect: '1' | '2' | '3' | '4';
  prefix: string[];
  Frequency_limitation: number;
  Type_of_restriction: '1' | '2';
  Type_of_ViewKeywordList: '1' | '2';
  Search_Range: '1' | '2' | '3';
  Find_Return_Preset: '1' | '2' | '3';
  Return_Limit: '1' | '2';
  Preposition_middleware: boolean;
  Unified_at_field: boolean;
  consoleInfo: boolean;
}

export const Config = Schema.intersect([
  Schema.object({
    command: Schema.object({
      TriggerPrefix: Schema.string().default('添加').description('触发`添加关键词`功能的指令'),
      DeleteKeyword: Schema.string().default('删除').description('触发`删除关键词`功能的指令'),
      KeywordOfEsc: Schema.string().default('取消添加').description('取消`添加关键词`功能的关键词'),
      KeywordOfEnd: Schema.string().default('结束添加').description('退出`添加关键词`功能的关键词'),
      GlobalTriggerPrefix: Schema.string().default('全局添加').description('触发`全局添加关键词`功能的指令（可在全局范围内生效）'),
      GlobalDeleteKeyword: Schema.string().default('全局删除').description('触发`全局删除关键词`功能的指令'),
      KeywordOfSearch: Schema.string().default('查找关键词').description('触发`搜索关键词`功能的指令'),
      KeywordOfFix: Schema.string().default('修改').description('触发`修改问答`功能的指令'),
      ViewKeywordList: Schema.string().default('查看关键词列表').description('触发`查看关键词列表`功能的指令（仅返回当前群组的关键词）'),
    }).collapse().description('指令注册设置'),
    addKeywordTime: Schema.number().role('slider').min(1).max(30).step(1).default(5).description('添加回复的输入时限，超过则视为超时，取消添加。`单位 分钟`'),
    defaultImageExtension: Schema.union(['jpg', 'png', 'gif']).default('png').description('输入图片保存的后缀名'),
  }).description('基础设置'),

  Schema.object({
    admin_list: Schema.array(Schema.object({
      adminID: Schema.string().description('管理员用户ID'),
      allowcommand: Schema.array(Schema.union(['添加', '删除', '全局添加', '全局删除', '查找关键词', '修改', '查看关键词列表']))
        .default(['添加', '删除', '修改', '查找关键词'])
        .description('可以使用的指令'),
    })).role('table')
      .description('管理员列表（ 0 代表所有用户）<br>独立于 channel_admin_auth ')
      .default([
        {
          "adminID": "0",
          "allowcommand": [
            "添加",
            "删除",
            "查找关键词",
            "修改",
            "查看关键词列表"
          ]
        }
      ]),
    channel_admin_auth: Schema.boolean().default(false).description('开启后 自动允许 管理员/群主 使用本插件的全部指令 `须确保适配器支持获取群员角色`').experimental(),
    Delete_Branch_Only: Schema.boolean().default(true).description('开启后 在删除多段回复的关键词时，必须指定需要删除的序号，而不会直接删除掉这个关键词'),
    Treat_all_as_lowercase: Schema.boolean().default(true).description('开启后 英文关键词匹配无视大写字母`解决英文大小写匹配问题`'),
    Prompt: Schema.string().role('textarea', { rows: [2, 4] }).default('请输入回复内容（输入 取消添加 以取消，输入 结束添加 以结束）：').description('添加时，返回的文字提示'),
    picture_save_to_local_send: Schema.union([
      Schema.const('1').description('不保存图片，使用平台的图片链接'),
      Schema.const('2').description('保存图片为文件，发送时使用图片文件绝对路径'),
      Schema.const('3').description('保存图片为文件，发送时图片文件转换为base64'),
      Schema.const('4').description('保存图片为base64到json，发送时使用base64 `json会变得好长唔，不推荐`'),
    ]).role('radio').default('2').description('开启后 图片回复保存到本地路径`防止平台图片链接失效`'),
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
    ]).role('radio').default('2').description("如何处理待添加的重复关键词"),
    MultisegmentAdditionRecoveryEffect: Schema.union([
      Schema.const('1').description('按照原版输入，原版输出（多段消息发送）'),
      Schema.const('2').description('合为图文消息/多行消息（一次发出，不是合并转发）'),
      Schema.const('3').description('合为一条图文消息，并且合并转发发送 `需要适配器支持哦~`'),
      Schema.const('4').description('按照原版输入，合并转发发送 `需要适配器支持哦~`'),
    ]).role('radio').default('2').description("多段添加的回复效果"),
  }).description('进阶设置'),

  Schema.object({
    prefix: Schema.array(String).role('table').default(["", "/", "#"]).description('指令前缀。将被用于指令的匹配。<br>与全局设置的那个，效果差不多，但是仅针对本插件的关键词。'),
  }).description('关键词设置'),

  Schema.object({
    Frequency_limitation: Schema.number().description('同一问答的最小触发间隔 单位：秒').default(0),
    Type_of_restriction: Schema.union([
      Schema.const('1').description('对同一个问题（全部对象）'),
      Schema.const('2').description('仅对同一个频道（不同频道独立记数间隔）'),
    ]).role('radio').default('2').description("最小间隔时间的限制对象"),
    Type_of_ViewKeywordList: Schema.union([
      Schema.const('1').description('返回文字列表'),
      Schema.const('2').description('返回图片列表（需要puppeteer服务）'),
    ]).role('radio').default('2').description("`查看关键词列表`的返回设置"),
  }).description('回复设置'),

  Schema.object({
    Search_Range: Schema.union([
      Schema.const('1').description('仅在当前频道搜索问答'),
      Schema.const('2').description('搜索全部频道的问答'),
      Schema.const('3').description('当前频道搜索问答 + 全局问答'),
    ]).role('radio').default('3').description("搜索范围，`查看关键词列表`和`查找关键词`指令的搜索范围"),
    Find_Return_Preset: Schema.union([
      Schema.const('1').description('仅返回问答的内容'),
      Schema.const('2').description('仅返回问答所在的频道ID/位置'),
      Schema.const('3').description('返回问答的内容，并且返回问答所在的频道ID/位置'),
    ]).role('radio').default('1').description("搜索关键词的 返回信息。"),
    Return_Limit: Schema.union([
      Schema.const('1').description('返回查找到的全部问答'),
      Schema.const('2').description('仅返回一条问答（模糊匹配）'),
    ]).role('radio').default('2').description("返回限制"),
  }).description('查找问答设置'),

  Schema.object({
    Preposition_middleware: Schema.boolean().default(false).description('开启后 使用前置中间件`匹配到关键词后，不会触发 同实例下 同名称的指令`<br>可以实现回复“指令正在维护中”的效果'),
    Unified_at_field: Schema.boolean().default(false).description('统一at消息的内容，统一为:`<at id="11514"/>`<br>因为有时候at内容是`<at id="11514" name="臭"/>`<br>这样可以防止更换了实现端导致的at字段不一致'),
    consoleInfo: Schema.boolean().default(false).description('日志调试模式')
  }).description('调试设置'),
]);

export function apply(ctx: Context, config: Config) {
  const add_command = config.command.TriggerPrefix; // 添加
  const global_add_command = config.command.GlobalTriggerPrefix;  //  全局添加
  const delete_command = config.command.DeleteKeyword;  //  删除
  const global_delete_command = config.command.GlobalDeleteKeyword; //  全局删除

  const KeywordOfEsc = config.command.KeywordOfEsc;
  const KeywordOfEnd = config.command.KeywordOfEnd;

  const KeywordOfSearch = config.command.KeywordOfSearch; //  搜索关键词
  const KeywordOfFix = config.command.KeywordOfFix; // 修改
  const ViewKeywordList = config.command.ViewKeywordList; // 查看关键词列表

  const zh_CN_default = {
    commands: {
      [ViewKeywordList]: {
        description: `查看关键词列表`,
        messages: {
          "channel_admin_auth": "你没有权限操作此指令。"
        }
      },
      [add_command]: {
        description: `添加关键词`,
        messages: {
          "channel_admin_auth": "你没有权限操作此指令。",
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
          "channel_admin_auth": "你没有权限操作此指令。",
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
          "channel_admin_auth": "你没有权限操作此指令。",
          "no_Valid_Keyword": "请提供一个有效的关键词。",
          "Keyword_does_not_exist": "关键词 \"{0}\" 不存在。",
          "Reply_deleted": "关键词 \"{0}\" 的回复已删除。"
        }
      },
      [global_delete_command]: {
        description: `删除全局关键词`,
        messages: {
          "channel_admin_auth": "你没有权限操作此指令。",
          "no_Valid_Keyword": "请提供一个有效的关键词。",
          "Keyword_does_not_exist": "关键词 \"{0}\" 不存在。",
          "Reply_deleted": "关键词 \"{0}\" 的回复已删除。"
        }
      },
      [KeywordOfSearch]: {
        description: `查找关键词`,
        messages: {
          "channel_admin_auth": "你没有权限操作此指令。",
          "no_Valid_Keyword": "请提供一个有效的关键词。",
          "Keyword_not_found": "未找到关键词 \"{0}\" 的相关问答。",
          "Keyword_found": "在 {0} 下找到：\n关键词：{1}\n回复：\n{2}",
          "Keyword_found_in_channel": "在 {0} 下找到关键词：{1}",
          "Keyword_found_content_only": "关键词：{0}\n回复：\n{1}"
        }
      },
      [KeywordOfFix]: {
        description: `修改关键词`,
        messages: {
          "channel_admin_auth": "你没有权限操作此指令。",
          "no_Valid_Keyword": "请提供一个有效的关键词。",
          "Keyword_not_found": "未找到关键词 \"{0}\" 的相关问答。",
          "Keyword_found": "在 {0} 下找到：\n关键词：{1}\n回复：\n{2}",
          "Keyword_found_in_channel": "在 {0} 下找到关键词：{1}",
          "Keyword_found_content_only": "关键词：{0}\n回复：\n{1}",
          "Input_Timeout": "输入超时。",
          "Cancel_operation": "添加操作已取消。",
          "Keyword_exists": "关键词 \"{0}\" 已存在，不能添加重复的关键词。\n或者请删除这个关键词后重新添加。",
          "Reply_added": "关键词 \"{0}\" 的回复已修改。"
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

  function logInfo(message: any) {
    if (config.consoleInfo) {
      logger.info(message);
    }
  }

  async function parseReplyContent(reply: string, root: string, session: Session, options: Options): Promise<ReplyGroup> {
    const elements = h.parse(reply);
    logInfo('Parsed elements:  ');
    logInfo(elements);

    const replyData: ReplyGroup = [];
    for (const element of elements) {
      let item: ReplyItem | null = null;
      const replyway = options.forward?.toString() || config.MultisegmentAdditionRecoveryEffect;

      if (element.type === 'img' || element.type === 'image') {
        let localPath: string;
        switch (config.picture_save_to_local_send) {
          case '1':
            localPath = element.attrs.src;
            break;
          case '2':
          case '3':
            localPath = await downloadImage(element.attrs.src, root, session, !!options.global);
            break;
          case '4':
            localPath = await downloadImageAsBase64(element.attrs.src) || ''; // 提供默认值
            break;
          default:
            localPath = element.attrs.src;
        }
        item = { type: 'image', text: localPath, fileSize: element.attrs.fileSize, replyway };
      } else if (element.type === 'text') {
        item = { type: 'text', text: element.attrs.content, replyway };
      } else if (element.type === 'at') {
        item = { type: 'at', text: element.attrs.id, replyway };
      } else if (element.type === 'audio') {
        item = { type: 'audio', text: element.attrs.src || element.attrs.url, replyway };
      } else if (element.type === 'video') {
        item = { type: 'video', text: element.attrs.src, replyway };
      } else if (element.type === 'mface') {
        item = { type: 'mface', text: element.attrs.url || "无法获取该 mface 的图片链接", replyway };
      } else {
        // 对于未知类型，将原始回复内容作为文本处理
        item = { type: 'unknown', text: h.select([element], 'text').map(e => e.attrs.content).join(''), replyway };
      }

      if (item) {
        replyData.push(item);
      }
    }
    return replyData;
  }

  // 判断是否为管理员
  function isAdmin(session: Session): boolean {
    const sessionRoles = session.event.member?.roles;
    return !!sessionRoles && (sessionRoles.includes('admin') || sessionRoles.includes('owner'));
  }

  // 检查用户是否有权限执行该指令
  function hasPermission(session: Session, command: "查看关键词列表" | "查找关键词" | "添加" | "删除" | "全局添加" | "全局删除" | "修改"): boolean {
    const userId = session.userId;

    // 查找特定用户的权限配置
    const adminConfig = config.admin_list.find((admin: { adminID: string; }) => admin.adminID === userId);
    // 查找 adminID 为 0 的配置，表示所有用户的默认权限
    const defaultConfig = config.admin_list.find((admin: { adminID: string; }) => admin.adminID === '0');
    if (defaultConfig && defaultConfig.allowcommand.includes(command)) {
      return true;
    }
    if (adminConfig) {
      return adminConfig.allowcommand.includes(command);
    }
    // 如果 channel_admin_auth 开启
    if (config.channel_admin_auth) {
      // 如果用户是管理员，检查其权限
      if (isAdmin(session)) {
        if (adminConfig) {
          return adminConfig.allowcommand.includes(command);
        }
        return true; // 默认管理员拥有所有权限
      }
      // 如果用户不在 admin_list 中，且不是管理员，则按照 defaultConfig 返回
      if (!adminConfig) {
        if (defaultConfig && defaultConfig.allowcommand.includes(command)) {
          return true;
        }
      }
    }
    return false;
  }
  // 删除关键词回复分支
  async function deleteKeywordReply(session: Session, filePath: string, keyword: string, config: Config, specifiedIndex: number | null) {
    if (!fs.existsSync(filePath)) {
      await session.send(h.unescape(session.text(`.Keyword_does_not_exist`)));
      return;
    }

    let data: KeywordData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // 转换关键词为小写
    if (config.Treat_all_as_lowercase) {
      keyword = keyword.toLowerCase();
    }

    // 查找关键词
    let found = false;
    let replies: ReplyGroup[] | undefined;
    let matchedKey: string | undefined;
    for (const key in data) {
      const normalizedKey = config.Treat_all_as_lowercase ? key.toLowerCase() : key;
      const strippedKey = normalizedKey.startsWith('regex:') ? normalizedKey.slice(6) : normalizedKey;
      if (strippedKey === keyword) {
        replies = data[key];
        matchedKey = key;
        found = true;
        break;
      }
    }

    if (!found || !replies || !matchedKey) {
      await session.send(h.unescape(session.text(`.Keyword_does_not_exist`, [keyword])));
      return;
    }

    // 检查多段回复时，是否要求删除指定序号
    if (config.Delete_Branch_Only && replies.length > 1) {
      if (specifiedIndex === null || specifiedIndex === undefined) {
        // 未指定删除的分支，直接提示用户使用删除命令
        await session.send(`关键词 "${keyword}" 有多个回复，请指定需要删除的分支。\n请使用如下指令来删除指定序号的回复：\n删除 -q [数字] ${keyword}`);
        return;
      } else if (specifiedIndex > 0 && specifiedIndex <= replies.length) {
        // 删除指定序号的回复
        replies.splice(specifiedIndex - 1, 1);

        // 如果删除后没有回复了，则删除整个关键词
        if (replies.length === 0) {
          delete data[matchedKey];
          await session.send(h.unescape(session.text(`.Reply_deleted`, [keyword])));
        } else {
          await session.send(h.unescape(`已删除关键词 "${keyword}" 的第 ${specifiedIndex} 条回复。`));
        }

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return;
      } else {
        await session.send(`无效的回复序号，请指定正确的序号。`);
        return;
      }
    } else {
      // 不使用分支删除，直接删除整个关键词
      delete data[matchedKey];
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      await session.send(h.unescape(session.text(`.Reply_deleted`, [keyword])));
    }
  }


  function escapeRegExp(string: string) {
    return string
      .replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')  // 转义正则元字符
      .replace(/\s/g, '\\s')                     // 转义空白字符
      .replace(/\\\\/g, '\\\\');                 // 双反斜杠只处理一次
  }

  async function addKeywordReply(session: Session, filePath: string, keyword: string, config: Config, options: Options) {
    let data: KeywordData;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {
      data = {};
    }
    // 将关键词转换为小写
    if (config.Treat_all_as_lowercase) {
      keyword = keyword.toLowerCase();
    }
    const addKeyword = options.unescape ? `regex:${keyword}` : `regex:${escapeRegExp(keyword)}`;
    const key = (options.regex || options.unescape) ? addKeyword : keyword;

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

      if (reply.includes(KeywordOfEsc)) {
        await session.send(h.text(session.text(`.Cancel_operation`)));
        return;
      }

      if (!reply) {
        await session.send(h.text(session.text(`.Input_Timeout`)));
        return;
      }

      const replyData = await parseReplyContent(reply, root, session, options);
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
      if (reply.includes(KeywordOfEsc)) {
        await session.send(h.text(session.text(`.Cancel_operation`)));
        return;
      }
      if ((config.MatchPatternForExit === '2' && reply === KeywordOfEnd) ||
        (config.MatchPatternForExit === '3' && reply.includes(KeywordOfEnd)) ||
        (config.MatchPatternForExit === '4' && (reply === KeywordOfEnd || reply.includes(KeywordOfEnd)))) {
        break;
      }
      if (!reply) {
        await session.send(h.text(session.text(`.Input_Timeout`)));
        return;
      }

      const replyData = await parseReplyContent(reply, root, session, options);
      currentReplies.push(...replyData);
    }

    data[key].push(currentReplies);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    await session.send(h.unescape((session.text(`.Reply_added`, [keyword]))));
  }


  async function downloadImage(url: string, outputPath: string, session: Session, isGlobal: boolean): Promise<string> {
    try {
      let absoluteOutputPath: string;
      if (isGlobal) {
        absoluteOutputPath = path.resolve(outputPath, 'global');  // 为全局关键词设定专门的文件夹
      } else {
        absoluteOutputPath = path.resolve(outputPath, session.channelId!);  // 使用群聊ID作为路径
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

      const imageURL = URL.pathToFileURL(absoluteOutputPath).href;
      logInfo(imageURL)
      // 返回图片的绝对路径
      return imageURL;
    } catch (error) {
      logger.error(`下载图片失败: ${(error as Error).message}`);
      throw error;
    }
  }

  async function downloadImageAsBase64(imagePath: string): Promise<string | null> {
    try {
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        // 处理网络图片链接
        const response = await ctx.http.get<ArrayBuffer>(imagePath, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response);
        return buffer.toString('base64');
      } else {
        // 处理本地文件路径
        let localPath = imagePath;
        if (localPath.startsWith('file:///')) {
          localPath = URL.fileURLToPath(localPath);
        }
        const imageBuffer = await fs.promises.readFile(localPath);
        return imageBuffer.toString('base64');
      }
    } catch (error) {
      logger.error('Error converting image to base64:', error);
      return null;
    }
  }

  async function formatReply(reply: ReplyItem, forwardreturn = false): Promise<h | string> {
    let formattedReply: h | string;
    if (reply.type === 'image') {
      if (config.picture_save_to_local_send === '3') {
        const base64fileData = await downloadImageAsBase64(reply.text);
        formattedReply = h.image('data:image/png;base64,' + base64fileData);
      } else if (config.picture_save_to_local_send === '4') {
        formattedReply = h.image('data:image/png;base64,' + reply.text);
      } else {
        formattedReply = h.image(reply.text);
      }
    } else if (reply.type === 'mface') {
      formattedReply = h.image(reply.text);
    } else if (reply.type === 'text') {
      formattedReply = h.text(reply.text);
    } else if (reply.type === 'audio') {
      formattedReply = h.audio(reply.text);
    } else if (reply.type === 'video') {
      formattedReply = h.video(reply.text);
    } else if (reply.type === 'at') {
      formattedReply = h.at(reply.text);
    } else { // unknown
      formattedReply = reply.text;
    }
    const returnformatReply = forwardreturn ? h('message', {}, formattedReply) : formattedReply;
    logInfo("returnformatReply:");
    logInfo(returnformatReply);
    return returnformatReply;
  }

  function isValidKeyword(keyword: string): boolean {
    return !!keyword && keyword.trim().length > 0;
  }

  function calculateFontSize(numKeywords: number, maxFontSize: number, minFontSize: number): number {
    const m = (minFontSize - maxFontSize) / (40 - 1);
    const b = maxFontSize - m;
    return m * numKeywords + b;
  }

  // 查看关键词列表指令
  ctx.command(`keyword-dialogue/${ViewKeywordList}`)
    .action(async ({ session }) => {
      if (!session) return;
      if (!hasPermission(session, '查看关键词列表')) {
        await session.send(session.text(".channel_admin_auth"));
        return;
      }

      // 根据配置项确定搜索范围
      const searchFiles = (() => {
        switch (config.Search_Range) {
          case '1':
            return [`${session.channelId!}.json`]; // 仅搜索当前频道
          case '2':
            return fs.readdirSync(root).filter(file => file.endsWith('.json')); // 搜索所有文件
          case '3':
            return [`${session.channelId!}.json`, 'global.json']; // 搜索当前频道和全局
          default:
            return [];
        }
      })();

      let keywords: string[] = [];
      for (const file of searchFiles) {
        const filePath = path.join(root, file);
        if (fs.existsSync(filePath)) {
          const data: KeywordData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          keywords = keywords.concat(Object.keys(data));
        }
      }

      keywords = Array.from(new Set(keywords)); // 去重

      if (keywords.length === 0) {
        await session.send('当前没有关键词。');
        return;
      }

      if (config.Type_of_ViewKeywordList === '1') {
        // 返回文字列表
        const message = keywords.join('\n');
        await session.send(h.text(message));
      } else if (config.Type_of_ViewKeywordList === '2') {
        const puppeteer = ctx.get('puppeteer')
        if (!puppeteer) {
          await session.send("puppeteer 服务未启用。");
          return;
        }
        // 分页处理
        const pages = [];
        for (let i = 0; i < keywords.length; i += 40) {
          pages.push(keywords.slice(i, i + 40));
        }

        for (const pageKeywords of pages) {
          const page = await puppeteer.page();

          // 设置页面内容
          const fontSize = calculateFontSize(pageKeywords.length, 120, 40);

          const content = `
<html>
<head>
<style>
body {
background-color: black;
color: white;
font-family: Arial, sans-serif;
display: flex;
justify-content: center;
align-items: center;
height: 100vh;
margin: 0;
}
.container {
display: grid;
grid-template-columns: 1fr 1fr;
gap: 10px;
padding: 20px;
width: 1080px;
height: 1920px;
box-sizing: border-box;
}
.keyword {
word-wrap: break-word;
text-align: left;
white-space: pre-wrap;
background-color: #333;
padding: 10px;
border-radius: 5px;
font-size: ${fontSize}px; /* 使用计算出的字体大小 */
}
</style>
</head>
<body>
<div class="container">
${pageKeywords.map(keyword => `<div class="keyword">${keyword}</div>`).join('')}
</div>
</body>
</html>
        `;

          await page.setContent(content);
          await page.setViewport({ width: 1080, height: 1920 });

          const imageBuffer = await page.screenshot({ encoding: "binary" });
          await page.close();

          const imageMessage = h.image(imageBuffer, "image/png");
          await session.send(imageMessage);
        }
      }
    });

  // 搜索关键词
  ctx.command(`keyword-dialogue/${KeywordOfSearch} [Keyword]`)
    .action(async ({ session }, Keyword: string) => {
      if (!session) return;
      if (!hasPermission(session, '查找关键词')) {
        await session.send(session.text(".channel_admin_auth"));
        return;
      }
      if (!Keyword) {
        await session.send(h.text(session.text(`.no_Valid_Keyword`)));
        return;
      }

      const searchRange = config.Search_Range;
      const returnPreset = config.Find_Return_Preset;
      const returnLimit = config.Return_Limit;
      const searchFiles = (() => {
        switch (searchRange) {
          case '1':
            return [`${session.channelId!}.json`];
          case '2':
            return fs.readdirSync(root).filter(file => file.endsWith('.json'));
          case '3':
            return [`${session.channelId!}.json`, 'global.json'];
          default:
            return [`${session.channelId!}.json`]; // 默认本频道内搜索
        }
      })();


      let results: (string | h)[] = [];
      for (const file of searchFiles) {
        const filePath = path.join(root, file);
        if (fs.existsSync(filePath)) {
          // 读取文件内容
          const data: KeywordData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

          // 搜索关键词
          for (const key in data) {
            const normalizedKey = config.Treat_all_as_lowercase ? key.toLowerCase() : key;
            if (normalizedKey.includes(Keyword.toLowerCase())) {
              const channelId = file.replace('.json', '');

              // 使用 formatReply 处理每个回复组，确保图片和文字格式化正确
              const formattedReplies = await Promise.all(data[key].map(async replyGroup => {
                const formattedParts = await Promise.all(replyGroup.map(reply => formatReply(reply, false)));
                return h.normalize(formattedParts).join('');
              }));

              if (returnPreset === '1') {
                results.push(h.unescape(session.text(`.Keyword_found_content_only`, [key, formattedReplies.join('\n\n')])));
              } else if (returnPreset === '2') {
                results.push(h.unescape(session.text(`.Keyword_found_in_channel`, [channelId, key])));
              } else if (returnPreset === '3') {
                results.push(h.unescape(session.text(`.Keyword_found`, [channelId, key, formattedReplies.join('\n\n')])));
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
        await session.send(h.normalize(results).join('\n\n'));
      }
    });

  // 删除关键词
  ctx.command(`keyword-dialogue/${delete_command} [Keyword]`)
    .alias('删除关键词')
    .option('question', '-q [number] 指定删除回复的序号')
    .action(async ({ session, options }, Keyword: string) => {
      if (!session || !options) return;
      if (!hasPermission(session, '删除')) {
        await session.send(session.text(".channel_admin_auth"));
        return;
      }
      if (!Keyword) {
        await session.send(h.text(session.text(`.no_Valid_Keyword`)));
        return;
      }

      const filePath = path.join(root, `${session.channelId!}.json`);
      const specifiedIndex = (options as Options).question ?? null;

      await deleteKeywordReply(session, filePath, Keyword, config, specifiedIndex);
    });

  // 全局删除关键词
  ctx.command(`keyword-dialogue/${global_delete_command} [Keyword]`)
    .alias('全局删除关键词')
    .option('question', '-q [number] 指定删除回复的序号')
    .action(async ({ session, options }, Keyword: string) => {
      if (!session || !options) return;
      if (!hasPermission(session, '全局删除')) {
        await session.send(session.text(".channel_admin_auth"));
        return;
      }
      if (!Keyword) {
        await session.send(h.text(session.text(`.no_Valid_Keyword`)));
        return;
      }

      const filePath = path.join(root, 'global.json');
      const specifiedIndex = (options as Options).question ?? null;

      await deleteKeywordReply(session, filePath, Keyword, config, specifiedIndex);
    });

  // 全局添加关键词
  ctx.command(`keyword-dialogue/${global_add_command} [Keyword]`)
    .alias('全局添加关键词')
    .option('regex', '-x 添加正则关键词')
    .option('global', '-g 添加全局关键词')
    .option('unescape', '-u 取消转义以使用自定义正则')
    .option('forward', '-f <number> 指定回复方式：1.按照原版输入，原版输出 2.合为图文消息 3.合为一条图文消息的合并转发 4.按照原版输入，合并转发发送')
    .example("全局添加关键词 使用教程 -x  -f 2")
    .action(async ({ session, options }, Keyword: string) => {
      if (!session || !options) return;
      if (!hasPermission(session, '全局添加')) {
        await session.send(session.text(".channel_admin_auth"));
        return;
      }
      if (!isValidKeyword(Keyword)) {
        await session.send(h.text(session.text(`.no_Valid_Keyword`)));
        return;
      }
      (options as Options).global = true;
      const filePath = path.join(root, 'global.json');
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 2), 'utf-8');
      }
      await addKeywordReply(session, filePath, Keyword.trim(), config, options as Options);
    });

  //添加关键词
  ctx.command(`keyword-dialogue/${add_command} [Keyword]`)
    .alias('添加关键词')
    .option('global', '-g 添加全局关键词')
    .option('regex', '-x 添加正则关键词')
    .option('unescape', '-u 取消转义以使用自定义正则')
    .option('forward', '-f <number> 指定回复方式：1.按照原版输入，原版输出 2.合为图文消息 3.合为一条图文消息的合并转发 4.按照原版输入，合并转发发送')
    .example("添加关键词 使用教程 -x  -f 2")
    .action(async ({ session, options }, Keyword: string) => {
      if (!session || !options) return;
      if (!hasPermission(session, '添加')) {
        await session.send(session.text(".channel_admin_auth"));
        return;
      }
      if (!isValidKeyword(Keyword)) {
        await session.send(h.text(session.text(`.no_Valid_Keyword`)));
        return;
      }

      const filePath = (options as Options).global ? path.join(root, 'global.json') : path.join(root, `${session.channelId!}.json`);

      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 2), 'utf-8');
      }
      await addKeywordReply(session, filePath, Keyword.trim(), config, options as Options);
    });

  // 修改问答
  ctx.command(`keyword-dialogue/${KeywordOfFix} [Keyword]`)
    .option('question', '-q [number] 指定回复序号')
    .action(async ({ session, options }, Keyword: string) => {
      if (!session || !options) return;
      if (!hasPermission(session, '修改')) {
        await session.send(session.text(".channel_admin_auth"));
        return;
      }
      if (!isValidKeyword(Keyword)) {
        await session.send(h.text(session.text(`.no_Valid_Keyword`)));
        return;
      }

      const filePath = (options as Options).global
        ? path.join(root, 'global.json')
        : path.join(root, `${session.channelId!}.json`);
      if (!fs.existsSync(filePath)) {
        await session.send(h.text("未找到相关问答数据。"));
        return;
      }

      const data: KeywordData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const key = config.Treat_all_as_lowercase ? Keyword.toLowerCase() : Keyword;
      const replies = data[key];

      if (!replies) {
        await session.send(h.text(`关键词 "${Keyword}" 不存在。`));
        return;
      }

      const index = (options as Options).question ? (options as Options).question! - 1 : 0;
      if (index < 0 || index >= replies.length) {
        await session.send(h.text(`指定的回复序号无效，请提供正确的序号。`));
        return;
      }

      // 提示用户正在修改哪一条回复以及显示该回复内容
      await session.send(h.unescape(`您正在修改的是【${Keyword}】的第【${index + 1}】条回复`));

      // 获取当前需要修改的回复内容
      const currentReply = replies[index];

      // 定义一个变量存储完整的格式化内容
      let fullReplyContent: (string | h)[] = [];

      // 遍历所有的回复段落并格式化显示
      for (const replyPart of currentReply) {
        const formattedReply = await formatReply(replyPart, false);
        fullReplyContent.push(formattedReply);
      }

      // 将完整的内容发送给用户
      await session.send(h.normalize(fullReplyContent));

      // 提示用户输入新的回复内容
      await session.send(h.text("请一次性将回复内容完整输入以修改：\n➣输入 取消添加 以取消"));


      const timeout = config.addKeywordTime * 60000; // 转换为毫秒
      const reply = await session.prompt(timeout);

      if (reply.includes(KeywordOfEsc)) {
        await session.send(h.text(session.text(`.Cancel_operation`)));
        return;
      }
      if (!reply) {
        await session.send(h.text(session.text(`.Input_Timeout`)));
        return;
      }

      const replyData = await parseReplyContent(reply, root, session, options as Options);
      data[key][index] = replyData; // 修改指定的回复
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      await session.send(h.unescape((session.text(`.Reply_added`, [Keyword]))));
    });



  const middlewareFunction = async (session: Session, next: () => Promise<void | h.Fragment>) => {
    const { channelId, platform } = session;
    let anothercontent = unescapeHtml(session.content).trim();
    // 移除开头的at内容
    if (platform === 'qq' || platform === 'qqguild') {
      anothercontent = unescapeHtml(session.stripped.content).trim();
    }
    // 将输入内容转换为小写
    if (config.Treat_all_as_lowercase) {
      anothercontent = anothercontent.toLowerCase();
    }
    // 统一at消息的格式
    if (config.Unified_at_field) {
      anothercontent = anothercontent.replace(/<at id="(\d+)" name="[^"]*"\s*\/>/g, '<at id="$1"/>');
    }

    logInfo(`用户输入内容为\n${anothercontent}`)

    const globalFilePath = path.join(root, 'global.json');
    const channelFilePath = path.join(root, `${channelId}.json`);

    // 添加前缀处理逻辑
    const getPrefixedKeywords = (keyword: string, prefixes: string[]): string[] => {
      return prefixes.map(prefix => prefix + keyword);
    };

    // 获取关键词的指定后缀，支持【关键词+序号】与【关键词+空格+序号】来指定触发回复的第几条
    const getSuffixIndex = (inputKeyword: string, baseKeyword: string): number | null => {
      // 确保 baseKeyword 被正确转义以用于正则表达式
      const escapedBaseKeyword = escapeRegExp(baseKeyword);
      const suffixPattern = new RegExp(`^${escapedBaseKeyword}\\s*(\\d+)$`);
      const match = inputKeyword.match(suffixPattern);
      if (match) {
        return parseInt(match[1], 10); // 返回指定的序号
      }
      return null; // 没有匹配后缀
    };


    const sendReplies = async (session: Session, replyGroup: ReplyGroup) => {
      if (!replyGroup || replyGroup.length === 0) return;

      const replyway = replyGroup[0].replyway || config.MultisegmentAdditionRecoveryEffect;

      if (replyway === '1') {
        for (const reply of replyGroup) {
          logInfo(reply);
          const formattedReply = await formatReply(reply, false);
          await session.send(formattedReply);
        }
      } else if (replyway === '2') {
        const formattedParts = await Promise.all(replyGroup.map(reply => formatReply(reply, false)));
        const combinedReply = h.normalize(formattedParts);
        logInfo(combinedReply);
        await session.send(combinedReply);
      } else if (replyway === '3' || replyway === '4') {
        const isForward = replyway === '4';
        const result = h('figure');
        for (const reply of replyGroup) {
          const formattedReply = await formatReply(reply, isForward);
          if (typeof formattedReply === 'string') {
            result.children.push(h.text(formattedReply));
          } else {
            result.children.push(formattedReply);
          }
        }
        logInfo(result);
        await session.send(result);
      }
    };


    const checkAndSendRandomReply = async (filePath: string): Promise<boolean> => {
      if (fs.existsSync(filePath)) {
        const data: KeywordData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        for (const keyword in data) {
          const replies = data[keyword];
          if (!replies || replies.length === 0) continue;

          let isMatch = false;

          // 获取当前关键词对应的所有可能的带前缀的关键词
          const prefixedKeywords = getPrefixedKeywords(keyword, config.prefix || ["", "/", "#"]);

          // 遍历所有带前缀的关键词，看是否匹配
          for (const prefixedKeyword of prefixedKeywords) {
            const suffixIndex = getSuffixIndex(anothercontent, prefixedKeyword);

            if (keyword.startsWith('regex:')) {
              const regexPattern = keyword.substring(6);
              const regex = new RegExp(regexPattern);
              isMatch = regex.test(anothercontent);
            } else {
              // 新增：根据后缀序号来判断匹配情况
              if (anothercontent === prefixedKeyword) {
                isMatch = true; // 直接匹配
              } else if (suffixIndex !== null && suffixIndex > 0 && suffixIndex <= replies.length) {
                // 指定序号范围内
                await sendReplies(session, replies[suffixIndex - 1]);
                return true;
              }
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

  if (config.Preposition_middleware) {
    ctx.middleware(middlewareFunction, true); // 使用前置中间件
  } else {
    ctx.middleware(middlewareFunction); // 使用普通中间件
  }
}