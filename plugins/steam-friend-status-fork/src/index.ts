import { Context, Schema, h, Session } from 'koishi'
import { } from 'koishi-plugin-puppeteer'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as URL from 'node:url'

export const name = 'steam-friend-status'

export const inject = ['puppeteer', "database"]

export const usage = `
---

<h3>📝 指令列表</h3>

<h4>🔗 账号管理</h4>
<ul>
  <li><code>绑定steam &lt;steamid&gt;</code> - 绑定自己的 Steam 账号</li>
  <li><code>绑定steam &lt;steamid&gt; @用户</code> - 为其他用户绑定 Steam 账号</li>
  <li><code>解绑steam</code> - 解绑自己的 Steam 账号</li>
  <li><code>解绑steam @用户</code> - 为其他用户解绑 Steam 账号</li>
  <li><code>解绑全部steam</code> - 解绑在所有群的 Steam 账号</li>
</ul>

<h4>📊 状态查看</h4>
<ul>
  <li><code>看看steam</code> - 查看当前群所有绑定用户的游戏状态</li>
  <li><code>steam信息</code> - 查看自己的好友码和 Steam ID</li>
  <li><code>更新steam</code> - 更新所有用户的头像信息</li>
</ul>

<h4>⚙️ 群组设置</h4>
<ul>
  <li><code>steam群报 on</code> - 开启群内游戏状态播报</li>
  <li><code>steam群报 off</code> - 关闭群内游戏状态播报</li>
</ul>

---

`;

declare module 'koishi' {
  interface Tables {
    SteamUser: SteamUser
  }
  interface Channel {
    usingSteam: boolean,
    channelName: string,
  }
}

interface SteamUser {
  userId: string,
  userName: string, //用户名
  steamId: string,
  steamName: string,  //Steam用户名
  effectGroups: string[],
  lastPlayedGame: string,
  lastUpdateTime: string,
}


export const Config = Schema.intersect([
  Schema.object({
    SteamApiKey: Schema.string().description('Steam API Key，获取方式：https://partner.steamgames.com/doc/webapi_overview/auth').role('secret').required(),
    interval: Schema.number().default(300).description('查询间隔,单位：秒'),
    useSteamName: Schema.boolean().default(true).description('使用Steam昵称,关闭时使用的QQ昵称'),
    broadcastWithImage: Schema.boolean().default(true).description('播报时附带图片'),
  }).description("基础设置"),

  Schema.object({
    showcardmode: Schema.union([
      Schema.const('1').description('展示 下方的 botname 与 头像'),
      Schema.const('2').description('展示 当前群组的名称与头像'),
    ]).role('radio').description("替换Bot头像与ID为群头像").default("2"),
    showuserIdorsteamId: Schema.boolean().default(false).description('开启后展示用户的steamID，关闭后展示用户的userId'),
    showOfflineFriends: Schema.boolean().default(true).description('显示离线好友，关闭后在【看看steam】指令中不显示离线好友'),
  }).description('fork扩展设置'),
  Schema.union([
    Schema.object({
      showcardmode: Schema.const("1").required(),
      botname: Schema.string().default("Bot of Koishi").description('展示的bot昵称'),
    }),
    Schema.object({}),
  ]),

  Schema.object({
    databasemaxlength: Schema.number().default(100).description("数据表 允许绑定的数据条数上限<br>绑定达到上限时会提示：`该Bot已达到绑定玩家数量上限`"),
    steamIdOffset: Schema.number().default(76561197960265728).description("steamIdOffset").experimental(),
    steamWebApiUrl: Schema.string().description('steam 的 Web Api 请求地址').default("http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/").role('link').experimental(),
    steamstatus: Schema.dict(String).role('table').default(
      {
        "0": "🔘 离线",
        "1": "🟢 在线",
        "2": "⛔ 忙碌",
        "3": "🌙 离开",
        "4": "💤 打盹",
        "5": "🔄 想交易",
        "6": "🎮 想玩"
      }
    ).description("steamstatus").experimental(),
    loggerinfo: Schema.boolean().default(false).description("日志调试模式"),
  }).description("开发者设置"),
])

