"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.usage = exports.inject = exports.name = void 0;

const koishi = require("koishi");
const { Schema, Logger, h } = require("koishi");
const logger = new Logger('music-link');

const name = 'music-link';
const inject = {
    required: ['http'],
    optional: ['puppeteer'],
};
const usage = `
## 使用方法

---

安装并配置插件后，使用下述命令搜索和下载音乐：

---

使用星之阁API搜索QQ、网易云音乐
\`\`\`bash
下载音乐 [...keywords]
\`\`\`

---

使用龙珠API搜索QQ、网易云音乐
\`\`\`bash
搜索歌曲 [...keywords]
\`\`\`

---

### 如果需要让歌曲链接返回为语音消息/视频消息

可以修改 对应指令的返回字段表中的 下载链接 对应的 type 字段， 把 text 更改为 audio 就是返回语音，改为 video 就是返回视频消息。

---

需要注意的是，当配置返回格式为 音频/视频 的时候，请自行检查是否安装了 silk 、 ffmpeg 等服务。

`;

const command1_return_qqdata_Field_default = [
    {
        "data": "songname",
        "describe": "歌曲名称",
        "type": "text"
    },
    {
        "data": "subtitle",
        "describe": "标题",
        "type": "text",
        "enable": false
    },
    {
        "data": "name",
        "describe": "歌手",
        "type": "text",
    },
    {
        "data": "album",
        "describe": "专辑",
        "type": "text",
        "enable": false
    },
    {
        "data": "pay",
        "describe": "付费情况",
        "type": "text",
        "enable": false
    },
    {
        "data": "song_type",
        "describe": "歌曲类型",
        "type": "text",
        "enable": false
    },
    {
        "data": "type",
        "describe": "类型",
        "type": "text",
        "enable": false
    },
    {
        "data": "songid",
        "describe": "歌曲ID",
        "type": "text",
        "enable": false
    },
    {
        "data": "mid",
        "describe": "mid",
        "type": "text",
        "enable": false
    },
    {
        "data": "time",
        "describe": "发行时间",
        "type": "text",
        "enable": false
    },
    {
        "data": "bpm",
        "describe": "bpm",
        "type": "text",
        "enable": false
    },
    {
        "data": "quality",
        "describe": "音质",
        "type": "text"
    },
    {
        "data": "interval",
        "describe": "时长",
        "type": "text",
        "enable": false
    },
    {
        "data": "size",
        "describe": "大小",
        "type": "text"
    },
    {
        "data": "kbps",
        "describe": "分辨率",
        "type": "text",
        "enable": false
    },
    {
        "data": "cover",
        "describe": "封面",
        "type": "image"
    },
    {
        "data": "songurl",
        "describe": "歌曲链接",
        "type": "text",
        "enable": false
    },
    {
        "data": "src",
        "describe": "下载链接",
        "type": "text"
    }
];
const command1_return_wyydata_Field_default = [
    {
        "data": "songname",
        "describe": "歌曲名称",
        "type": "text"
    },
    {
        "data": "name",
        "describe": "歌手",
        "type": "text"
    },
    {
        "data": "album",
        "describe": "专辑",
        "type": "text",
        "enable": false
    },
    {
        "data": "pay",
        "describe": "付费情况",
        "enable": false,
        "type": "text"
    },
    {
        "data": "id",
        "describe": "歌曲ID",
        "enable": false,
        "type": "text"
    },
    {
        "data": "quality",
        "describe": "音质",
        "type": "text"
    },
    {
        "data": "interval",
        "describe": "时长",
        "enable": false,
        "type": "text"
    },
    {
        "data": "size",
        "describe": "大小",
        "type": "text"
    },
    {
        "data": "kbps",
        "describe": "分辨率",
        "enable": false,
        "type": "text"
    },
    {
        "data": "cover",
        "describe": "封面",
        "type": "image"
    },
    {
        "data": "songurl",
        "describe": "歌曲链接",
        "type": "text",
        "enable": false
    },
    {
        "data": "src",
        "describe": "下载链接",
        "type": "text"
    }
];



