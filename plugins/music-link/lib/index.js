"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.usage = exports.inject = exports.name = void 0;

const koishi = require("koishi");
const { Schema, Logger, h } = require("koishi");
const logger = new Logger('music-link');

const name = 'music-link';
const inject = {
    required: ['http', "i18n"],
    optional: ['puppeteer'],
};
const usage = `
<h2>使用方法</h2>
<hr>

<p>安装并配置插件后，使用下述命令搜索和下载音乐：</p>
<hr>

<h3>使用星之阁API搜索QQ、网易云音乐</h3>
<pre><code>下载音乐 [keywords]</code></pre>
<hr>

<h3>使用music.gdstudio.xyz搜索各大音乐</h3>
<pre><code>歌曲搜索 [keywords]</code></pre>
<hr>

<h3>如果需要让歌曲链接返回为语音消息/视频消息</h3>
<p>可以修改对应指令的返回字段表中的下载链接对应的 <code>type</code> 字段，把 <code>text</code> 更改为 <code>audio</code> 就是返回语音，改为 <code>video</code> 就是返回视频消息。</p>
<hr>

<p>需要注意的是，当配置返回格式为音频/视频的时候，请自行检查是否安装了 <code>silk</code>、<code>ffmpeg</code> 等服务。</p>
<hr>

<h3>使用 <code>-n 1</code> 直接返回内容</h3>
<p>在使用命令时，可以通过添加 <code>-n 1</code> 选项直接返回指定序号的歌曲内容。这对于快速获取特定歌曲非常有用。</p>
<p>例如，使用以下命令可以直接获取第一首歌曲的详细信息：</p>
<pre><code>歌曲搜索 -n 1 蔚蓝档案</code></pre>

---

## 目前 星之阁API的key已经失效，如需使用请自行前往注册

## 目前 推荐使用新指令<code>歌曲搜索</code>，请确保<code>puppeteer</code>服务可用
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

const command4_return_data_Field_default = [
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
        "type": "text",
        "enable": false
    },
    {
        "data": "size",
        "describe": "大小",
        "type": "text",
        "enable": null
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
        "data": "src",
        "describe": "下载链接",
        "type": "text"
    },
    {
        "data": "songurl",
        "describe": "跳转链接",
        "type": "text",
        "enable": false
    }
];

const Config = Schema.intersect([
    Schema.object({
        xingzhigeAPIkey: Schema.string().role('secret').description('星之阁的音乐API的请求key<br>（默认值是作者自己的哦，如果失效了请你自己获取一个）<br>请前往 QQ群 905188643 <br>添加QQ好友 3556898686 <br>私聊发送 `/getapikey` 获得你的APIkey以填入此处 ').default("up8bpg7bItrfvuCaEdG6vrU-Kr5u68LSKpbGUMHSmsM="),
    }).description('请求设置'),
    Schema.object({
        waitTimeout: Schema.natural().role('s').description('允许用户返回选择序号的等待时间').default(45),
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
        enablemiddleware: Schema.boolean().description("是否自动解析JSON音乐卡片").default(false),
        used_command: Schema.union(['command1', 'command4', 'command5']).description("自动解析使用的指令<br>解析内容与下面对应的指令返回设置一致").default("command1"), // , 'command2'
        used_id: Schema.number().default(1).min(0).max(10).description("在歌单里默认选择的序号<br>范围`0-10`，无需考虑11-20，会自动根据JSON卡片的平台选择。若音乐平台不匹配 则在搜索项前十个进行选择。"),
    }).description('JSON卡片解析设置'),
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
        })).role('table').default(command1_return_qqdata_Field_default).description('歌曲返回信息的字段选择<br>[➣ 点我查看该API返回内容示例](https://api.xingzhige.com/API/QQmusicVIP/?songid=499449053&br=2&uin=2&skey=2&key=)'),

        command1_return_wyydata_Field: Schema.array(Schema.object({
            data: Schema.string().description('返回的字段').disabled(),
            describe: Schema.string().description('对该字段的中文描述'),
            type: Schema.union(['text', 'image', 'audio', 'video']).description('发送类型'),
            enable: Schema.boolean().default(true).description('是否启用')
        })).role('table').default(command1_return_wyydata_Field_default).description('歌曲返回信息的字段选择<br>[➣ 点我查看该API返回内容示例](https://api.xingzhige.com/API/NetEase_CloudMusic_new/?name=%E8%94%9A%E8%93%9D%E6%A1%A3%E6%A1%88&n=1&key=)'),

    }).description('星之阁API返回设置'),
    /*
    Schema.object({
    command2: Schema.string().default('qq音乐下载').description('桑帛云API的指令名称'),
    defaultQualitycommand2Download: Schema.number().default(11).description('默认下载音质【母带：14】【无损：11】【HQ：8】【标准：4】'),
    }).description('桑帛云API返回设置'),
    */

    /*
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
    */

    Schema.object({
        command4: Schema.string().default('酷狗音乐').description('酷狗-星之阁API的指令名称'),
        command4_kugouQuality: Schema.number().default(1).description('音乐默认下载音质。音质，默认为1'),
        command4_return_data_Field: Schema.array(Schema.object({
            data: Schema.string().description('返回的字段').disabled(),
            describe: Schema.string().description('对该字段的中文描述'),
            type: Schema.union(['text', 'image', 'audio', 'video']).description('发送类型'),
            enable: Schema.boolean().default(true).description('是否启用')
        })).role('table').default(command4_return_data_Field_default).description('歌曲返回信息的字段选择<br>[➣ 点我查看该API返回内容示例](https://api.xingzhige.com/API/Kugou_GN_new/?name=蔚蓝档案&pagesize=20&br=2&key=)'),
    }).description('酷狗-星之阁API返回设置'),


    Schema.object({
        command5: Schema.string().default('歌曲搜索').description('`music.gdstudio.xyz`的指令名称'),
        command5_defaultPlatform: Schema.union([
            Schema.const('网易云').description('网易云'),
            Schema.const('QQ').description('QQ'),
            Schema.const('酷我').description('酷我'),
            Schema.const('Tidal').description('Tidal'),
            Schema.const('Qobuz').description('Qobuz'),
            Schema.const('喜马FM').description('喜马FM'),
            Schema.const('咪咕').description('咪咕'),
            Schema.const('酷狗').description('酷狗'),
            Schema.const('油管').description('油管'),
            Schema.const('Spotify').description('Spotify'),
        ]).role('radio').description('音乐 **默认**使用的平台。').default('网易云'),
        /*
        command5_defaultQuality: Schema.union([
            Schema.const('128K').description('128K标准 [ 全部音乐源 ]<br>192K较高 [ 网易云 / QQ / Spotify / 咪咕 / 油管 ]'),
            Schema.const('320K').description('320K高品 [ 全部音乐源 ]'),
            Schema.const('16bit').description('16bit无损 [ 网易云 / QQ / 酷我 / Tidal / Qobuz / 咪咕 ]'),
            Schema.const('24bit').description('24bit无损 [ 网易云 / QQ / Tidal / Qobuz ]'),
        ]).role('radio').description('音乐 **默认**下载音质。').default('320K'),
        */
        command5_searchList: Schema.number().default(10).min(1).max(20).description('歌曲搜索的列表长度。返回1到20个候选项。'),
        command5_return_data_Field: Schema.array(
            Schema.object({
                data: Schema.string().description('返回的字段').disabled(),
                describe: Schema.string().description('对该字段的中文描述'),
                type: Schema.union(['text', 'image', 'audio', 'video']).description('发送类型'),
                enable: Schema.boolean().default(true).description('是否启用'),
            })
        )
            .role('table')
            .description('歌曲返回信息的字段选择<br>')
            .default([
                { data: '歌名', describe: '歌名', type: 'text' },
                { data: '歌手', describe: '歌手', type: 'text' },
                { data: '专辑', describe: '专辑', type: 'text', enable: false },
                { data: '时长', describe: '时长', type: 'text', enable: false },
                { data: '来源', describe: '来源', enable: false, type: 'text' },
                { data: '歌曲ID', describe: '歌曲ID', type: 'text', enable: false },
                { data: '文件大小', describe: '文件大小', type: 'text' },
                { data: '播放音质', describe: '播放音质', type: 'text', enable: false },
                { data: '封面链接', describe: '封面链接', type: 'image' },
                { data: '歌曲链接', describe: '歌曲链接', type: 'text' },
            ]),
    }).description('`music.gdstudio.xyz`返回设置'),


    Schema.object({
        loggerinfo: Schema.boolean().default(false).description('日志调试开关'),
    }).description('调试模式'),
]);

function apply(ctx, config) {
    // const waitTimeInSeconds = config.waitTimeout / 1000;
    const exitCommands = config.exitCommand.split(/[,，]/).map(cmd => cmd.trim());
    const exitCommandTip = config.menuExitCommandTip ? `退出选择请发[${exitCommands}]中的任意内容<br /><br />` : '';

    if (config.enablemiddleware) {
        ctx.middleware(async (session, next) => {
            try {
                // 解析消息内容
                const messageElements = await h.parse(session.content);

                // 遍历解析后的消息元素
                for (const element of messageElements) {
                    // 确保元素类型为 'json' 并且有数据
                    if (element.type === 'json' && element.attrs && element.attrs.data) {
                        const jsonData = JSON.parse(element.attrs.data);
                        logInfo(jsonData);
                        // 检查是否存在 musicMeta 和 tag
                        const musicMeta = jsonData.meta.music;
                        if (musicMeta && musicMeta.tag) {
                            const tag = musicMeta.tag;
                            const title = musicMeta.title;
                            const desc = musicMeta.desc;
                            // 根据音乐标签选择 API
                            let command;
                            let usedId = config.used_id;
                            if (tag === 'QQ音乐') {
                                command = config.used_command === "command1" ? config.command1 : config.command3;
                            } else if (tag === '网易云音乐') {
                                command = config.used_command === "command1" ? config.command1 : config.command3;
                                usedId += 10;
                                // 理想情况下 这样是可以的，但是如果歌单不足10个，就不行了 以后再改吧
                            }

                            if (command) {
                                await session.execute(`${command} -n ${usedId} “${title} ${desc}”`);
                            }
                        }
                    }
                }
            } catch (error) {
                logInfo(error);
                await session.send('处理消息时出错。');
            }
            // 如果没有匹配到任何 json 数据，继续下一个中间件
            return next();
        });
    }

    ctx.command(name, "下载歌曲")
    ctx.command(name + '/' + config.command1 + '  <keyword:text>', '搜索歌曲')
        .option('quality', '-q <value:number> 品质因数')
        .option('number', '-n <number:number> 歌曲序号')
        .action(async ({ session, options }, keyword) => {
            if (!keyword) return '请输入歌曲相关信息。';

            let qq, netease;
            try {
                let res = await searchQQ(ctx.http, keyword);
                if (typeof res === 'string') res = JSON.parse(res);
                const item = res.request?.data?.body?.item_song;
                qq = {
                    code: res.code,
                    msg: '',
                    data: Array.isArray(item) ? item.map(v => ({
                        songname: v.title.replaceAll('<em>', '').replaceAll('</em>', ''),
                        album: v.album.name,
                        songid: v.id,
                        songurl: `https://y.qq.com/n/ryqq/songDetail/${v.mid}`,
                        name: v.singer.map(v => v.name).join('/')
                    })) : []
                };
            } catch (e) {
                logger.warn('获取QQ音乐数据时发生错误', e);
            }

            try {
                netease = await searchXZG(ctx.http, 'NetEase Music',
                    {
                        name: keyword,
                        key: config.xingzhigeAPIkey

                    });
            } catch (e) {
                logger.warn('获取网易云音乐数据时发生错误', e);
            }

            const qqData = qq?.data;
            const neteaseData = netease?.data;
            if (!qqData?.length && !neteaseData?.length) return '无法获取歌曲列表，请稍后再试。';

            const totalQQSongs = qqData?.length ?? 0;
            const totalNetEaseSongs = neteaseData?.length ?? 0;

            // 检查是不是可用序号
            let serialNumber = options.number;
            if (serialNumber) {
                serialNumber = Number(serialNumber);
                if (Number.isNaN(serialNumber) || serialNumber < 1 || serialNumber > (totalQQSongs + totalNetEaseSongs)) {
                    return `序号输入错误，已退出歌曲选择。`;
                }
            } else {
                // 给用户选择序号
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
                        h.text(`${exitCommandTip.replaceAll('<br />', '\n')}请在${config.waitTimeout}秒内，\n输入歌曲对应的序号`),
                    ];
                    const msg = await session.send(payload);
                    quoteId = msg.at(-1);
                } else {
                    const msg = await session.send(`${listText}<br /><br />${exitCommandTip}请在 ${config.waitTimeout}秒内，\n输入歌曲对应的序号`);
                    quoteId = msg.at(-1);
                }

                const input = await session.prompt(config.waitTimeout * 1000);
                if (!input) {
                    return `${quoteId ? h.quote(quoteId) : ''}输入超时，已取消点歌。`;
                }
                if (exitCommands.includes(input)) {
                    return `已退出歌曲选择。`;
                }
                serialNumber = +input;
                if (Number.isNaN(serialNumber) || serialNumber < 1 || serialNumber > (totalQQSongs + totalNetEaseSongs)) {
                    return `序号输入错误，已退出歌曲选择。`;
                }
            }

            let platform, songid, br, uin, skey;
            let selected;

            if (serialNumber <= totalQQSongs) {
                selected = qqData[serialNumber - 1];
                platform = 'QQ Music';
                songid = selected.songid;
                br = config.command1_qq_Quality;
                uin = config.command1_qq_uin;
                skey = config.command1_qq_skey;
            } else {
                selected = neteaseData[serialNumber - totalQQSongs - 1];
                platform = 'NetEase Music';
                songid = selected.id;
                br = config.command1_wyy_Quality;
                uin = 'onlyqq';
                skey = 'onlyqq';
            }

            if (options.quality) {
                br = options.quality;
            }
            if (!platform) return `获取歌曲失败。`;

            const song = await searchXZG(ctx.http, platform, {
                songid,
                br,
                uin,
                skey,
                key: config.xingzhigeAPIkey
            });

            if (song.code === 0) {
                const data = song.data;
                try {
                    let songDetails;
                    if (serialNumber <= totalQQSongs) {
                        songDetails = generateResponse(data, config.command1_return_qqdata_Field);
                    } else {
                        songDetails = generateResponse(data, config.command1_return_wyydata_Field);
                    }
                    logInfo(songDetails);
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
    ctx.command(name + '/' + config.command2 + ' <keyword:text>', '搜索QQ歌曲')
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
    await session.send(h.image(imageBuffer, 'image/png') + `${exitCommandTip}请在${waitTimeInSeconds}秒内，\n输入歌曲对应的序号`);
    }
    else {
    await session.send(songListMessage + `<br /><br />${exitCommandTip}请在${waitTimeInSeconds}秒内，\n输入歌曲对应的序号`);
    }
    // 用户回复序号
    const songChoice = await session.prompt(config.waitTimeout *1000); // 获取用户的输入
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

    /*
    ctx.command(name + '/' + config.command3 + ' <keyword:text>', '搜索龙珠歌曲')
        .option('quality', '-q <value:number> 品质因数', { fallback: config.command3_wyyQuality })
        .option('number', '-n <number:number> 歌曲序号')
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

            const totalSongs = qqSongs.length + wySongs.length;

            // 检查是 可用序号
            let index = options.number;
            if (index) {
                index = Number(index);
                if (Number.isNaN(index) || index < 1 || index > totalSongs) {
                    return '输入的序号无效。若要点歌请重新发起。';
                }
            } else {
                // 格式化QQ音乐歌曲列表
                const qqSongList = qqSongs.map((song, idx) => {
                    const title = song.song_title || song.title;
                    const singer = song.song_singer || song.singer;
                    return `${idx + 1}. ${title} -- ${singer}`;
                });

                // 格式化网易云音乐歌曲列表
                const wySongList = wySongs.map((song, idx) => {
                    const title = song.song_title || song.title;
                    const singer = song.song_singer || song.singer;
                    return `${idx + 1 + qqSongs.length}. ${title} -- ${singer}`;
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
                    await session.send(h.image(imageBuffer, 'image/png') + `${exitCommandTip}请在${waitTimeInSeconds}秒内，\n输入歌曲对应的序号`);
                } else {
                    await session.send(`以下是搜索结果：\n${songListMessage}\n${exitCommandTip}请在${waitTimeInSeconds}秒内，\n输入歌曲对应的序号`);
                }

                // 用户回复序号
                const songChoice = await session.prompt(config.waitTimeout);
                if (!songChoice) {
                    return '输入超时，已取消点歌。';
                }

                index = parseInt(songChoice, 10);
                if (isNaN(index) || index < 1 || index > totalSongs) {
                    return '输入的序号无效。若要点歌请重新发起。';
                }
            }

            const quality = options.quality || config.command3_wyyQuality;

            // 获取用户选择的歌曲详细信息
            let details, songDetails3;
            if (index <= qqSongs.length) {
                details = await fetchLongZhuQQDetails(keyword, index);
                songDetails3 = generateResponse(details, config.command3_return_qqdata_Field);
            } else {
                details = await fetchLongZhuWYDetails(keyword, index - qqSongs.length, quality);
                songDetails3 = generateResponse(details, config.command3_return_wyydata_Field);
            }

            if (!details) {
                return '无法获取歌曲下载链接。';
            }
            return songDetails3;
        });
*/

    ctx.command(config.command4 + ' <keyword:text>', '搜索酷狗音乐')
        .option('quality', '-q <value:number> 音质因数')
        .option('number', '-n <number:number> 歌曲序号')
        .action(async ({ session, options }, keyword) => {
            if (!keyword) return '请输入歌曲相关信息。';

            let kugou;
            try {
                kugou = await searchKugou(ctx.http, keyword, options.quality || config.command4_kugouQuality);
            } catch (e) {
                logger.warn('获取酷狗音乐数据时发生错误', e);
                return '获取酷狗音乐数据时发生错误，请稍后再试。';
            }

            const kugouData = kugou?.data;
            if (!kugouData?.length) return '无法获取歌曲列表，请稍后再试。';

            const totalKugouSongs = kugouData.length;

            // 检查是不是可用序号
            let serialNumber = options.number;
            if (serialNumber) {
                serialNumber = Number(serialNumber);
                if (Number.isNaN(serialNumber) || serialNumber < 1 || serialNumber > totalKugouSongs) {
                    return `序号输入错误，已退出歌曲选择。`;
                }
            } else {
                // 给用户选择序号
                const kugouListText = formatSongList(kugouData, '酷狗音乐', 0);
                const exitCommands = config.exitCommand.split(/[,，]/).map(cmd => cmd.trim());
                const exitCommandTip = config.menuExitCommandTip ? `退出选择请发[${exitCommands}]中的任意内容<br /><br />` : '';
                let quoteId = session.messageId;

                if (config.imageMode) {
                    const imageBuffer = await generateSongListImage(ctx.puppeteer, kugouListText);
                    const payload = [
                        h.image(imageBuffer, 'image/png'),
                        h.text(`${exitCommandTip.replaceAll('<br />', '\n')}请在${config.waitTimeout}秒内，\n输入歌曲对应的序号`),
                    ];
                    const msg = await session.send(payload);
                    quoteId = msg.at(-1);
                } else {
                    const msg = await session.send(`${kugouListText}<br /><br />${exitCommandTip}请在 ${config.waitTimeout}秒内，\n输入歌曲对应的序号`);
                    quoteId = msg.at(-1);
                }

                const input = await session.prompt(config.waitTimeout * 1000);
                if (!input) {
                    return `${quoteId ? h.quote(quoteId) : ''}输入超时，已取消点歌。`;
                }
                if (exitCommands.includes(input)) {
                    return `已退出歌曲选择。`;
                }
                serialNumber = +input;
                if (Number.isNaN(serialNumber) || serialNumber < 1 || serialNumber > totalKugouSongs) {
                    return `序号输入错误，已退出歌曲选择。`;
                }
            }

            //const selected = kugouData[serialNumber - 1];
            //const songid = serialNumber;
            //logInfo(songid);
            const br = options.quality || config.command4_kugouQuality;

            const song = await searchKugouSong(ctx.http, keyword, br, serialNumber);

            if (song.code === 0) {
                const data = song.data;
                try {
                    logInfo(song);
                    logInfo(data);
                    const songDetails = generateResponse(data, config.command4_return_data_Field);
                    logInfo(songDetails);
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



    const platformMap = {
        '网易云': 'netease',
        'QQ': 'tencent',
        '酷我': 'kuwo',
        'Tidal': 'tidal',
        'Qobuz': 'qobuz',
        '喜马FM': 'ximalaya',
        '咪咕': 'migu',
        '酷狗': 'kugou',
        '油管': 'ytmusic',
        'Spotify': 'spotify',
    };
    ctx.command(`${config.command5} <keyword:text>`, '歌曲搜索')
        .option('platform', '-p <platform:string> 平台名称')
        .option('number', '-n <number:number> 歌曲序号')
        .example("歌曲搜索 -p QQ -n 1 蔚蓝档案")
        .action(async ({ session, options }, keyword) => {
            if (!ctx.puppeteer) {
                await session.send("没有开启puppeteer服务");
                return;
            }
            if (!keyword) return '请输入歌曲相关信息。';

            const page = await ctx.puppeteer.page();
            try {
                // 打开目标网页
                await page.goto('https://music.gdstudio.xyz/', { waitUntil: 'networkidle2' });

                // 关闭公告弹窗（如果存在）
                const announcement = await page.$('.layui-layer-btn0');
                if (announcement) await announcement.click();

                // 点击【歌曲搜索】按钮
                const searchButton = await page.$('span[data-action="search"]');
                if (!searchButton) return '未找到搜索按钮，请检查页面结构。';
                await searchButton.click();

                // 等待搜索弹窗完全加载
                await page.waitForSelector('#search-area', { visible: true });

                // 输入搜索关键词
                await page.type('#search-wd', keyword);

                // 选择平台
                const platform = options.platform || config.command5_defaultPlatform;
                const platformValue = platformMap[platform]; // 获取对应的 value
                if (!platformValue) {
                    return `不支持的平台: ${platform}`;
                }

                const platformSelector = `input[name="source"][value="${platformValue}"]`;
                const platformRadio = await page.$(platformSelector);
                if (platformRadio) {
                    await platformRadio.click();
                } else {
                    return `未找到平台选项: ${platform}`;
                }
                logInfo(`已选择平台: ${platform}`);

                // 获取当前选中的平台（用于调试）
                const selectedPlatform = await page.$eval('input[name="source"]:checked', el => el.value);
                logInfo(`当前选中的平台: ${selectedPlatform}`);

                // 等待 500ms，确保选项生效
                await new Promise(resolve => setTimeout(resolve, 500));

                // 点击【搜索】按钮
                const submitButton = await page.$('.search-submit');
                if (!submitButton) return '未找到搜索提交按钮，请检查页面结构。';
                await submitButton.click();

                // 检查是否存在弹窗
                const alert = await page.$('.layui-layer-msg.layui-layer-hui');
                if (alert) {
                    const alertText = await page.evaluate(() => {
                        const alertContent = document.querySelector('.layui-layer-msg.layui-layer-hui .layui-layer-content');
                        return alertContent ? alertContent.innerText : null;
                    });

                    if (alertText) {
                        if (alertText.includes('关闭梯子')) {
                            // 国内节点提示弹窗：直接删除或关闭
                            await page.evaluate(() => {
                                const alertElement = document.querySelector('.layui-layer-msg.layui-layer-hui');
                                if (alertElement) alertElement.remove(); // 直接删除弹窗
                            });
                            logInfo('已删除国内节点提示弹窗');
                        } else if (alertText.includes('QQ请求已达今日上限')) {
                            // QQ请求上限提示弹窗：返回错误信息给用户
                            return `错误：${alertText}`;
                        }
                    }
                }

                // 等待搜索结果出现
                await page.waitForSelector('.list-item', { visible: true });


                // 确保搜索结果有效
                const searchResults = await page.$$('.list-item');
                if (searchResults.length === 0) {
                    return '未找到相关歌曲，请尝试其他关键词。';
                }

                // 静音
                const muteButton = await page.$('.btn-quiet');
                if (muteButton) {
                    await muteButton.click(); // 点击静音按钮
                    logInfo('已开启静音');
                } else {
                    ctx.logger.error('未找到静音按钮');
                }

                // 将音量调至最低
                await page.evaluate(() => {
                    const volumeSlider = document.querySelector('#volume-progress .mkpgb-dot');
                    if (volumeSlider) {
                        volumeSlider.style.left = '0%'; // 将音量滑块移动到最左侧
                    }
                });

                logInfo('已将音量调至最低');
                // 等待 1500ms 确保页面完全加载
                await new Promise(resolve => setTimeout(resolve, 1500));

                // 获取 #main-list 元素
                const mainListElement = await page.$('#main-list');
                if (!mainListElement) {
                    return '未找到歌曲列表元素，请检查页面结构。';
                }

                // 根据 config.command5_searchList 动态调整截图范围
                const listItems = await page.$$('.list-item');
                const screenshotHeight = Math.min(listItems.length, 1 + config.command5_searchList) * 50; // 假设每个列表项高度为 50px
                const screenshot = await mainListElement.screenshot({
                    clip: {
                        x: 0,
                        y: 0,
                        width: 800, // 假设宽度为 800px
                        height: screenshotHeight,
                    },
                });

                // 返回图文消息
                const exitCommands = config.exitCommand.split(/[,，]/).map(cmd => cmd.trim());
                const exitCommandTip = config.menuExitCommandTip ? `退出选择请发[${exitCommands}]中的任意内容\n\n` : '';
                const promptText = `${exitCommandTip}请在${config.waitTimeout}秒内，\n输入歌曲对应的序号`;

                // 获取用户输入的序号
                let selectedIndex;
                if (options.number) {
                    // 如果用户通过 -n 指定了序号，则直接使用
                    selectedIndex = options.number;
                } else {
                    await session.send([
                        h.image(screenshot, 'image/png'),
                        h.text(promptText),
                    ]);

                    // 否则等待用户输入
                    const input = await session.prompt(config.waitTimeout * 1000); // 超时时间
                    if (!input) return '输入超时，已取消点歌。';
                    selectedIndex = parseInt(input, 10);
                }

                // 检查序号是否有效
                if (isNaN(selectedIndex) || selectedIndex < 1 || selectedIndex > config.command5_searchList) {
                    return `序号输入错误，请输入 1 到 ${config.command5_searchList} 之间的数字。`;
                }

                // 点击选择的歌曲
                const songElement = await page.$(`.list-item[data-no="${selectedIndex - 1}"] .list-num`);
                if (!songElement) return '未找到歌曲元素，请检查页面结构。';

                // 模拟双击操作
                await page.evaluate((element) => {
                    const dblclickEvent = new MouseEvent('dblclick', {
                        bubbles: true, // 事件冒泡
                        cancelable: true, // 事件可以取消
                        view: window, // 事件视图
                    });
                    element.dispatchEvent(dblclickEvent);
                }, songElement);

                logInfo(`已双击歌曲序号: ${selectedIndex}`); // 调试日志

                // 检查是否存在弹窗

                /*额，这里在测试的时候，到了新的一天了  刷新了
                好像无法复现QQ请求上限提示弹窗了。以后再说吧 */

                if (alert) {
                    const alertText = await page.evaluate(() => {
                        const alertContent = document.querySelector('.layui-layer-msg.layui-layer-hui .layui-layer-content');
                        return alertContent ? alertContent.innerText : null;
                    });

                    if (alertText) {
                        if (alertText.includes('关闭梯子')) {
                            // 国内节点提示弹窗：直接删除或关闭
                            await page.evaluate(() => {
                                const alertElement = document.querySelector('.layui-layer-msg.layui-layer-hui');
                                if (alertElement) alertElement.remove(); // 直接删除弹窗
                            });
                            logInfo('已删除国内节点提示弹窗');
                        } else if (alertText.includes('QQ请求已达今日上限')) {
                            // QQ请求上限提示弹窗：返回错误信息给用户
                            return `错误：${alertText}`;
                        }
                    }
                }

                // 等待播放加载完成
                await page.waitForSelector('.layui-layer-msg', { visible: true });
                await page.waitForSelector('.layui-layer-msg', { hidden: true });

                // 获取歌曲信息
                const infoButton = await page.$('#music-info');
                if (!infoButton) return '未找到歌曲信息按钮，请检查页面结构。';
                await infoButton.click();

                // 点击【详情】按钮
                const detailButton = await page.$('.info-btn[onclick*="thisShare"]');
                if (!detailButton) return '未找到详情按钮，请检查页面结构。';
                await detailButton.click();

                // 等待【加载中】弹窗消失
                await page.waitForSelector('.layui-layer-msg', { visible: true });
                await page.waitForSelector('.layui-layer-msg', { hidden: true });

                // 等待详情加载完成
                await page.waitForSelector('.layui-layer-content', { visible: true });

                // 解析歌曲信息
                const songInfo = await page.evaluate(() => {
                    const infoElement = document.querySelector('.layui-layer-content');
                    if (!infoElement) return null;

                    const infoText = infoElement.innerText;

                    const extractInfo = (label, regex) => {
                        const match = infoText.match(new RegExp(`${label}${regex}`));
                        return match ? match[1] : null;
                    };

                    const info = {
                        歌名: extractInfo("歌名：", "(.+)"),
                        歌手: extractInfo("歌手：", "(.+)"),
                        专辑: extractInfo("专辑：", "(.+)"),
                        时长: extractInfo("时长：", "(.+)"),
                        来源: extractInfo("来源：", "(.+)"),
                        歌曲ID: extractInfo("歌曲ID：", "(.+)"),
                        文件大小: extractInfo("文件大小：", "(.+)"),
                        播放音质: extractInfo("播放音质：", "(.+)"),
                        歌词链接: extractInfo("歌词链接：", "(https?:\\/\\/.+)"), // 匹配链接
                        封面链接: extractInfo("封面链接：", "(https?:\\/\\/.+)"), // 匹配链接
                        歌曲链接: extractInfo("歌曲链接：", "(https?:\\/\\/.+)"), // 匹配链接
                    };

                    return info;
                });

                if (!songInfo) {
                    return '未找到歌曲信息，请稍后再试。';
                }
                logInfo(songInfo)
                // 返回自定义字段
                const response = generateResponse(songInfo, config.command5_return_data_Field);
                //logInfo(response)
                return response;
            } catch (error) {
                ctx.logger.error('音乐搜索插件出错:', error);
                return '音乐搜索插件出错，请稍后再试。';
            } finally {
                await page.close();
            }
        });


    async function searchKugou(http, query, br) {
        const apiBase = 'https://api.xingzhige.com/API/Kugou_GN_new/';
        const params = {
            name: query,
            pagesize: 20,
            br: br,
            key: config.xingzhigeAPIkey
        };
        return await http.get(apiBase, { params });
    }

    async function searchKugouSong(http, query, br, serialNumber) {
        const apiBase = 'https://api.xingzhige.com/API/Kugou_GN_new/';
        const params = {
            name: query,
            n: serialNumber,
            pagesize: 20,
            br: br,
            key: config.xingzhigeAPIkey
        };
        return await http.get(apiBase, { params });
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////
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
                        if (field.data === 'cover' || field.data === '封面链接') {
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