export function apply(ctx: Context, config) {
  // write your plugin here
  const rootpath = ctx.baseDir
  const sourcepath = path.join(rootpath, `data/${name}`)
  const imgpath = path.join(sourcepath, 'img')

  const steamIdOffset: number = config.steamIdOffset
  const steamWebApiUrl = config.steamWebApiUrl
  const steamstatus: { [key: number]: string } = config.steamstatus


  ctx.model.extend('channel', {
    usingSteam: { type: 'boolean', initial: false, nullable: false },
    channelName: { type: 'string', initial: null, nullable: true },
  })

  ctx.model.extend('SteamUser', {
    userId: 'string',
    userName: 'string',
    steamId: 'string',
    steamName: 'string',
    effectGroups: 'list',
    lastPlayedGame: 'string',
    lastUpdateTime: 'string',
  }, { primary: 'userId' })

  initBotsHeadshots(ctx);
  ctx.setInterval(function () { steamInterval(ctx, config) }, config.interval * 1000)
  ctx.command('steam-friend-status', "查询群友steam状态")
  ctx.command('steam-friend-status/绑定steam <steamid:string> [user]', "绑定steam账号")
    .usage('steamid参数 可以是好友码 也可以是steamID')
    .example("绑定steam 123456789")
    .example("绑定steam 76561197960265728")
    .example("绑定steam 123456789 @用户")
    .example("绑定steam 76561197960265728 @用户")
    .action(async ({ session }, steamid, user) => {
      if (steamid == undefined) {
        await session.execute("绑定steam -h")
        return '缺少参数'
      }

      let result
      if (!user) {
        // 没有指定用户，绑定自己
        result = await bindPlayer(ctx, steamid, session, config.SteamApiKey)
      } else {
        // 解析@用户
        const parsedUser = h.parse(user)[0];
        if (!parsedUser || parsedUser.type !== 'at' || !parsedUser.attrs.id) {
          return '无效的用户输入，请使用@用户的格式';
        }

        const targetUserId = parsedUser.attrs.id;
        let targetUsername = parsedUser.attrs.name ||
          (typeof session.bot.getUser === 'function' ?
            ((await session.bot.getUser(targetUserId))?.name || targetUserId) :
            targetUserId);

        result = await bindPlayer(ctx, steamid, session, config.SteamApiKey, targetUserId, targetUsername)
      }

      await session.send(result)
      await session.execute("更新steam")
      return
    })

  ctx.command('steam-friend-status/解绑steam [user]', "解绑steam账号")
    .example("解绑steam")
    .example("解绑steam @用户")
    .action(async ({ session }, user) => {
      let result
      if (!user) {
        // 没有指定用户，解绑自己
        const userid = session.event.user?.id
        const channelid = session.event.channel.id
        result = await unbindPlayer(ctx, userid, channelid)
      } else {
        // 解析@用户
        const parsedUser = h.parse(user)[0];
        if (!parsedUser || parsedUser.type !== 'at' || !parsedUser.attrs.id) {
          return '无效的用户输入，请使用@用户的格式';
        }

        const targetUserId = parsedUser.attrs.id;
        const channelid = session.event.channel.id
        result = await unbindPlayer(ctx, targetUserId, channelid)
      }
      return result
    })

  ctx.command('steam-friend-status/解绑全部steam', '解绑在所有群的steam账号')
    .action(async ({ session }) => {
      const result = await unbindAll(ctx, session)
      return result
    })

  ctx.command('steam-friend-status/steam群报 <word:text>', "开启或关闭群通报")
    .example("steam群报 on")
    .example("steam群报 off")
    .channelFields(['usingSteam'])
    .userFields(['authority'])
    .action(async ({ session }, text) => {
      // 获取 session.event.member.roles 和 session.author.roles
      const eventMemberRoles = session.event.member.roles || [];
      const authorRoles = session.author.roles || [];
      // 合并两个角色列表并去重
      const roles = Array.from(new Set([...eventMemberRoles, ...authorRoles]));
      // 检查是否有所需角色
      const hasRequiredRole = roles.includes('admin') || roles.includes('owner');
      // 检查用户是否有足够的权限：authority > 1 或者角色是 admin 或 owner
      if (session.user.authority > 1 || hasRequiredRole) {
        switch (text) {
          case "on":
          case "开启":
            session.channel.usingSteam = true;
            return "开启成功";
          case "off":
          case "关闭":
            session.channel.usingSteam = false;
            return "关闭成功";
          default:
            return "无效指令";
        }
      } else {
        return "您没有权限执行此操作";
      }
    })

  ctx.command('steam-friend-status/更新steam', "更新绑定的steam用户的头像")
    .action(async ({ session }) => {
      await updataPlayerHeadshots(ctx, config.SteamApiKey)
      return "更新成功，可以使用 看看steam 指令来查看啦~"
    })

  ctx.command('steam-friend-status/看看steam', "查看当前绑定过的玩家状态")
    .action(async ({ session }) => {
      // 获取群组昵称
      const { channelId, bot, event } = session;
      let channelName = "当前群组";

      if (typeof bot.getGuildList === 'function') {
        try {
          const groupList = await bot.getGuildList();
          const groups = groupList.data;
          channelName = getNameFromChannelId(groups, channelId);
          if (channelName) {
            ctx.database.set('channel', { id: session.channelId }, { channelName: channelName })
          }
        } catch (error) {
          console.error("Error getting guild list:", error);
          channelName = "当前群组"; // 或者其他默认值
        }
      }


      const allUserData = await ctx.database.get('SteamUser', {})
      const users = await selectUsersByGroup(allUserData, session.event.channel.id)
      if (users.length === 0) {
        return '本群无人绑定'
      }
      let data;
      try {
        data = await getSteamUserInfoByDatabase(ctx, users, config.SteamApiKey);
        if (!data) {
          ctx.logger.warn("获取 Steam 用户信息失败，可能是因为请求过于频繁。请稍后再试。");
          return;
        }
      } catch (error) {
        ctx.logger.error(error);
        if (error.response && error.response.status === 429) {
          ctx.logger.warn("Steam API 请求过于频繁，请稍后再试。");
          return;
        } else {
          return "获取 Steam 用户信息时发生错误：" + error.message;
        }
      }



      logInfo(data)
      if (config.showcardmode === "1") {
        return await getFriendStatusImg(ctx, data, session.event.selfId);
      }
      else {
        await getGroupHeadshot(ctx, session.event.channel.id)
        return await getFriendStatusImg(ctx, data, session.selfId, session.event.channel.id, channelName);
      }

    })

  ctx.command('steam-friend-status/steam信息', "查看自己的好友码和ID")
    .action(async ({ session }) => {
      return `你的好友码为: ${await getSelfFriendcode(ctx, session)}`
    })

  function getNameFromChannelId(groups: any[], channelId: string): string | undefined {
    if (!Array.isArray(groups)) {
      groups = [groups];
      groups = groups.map((group: any) => ({ id: group.guildId }));
    }

    const group = groups.find(group => group.id === channelId);
    return group ? group.name : undefined;
  }

  //初始化QQ相关平台的bot头像
  async function initBotsHeadshots(ctx: Context) {

    //将资源文件放在koishi的data目录下
    if (!fs.existsSync(sourcepath)) {
      fs.mkdirSync(sourcepath)
      if (!fs.existsSync(imgpath)) {
        fs.mkdirSync(imgpath)
      }
    }
    const channel = await ctx.database.get('channel', {})
    let tempbots = []
    for (let i = 0; i < channel.length; i++) {
      const platforms = ['onebot', 'red', 'chronocat']
      if (platforms.includes(channel[i].platform)) {
        tempbots.push(channel[i].assignee)
        if (channel[i].usingSteam) {
          await getGroupHeadshot(ctx, channel[i].id)
        }
      }
    }
    const bots = [...new Set(tempbots)]
    for (let i = 0; i < bots.length; i++) {
      await getBotHeadshot(ctx, bots[i])
    }
  }

  interface SteamUserInfo {
    response: {
      players: {
        steamid: string,//用户ID
        communityvisibilitystate: number,//社区可见性状态
        profilestate: number,//用户是否配置了社区配置文件
        personaname: string,//玩家角色名
        commentpermission: number,//注释许可，如果设置，表示简档允许公开评论
        profileurl: string,//玩家Steam社区个人资料的完整URL
        avatar: string,//用户32*32大小头像
        avatarmedium: string,//用户64*64大小头像
        avatarfull: string,//用户184*184大小头像
        avatarhash: string,//头像哈希值
        lastlogoff: number,//用户上次联机的时间，以unix时间表示
        personastate: number,//用户的当前状态。0 -离线，1 -在线，2 -忙碌，3 -离开，4 -打盹，5 -想交易，6 -想玩。如果玩家的个人资料是私人的，这将始终是“0”，除非用户已将其状态设置为“正在交易”或“正在玩游戏”，因为即使个人资料是私人的，一个bug也会显示这些状态。
        realname: string,//真实姓名，如果玩家设置过了的话
        primaryclanid: string,//玩家的主要群组
        timecreated: number,//玩家帐户创建的时间
        personastateflags: number,//
        loccountrycode: string,//用户的居住国
        gameid: number,//玩家正在游玩的游戏ID
        gameserverip: string,//玩家正在游玩的游戏服务器地址
        gameextrainfo: string//玩家正在游玩的游戏名
      }[]
    }
  }

  //将steam好友码转换成steamid
  function getSteamId(steamIdOrSteamFriendCode: string): string {
    if (!Number(steamIdOrSteamFriendCode)) {
      return ''
    }
    const steamId = Number(steamIdOrSteamFriendCode)
    if (steamId < steamIdOffset) {
      const result = BigInt(steamId) + BigInt(steamIdOffset)
      return result.toString()
    }
    else {
      return steamIdOrSteamFriendCode
    }
  }
  // 绑定玩家
  async function bindPlayer(ctx: Context, friendcodeOrId: string, session: Session, steamApiKey: string, inputid?: string, inputname?: string): Promise<string> {
    const userid = inputid || session.event.user.id; // 使用传入的 userId 或当前用户的 userId
    const channelid = session.event.channel.id;
    if (!userid || !channelid) {
      return '未检测到用户ID或群ID';
    }
    const database = await ctx.database.get('SteamUser', {});
    if (database.length >= config.databasemaxlength) {
      return '该Bot已达到绑定玩家数量上限';
    }
    let steamId = getSteamId(friendcodeOrId);
    const steamUserInfo = await getSteamUserInfo(ctx, steamApiKey, steamId);

    // 检查 getSteamUserInfo 的返回值是否有效
    if (!steamUserInfo || !steamUserInfo.response || !steamUserInfo.response.players || steamUserInfo.response.players.length === 0) {
      return '无法获取到steam用户信息，请检查输入的steamId是否正确或者检查网络环境';
    }

    const playerData = steamUserInfo.response.players[0];
    const userDataInDatabase = await ctx.database.get('SteamUser', { userId: userid });

    if (userDataInDatabase.length === 0) {
      let userName = inputname || session.event.user.name; // 使用传入的 username 或当前用户的 username
      if (!userName) {
        userName = userid;
      }
      const userData: SteamUser = {
        userId: userid,
        userName: userName,
        steamId: playerData.steamid,
        steamName: playerData.personaname,
        effectGroups: [session.event.channel.id],
        lastPlayedGame: playerData.gameextrainfo != undefined ? playerData.gameextrainfo : undefined,
        lastUpdateTime: Date.now().toString()
      };
      await ctx.database.create('SteamUser', userData);
      const headshot = await ctx.http.get(playerData.avatarmedium, { responseType: 'arraybuffer' });
      const filepath = path.join(sourcepath, `img/steamuser${playerData.steamid}.jpg`);
      fs.writeFileSync(filepath, Buffer.from(headshot));
      return '绑定成功';
    }

    if (userDataInDatabase[0].effectGroups.includes(channelid)) {
      return `已在该群绑定过，无需再次绑定`;
    } else {
      const effectGroups = userDataInDatabase[0].effectGroups;
      effectGroups.push(channelid);
      await ctx.database.set('SteamUser', { userId: userid }, { effectGroups: effectGroups });
      return '绑定成功';
    }
  }

  //解绑玩家
  async function unbindPlayer(ctx: Context, userid: string, channelid: string): Promise<string> {
    if (!userid || !channelid) {
      return '未获取到用户ID或者群ID，解绑失败'
    }
    const userData = (await ctx.database.get('SteamUser', { userId: userid }))[0]
    if (userData && userData.effectGroups.includes(channelid)) {
      if (userData.effectGroups.length == 1) {
        const filepath = path.join(sourcepath, `img/steamuser${userData.steamId}.jpg`)
        fs.unlink(filepath, (err) => {
          if (err) {
            ctx.logger.error('删除头像出错', err)
          }
        })
        ctx.database.remove('SteamUser', { userId: userid })
      }
      const effectGroups = userData.effectGroups
      effectGroups.splice(effectGroups.indexOf(channelid), 1)
      await ctx.database.set('SteamUser', { userId: userid }, { effectGroups: effectGroups })
      return '解绑成功'
    }
    else {
      return '用户未曾绑定，无法解绑'
    }
  }

  //解绑全部
  async function unbindAll(ctx: Context, session: Session): Promise<string> {
    const userid = session.event.user?.id
    if (!userid) {
      return '未获取到用户ID，解绑失败'
    }
    const userData = (await ctx.database.get('SteamUser', { userId: userid }))
    if (userData.length < 1) {
      return '用户未曾绑定，无法解绑'
    }
    const filepath = path.join(sourcepath, `img/steamuser${userData[0].steamId}.jpg`)
    fs.unlink(filepath, (err) => {
      if (err) {
        ctx.logger.error('删除头像出错', err)
      }
    })
    await ctx.database.remove('SteamUser', { userId: userid })
    return '解绑成功'
  }
  // 查询数据库中玩家信息
  async function getSteamUserInfoByDatabase(ctx: Context, steamusers: SteamUser[], steamApiKey: string): Promise<SteamUserInfo | undefined> {
    try {
      let steamIds: string[] = [];
      for (let i = 0; i < steamusers.length; i++) {
        steamIds.push(steamusers[i].steamId.toString());
      }

      const requestUrl = `${steamWebApiUrl}?key=${steamApiKey}&steamids=${steamIds.join(',')}`;

      const response = await ctx.http.get(requestUrl);
      if (!response || response.response.players.length === 0) {
        ctx.logger.warn('No players found in the response or response is undefined.');
        return undefined;
      }
      return response as SteamUserInfo;
    } catch (error) {
      ctx.logger.error('Error fetching Steam user info:', error);
      return undefined;
    }
  }

  //检查用户是否存在
  async function getSteamUserInfo(ctx: Context, steamApiKey: string, steamid: string): Promise<SteamUserInfo> {
    const requestUrl = `${steamWebApiUrl}?key=${steamApiKey}&steamIds=${steamid}`
    const response = await ctx.http.get(requestUrl)
    if (!response || response.response.players.length === 0) {
      return undefined
    }
    return response as SteamUserInfo
  }
  //检查玩家状态是否变化
  async function getUserStatusChanged(ctx: Context, steamUserInfo: SteamUserInfo, usingSteamName: boolean): Promise<{ [key: string]: string }> {
    if (steamUserInfo === undefined) return
    let msgArray: { [key: string]: string } = {}
    for (let i = 0; i < steamUserInfo.response.players.length; i++) {
      const playerTemp = steamUserInfo.response.players[i]
      const userData = (await ctx.database.get('SteamUser', { steamId: playerTemp.steamid }))[0]
      //如果steam名称有更改
      if (userData.steamName !== playerTemp.personaname) {
        ctx.database.set('SteamUser', { steamId: playerTemp.steamid }, { steamName: playerTemp.personaname })
      }
      //开始玩了
      if (!userData.lastPlayedGame && playerTemp.gameextrainfo) {
        await ctx.database.set('SteamUser', { steamId: userData.steamId }, { lastPlayedGame: playerTemp.gameextrainfo })
        msgArray[userData.userId] = (`${usingSteamName ? playerTemp.personaname : userData.userName} 开始玩 ${playerTemp.gameextrainfo} 了\n`)
        continue
      }
      //换了一个游戏玩
      if (userData.lastPlayedGame != playerTemp.gameextrainfo && userData.lastPlayedGame && playerTemp.gameextrainfo) {
        const lastPlayedGame = userData.lastPlayedGame
        await ctx.database.set('SteamUser', { steamId: userData.steamId }, { lastPlayedGame: playerTemp.gameextrainfo })
        msgArray[userData.userId] = (`${usingSteamName ? playerTemp.personaname : userData.userName} 不玩 ${lastPlayedGame} 了，开始玩 ${playerTemp.gameextrainfo} 了\n`)
        continue
      }
      //不玩辣
      if (!playerTemp.gameextrainfo && userData.lastPlayedGame) {
        const lastPlayedGame = userData.lastPlayedGame
        await ctx.database.set('SteamUser', { steamId: userData.steamId }, { lastPlayedGame: '' })
        msgArray[userData.userId] = (`${usingSteamName ? playerTemp.personaname : userData.userName} 不玩 ${lastPlayedGame} 了\n`)
        continue
      }
    }
    return msgArray
  }


  // 获取好友状态图片
  async function getFriendStatusImg(ctx: Context, userData: SteamUserInfo, botid: string, channelid?: string, channelname?: string) {
    const gamingUsers = userData.response.players.filter(player => player.gameextrainfo); // 筛选出游戏中的好友
    const onlineUsers = userData.response.players.filter(player => player.personastate != 0 && !player.gameextrainfo); // 筛选出在线但未游戏的好友
    onlineUsers.sort((a, b) => a.personastate - b.personastate); // 根据在线状态排序
    const offlineUsers = config.showOfflineFriends ? userData.response.players.filter(player => player.personastate == 0) : []; // 根据配置决定是否筛选离线好友
    const url = URL.pathToFileURL(path.join(__dirname, './../data/html/steamFriendList.html')).href; // 模板文件路径

    // 图片转 Base64 函数
    const convertImageToBase64 = async (filePath) => {
      const fs = require('fs').promises;
      const data = await fs.readFile(filePath);
      return `data:image/jpeg;base64,${data.toString('base64')}`;
    };

    // 根据 showcardmode 设置展示内容
    let botname; // 默认 Bot 名称
    let headshotfileName = '';
    let GroupHeadshotBase64 = '';
    if (channelid) {
      botname = channelname || `当前群组`;
      // 使用群组头像与群组名称
      try {
        await getGroupHeadshot(ctx, channelid); // 获取群组头像
        headshotfileName = `group${channelid}.jpg`;
        GroupHeadshotBase64 = await convertImageToBase64(path.join(rootpath, `data/steam-friend-status/img/${headshotfileName}`));
      } catch (error) {
        ctx.logger.error('获取群组头像失败', error);
      }
    } else {
      botname = config.botname;
      // 使用 Bot 头像与 Bot 名称
      try {
        await getBotHeadshot(ctx, botid); // 获取 Bot 头像
        headshotfileName = `bot${botid}.jpg`;
        GroupHeadshotBase64 = await convertImageToBase64(path.join(rootpath, `data/steam-friend-status/img/${headshotfileName}`));
      } catch (error) {
        ctx.logger.error('获取Bot头像失败', error);
      }
    }

    // 从数据库获取所有用户数据
    const allUserData = await ctx.database.get('SteamUser', {});

    // 创建 puppeteer 页面
    const page = await ctx.puppeteer.page();
    // 计算实际显示的用户数量，如果不显示离线好友则不计算离线用户
    const displayedUsers = gamingUsers.length + onlineUsers.length + (config.showOfflineFriends ? offlineUsers.length : 0);
    // 计算需要显示的分组数量：游戏中、在线好友，以及可能的离线好友
    const displayedGroups = 2 + (config.showOfflineFriends && offlineUsers.length > 0 ? 1 : 0);
    // 基础高度：头部75px + 好友标题30px + 底部padding15px + 每个分组标题28px + 每个用户46px
    const baseHeight = 75 + 30 + 15;
    const groupTitleHeight = displayedGroups * 28;
    const userHeight = displayedUsers * 46;
    const totalHeight = baseHeight + groupTitleHeight + userHeight;
    await page.setViewport({ width: 227, height: totalHeight, deviceScaleFactor: 2 });
    await page.goto(url);

    // 转换好友头像为 Base64
    const gamingUsersBase64 = await Promise.all(
      gamingUsers.map(user => convertImageToBase64(path.join(rootpath, `data/steam-friend-status/img/steamuser${user.steamid}.jpg`)))
    );
    const onlineUsersBase64 = await Promise.all(
      onlineUsers.map(user => convertImageToBase64(path.join(rootpath, `data/steam-friend-status/img/steamuser${user.steamid}.jpg`)))
    );
    const offlineUsersBase64 = offlineUsers.length > 0 ? await Promise.all(
      offlineUsers.map(user => convertImageToBase64(path.join(rootpath, `data/steam-friend-status/img/steamuser${user.steamid}.jpg`)))
    ) : [];

    const findUserId = (steamId) => {
      const user = allUserData.find(u => u.steamId === steamId);
      return user ? user.userName : steamId; // 找不到对应用户时默认展示 SteamID
    };

    // 处理用户数据
    const processedGamingUsers = gamingUsers.map(user => ({
      ...user,
      displayName: config.showuserIdorsteamId ? user.steamid : findUserId(user.steamid),
    }));

    const processedOnlineUsers = onlineUsers.map(user => ({
      ...user,
      displayName: config.showuserIdorsteamId ? user.steamid : findUserId(user.steamid),
    }));

    const processedOfflineUsers = offlineUsers.map(user => ({
      ...user,
      displayName: config.showuserIdorsteamId ? user.steamid : findUserId(user.steamid),
    }));

    // 渲染页面
    await page.evaluate(
      (GroupHeadshotBase64, botname, gamingUsersBase64, onlineUsersBase64, offlineUsersBase64, steamstatus, processedGamingUsers, processedOnlineUsers, processedOfflineUsers, showOfflineFriends) => {
        var bot = document.getElementsByClassName('bot')[0];
        var botHeadshot = bot.querySelector('img');
        var botName = bot.querySelector('p');
        var gamingList = document.getElementById('ul-gaming');
        var onlineList = document.getElementById('ul-online');
        var offlineList = document.getElementById('ul-offline');
        var titles = document.getElementsByClassName('title');

        // 根据配置动态渲染 bot 信息
        botHeadshot.setAttribute('src', GroupHeadshotBase64);
        botName.innerHTML = `<b>${botname}</b>`;

        // 更新标题
        titles[0].innerHTML = `游戏中(${processedGamingUsers.length})`;
        titles[1].innerHTML = `在线好友(${processedOnlineUsers.length})`;
        if (showOfflineFriends) {
          titles[2].innerHTML = `离线好友(${processedOfflineUsers.length})`;
        } else {
          // 完全隐藏离线好友分组，包括标题和列表
          const offlineGroup = titles[2].parentElement;
          (offlineGroup as HTMLElement).style.display = 'none';
          // 移除在线好友分组的底部边框，因为它现在是最后一个可见分组
          const onlineGroup = titles[1].parentElement;
          (onlineGroup as HTMLElement).style.borderBottom = 'none';
        }

        // 渲染游戏中的好友列表
        processedGamingUsers.forEach((user, i) => {
          const li = document.createElement('li');
          li.setAttribute('class', 'friend');
          li.innerHTML = `
              <img src="${gamingUsersBase64[i]}" class="headshot-online">
              <div class="name-and-status">
                  <p class="name-gaming">${user.personaname}(${user.displayName})</p>
                  <p class="status-gaming">${user.gameextrainfo}</p>
              </div>`;
          gamingList.appendChild(li);
        });

        // 渲染在线的好友列表
        processedOnlineUsers.forEach((user, i) => {
          const li = document.createElement('li');
          li.setAttribute('class', 'friend');
          li.innerHTML = `
              <img src="${onlineUsersBase64[i]}" class="headshot-online">
              <div class="name-and-status">
                  <p class="name-online">${user.personaname}(${user.displayName})</p>
                  <p class="status-online">${steamstatus[user.personastate]}</p>
              </div>`;
          onlineList.appendChild(li);
        });

        // 渲染离线的好友列表
        if (showOfflineFriends) {
          processedOfflineUsers.forEach((user, i) => {
            const li = document.createElement('li');
            li.setAttribute('class', 'friend');
            li.innerHTML = `
                <img src="${offlineUsersBase64[i]}" class="headshot-offline">
                <div class="name-and-status">
                    <p class="name-offline">${user.personaname}(${user.displayName})</p>
                    <p class="status-offline">${steamstatus[user.personastate]}</p>
                </div>`;
            offlineList.appendChild(li);
          });
        }
        // 在这里不需要隐藏offlineList，已经在上面隐藏了整个分组
      },
      GroupHeadshotBase64, botname, gamingUsersBase64, onlineUsersBase64, offlineUsersBase64, steamstatus, processedGamingUsers, processedOnlineUsers, processedOfflineUsers, config.showOfflineFriends
    );


    // 截图并返回
    const image = await page.screenshot({ fullPage: true, type: 'png', encoding: 'binary' });
    await page.close();
    return h.image(image, 'image/png');
  }

  //循环检测玩家状态
  async function steamInterval(ctx: Context, config) {
    const allUserData = await ctx.database.get('SteamUser', {})
    const userdata = await getSteamUserInfoByDatabase(ctx, allUserData, config.SteamApiKey)
    const changeMessage: { [key: string]: string } = await getUserStatusChanged(ctx, userdata, config.useSteamName)
    // 检查 changeMessage 是否为 undefined 或 null
    if (!changeMessage || Object.keys(changeMessage).length === 0) {
      return;
    }
    if (Object?.keys(changeMessage)?.length > 0) {
      const supportPlatform = ['onebot', 'red', 'chronocat']
      const channel = await ctx.database.get('channel', { usingSteam: true, platform: supportPlatform })
      for (let i = 0; i < channel.length; i++) {
        const groupMessage: Array<string | h> = []
        for (let j = 0; j < allUserData.length; j++) {
          if (allUserData[j].effectGroups.includes(channel[i].id) && changeMessage[allUserData[j].userId]) {
            groupMessage.push(changeMessage[allUserData[j].userId])
          }
        }
        const usersInGroup = selectUsersByGroup(allUserData, channel[i].id)
        const userInGroup = await getSteamUserInfoByDatabase(ctx, usersInGroup, config.SteamApiKey)
        if (groupMessage.length > 0) {
          if (config.broadcastWithImage) {
            let image
            if (config.showcardmode === "1") {
              image = await getFriendStatusImg(ctx, userInGroup, channel[i].assignee)
            }
            else {
              image = await getFriendStatusImg(ctx, userInGroup, channel[i].assignee, channel[i].id, channel[i].channelName)
            }
            groupMessage.push(image)
          }
          const bot = ctx.bots[`${channel[i].platform}:${channel[i].assignee}`]
          if (bot) {
            bot.sendMessage(channel[i].id, groupMessage)
          }
        }
      }
    } else {
      return
    }
  }

  //更新头像信息
  async function updataPlayerHeadshots(ctx: Context, apiKey: string) {
    const allUserData = await ctx.database.get('SteamUser', {})
    const userdata = (await getSteamUserInfoByDatabase(ctx, allUserData, apiKey)).response.players
    for (let i = 0; i < userdata.length; i++) {
      const headshot = await ctx.http.get(userdata[i].avatarmedium, { responseType: 'arraybuffer' })
      const filepath = path.join(imgpath, `steamuser${userdata[i].steamid}.jpg`)
      fs.writeFileSync(filepath, Buffer.from(headshot))
    }
  }

  //获取自己的好友码
  async function getSelfFriendcode(ctx: Context, session: Session): Promise<string> {
    const userdata = await ctx.database.get('SteamUser', { userId: session.event.user.id })
    if (userdata.length == 0) {
      return '用户未绑定,无法获得好友码'
    }
    let userName = session.event.user.name
    if (!userName) {
      userName = session.event.user.id
    }
    if (userdata[0].userName != userName) {
      await ctx.database.set('SteamUser', { userId: session.event.user.id }, { userName })
    }
    const steamID = userdata[0].steamId
    const steamFriendCode = BigInt(steamID) - BigInt(steamIdOffset)
    return steamFriendCode.toString()
  }

  //筛选在特定群中的用户
  function selectUsersByGroup(steamusers: SteamUser[], groupid: string): SteamUser[] {
    const users = steamusers.filter(user => user.effectGroups.includes(groupid))
    return users
  }

  /*
  //根据群号筛选从API中获取的用户数据
  function selectApiUsersByGroup(steamusers_api: SteamUserInfo, steamusers_database: SteamUser[], groupid: string): SteamUserInfo {
    let result: SteamUserInfo = {
      response: {
        players: []
      }
    }
    const databaseUsers = selectUsersByGroup(steamusers_database, groupid)
    for (let i = 0; i < steamusers_api.response.players.length; i++) {
      const tempplayer = steamusers_api.response.players[i]
      if (databaseUsers.find(user => user.steamId == tempplayer.steamid)) {
        result.response.players.push(tempplayer)
      }
    }
    return result
  }
  */

  /*
  async function getAllUserFriendCodesInGroup(ctx: Context, groupid: string): Promise<string> {
    let result = []
    const allUserData = await ctx.database.get('SteamUser', {})
    const groupUserData = selectUsersByGroup(allUserData, groupid)
    for (let i = 0; i < groupUserData.length; i++) {
      result.push(`${groupUserData[i].userName}: ${(BigInt(groupUserData[i].steamId) - BigInt(steamIdOffset)).toString()}`)
    }
    if (result.length == 0) {
      return '本群没有用户绑定'
    }
    else {
      return result.join('\n')
    }
  }
  */

  async function getGroupHeadshot(ctx: Context, groupid: string): Promise<void> {
    const groupheadshot = await ctx.http.get(`http://p.qlogo.cn/gh/${groupid}/${groupid}/0`, { responseType: 'arraybuffer' })
    const filepath = path.join(imgpath, `group${groupid}.jpg`)
    fs.writeFileSync(filepath, Buffer.from(groupheadshot))
  }

  async function getBotHeadshot(ctx: Context, userid: string) {
    const userheadshot = await ctx.http.get(`http://q.qlogo.cn/headimg_dl?dst_uin=${userid}&spec=640`, { responseType: 'arraybuffer' })
    const filepath = path.join(imgpath, `bot${userid}.jpg`)
    fs.writeFileSync(filepath, Buffer.from(userheadshot))
  }

  function logInfo(...args: any[]) {
    if (config.loggerinfo) {
      (ctx.logger.info as (...args: any[]) => void)(...args);
    }
  }
}