const command3_return_qqdata_Field_default = [
    {
        "data": "song_name",
        "type": "text",
        "describe": "歌曲名称"
    },
    {
        "data": "song_singer",
        "describe": "歌手",
        "type": "text"
    },
    {
        "data": "quality",
        "describe": "音质",
        "type": "text"
    },
    {
        "data": "cover",
        "describe": "封面",
        "type": "image"
    },
    {
        "data": "link",
        "describe": "歌曲链接",
        "type": "text",
        "enable": false
    },
    {
        "data": "music_url",
        "describe": "下载链接",
        "type": "text"
    },
    {
        "data": "lyric",
        "describe": "歌词",
        "type": "text",
        "enable": false
    }
];
const command3_return_wyydata_Field_default = [
    {
        "data": "title",
        "describe": "歌曲名称",
        "type": "text"
    },
    {
        "data": "singer",
        "describe": "歌手",
        "type": "text"
    },
    {
        "data": "id",
        "describe": "音质",
        "type": "text",
        "enable": null
    },
    {
        "data": "cover",
        "describe": "封面",
        "type": "image"
    },
    {
        "data": "link",
        "describe": "歌曲链接",
        "type": "text",
        "enable": false
    },
    {
        "data": "music_url",
        "describe": "下载链接",
        "type": "text"
    },
    {
        "data": "lrc",
        "describe": "歌词",
        "type": "text",
        "enable": false
    }
];


const Config = Schema.intersect([
    Schema.object({
        waitTimeout: Schema.natural().role('ms').description('允许用户返回选择序号的等待时间').default(45000),
    }).description('基础设置'),
    Schema.object({
        exitCommand: Schema.string().default('0, 不听了').description('退出选择指令，多个指令间请用逗号分隔开'), // 兼容中文逗号、英文逗号
        menuExitCommandTip: Schema.boolean().default(false).description('是否在歌单内容的后面，加上退出选择指令的文字提示'),
        retryExitCommandTip: Schema.boolean().default(true).description('是否交互序号错误时，加上退出选择指令的文字提示'),

    }).description('进阶设置'),
    Schema.object({
        imageMode: Schema.boolean().default(true).description('开启后返回图片歌单，关闭后返回文本歌单'),
        darkMode: Schema.boolean().default(true).description('是否开启暗黑模式')
    }).description('图片歌单设置'),
    Schema.object({
        command1: Schema.string().default('下载音乐').description('星之阁API的指令名称'),
        command1_wyy_Quality: Schema.number().default(2).description('网易云音乐默认下载音质。默认2，其余自己试 `不建议更改，可能会导致无音源`'),
        command1_qq_Quality: Schema.number().default(2).description('QQ音乐默认下载音质。音质11为最高 `不建议更改，可能会导致无音源`'),
        command1_qq_uin: Schema.string().description('QQ音乐搜索：提供skey的账号(当站长提供的cookie失效时必填，届时生效)'),
        command1_qq_skey: Schema.string().description('QQ音乐搜索：提供开通有绿钻特权的skey可获取vip歌曲(当站长提供的cookie失效时必填，届时生效)为空默认获取站长提供的skey'),

        command1_return_qqdata_Field: Schema.array(Schema.object({
            data: Schema.string().description('返回的字段').disabled(),
            describe: Schema.string().description('对该字段的中文描述'),
            type: Schema.union(['text', 'image', 'audio', 'video']).description('发送类型'),
            enable: Schema.boolean().default(true).description('是否启用')
        })).role('table').default(command1_return_qqdata_Field_default).description('歌曲返回信息的字段选择<br>[➣ 点我查看该API返回内容示例](https://api.xingzhige.com/API/QQmusicVIP/?songid=499449053&br=2&uin=2&skey=2)'),

        command1_return_wyydata_Field: Schema.array(Schema.object({
            data: Schema.string().description('返回的字段').disabled(),
            describe: Schema.string().description('对该字段的中文描述'),
            type: Schema.union(['text', 'image', 'audio', 'video']).description('发送类型'),
            enable: Schema.boolean().default(true).description('是否启用')
        })).role('table').default(command1_return_wyydata_Field_default).description('歌曲返回信息的字段选择<br>[➣ 点我查看该API返回内容示例](https://api.xingzhige.com/API/NetEase_CloudMusic_new/?name=%E8%94%9A%E8%93%9D%E6%A1%A3%E6%A1%88&n=1)'),

    }).description('星之阁API返回设置'),
    /*
        Schema.object({
            command2: Schema.string().default('qq音乐下载').description('桑帛云API的指令名称'),
            defaultQualitycommand2Download: Schema.number().default(11).description('默认下载音质【母带：14】【无损：11】【HQ：8】【标准：4】'),
        }).description('桑帛云API返回设置'),
        */
    Schema.object({
        command3: Schema.string().default('搜索歌曲').description('龙珠API的指令名称'),
        command3_wyyQuality: Schema.number().default(1).description('网易云音乐默认下载音质。`找不到对应音质，会自动使用标准音质`<br>1(标准音质)/2(极高音质)/3(无损音质)/4(Hi-Res音质)/5(高清环绕声)/6(沉浸环绕声)/7(超清母带)'),

        command3_return_qqdata_Field: Schema.array(Schema.object({
            data: Schema.string().description('返回的字段').disabled(),
            describe: Schema.string().description('对该字段的中文描述'),
            type: Schema.union(['text', 'image', 'audio', 'video']).description('发送类型'),
            enable: Schema.boolean().default(true).description('是否启用')
        })).role('table').default(command3_return_qqdata_Field_default).description('歌曲返回信息的字段选择<br>[➣ 点我查看该API返回内容示例](https://www.hhlqilongzhu.cn/api/dg_qqmusic.php?gm=蔚蓝档案&type=json&num=10&n=1)'),

        command3_return_wyydata_Field: Schema.array(Schema.object({
            data: Schema.string().description('返回的字段').disabled(),
            describe: Schema.string().description('对该字段的中文描述'),
            type: Schema.union(['text', 'image', 'audio', 'video']).description('发送类型'),
            enable: Schema.boolean().default(true).description('是否启用')
        })).role('table').default(command3_return_wyydata_Field_default).description('歌曲返回信息的字段选择<br>[➣ 点我查看该API返回内容示例](https://www.hhlqilongzhu.cn/api/dg_wyymusic.php?gm=蔚蓝档案&type=json&num=10&n=1)'),



    }).description('龙珠API返回设置'),
    Schema.object({
        loggerinfo: Schema.boolean().default(false).description('日志调试开关'),
    }).description('调试模式'),
]);

