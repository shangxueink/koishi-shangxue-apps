var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var fs = __toESM(require("node:fs"));
var path = __toESM(require("node:path"));
var URL = __toESM(require("node:url"));
var name = "steam-friend-status";
var inject = ["puppeteer", "database"];
var Config = import_koishi.Schema.intersect([
  import_koishi.Schema.object({
    SteamApiKey: import_koishi.Schema.string().description("Steam API Key，获取方式：https://partner.steamgames.com/doc/webapi_overview/auth").role("secret").required(),
    interval: import_koishi.Schema.number().default(300).description("查询间隔,单位：秒"),
    useSteamName: import_koishi.Schema.boolean().default(true).description("使用Steam昵称,关闭时使用的QQ昵称"),
    broadcastWithImage: import_koishi.Schema.boolean().default(true).description("播报时附带图片")
  }).description("基础设置"),
  import_koishi.Schema.object({
    showcardmode: import_koishi.Schema.union([
      import_koishi.Schema.const("1").description("展示 下方的 botname 与 头像"),
      import_koishi.Schema.const("2").description("展示 当前群组的名称与头像")
    ]).role("radio").description("替换Bot头像与ID为群头像").default("2"),
    showuserIdorsteamId: import_koishi.Schema.boolean().default(false).description("开启后展示用户的steamID，关闭后展示用户的userId")
  }).description("fork扩展设置"),
  import_koishi.Schema.union([
    import_koishi.Schema.object({
      showcardmode: import_koishi.Schema.const("1").required(),
      botname: import_koishi.Schema.string().default("Bot of Koishi").description("展示的bot昵称")
    }),
    import_koishi.Schema.object({})
  ]),
  import_koishi.Schema.object({
    databasemaxlength: import_koishi.Schema.number().default(100).description("数据表 允许绑定的数据条数上限<br>绑定达到上限时会提示：`该Bot已达到绑定玩家数量上限`"),
    steamIdOffset: import_koishi.Schema.number().default(76561197960265730).description("steamIdOffset").experimental(),
    steamWebApiUrl: import_koishi.Schema.string().description("steam 的 Web Api 请求地址").default("http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/").role("link").experimental(),
    steamstatus: import_koishi.Schema.dict(String).role("table").default(
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
    loggerinfo: import_koishi.Schema.boolean().default(false).description("日志调试模式")
  }).description("开发者设置")
]);
function apply(ctx, config) {
  const rootpath = ctx.baseDir;
  const sourcepath = path.join(rootpath, `data/${name}`);
  const imgpath = path.join(sourcepath, "img");
  const steamIdOffset = config.steamIdOffset;
  const steamWebApiUrl = config.steamWebApiUrl;
  const steamstatus = config.steamstatus;
  ctx.model.extend("channel", {
    usingSteam: { type: "boolean", initial: false, nullable: false },
    channelName: { type: "string", initial: null, nullable: true }
  });
  ctx.model.extend("SteamUser", {
    userId: "string",
    userName: "string",
    steamId: "string",
    steamName: "string",
    effectGroups: "list",
    lastPlayedGame: "string",
    lastUpdateTime: "string"
  }, { primary: "userId" });
  initBotsHeadshots(ctx);
  ctx.setInterval(function() {
    steamInterval(ctx, config);
  }, config.interval * 1e3);
  ctx.command("steam-friend-status", "查询群友steam状态");
  ctx.command("steam-friend-status/绑定steam <steamid:string>", "绑定steam账号").option("id", "-i <id:string> 指定userid").option("name", "-n <name:string> 指定usename").usage("steamid参数 可以是好友码 也可以是steamID").example("绑定steam 123456789").example("绑定steam 76561197960265728").example("绑定steam 123456789 -i 114514 -n 上学大人").example("绑定steam 76561197960265728 -i 114514 -n 上学大人").action(async ({ session, options }, steamid) => {
    if (steamid == void 0) {
      await session.execute("绑定steam -h");
      return "缺少参数";
    }
    let result;
    if (!options.id || !options.name) {
      result = await bindPlayer(ctx, steamid, session, config.SteamApiKey);
    } else {
      result = await bindPlayer(ctx, steamid, session, config.SteamApiKey, options.id || options.name, options.name || options.id);
    }
    await session.send(result);
    await session.execute("更新steam");
    return;
  });
  ctx.command("steam-friend-status/解绑steam", "解绑steam账号").action(async ({ session }) => {
    const result = await unbindPlayer(ctx, session);
    return result;
  });
  ctx.command("steam-friend-status/解绑全部steam", "解绑在所有群的steam账号").action(async ({ session }) => {
    const result = await unbindAll(ctx, session);
    return result;
  });
  ctx.command("steam-friend-status/steam群报 <word:text>", "开启或关闭群通报").example("steam群报 on").example("steam群报 off").channelFields(["usingSteam"]).userFields(["authority"]).action(async ({ session }, text) => {
    const eventMemberRoles = session.event.member.roles || [];
    const authorRoles = session.author.roles || [];
    const roles = Array.from(/* @__PURE__ */ new Set([...eventMemberRoles, ...authorRoles]));
    const hasRequiredRole = roles.includes("admin") || roles.includes("owner");
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
  });
  ctx.command("steam-friend-status/更新steam", "更新绑定的steam用户的头像").action(async ({ session }) => {
    await updataPlayerHeadshots(ctx, config.SteamApiKey);
    return "更新成功，可以使用 看看steam 指令来查看啦~";
  });
  ctx.command("steam-friend-status/看看steam", "查看当前绑定过的玩家状态").action(async ({ session }) => {
    const { channelId, bot, event } = session;
    let channelName = "当前群组";
    if (typeof bot.getGuildList === "function") {
      try {
        const groupList = await bot.getGuildList();
        const groups = groupList.data;
        channelName = getNameFromChannelId(groups, channelId);
        if (channelName) {
          ctx.database.set("channel", { id: session.channelId }, { channelName });
        }
      } catch (error) {
        console.error("Error getting guild list:", error);
        channelName = "当前群组";
      }
    }
    const allUserData = await ctx.database.get("SteamUser", {});
    const users = await selectUsersByGroup(allUserData, session.event.channel.id);
    if (users.length === 0) {
      return "本群无人绑定";
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
    logInfo(data);
    if (config.showcardmode === "1") {
      return await getFriendStatusImg(ctx, data, session.event.selfId);
    } else {
      await getGroupHeadshot(ctx, session.event.channel.id);
      return await getFriendStatusImg(ctx, data, session.selfId, session.event.channel.id, channelName);
    }
  });
  ctx.command("steam-friend-status/steam信息", "查看自己的好友码和ID").action(async ({ session }) => {
    return `你的好友码为: ${await getSelfFriendcode(ctx, session)}`;
  });
  function getNameFromChannelId(groups, channelId) {
    if (!Array.isArray(groups)) {
      groups = [groups];
      groups = groups.map((group2) => ({ id: group2.guildId }));
    }
    const group = groups.find((group2) => group2.id === channelId);
    return group ? group.name : void 0;
  }
  __name(getNameFromChannelId, "getNameFromChannelId");
  async function initBotsHeadshots(ctx2) {
    if (!fs.existsSync(sourcepath)) {
      fs.mkdirSync(sourcepath);
      if (!fs.existsSync(imgpath)) {
        fs.mkdirSync(imgpath);
      }
    }
    const channel = await ctx2.database.get("channel", {});
    let tempbots = [];
    for (let i = 0; i < channel.length; i++) {
      const platforms = ["onebot", "red", "chronocat"];
      if (platforms.includes(channel[i].platform)) {
        tempbots.push(channel[i].assignee);
        if (channel[i].usingSteam) {
          await getGroupHeadshot(ctx2, channel[i].id);
        }
      }
    }
    const bots = [...new Set(tempbots)];
    for (let i = 0; i < bots.length; i++) {
      await getBotHeadshot(ctx2, bots[i]);
    }
  }
  __name(initBotsHeadshots, "initBotsHeadshots");
  function getSteamId(steamIdOrSteamFriendCode) {
    if (!Number(steamIdOrSteamFriendCode)) {
      return "";
    }
    const steamId = Number(steamIdOrSteamFriendCode);
    if (steamId < steamIdOffset) {
      const result = BigInt(steamId) + BigInt(steamIdOffset);
      return result.toString();
    } else {
      return steamIdOrSteamFriendCode;
    }
  }
  __name(getSteamId, "getSteamId");
  async function bindPlayer(ctx2, friendcodeOrId, session, steamApiKey, inputid, inputname) {
    const userid = inputid || session.event.user.id;
    const channelid = session.event.channel.id;
    if (!userid || !channelid) {
      return "未检测到用户ID或群ID";
    }
    const database = await ctx2.database.get("SteamUser", {});
    if (database.length >= config.databasemaxlength) {
      return "该Bot已达到绑定玩家数量上限";
    }
    let steamId = getSteamId(friendcodeOrId);
    const steamUserInfo = await getSteamUserInfo(ctx2, steamApiKey, steamId);
    if (!steamUserInfo || !steamUserInfo.response || !steamUserInfo.response.players || steamUserInfo.response.players.length === 0) {
      return "无法获取到steam用户信息，请检查输入的steamId是否正确或者检查网络环境";
    }
    const playerData = steamUserInfo.response.players[0];
    const userDataInDatabase = await ctx2.database.get("SteamUser", { userId: userid });
    if (userDataInDatabase.length === 0) {
      let userName = inputname || session.event.user.name;
      if (!userName) {
        userName = userid;
      }
      const userData = {
        userId: userid,
        userName,
        steamId: playerData.steamid,
        steamName: playerData.personaname,
        effectGroups: [session.event.channel.id],
        lastPlayedGame: playerData.gameextrainfo != void 0 ? playerData.gameextrainfo : void 0,
        lastUpdateTime: Date.now().toString()
      };
      await ctx2.database.create("SteamUser", userData);
      const headshot = await ctx2.http.get(playerData.avatarmedium, { responseType: "arraybuffer" });
      const filepath = path.join(sourcepath, `img/steamuser${playerData.steamid}.jpg`);
      fs.writeFileSync(filepath, Buffer.from(headshot));
      return "绑定成功";
    }
    if (userDataInDatabase[0].effectGroups.includes(channelid)) {
      return `已在该群绑定过，无需再次绑定`;
    } else {
      const effectGroups = userDataInDatabase[0].effectGroups;
      effectGroups.push(channelid);
      await ctx2.database.set("SteamUser", { userId: userid }, { effectGroups });
      return "绑定成功";
    }
  }
  __name(bindPlayer, "bindPlayer");
  async function unbindPlayer(ctx2, session) {
    const userid = session.event.user?.id;
    const channelid = session.event.channel.id;
    if (!userid || !channelid) {
      return "未获取到用户ID或者群ID，解绑失败";
    }
    const userData = (await ctx2.database.get("SteamUser", { userId: userid }))[0];
    if (userData && userData.effectGroups.includes(channelid)) {
      if (userData.effectGroups.length == 1) {
        const filepath = path.join(sourcepath, `img/steamuser${userData.steamId}.jpg`);
        fs.unlink(filepath, (err) => {
          ctx2.logger.error("删除头像出错", err);
        });
        ctx2.database.remove("SteamUser", { userId: userid });
      }
      const effectGroups = userData.effectGroups;
      effectGroups.splice(effectGroups.indexOf(channelid), 1);
      await ctx2.database.set("SteamUser", { userId: userid }, { effectGroups });
      return "解绑成功";
    } else {
      return "用户未曾绑定，无法解绑";
    }
  }
  __name(unbindPlayer, "unbindPlayer");
  async function unbindAll(ctx2, session) {
    const userid = session.event.user?.id;
    if (!userid) {
      return "未获取到用户ID，解绑失败";
    }
    const userData = await ctx2.database.get("SteamUser", { userId: userid });
    if (userData.length < 1) {
      return "用户未曾绑定，无法解绑";
    }
    const filepath = path.join(sourcepath, `img/steamuser${userData[0].steamId}.jpg`);
    fs.unlink(filepath, (err) => {
      ctx2.logger.error("删除头像出错", err);
    });
    await ctx2.database.remove("SteamUser", { userId: userid });
    return "解绑成功";
  }
  __name(unbindAll, "unbindAll");
  async function getSteamUserInfoByDatabase(ctx2, steamusers, steamApiKey) {
    try {
      let steamIds = [];
      for (let i = 0; i < steamusers.length; i++) {
        steamIds.push(steamusers[i].steamId.toString());
      }
      const requestUrl = `${steamWebApiUrl}?key=${steamApiKey}&steamids=${steamIds.join(",")}`;
      const response = await ctx2.http.get(requestUrl);
      if (!response || response.response.players.length === 0) {
        ctx2.logger.warn("No players found in the response or response is undefined.");
        return void 0;
      }
      return response;
    } catch (error) {
      ctx2.logger.error("Error fetching Steam user info:", error);
      return void 0;
    }
  }
  __name(getSteamUserInfoByDatabase, "getSteamUserInfoByDatabase");
  async function getSteamUserInfo(ctx2, steamApiKey, steamid) {
    const requestUrl = `${steamWebApiUrl}?key=${steamApiKey}&steamIds=${steamid}`;
    const response = await ctx2.http.get(requestUrl);
    if (!response || response.response.players.length === 0) {
      return void 0;
    }
    return response;
  }
  __name(getSteamUserInfo, "getSteamUserInfo");
  async function getUserStatusChanged(ctx2, steamUserInfo, usingSteamName) {
    if (steamUserInfo === void 0) return;
    let msgArray = {};
    for (let i = 0; i < steamUserInfo.response.players.length; i++) {
      const playerTemp = steamUserInfo.response.players[i];
      const userData = (await ctx2.database.get("SteamUser", { steamId: playerTemp.steamid }))[0];
      if (userData.steamName !== playerTemp.personaname) {
        ctx2.database.set("SteamUser", { steamId: playerTemp.steamid }, { steamName: playerTemp.personaname });
      }
      if (!userData.lastPlayedGame && playerTemp.gameextrainfo) {
        await ctx2.database.set("SteamUser", { steamId: userData.steamId }, { lastPlayedGame: playerTemp.gameextrainfo });
        msgArray[userData.userId] = `${usingSteamName ? playerTemp.personaname : userData.userName} 开始玩 ${playerTemp.gameextrainfo} 了
`;
        continue;
      }
      if (userData.lastPlayedGame != playerTemp.gameextrainfo && userData.lastPlayedGame && playerTemp.gameextrainfo) {
        const lastPlayedGame = userData.lastPlayedGame;
        await ctx2.database.set("SteamUser", { steamId: userData.steamId }, { lastPlayedGame: playerTemp.gameextrainfo });
        msgArray[userData.userId] = `${usingSteamName ? playerTemp.personaname : userData.userName} 不玩 ${lastPlayedGame} 了，开始玩 ${playerTemp.gameextrainfo} 了
`;
        continue;
      }
      if (!playerTemp.gameextrainfo && userData.lastPlayedGame) {
        const lastPlayedGame = userData.lastPlayedGame;
        await ctx2.database.set("SteamUser", { steamId: userData.steamId }, { lastPlayedGame: "" });
        msgArray[userData.userId] = `${usingSteamName ? playerTemp.personaname : userData.userName} 不玩 ${lastPlayedGame} 了
`;
        continue;
      }
    }
    return msgArray;
  }
  __name(getUserStatusChanged, "getUserStatusChanged");
  async function getFriendStatusImg(ctx2, userData, botid, channelid, channelname) {
    const gamingUsers = userData.response.players.filter((player) => player.gameextrainfo);
    const onlineUsers = userData.response.players.filter((player) => player.personastate != 0 && !player.gameextrainfo);
    onlineUsers.sort((a, b) => a.personastate - b.personastate);
    const offlineUsers = userData.response.players.filter((player) => player.personastate == 0);
    const url = URL.pathToFileURL(path.join(__dirname, "./../data/html/steamFriendList.html")).href;
    const convertImageToBase64 = /* @__PURE__ */ __name(async (filePath) => {
      const fs2 = require("fs").promises;
      const data = await fs2.readFile(filePath);
      return `data:image/jpeg;base64,${data.toString("base64")}`;
    }, "convertImageToBase64");
    let botname;
    let headshotfileName = "";
    let GroupHeadshotBase64 = "";
    if (channelid) {
      botname = channelname || `当前群组`;
      try {
        await getGroupHeadshot(ctx2, channelid);
        headshotfileName = `group${channelid}.jpg`;
        GroupHeadshotBase64 = await convertImageToBase64(path.join(rootpath, `data/steam-friend-status/img/${headshotfileName}`));
      } catch (error) {
        ctx2.logger.error("获取群组头像失败", error);
      }
    } else {
      botname = config.botname;
      try {
        await getBotHeadshot(ctx2, botid);
        headshotfileName = `bot${botid}.jpg`;
        GroupHeadshotBase64 = await convertImageToBase64(path.join(rootpath, `data/steam-friend-status/img/${headshotfileName}`));
      } catch (error) {
        ctx2.logger.error("获取Bot头像失败", error);
      }
    }
    const allUserData = await ctx2.database.get("SteamUser", {});
    const page = await ctx2.puppeteer.page();
    await page.setViewport({ width: 227, height: 224 + userData.response.players.length * 46, deviceScaleFactor: 2 });
    await page.goto(url);
    const gamingUsersBase64 = await Promise.all(
      gamingUsers.map((user) => convertImageToBase64(path.join(rootpath, `data/steam-friend-status/img/steamuser${user.steamid}.jpg`)))
    );
    const onlineUsersBase64 = await Promise.all(
      onlineUsers.map((user) => convertImageToBase64(path.join(rootpath, `data/steam-friend-status/img/steamuser${user.steamid}.jpg`)))
    );
    const offlineUsersBase64 = await Promise.all(
      offlineUsers.map((user) => convertImageToBase64(path.join(rootpath, `data/steam-friend-status/img/steamuser${user.steamid}.jpg`)))
    );
    const findUserId = /* @__PURE__ */ __name((steamId) => {
      const user = allUserData.find((u) => u.steamId === steamId);
      return user ? user.userName : steamId;
    }, "findUserId");
    const processedGamingUsers = gamingUsers.map((user) => ({
      ...user,
      displayName: config.showuserIdorsteamId ? user.steamid : findUserId(user.steamid)
    }));
    const processedOnlineUsers = onlineUsers.map((user) => ({
      ...user,
      displayName: config.showuserIdorsteamId ? user.steamid : findUserId(user.steamid)
    }));
    const processedOfflineUsers = offlineUsers.map((user) => ({
      ...user,
      displayName: config.showuserIdorsteamId ? user.steamid : findUserId(user.steamid)
    }));
    await page.evaluate(
      (GroupHeadshotBase642, botname2, gamingUsersBase642, onlineUsersBase642, offlineUsersBase642, steamstatus2, processedGamingUsers2, processedOnlineUsers2, processedOfflineUsers2) => {
        var bot = document.getElementsByClassName("bot")[0];
        var botHeadshot = bot.querySelector("img");
        var botName = bot.querySelector("p");
        var gamingList = document.getElementById("ul-gaming");
        var onlineList = document.getElementById("ul-online");
        var offlineList = document.getElementById("ul-offline");
        var titles = document.getElementsByClassName("title");
        botHeadshot.setAttribute("src", GroupHeadshotBase642);
        botName.innerHTML = `<b>${botname2}</b>`;
        titles[0].innerHTML = `游戏中(${processedGamingUsers2.length})`;
        titles[1].innerHTML = `在线好友(${processedOnlineUsers2.length})`;
        titles[2].innerHTML = `离线好友(${processedOfflineUsers2.length})`;
        processedGamingUsers2.forEach((user, i) => {
          const li = document.createElement("li");
          li.setAttribute("class", "friend");
          li.innerHTML = `
              <img src="${gamingUsersBase642[i]}" class="headshot-online">
              <div class="name-and-status">
                  <p class="name-gaming">${user.personaname}(${user.displayName})</p>
                  <p class="status-gaming">${user.gameextrainfo}</p>
              </div>`;
          gamingList.appendChild(li);
        });
        processedOnlineUsers2.forEach((user, i) => {
          const li = document.createElement("li");
          li.setAttribute("class", "friend");
          li.innerHTML = `
              <img src="${onlineUsersBase642[i]}" class="headshot-online">
              <div class="name-and-status">
                  <p class="name-online">${user.personaname}(${user.displayName})</p>
                  <p class="status-online">${steamstatus2[user.personastate]}</p>
              </div>`;
          onlineList.appendChild(li);
        });
        processedOfflineUsers2.forEach((user, i) => {
          const li = document.createElement("li");
          li.setAttribute("class", "friend");
          li.innerHTML = `
              <img src="${offlineUsersBase642[i]}" class="headshot-offline">
              <div class="name-and-status">
                  <p class="name-offline">${user.personaname}(${user.displayName})</p>
                  <p class="status-offline">${steamstatus2[user.personastate]}</p>
              </div>`;
          offlineList.appendChild(li);
        });
      },
      GroupHeadshotBase64,
      botname,
      gamingUsersBase64,
      onlineUsersBase64,
      offlineUsersBase64,
      steamstatus,
      processedGamingUsers,
      processedOnlineUsers,
      processedOfflineUsers
    );
    const image = await page.screenshot({ fullPage: true, type: "png", encoding: "binary" });
    await page.close();
    return import_koishi.h.image(image, "image/png");
  }
  __name(getFriendStatusImg, "getFriendStatusImg");
  async function steamInterval(ctx2, config2) {
    const allUserData = await ctx2.database.get("SteamUser", {});
    const userdata = await getSteamUserInfoByDatabase(ctx2, allUserData, config2.SteamApiKey);
    const changeMessage = await getUserStatusChanged(ctx2, userdata, config2.useSteamName);
    if (!changeMessage || Object.keys(changeMessage).length === 0) {
      return;
    }
    if (Object?.keys(changeMessage)?.length > 0) {
      const supportPlatform = ["onebot", "red", "chronocat"];
      const channel = await ctx2.database.get("channel", { usingSteam: true, platform: supportPlatform });
      for (let i = 0; i < channel.length; i++) {
        const groupMessage = [];
        for (let j = 0; j < allUserData.length; j++) {
          if (allUserData[j].effectGroups.includes(channel[i].id) && changeMessage[allUserData[j].userId]) {
            groupMessage.push(changeMessage[allUserData[j].userId]);
          }
        }
        const userInGroup = selectApiUsersByGroup(userdata, allUserData, channel[i].id);
        if (groupMessage.length > 0) {
          if (config2.broadcastWithImage) {
            let image;
            if (config2.showcardmode === "1") {
              image = await getFriendStatusImg(ctx2, userInGroup, channel[i].assignee);
            } else {
              image = await getFriendStatusImg(ctx2, userInGroup, channel[i].assignee, channel[i].id, channel[i].channelName);
            }
            groupMessage.push(image);
          }
          const bot = ctx2.bots[`${channel[i].platform}:${channel[i].assignee}`];
          if (bot) {
            bot.sendMessage(channel[i].id, groupMessage);
          }
        }
      }
    } else {
      return;
    }
  }
  __name(steamInterval, "steamInterval");
  async function updataPlayerHeadshots(ctx2, apiKey) {
    const allUserData = await ctx2.database.get("SteamUser", {});
    const userdata = (await getSteamUserInfoByDatabase(ctx2, allUserData, apiKey)).response.players;
    for (let i = 0; i < userdata.length; i++) {
      const headshot = await ctx2.http.get(userdata[i].avatarmedium, { responseType: "arraybuffer" });
      const filepath = path.join(imgpath, `steamuser${userdata[i].steamid}.jpg`);
      fs.writeFileSync(filepath, Buffer.from(headshot));
    }
  }
  __name(updataPlayerHeadshots, "updataPlayerHeadshots");
  async function getSelfFriendcode(ctx2, session) {
    const userdata = await ctx2.database.get("SteamUser", { userId: session.event.user.id });
    if (userdata.length == 0) {
      return "用户未绑定,无法获得好友码";
    }
    let userName = session.event.user.name;
    if (!userName) {
      userName = session.event.user.id;
    }
    if (userdata[0].userName != userName) {
      await ctx2.database.set("SteamUser", { userId: session.event.user.id }, { userName });
    }
    const steamID = userdata[0].steamId;
    const steamFriendCode = BigInt(steamID) - BigInt(steamIdOffset);
    return steamFriendCode.toString();
  }
  __name(getSelfFriendcode, "getSelfFriendcode");
  function selectUsersByGroup(steamusers, groupid) {
    const users = steamusers.filter((user) => user.effectGroups.includes(groupid));
    return users;
  }
  __name(selectUsersByGroup, "selectUsersByGroup");
  function selectApiUsersByGroup(steamusers_api, steamusers_database, groupid) {
    let result = {
      response: {
        players: []
      }
    };
    const databaseUsers = selectUsersByGroup(steamusers_database, groupid);
    for (let i = 0; i < steamusers_api.response.players.length; i++) {
      const tempplayer = steamusers_api.response.players[i];
      if (databaseUsers.find((user) => user.steamId == tempplayer.steamid)) {
        result.response.players.push(tempplayer);
      }
    }
    return result;
  }
  __name(selectApiUsersByGroup, "selectApiUsersByGroup");
  async function getGroupHeadshot(ctx2, groupid) {
    const groupheadshot = await ctx2.http.get(`http://p.qlogo.cn/gh/${groupid}/${groupid}/0`, { responseType: "arraybuffer" });
    const filepath = path.join(imgpath, `group${groupid}.jpg`);
    fs.writeFileSync(filepath, Buffer.from(groupheadshot));
  }
  __name(getGroupHeadshot, "getGroupHeadshot");
  async function getBotHeadshot(ctx2, userid) {
    const userheadshot = await ctx2.http.get(`http://q.qlogo.cn/headimg_dl?dst_uin=${userid}&spec=640`, { responseType: "arraybuffer" });
    const filepath = path.join(imgpath, `bot${userid}.jpg`);
    fs.writeFileSync(filepath, Buffer.from(userheadshot));
  }
  __name(getBotHeadshot, "getBotHeadshot");
  function logInfo(...args) {
    if (config.loggerinfo) {
      ctx.logger.info(...args);
    }
  }
  __name(logInfo, "logInfo");
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name
});
