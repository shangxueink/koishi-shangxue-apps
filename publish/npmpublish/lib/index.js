"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = exports.inject = exports.name = void 0;
exports.apply = apply;
const koishi_1 = require("koishi");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
exports.name = 'steam-friend-status';
exports.inject = ['puppeteer', "database"];
exports.Config = koishi_1.Schema.intersect([
    koishi_1.Schema.object({
        SteamApiKey: koishi_1.Schema.string().description('Steam API Key，获取方式：https://partner.steamgames.com/doc/webapi_overview/auth').required(),
        interval: koishi_1.Schema.number().default(300).description('查询间隔,单位：秒'),
        useSteamName: koishi_1.Schema.boolean().default(true).description('使用Steam昵称,关闭时使用的QQ昵称'),
        broadcastWithImage: koishi_1.Schema.boolean().default(true).description('播报时附带图片'),
        useGroupHead: koishi_1.Schema.boolean().default(false).description('此功能以被下方 showcardmode 代替<br>替换Bot头像与ID为群头像').deprecated(),
    }).description("基础设置"),
    koishi_1.Schema.object({
        botname: koishi_1.Schema.string().default("Bot of Koishi").description('展示的bot昵称'),
        showcardmode: koishi_1.Schema.union([
            koishi_1.Schema.const('1').description('展示 上方的botname 与 头像'),
            koishi_1.Schema.const('2').description('展示 当前群组的名称与头像'),
        ]).role('radio').description("替换Bot头像与ID为群头像").default("2"),
        showuserIdorsteamId: koishi_1.Schema.boolean().default(false).description('开启后展示用户的steamID，关闭后展示用户的userId'),
    }).description('fork扩展设置'),
]);
function apply(ctx, config) {
    // write your plugin here
    const rootpath = ctx.baseDir;
    const sourcepath = path.join(rootpath, `data/${exports.name}`);
    const imgpath = path.join(sourcepath, 'img');
    ctx.model.extend('channel', {
        usingSteam: { type: 'boolean', initial: false, nullable: false },
        channelName: { type: 'string', initial: null, nullable: true },
    });
    ctx.model.extend('SteamUser', {
        userId: 'string',
        userName: 'string',
        steamId: 'string',
        steamName: 'string',
        effectGroups: 'list',
        lastPlayedGame: 'string',
        lastUpdateTime: 'string',
    }, { primary: 'userId' });
    initBotsHeadshots(ctx);
    ctx.setInterval(function () { steamInterval(ctx, config); }, config.interval * 1000);
    ctx.command('steam-friend-status', "查询群友steam状态");
    ctx.command('steam-friend-status/绑定steam <steamid:text>')
        .usage('绑定steam账号，参数可以是好友码也可以是ID')
        .action(async ({ session }, steamid) => {
        if (steamid == undefined) {
            return '缺少参数';
        }
        const result = await bindPlayer(ctx, steamid, session, config.SteamApiKey);
        return result;
    });
    ctx.command('steam-friend-status/解绑steam')
        .usage('解绑steam账号')
        .action(async ({ session }) => {
        const result = await unbindPlayer(ctx, session);
        return result;
    });
    ctx.command('steam-friend-status/解绑全部steam')
        .usage('解绑在所有群的steam账号')
        .action(async ({ session }) => {
        const result = await unbindAll(ctx, session);
        return result;
    });
    ctx.command('steam-friend-status/steam群报 <word:text>')
        .usage('开启或关闭群通报，输入[steam on/off]或者[开启/关闭steam]来开关')
        .shortcut('开启steam', { args: ['on'] })
        .shortcut('关闭steam', { args: ['off'] })
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
        }
        else {
            return "您没有权限执行此操作";
        }
    });
    ctx.command('steam-friend-status/更新steam')
        .usage('更新绑定的steam用户的头像')
        .action(async ({ session }) => {
        await updataPlayerHeadshots(ctx, config.SteamApiKey);
        return "更新成功";
    });
    ctx.command('steam-friend-status/看看steam')
        .usage('查看当前绑定过的玩家状态')
        .action(async ({ session }) => {
        //ctx.logger.info(session)
        // 获取群组昵称
        const { channelId, bot, event } = session;
        const groupList = await bot.getGuildList();
        const groups = groupList.data;
        const channelName = getNameFromChannelId(groups, channelId);
        if (channelName) {
            ctx.database.set('channel', { id: session.channelId }, { channelName: channelName });
        }
        const allUserData = await ctx.database.get('SteamUser', {});
        const users = await selectUsersByGroup(allUserData, session.event.channel.id);
        if (users.length === 0) {
            return '本群无人绑定';
        }
        const data = await getSteamUserInfoByDatabase(ctx, users, config.SteamApiKey);
        if (config.showcardmode === "1") {
            return await getFriendStatusImg(ctx, data, session.event.selfId);
        }
        else {
            await getGroupHeadshot(ctx, session.event.channel.id);
            // 获取群组昵称
            const { channelId, bot, event } = session;
            const groupList = await bot.getGuildList();
            const groups = groupList.data;
            const channelName = getNameFromChannelId(groups, channelId);
            return await getFriendStatusImg(ctx, data, session.event.selfId, session.event.channel.id, channelName);
        }
    });
    ctx.command('steam-friend-status/steam信息')
        .usage('查看自己的好友码和ID')
        .action(async ({ session }) => {
        return `你的好友码为: ${await getSelfFriendcode(ctx, session)}`;
    });
    function getNameFromChannelId(groups, channelId) {
        if (!Array.isArray(groups)) {
            groups = [groups];
            groups = groups.map((group) => ({ id: group.guildId }));
        }
        const group = groups.find(group => group.id === channelId);
        return group ? group.name : undefined;
    }
    //初始化QQ相关平台的bot头像
    async function initBotsHeadshots(ctx) {
        //将资源文件放在koishi的data目录下
        if (!fs.existsSync(sourcepath)) {
            fs.mkdirSync(sourcepath);
            if (!fs.existsSync(imgpath)) {
                fs.mkdirSync(imgpath);
            }
        }
        const channel = await ctx.database.get('channel', {});
        let tempbots = [];
        for (let i = 0; i < channel.length; i++) {
            const platforms = ['onebot', 'red', 'chronocat'];
            if (platforms.includes(channel[i].platform)) {
                tempbots.push(channel[i].assignee);
                if (channel[i].usingSteam) {
                    await getGroupHeadshot(ctx, channel[i].id);
                }
            }
        }
        const bots = [...new Set(tempbots)];
        for (let i = 0; i < bots.length; i++) {
            await getBotHeadshot(ctx, bots[i]);
        }
    }
    const steamIdOffset = 76561197960265728;
    const steamWebApiUrl = 'http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/';
    const steamstatus = { 0: '离线', 1: '在线', 2: '忙碌', 3: '离开', 4: '打盹', 5: '想交易', 6: '想玩' };
    //将steam好友码转换成steamid
    function getSteamId(steamIdOrSteamFriendCode) {
        if (!Number(steamIdOrSteamFriendCode)) {
            return '';
        }
        const steamId = Number(steamIdOrSteamFriendCode);
        if (steamId < steamIdOffset) {
            const result = BigInt(steamId) + BigInt(steamIdOffset);
            return result.toString();
        }
        else {
            return steamIdOrSteamFriendCode;
        }
    }
    //绑定玩家
    async function bindPlayer(ctx, friendcodeOrId, session, steamApiKey) {
        const userid = session.event.user.id;
        const channelid = session.event.channel.id;
        if (!userid || !channelid) {
            return '未检测到用户ID或群ID';
        }
        const database = await ctx.database.get('SteamUser', {});
        if (database.length >= 100) {
            return '该Bot已达到绑定玩家数量上限';
        }
        let steamId = getSteamId(friendcodeOrId);
        const playerData = (await getSteamUserInfo(ctx, steamApiKey, steamId)).response.players[0];
        if (playerData == undefined) {
            return '无法获取到steam用户信息，请检查输入的steamId是否正确或者检查网络环境';
        }
        const userDataInDatabase = await ctx.database.get('SteamUser', { userId: userid });
        if (userDataInDatabase.length === 0) {
            let userName = session.event.user.name;
            if (!userName) {
                userName = userid;
            }
            const userData = {
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
        }
        else {
            const effectGroups = userDataInDatabase[0].effectGroups;
            effectGroups.push(channelid);
            await ctx.database.set('SteamUser', { userId: userid }, { effectGroups: effectGroups });
            return '绑定成功';
        }
    }
    //解绑玩家
    async function unbindPlayer(ctx, session) {
        const userid = session.event.user?.id;
        const channelid = session.event.channel.id;
        if (!userid || !channelid) {
            return '未获取到用户ID或者群ID，解绑失败';
        }
        const userData = (await ctx.database.get('SteamUser', { userId: userid }))[0];
        if (userData && userData.effectGroups.includes(channelid)) {
            if (userData.effectGroups.length == 1) {
                const filepath = path.join(sourcepath, `img/steamuser${userData.steamId}.jpg`);
                fs.unlink(filepath, (err) => { ctx.logger.error('删除头像出错', err); });
                ctx.database.remove('SteamUser', { userId: userid });
            }
            const effectGroups = userData.effectGroups;
            effectGroups.splice(effectGroups.indexOf(channelid), 1);
            await ctx.database.set('SteamUser', { userId: userid }, { effectGroups: effectGroups });
            return '解绑成功';
        }
        else {
            return '用户未曾绑定，无法解绑';
        }
    }
    //解绑全部
    async function unbindAll(ctx, session) {
        const userid = session.event.user?.id;
        if (!userid) {
            return '未获取到用户ID，解绑失败';
        }
        const userData = (await ctx.database.get('SteamUser', { userId: userid }));
        if (userData.length < 1) {
            return '用户未曾绑定，无法解绑';
        }
        const filepath = path.join(sourcepath, `img/steamuser${userData[0].steamId}.jpg`);
        fs.unlink(filepath, (err) => { ctx.logger.error('删除头像出错', err); });
        await ctx.database.remove('SteamUser', { userId: userid });
        return '解绑成功';
    }
    // 查询数据库中玩家信息
    async function getSteamUserInfoByDatabase(ctx, steamusers, steamApiKey) {
        try {
            let steamIds = [];
            for (let i = 0; i < steamusers.length; i++) {
                steamIds.push(steamusers[i].steamId.toString());
            }
            const requestUrl = `${steamWebApiUrl}?key=${steamApiKey}&steamids=${steamIds.join(',')}`;
            //ctx.logger.info(`Fetching Steam user info from API: ${requestUrl}`);
            const response = await ctx.http.get(requestUrl);
            if (!response || response.response.players.length === 0) {
                //ctx.logger.warn('No players found in the response or response is undefined.');
                return undefined;
            }
            //ctx.logger.info('Steam user info fetched successfully.');
            return response;
        }
        catch (error) {
            ctx.logger.error('Error fetching Steam user info:', error);
            return undefined;
        }
    }
    //检查用户是否存在
    async function getSteamUserInfo(ctx, steamApiKey, steamid) {
        const requestUrl = `${steamWebApiUrl}?key=${steamApiKey}&steamIds=${steamid}`;
        const response = await ctx.http.get(requestUrl);
        if (!response || response.response.players.length === 0) {
            return undefined;
        }
        return response;
    }
    //检查玩家状态是否变化
    async function getUserStatusChanged(ctx, steamUserInfo, usingSteamName) {
        if (steamUserInfo === undefined)
            return;
        let msgArray = {};
        for (let i = 0; i < steamUserInfo.response.players.length; i++) {
            const playerTemp = steamUserInfo.response.players[i];
            const userData = (await ctx.database.get('SteamUser', { steamId: playerTemp.steamid }))[0];
            //如果steam名称有更改
            if (userData.steamName !== playerTemp.personaname) {
                ctx.database.set('SteamUser', { steamId: playerTemp.steamid }, { steamName: playerTemp.personaname });
            }
            //开始玩了
            if (!userData.lastPlayedGame && playerTemp.gameextrainfo) {
                await ctx.database.set('SteamUser', { steamId: userData.steamId }, { lastPlayedGame: playerTemp.gameextrainfo });
                msgArray[userData.userId] = (`${usingSteamName ? playerTemp.personaname : userData.userName} 开始玩 ${playerTemp.gameextrainfo} 了\n`);
                continue;
            }
            //换了一个游戏玩
            if (userData.lastPlayedGame != playerTemp.gameextrainfo && userData.lastPlayedGame && playerTemp.gameextrainfo) {
                const lastPlayedGame = userData.lastPlayedGame;
                await ctx.database.set('SteamUser', { steamId: userData.steamId }, { lastPlayedGame: playerTemp.gameextrainfo });
                msgArray[userData.userId] = (`${usingSteamName ? playerTemp.personaname : userData.userName} 不玩 ${lastPlayedGame} 了，开始玩 ${playerTemp.gameextrainfo} 了\n`);
                continue;
            }
            //不玩辣
            if (!playerTemp.gameextrainfo && userData.lastPlayedGame) {
                const lastPlayedGame = userData.lastPlayedGame;
                await ctx.database.set('SteamUser', { steamId: userData.steamId }, { lastPlayedGame: '' });
                msgArray[userData.userId] = (`${usingSteamName ? playerTemp.personaname : userData.userName} 不玩 ${lastPlayedGame} 了\n`);
                continue;
            }
        }
        return msgArray;
    }
    // 获取好友状态图片
    async function getFriendStatusImg(ctx, userData, botid, channelid, channelname) {
        const gamingUsers = userData.response.players.filter(player => player.gameextrainfo); // 筛选出游戏中的好友
        const onlineUsers = userData.response.players.filter(player => player.personastate != 0 && !player.gameextrainfo); // 筛选出在线但未游戏的好友
        onlineUsers.sort((a, b) => a.personastate - b.personastate); // 根据在线状态排序
        const offlineUsers = userData.response.players.filter(player => player.personastate == 0); // 筛选出离线好友
        const url = path.join(__dirname, 'html/steamFriendList.html'); // 模板文件路径
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
            }
            catch (error) {
                ctx.logger.error('获取群组头像失败', error);
            }
        }
        else {
            botname = config.botname;
            // 使用 Bot 头像与 Bot 名称
            try {
                await getBotHeadshot(ctx, botid); // 获取 Bot 头像
                headshotfileName = `bot${botid}.jpg`;
                GroupHeadshotBase64 = await convertImageToBase64(path.join(rootpath, `data/steam-friend-status/img/${headshotfileName}`));
            }
            catch (error) {
                ctx.logger.error('获取Bot头像失败', error);
            }
        }
        // 从数据库获取所有用户数据
        const allUserData = await ctx.database.get('SteamUser', {});
        // 创建 puppeteer 页面
        const page = await ctx.puppeteer.page();
        await page.setViewport({ width: 227, height: 224 + userData.response.players.length * 46 });
        await page.goto(url);
        // 转换好友头像为 Base64
        const gamingUsersBase64 = await Promise.all(gamingUsers.map(user => convertImageToBase64(path.join(rootpath, `data/steam-friend-status/img/steamuser${user.steamid}.jpg`))));
        const onlineUsersBase64 = await Promise.all(onlineUsers.map(user => convertImageToBase64(path.join(rootpath, `data/steam-friend-status/img/steamuser${user.steamid}.jpg`))));
        const offlineUsersBase64 = await Promise.all(offlineUsers.map(user => convertImageToBase64(path.join(rootpath, `data/steam-friend-status/img/steamuser${user.steamid}.jpg`))));
        // 渲染页面
        await page.evaluate((GroupHeadshotBase64, botname, gamingUsers, gamingUsersBase64, onlineUsers, onlineUsersBase64, offlineUsers, offlineUsersBase64, steamstatus, allUserData, showuserIdorsteamId) => {
            const findUserId = (steamId) => {
                const user = allUserData.find(u => u.steamId === steamId);
                return user ? user.userName : steamId; // 找不到对应用户时默认展示 SteamID
            };
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
            titles[0].innerHTML = `游戏中(${gamingUsers.length})`;
            titles[1].innerHTML = `在线好友(${onlineUsers.length})`;
            titles[2].innerHTML = `离线好友(${offlineUsers.length})`;
            // 渲染游戏中的好友列表
            for (let i = 0; i < gamingUsers.length; i++) {
                const li = document.createElement('li');
                li.setAttribute('class', 'friend');
                li.innerHTML = `
                  <img src="${gamingUsersBase64[i]}" class="headshot-online">
                  <div class="name-and-status">
                      <p class="name-gaming">${gamingUsers[i].personaname}(${showuserIdorsteamId ? gamingUsers[i].steamid : findUserId(gamingUsers[i].steamid)})</p>
                      <p class="status-gaming">${gamingUsers[i].gameextrainfo}</p>
                  </div>`;
                gamingList.appendChild(li);
            }
            // 渲染在线的好友列表
            for (let i = 0; i < onlineUsers.length; i++) {
                const li = document.createElement('li');
                li.setAttribute('class', 'friend');
                li.innerHTML = `
                  <img src="${onlineUsersBase64[i]}" class="headshot-online">
                  <div class="name-and-status">
                      <p class="name-online">${onlineUsers[i].personaname}(${showuserIdorsteamId ? onlineUsers[i].steamid : findUserId(onlineUsers[i].steamid)})</p>
                      <p class="status-online">${steamstatus[onlineUsers[i].personastate]}</p>
                  </div>`;
                onlineList.appendChild(li);
            }
            // 渲染离线的好友列表
            for (let i = 0; i < offlineUsers.length; i++) {
                const li = document.createElement('li');
                li.setAttribute('class', 'friend');
                li.innerHTML = `
                  <img src="${offlineUsersBase64[i]}" class="headshot-offline">
                  <div class="name-and-status">
                      <p class="name-offline">${offlineUsers[i].personaname}(${showuserIdorsteamId ? offlineUsers[i].steamid : findUserId(offlineUsers[i].steamid)})</p>
                      <p class="status-offline">${steamstatus[offlineUsers[i].personastate]}</p>
                  </div>`;
                offlineList.appendChild(li);
            }
        }, GroupHeadshotBase64, botname, gamingUsers, gamingUsersBase64, onlineUsers, onlineUsersBase64, offlineUsers, offlineUsersBase64, steamstatus, allUserData, config.showuserIdorsteamId);
        // 截图并返回
        const image = await page.screenshot({ fullPage: true, type: 'png', encoding: 'binary' });
        await page.close();
        return koishi_1.h.image(image, 'image/png');
    }
    //循环检测玩家状态
    async function steamInterval(ctx, config) {
        const allUserData = await ctx.database.get('SteamUser', {});
        const userdata = await getSteamUserInfoByDatabase(ctx, allUserData, config.SteamApiKey);
        const changeMessage = await getUserStatusChanged(ctx, userdata, config.useSteamName);
        // 检查 changeMessage 是否为 undefined 或 null
        if (!changeMessage || Object.keys(changeMessage).length === 0) {
            return;
        }
        if (Object?.keys(changeMessage)?.length > 0) {
            const supportPlatform = ['onebot', 'red', 'chronocat'];
            const channel = await ctx.database.get('channel', { usingSteam: true, platform: supportPlatform });
            for (let i = 0; i < channel.length; i++) {
                const groupMessage = [];
                for (let j = 0; j < allUserData.length; j++) {
                    if (allUserData[j].effectGroups.includes(channel[i].id) && changeMessage[allUserData[j].userId]) {
                        groupMessage.push(changeMessage[allUserData[j].userId]);
                    }
                }
                const userInGroup = selectApiUsersByGroup(userdata, allUserData, channel[i].id);
                if (groupMessage.length > 0) {
                    if (config.broadcastWithImage) {
                        let image;
                        if (config.showcardmode === "1") {
                            image = await getFriendStatusImg(ctx, userInGroup, channel[i].assignee);
                        }
                        else {
                            image = await getFriendStatusImg(ctx, userInGroup, channel[i].assignee, channel[i].id, channel[i].channelName);
                        }
                        groupMessage.push(image);
                    }
                    const bot = ctx.bots[`${channel[i].platform}:${channel[i].assignee}`];
                    if (bot) {
                        bot.sendMessage(channel[i].id, groupMessage);
                    }
                }
            }
        }
        else {
            return;
        }
    }
    //更新头像信息
    async function updataPlayerHeadshots(ctx, apiKey) {
        const allUserData = await ctx.database.get('SteamUser', {});
        const userdata = (await getSteamUserInfoByDatabase(ctx, allUserData, apiKey)).response.players;
        for (let i = 0; i < userdata.length; i++) {
            const headshot = await ctx.http.get(userdata[i].avatarmedium, { responseType: 'arraybuffer' });
            const filepath = path.join(imgpath, `steamuser${userdata[i].steamid}.jpg`);
            fs.writeFileSync(filepath, Buffer.from(headshot));
        }
    }
    //获取自己的好友码
    async function getSelfFriendcode(ctx, session) {
        const userdata = await ctx.database.get('SteamUser', { userId: session.event.user.id });
        if (userdata.length == 0) {
            return '用户未绑定,无法获得好友码';
        }
        let userName = session.event.user.name;
        if (!userName) {
            userName = session.event.user.id;
        }
        if (userdata[0].userName != userName) {
            await ctx.database.set('SteamUser', { userId: session.event.user.id }, { userName });
        }
        const steamID = userdata[0].steamId;
        const steamFriendCode = BigInt(steamID) - BigInt(steamIdOffset);
        return steamFriendCode.toString();
    }
    //筛选在特定群中的用户
    function selectUsersByGroup(steamusers, groupid) {
        const users = steamusers.filter(user => user.effectGroups.includes(groupid));
        return users;
    }
    //根据群号筛选从API中获取的用户数据
    function selectApiUsersByGroup(steamusers_api, steamusers_database, groupid) {
        let result = {
            response: {
                players: []
            }
        };
        const databaseUsers = selectUsersByGroup(steamusers_database, groupid);
        for (let i = 0; i < steamusers_api.response.players.length; i++) {
            const tempplayer = steamusers_api.response.players[i];
            if (databaseUsers.find(user => user.steamId == tempplayer.steamid)) {
                result.response.players.push(tempplayer);
            }
        }
        return result;
    }
    async function getAllUserFriendCodesInGroup(ctx, groupid) {
        let result = [];
        const allUserData = await ctx.database.get('SteamUser', {});
        const groupUserData = selectUsersByGroup(allUserData, groupid);
        for (let i = 0; i < groupUserData.length; i++) {
            result.push(`${groupUserData[i].userName}: ${(BigInt(groupUserData[i].steamId) - BigInt(steamIdOffset)).toString()}`);
        }
        if (result.length == 0) {
            return '本群没有用户绑定';
        }
        else {
            return result.join('\n');
        }
    }
    async function getGroupHeadshot(ctx, groupid) {
        const groupheadshot = await ctx.http.get(`http://p.qlogo.cn/gh/${groupid}/${groupid}/0`, { responseType: 'arraybuffer' });
        const filepath = path.join(imgpath, `group${groupid}.jpg`);
        fs.writeFileSync(filepath, Buffer.from(groupheadshot));
    }
    async function getBotHeadshot(ctx, userid) {
        const userheadshot = await ctx.http.get(`http://q.qlogo.cn/headimg_dl?dst_uin=${userid}&spec=640`, { responseType: 'arraybuffer' });
        const filepath = path.join(imgpath, `bot${userid}.jpg`);
        fs.writeFileSync(filepath, Buffer.from(userheadshot));
    }
}