function apply(ctx, config) {
    const waitTimeInSeconds = config.waitTimeout / 1000;
    const exitCommands = config.exitCommand.split(/[,，]/).map(cmd => cmd.trim());
    const exitCommandTip = config.menuExitCommandTip ? `退出选择请发[${exitCommands}]中的任意内容<br /><br />` : '';
    ctx.command(name)
    ctx.command(name + '/' + config.command1 + '  [...keywords]', '搜索歌曲')
        .option('quality', '-q <value:number>')
        .action(async ({ session, options }, keyword) => {
            if (!keyword)
                return '请输入歌曲相关信息。';
            let qq, netease;
            try {
                let res = await searchQQ(ctx.http, keyword);
                if (typeof res === 'string')
                    res = JSON.parse(res);
                const item = res.request?.data?.body?.item_song;
                qq = {
                    code: res.code,
                    msg: '',
                    data: Array.isArray(item) ? item.map(v => {
                        return {
                            songname: v.title.replaceAll('<em>', '').replaceAll('</em>', ''),
                            album: v.album.name,
                            songid: v.id,
                            songurl: `https://y.qq.com/n/ryqq/songDetail/${v.mid}`,
                            name: v.singer.map(v => v.name).join('/')
                        };
                    }) : []
                };
            }
            catch (e) {
                logger.warn('获取QQ音乐数据时发生错误', e);
            }
            try {
                netease = await searchXZG(ctx.http, 'NetEase Music', { name: keyword });
            }
            catch (e) {
                logger.warn('获取网易云音乐数据时发生错误', e);
            }
            const qqData = qq?.data;
            const neteaseData = netease?.data;
            if (!qqData?.length && !neteaseData?.length)
                return '无法获取歌曲列表，请稍后再试。';
            const qqListText = qqData?.length ? formatSongList(qqData, 'QQ Music', 0) : '<b>QQ Music</b>: 无法获取歌曲列表';
            const neteaseListText = neteaseData?.length ? formatSongList(neteaseData, 'NetEase Music', qqData?.length ?? 0) : '<b>NetEase Music</b>: 无法获取歌曲列表';
            const listText = `${qqListText}<br /><br />${neteaseListText}`;
            const exitCommands = config.exitCommand.split(/[,，]/).map(cmd => cmd.trim());
            const exitCommandTip = config.menuExitCommandTip ? `退出选择请发[${exitCommands}]中的任意内容<br /><br />` : '';
            let quoteId = session.messageId;
            if (config.imageMode) {
                const imageBuffer = await generateSongListImage(ctx.puppeteer, listText);
                const payload = [
                    h.image(imageBuffer, 'image/png'),
                    h.text(`${exitCommandTip.replaceAll('<br />', '\n')}请在 `),
                    (0, h)('i18n:time', { value: config.waitTimeout }),
                    h.text('内，\n'),
                    h.text('输入歌曲对应的序号')
                ];
                const msg = await session.send(payload);
                quoteId = msg.at(-1);
            }
            else {
                const msg = await session.send(`${listText}<br /><br />${exitCommandTip}请在 <i18n:time value="${config.waitTimeout}"/>内，<br />输入歌曲对应的序号`);
                quoteId = msg.at(-1);
            }
            const input = await session.prompt(config.waitTimeout);
            if (!input) {
                return `${quoteId ? h.quote(quoteId) : ''}输入超时，已取消点歌。`;
            }
            if (exitCommands.includes(input)) {
                return `已退出歌曲选择。`;
            }
            const serialNumber = +input;
            const totalQQSongs = qqData?.length ?? 0;
            const totalNetEaseSongs = neteaseData?.length ?? 0;

            if (Number.isNaN(serialNumber) || serialNumber < 1 || serialNumber > (totalQQSongs + totalNetEaseSongs)) {
                return `序号输入错误，已退出歌曲选择。`;
            }

            let platform, songid, br, uin, skey;
            let selected;

            if (serialNumber <= totalQQSongs) {
                // 用户选择的是 QQ 音乐的歌曲
                selected = qqData[serialNumber - 1];
                platform = 'QQ Music';
                songid = selected.songid;
                br = config.command1_qq_Quality; // 使用 QQ 音乐的音质
                uin = config.command1_qq_uin;
                skey = config.command1_qq_skey;
            } else {
                // 用户选择的是网易云音乐的歌曲
                selected = neteaseData[serialNumber - totalQQSongs - 1]; // 调整索引
                platform = 'NetEase Music';
                songid = selected.id;
                br = config.command1_wyy_Quality; // 使用网易云音乐的音质
                uin = 'onlyqq';
                skey = 'onlyqq';
            }

            if (options.quality) {
                br = options.quality;
            }
            if (!platform)
                return `获取歌曲失败。`;
            const song = await searchXZG(ctx.http, platform, {
                songid,
                br,
                uin,
                skey,
            });

            if (song.code === 0) {
                const data = song.data;
                try {
                    let songDetails;
                    if (serialNumber <= totalQQSongs) {
                        // 用户选择的是 QQ 音乐的歌曲
                        songDetails = generateResponse(data, config.command1_return_qqdata_Field);
                    } else {
                        // 用户选择的是网易云音乐的歌曲
                        songDetails = generateResponse(data, config.command1_return_wyydata_Field);
                    }
                    logInfo(songDetails)
                    return songDetails;
                } catch (e) {
                    logger.error(e);
                    return '解析歌曲详情时发生错误';
                }
            } else {
                logger.warn(`获取歌曲失败：${JSON.stringify(song)}`);
                return '获取歌曲失败：' + song.msg;
            }

        });

    /*
    // QQ音乐下载命令
    ctx.command(name + '/' + config.command2 + ' [...keywords]', '搜索QQ歌曲')
        .option('quality', '-q <value:number>', { fallback: config.defaultQualitycommand2Download })
        .action(async ({ session, options, args }) => {
            const keyword = args.join(' ');
            if (!keyword) {
                await session.send('请输入歌曲名称。');
                return;
            }
            // 解析用户输入的音质参数，如果没有则使用默认配置
            const quality = options.quality ?? config.defaultQualitycommand2Download;
            // 获取歌曲列表
            const songs = await fetchSongList(keyword);
            if (!songs || songs.length === 0) {
                return '没有找到相关歌曲。';
            }
            const songListMessage = formatSongList2(songs);
            if (config.imageMode) {
                const imageBuffer = await generateSongListImage(ctx.puppeteer, songListMessage);
                await session.send(h.image(imageBuffer, 'image/png') + `${exitCommandTip}请在${waitTimeInSeconds}秒内，<br />输入歌曲对应的序号`);
            }
            else {
                await session.send(songListMessage + `<br /><br />${exitCommandTip}请在${waitTimeInSeconds}秒内，<br />输入歌曲对应的序号`);
            }
            // 用户回复序号
            const songChoice = await session.prompt(config.waitTimeout); // 获取用户的输入
            if (!songChoice)
                return '输入超时，已取消点歌。'; // 输入超时判断
            // 将 exitCommands 与 songChoice 比较，而不是 index
            if (exitCommands.includes(songChoice.trim())) {
                return '已退出歌曲选择。'; // 用户选择退出
            }
            const index = parseInt(songChoice, 10); // 将用户输入转换为数值
            // 有效性检查
            if (isNaN(index) || index < 1 || index > songs.length) {
                return '输入的序号无效。若要点歌请重新发起。';
            }
            // 获取用户选择的歌曲详细信息
            const details = await fetchSongDetails(keyword, index, quality);
            if (!details.url) {
                return '无法获取歌曲下载链接。';
            }
            // 发送用户选择的歌曲详细信息
            let songDetails2;
            switch (config.Return_Format) {
                case 'text':
                    songDetails2 = [
                        h.text(`歌曲：${details.song}`),
                        h.text(`歌手：${details.singer}`),
                        h.text(`品质：${details.quality}`),
                        h.text(`大小：${details.size}`),
                        h.text(`下载链接：${details.url}`),
                        h.image(details.cover)
                    ].join('\n');
                    break;
                case 'audio':
                    songDetails2 = [
                        h.text(`歌曲：${details.song}`),
                        h.text(`歌手：${details.singer}`),
                        h.text(`品质：${details.quality}`),
                        h.text(`大小：${details.size}`),
                        h.image(details.cover),
                        h.audio(details.url)
                    ].join('\n');
                    break;
                case 'video':
                    songDetails2 = [
                        h.text(`歌曲：${details.song}`),
                        h.text(`歌手：${details.singer}`),
                        h.text(`品质：${details.quality}`),
                        h.text(`大小：${details.size}`),
                        h.image(details.cover),
                        h.video(details.url)
                    ].join('\n');
                    break;
                default:
                    throw new Error('Unsupported Return_Format');
            }
            return songDetails2;
        });
    
    */

    ctx.command(name + '/' + config.command3 + ' [...keywords]', '搜索龙珠歌曲')
        .option('quality', '-q <value:number>', { fallback: config.command3_wyyQuality })
        .action(async ({ session, options, args }) => {
            const keyword = args.join(' ');
            if (!keyword) {
                await session.send('请输入歌曲名称。');
                return;
            }

            // 获取QQ音乐歌曲列表
            let qqSongs;
            try {
                qqSongs = await searchLongZhuQQ(keyword);
            } catch (error) {
                logger.warn('获取龙珠QQ歌曲列表时发生错误', error);
                return '无法获取QQ音乐歌曲列表，请稍后再试。';
            }

            // 获取网易云音乐歌曲列表
            let wySongs;
            try {
                wySongs = await searchLongZhuWY(keyword);
            } catch (error) {
                logger.warn('获取龙珠网易云歌曲列表时发生错误', error);
                return '无法获取网易云音乐歌曲列表，请稍后再试。';
            }

            // 确保歌曲列表非空
            if (qqSongs.length === 0 && wySongs.length === 0) {
                return '没有找到相关歌曲。';
            }

            // 格式化QQ音乐歌曲列表
            const qqSongList = qqSongs.map((song, index) => {
                const title = song.song_title || song.title; // 歌曲标题
                const singer = song.song_singer || song.singer; // 歌手
                return `${index + 1}. ${title} -- ${singer}`;
            });

            // 格式化网易云音乐歌曲列表
            const wySongList = wySongs.map((song, index) => {
                const title = song.song_title || song.title; // 歌曲标题
                const singer = song.song_singer || song.singer; // 歌手
                return `${index + 1 + qqSongs.length}. ${title} -- ${singer}`;
            });

            // 合并歌曲列表并添加小标题
            const songListMessage = [
                'QQ Music',
                ...qqSongList,
                '',
                'NetEase Music',
                ...wySongList
            ].join('\n');

            // 判断是否使用图片模式
            if (config.imageMode) {
                const listText = songListMessage.replace(/\n/g, '<br />');
                const imageBuffer = await generateSongListImage(ctx.puppeteer, listText);
                await session.send(h.image(imageBuffer, 'image/png') + `${exitCommandTip}请在${waitTimeInSeconds}秒内，<br />输入歌曲对应的序号`);
            } else {
                await session.send(`以下是搜索结果：\n${songListMessage}\n${exitCommandTip}请在${waitTimeInSeconds}秒内，<br />输入歌曲对应的序号`);
            }

            // 用户回复序号
            const songChoice = await session.prompt(config.waitTimeout); // 获取用户的输入
            if (!songChoice) {
                return '输入超时，已取消点歌。'; // 输入超时判断
            }

            const index = parseInt(songChoice, 10); // 将用户输入转换为数值
            // 有效性检查
            if (isNaN(index) || index < 1 || index > (qqSongs.length + wySongs.length)) {
                return '输入的序号无效。若要点歌请重新发起。';
            }
            const quality = options.quality ? options.quality : config.command3_wyyQuality;

            logInfo(options.quality);
            // 获取用户选择的歌曲详细信息
            let details, songDetails3;
            if (index <= qqSongs.length) {
                details = await fetchLongZhuQQDetails(keyword, index);
                songDetails3 = generateResponse(details, config.command3_return_qqdata_Field);
            } else {
                details = await fetchLongZhuWYDetails(keyword, index - qqSongs.length, quality);
                songDetails3 = generateResponse(details, config.command3_return_wyydata_Field);
            }
            logInfo(songDetails3)

            if (!details) {
                return '无法获取歌曲下载链接。';
            }
            return songDetails3;
        });




    function generateResponse(data, platformconfig) {
        // 准备存储各类内容的数组
        const textElements = [];
        const mediaElement = []; // 单个元素数组，存放audio或video
        const imageElement = []; // 单个元素数组，存放image

        // 根据配置生成相应的内容
        platformconfig.forEach(field => {
            if (field.enable) {
                switch (field.type) {
                    case 'text':
                        textElements.push(h.text(`${field.describe}：${data[field.data]}`));
                        break;
                    case 'image':
                        // 封面图总是存在，单独处理
                        if (field.data === 'cover') {
                            imageElement.push(h.image(data[field.data]));
                        }
                        break;
                    case 'audio':
                        // 确保audio元素总是在最后
                        mediaElement.push(h.audio(data[field.data]));
                        break;
                    case 'video':
                        // 确保video元素总是在最后
                        mediaElement.push(h.video(data[field.data]));
                        break;
                }
            }
        });

        // 组合所有内容，确保media总在最后
        return [...textElements, ...imageElement, ...mediaElement].join('\n');
    }

    async function searchXZG(http, platform, params) {
        logInfo(params);
        let apiBase = 'https://api.xingzhige.com/API/QQmusicVIP/';
        if (platform === 'NetEase Music') {
            apiBase = 'https://api.xingzhige.com/API/NetEase_CloudMusic_new/';
        }
        // 构建完整的请求 URL
        const requestUrl = `${apiBase}?${new URLSearchParams(params).toString()}`;
        logInfo(requestUrl);
        return await http.get(apiBase, { params });
    }

    function formatSongList(data, platform, startIndex) {
        const formattedList = data.map((song, index) => `${index + startIndex + 1}. ${song.songname} -- ${song.name}`).join('<br />');
        return `<b>${platform}</b>:<br />${formattedList}`;
    }
    async function searchQQ(http, query) {
        return await http.post('https://u.y.qq.com/cgi-bin/musicu.fcg', {
            comm: {
                ct: 11,
                cv: '1929'
            },
            request: {
                module: 'music.search.SearchCgiService',
                method: 'DoSearchForQQMusicLite',
                param: {
                    search_id: '83397431192690042',
                    remoteplace: 'search.android.keyboard',
                    query,
                    search_type: 0,
                    num_per_page: 10,
                    page_num: 1,
                    highlight: 1,
                    nqc_flag: 0,
                    page_id: 1,
                    grp: 1
                }
            }
        });
    }
    async function generateSongListImage(pptr, listText) {
        const textBrightness = config.darkMode ? 255 : 0;
        const backgroundBrightness = config.darkMode ? 0 : 255;
        const page = await pptr.browser.newPage();
        const textColor = `rgb(${textBrightness},${textBrightness},${textBrightness})`;
        const backgroundColor = `rgb(${backgroundBrightness},${backgroundBrightness},${backgroundBrightness})`;
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="zh">
              <head>
                <title>music</title>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <style>
                  body {
                    margin: 0;
                    font-family: PingFang SC, Hiragino Sans GB, Microsoft YaHei, SimSun, sans-serif;
                    font-size: 16px;
                    background: ${backgroundColor};
                    color: ${textColor};
                    min-height: 100vh;
                  }
                  #song-list {
                    padding: 20px;
                    display: inline-block; /* 使div适应内容宽度 */
                    max-width: 100%; /* 防止内容溢出 */
                    white-space: nowrap; /* 防止歌曲名称换行 */
                    transform: scale(0.77);
                  }
                </style>
              </head>
              <body>
                <div id="song-list">${listText}</div>
              </body>
            </html>
          `;
        await page.setContent(htmlContent);
        const clipRect = await page.evaluate(() => {
            const songList = document.getElementById('song-list');
            const rect = songList.getBoundingClientRect();
            return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
        });
        const screenshot = await page.screenshot({
            clip: clipRect,
            encoding: 'binary'
        });
        await page.close();
        return screenshot;
    }
    /*
    // QQ音乐下载相关函数
    async function fetchSongList(keyword) {
        const url = `https://api.lolimi.cn/API/yiny/?word=${encodeURIComponent(keyword)}&num=20`;
        const response = await fetch(url);
        logInfo(JSON.stringify(url));

        if (!response.ok) {
            throw new Error(`Failed to fetch song list: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.code !== 200) {
            throw new Error(`API error: ${data.code}`);
        }
        return data.data;
    }
    async function fetchSongDetails(keyword, n, quality) {
        const url = `https://api.lolimi.cn/API/yiny/?word=${encodeURIComponent(keyword)}&num=20&n=${n}&q=${quality}`;
        const response = await fetch(url);
        logInfo(JSON.stringify(url));

        if (!response.ok) {
            throw new Error(`Failed to fetch song details: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.code !== 200) {
            throw new Error(`API error: ${data.code}`);
        }
        return data.data;
    }
    function formatSongList2(songs) {
        return songs.map((song, index) => `${index + 1}. ${song.song} -- ${song.singer}`).join('<br />');
    }
    */
    // 龙珠API相关函数
    async function searchLongZhuQQ(keyword) {
        const url = `https://www.hhlqilongzhu.cn/api/dg_qqmusic.php?gm=${encodeURIComponent(keyword)}&type=json&num=10`;
        const response = await fetch(url);
        logInfo(JSON.stringify(url));

        if (!response.ok) {
            throw new Error(`Failed to fetch QQ song list: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.code !== 200) {
            throw new Error(`API error: ${data.code}`);
        }
        logInfo(JSON.stringify(data));
        return data.data; // 返回歌曲数据
    }

    async function fetchLongZhuQQDetails(keyword, n) {
        const url = `https://www.hhlqilongzhu.cn/api/dg_qqmusic.php?gm=${encodeURIComponent(keyword)}&type=json&num=10&n=${n}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch WY song list: ${response.statusText}`);
        }
        logInfo(JSON.stringify(url));

        const data = await response.json();
        if (data.code !== 200) {
            throw new Error(`API error: ${data.code}`);
        }
        logInfo(JSON.stringify(data));
        return data.data; // 返回歌曲详细信息
    }

    async function searchLongZhuWY(keyword) {
        const url = `https://www.hhlqilongzhu.cn/api/dg_wyymusic.php?gm=${encodeURIComponent(keyword)}&type=json&num=10`;
        const response = await fetch(url);
        logInfo(JSON.stringify(url));

        if (!response.ok) {
            throw new Error(`Failed to fetch WY song list: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.code !== 200) {
            throw new Error(`API error: ${data.code}`);
        }
        logInfo(JSON.stringify(data));
        return data.data; // 返回歌曲数据
    }

    async function fetchLongZhuWYDetails(keyword, n, quality) {
        const url = `https://www.hhlqilongzhu.cn/api/dg_wyymusic.php?gm=${encodeURIComponent(keyword)}&type=json&br=${quality}&num=10&n=${n}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch WY song list: ${response.statusText}`);
        }
        logInfo(JSON.stringify(url));

        const data = await response.json();
        if (data.code !== 200) {
            throw new Error(`API error: ${data.code}`);
        }
        logInfo(JSON.stringify(data));
        return data; // 返回歌曲详细信息
    }

    function logInfo(message) {
        if (config.loggerinfo) {
            logger.info(message);
        }
    }

}
exports.apply = apply;
exports.Config = Config;
exports.name = name;
exports.usage = usage;
exports.inject = inject;