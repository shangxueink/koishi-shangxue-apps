"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.usage = exports.inject = exports.name = void 0;
const { Schema, Logger, h } = require("koishi");
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const path = require('node:path');
const url = require('node:url');
const name = 'music-link';
const inject = {
    required: ['http', "i18n"],
    optional: ['puppeteer'],
};
const logger = new Logger('music-link');
const usage = `
<hr>

<details>
<summary><h3>使用方法 (点击展开)</h3></summary>

<p>安装并配置插件后，使用下述命令搜索和下载音乐：</p>
<hr>

<h3>使用星之阁API搜索QQ、网易云音乐</h3>
<pre><code>下载音乐 [keywords]</code></pre>
<p><b>(不推荐)</b> 星之阁API，需要加群申请API Key，且API Key可能存在失效风险。支持QQ音乐和网易云音乐，速度较慢，稳定性一般。</p>
<hr>

<h3>使用星之阁-酷狗API搜索酷狗音乐</h3>
<pre><code>酷狗音乐 [keywords]</code></pre>
<p><b>(不推荐)</b> 星之阁-酷狗API，需要加群申请API Key，且API Key可能存在失效风险。仅支持酷狗音乐，速度较慢，稳定性一般。</p>
<hr>

<h3>使用music.gdstudio.xyz网站搜索各大音乐平台</h3>
<pre><code>歌曲搜索 [keywords]</code></pre>
<p><b>(比较推荐)</b> music.gdstudio.xyz 网站，无需API Key，但需要 <b>puppeteer</b> 服务支持进行网页爬取，速度还行。默认使用网易云音乐搜索，支持多平台选择。</p>
<hr>

<h3>使用api.injahow.cn网站搜索网易云音乐</h3>
<pre><code>网易点歌 [歌曲名称/歌曲ID]</code></pre>
<p><b>(很推荐)</b> api.injahow.cn 网站，API请求快速且稳定，无需 puppeteer 服务，推荐QQ官方机器人使用此后端，使用这个后端VIP歌曲只能听45秒，但这个指令还有一个后端可以都听。很好用哦<b>仅支持网易云音乐</b>，可以通过歌曲名称或歌曲ID进行搜索。</p>
<hr>

<h3>使用dev.iw233.cn网站搜索网易云音乐</h3>
<pre><code>音乐搜索器 [keywords]</code></pre>
<p><b>(推荐)</b> dev.iw233.cn 网站，无需API Key，但需要 <b>puppeteer</b> 服务支持进行网页爬取，速度较慢。支持网易云音乐搜索。</p>
<hr>

<h3>使用api.dragonlongzhu.cn网站API搜索音乐</h3>
<pre><code>龙珠搜索 [keywords]</code></pre>
<p><b>(一般推荐)</b> api.dragonlongzhu.cn 网站的点歌API。支持多平台音乐搜索。</p>
<hr>

</details>

---

<h3>如何返回语音/视频/群文件消息</h3>
<p>可以修改对应指令的<code>返回字段表</code>中的 <code>下载链接</code> 对应的 <code>字段发送类型</code> 字段，

把 <code>text</code> 更改为 <code>audio</code> 就是返回 语音，

改为 <code>video</code> 就是返回 视频消息，

改为 <code>file</code> 就是返回 群文件。</p>
<hr>

<p>⚠️需要注意的是，当配置返回格式为音频/视频的时候，请自行检查是否安装了 <code>silk</code>、<code>ffmpeg</code> 等服务。</p>
<p>⚠️如果你选择了 <code>file</code> 类型，请确保平台支持！目前仅实测了 <code>onebot</code> 平台的部分协议端支持！</p>
<hr>

<h3>使用 <code>-n 1</code> 直接返回内容</h3>
<p>在使用命令时，可以通过添加 <code>-n 1</code> 选项直接返回指定序号的歌曲内容。这对于快速获取特定歌曲非常有用。</p>
<p>例如，使用以下命令可以直接获取第一首歌曲的详细信息：</p>
<pre><code>歌曲搜索 -n 1 蔚蓝档案</code></pre>


---

## 重要提示⚠️

### 目前 星之阁API的key已经失效，如需使用请自行前往注册

### 目前 推荐使用<code>api.injahow.cn（网易云点歌）</code>的服务，请确保<code>puppeteer</code>服务可用

---
| 后端推荐度 |               名称                | 备注  |
| :--------: | :-------------------------------: | :---: |
|   **ⅰ**    | \`api.injahow.cn\` (歌曲搜索) | 较高  |
|   **ⅱ**    |   \`dev.iw233.cn\` (音乐搜索器)   | 中等  |
|  *......*  |               其他                | 中等  |
|   **ⅳ**    | \`星之阁API\` (下载音乐/酷狗音乐) | 较低  |

---

目前基本QQ音乐都死翘翘了 （腾讯太小气了
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

const command5_return_data_Field_default = [
    {
        "data": "name",
        "describe": "歌曲名称",
        "type": "text"
    },
    {
        "data": "artist",
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
        "data": "source",
        "describe": "来源平台",
        "enable": false,
        "type": "text"
    },
    {
        "data": "fileSize",
        "describe": "文件大小",
        "type": "text"
    },
    {
        "data": "br",
        "describe": "比特率",
        "type": "text",
        "enable": false
    },
    {
        "data": "coverUrl",
        "describe": "封面链接",
        "type": "image"
    },
    {
        "data": "musicUrl",
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

const command6_return_data_Field_default = [
    {
        "data": "name",
        "describe": "歌曲名称",
        "type": "text"
    },
    {
        "data": "id",
        "describe": "歌曲ID",
        "type": "text"
    },
    {
        "data": "artist",
        "describe": "歌手",
        "type": "text"
    },
    {
        "data": "url",
        "describe": "下载链接",
        "type": "text"
    },
    {
        "data": "pic",
        "describe": "封面链接",
        "type": "image"
    },
    {
        "data": "lrc",
        "describe": "歌词",
        "type": "text",
        "enable": false
    }
];

const command7_return_data_Field_default = [
    {
        "type": "text",
        "data": "type",
        "describe": "平台名称",
        "enable": false
    },
    {
        "data": "link",
        "describe": "音乐地址",
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
        "data": "title",
        "describe": "歌曲名称",
        "type": "text",
        "enable": null
    },
    {
        "data": "author",
        "describe": "歌手",
        "type": "text"
    },
    {
        "data": "lrc",
        "describe": "歌词",
        "type": "text",
        "enable": false
    },
    {
        "data": "url",
        "describe": "下载链接",
        "type": "text"
    },
    {
        "data": "pic",
        "describe": "封面链接",
        "type": "image"
    }
];

const command8_return_QQdata_Field_default = [
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
        "data": "url",
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

const Config = Schema.intersect([
    Schema.object({
        enableReplySonglist: Schema.boolean().default(false).description("开启后 发送歌单消息的时候 会回复触发指令的消息"),
        waitTimeout: Schema.natural().role('s').description('允许用户返回选择序号的等待时间').default(45),
        exitCommand: Schema.string().default('0, 不听了').description('退出选择指令，多个指令间请用逗号分隔开'), // 兼容中文逗号、英文逗号
        menuExitCommandTip: Schema.boolean().default(false).description('是否在歌单内容的后面，加上退出选择指令的文字提示'),
    }).description('基础设置'),

    Schema.object({
        imageMode: Schema.boolean().default(true).description('开启后返回图片歌单（需要puppeteer服务），关闭后返回文本歌单（部分指令必须使用puppeteer）'),
        darkMode: Schema.boolean().default(true).description('是否开启暗黑模式（黑底菜单）')
    }).description('图片歌单设置'),

    Schema.object({
        serverSelect: Schema.union([
            Schema.const('command1').description('command1：星之阁API                 （需加群申请APIkey）          （QQ + 网易云）'),
            Schema.const('command4').description('command4：星之阁-酷狗API             （需加群申请APIkey）          （酷狗）'),
            Schema.const('command5').description('command5：`music.gdstudio.xyz`  网站   （需puppeteer爬取 较慢，但访问性好）    （多平台）'),
            Schema.const('command6').description('command6：`api.injahow.cn`网站       （API 请求快 + 稳定 推荐QQ官方机器人使用）      （网易云）'),
            Schema.const('command7').description('command7：`dev.iw233.cn` 网站         （需puppeteer爬取 较慢）          （网易云）'),
            Schema.const('command8').description('command8：`api.dragonlongzhu.cn` 龙珠API  （多平台音乐）'),
        ]).role('radio').default("command6").description('选择使用的后端<br>➣ 推荐度：`api.injahow.cn`  ≥ `music.gdstudio.xyz` ≥ `dev.iw233.cn` ≥ `api.dragonlongzhu.cn` > `星之阁API`'),
    }).description('后端选择'),
    Schema.union([
        Schema.object({
            serverSelect: Schema.const('command1').required(),
            xingzhigeAPIkey: Schema.string().role('secret').description('星之阁的音乐API的请求key<br>（默认值是作者自己的哦，如果失效了请你自己获取一个）<br>请前往 QQ群 905188643 <br>添加QQ好友 3556898686 <br>私聊发送 `/getapikey` 获得你的APIkey以填入此处 ')
                .default("xhsP7Q4MulpzDU6BVwHSKB-j-NfvBxaqiT37hx8djyE="),
            command1: Schema.string().default('下载音乐').description('星之阁API的指令名称'),
            command1_wyy_Quality: Schema.number().default(2).description('网易云音乐默认下载音质。默认2，其余自己试 `不建议更改，可能会导致无音源`'),
            command1_qq_Quality: Schema.number().default(2).description('QQ音乐默认下载音质。音质11为最高 `不建议更改，可能会导致无音源`'),
            command1_qq_uin: Schema.string().description('QQ音乐搜索：提供skey的账号(当站长提供的cookie失效时必填，届时生效)'),
            command1_qq_skey: Schema.string().description('QQ音乐搜索：提供开通有绿钻特权的skey可获取vip歌曲(当站长提供的cookie失效时必填，届时生效)为空默认获取站长提供的skey'),

            command1_return_qqdata_Field: Schema.array(Schema.object({
                data: Schema.string().description('返回的字段'),
                describe: Schema.string().description('对该字段的中文描述'),
                type: Schema.union([
                    Schema.const('text').description('文本（text）'),
                    Schema.const('image').description('图片（image）'),
                    Schema.const('audio').description('语音（audio）'),
                    Schema.const('video').description('视频（video）'),
                    Schema.const('file').description('文件（file）'),
                ]).description('字段发送类型'),
                enable: Schema.boolean().default(true).description('是否启用')
            })).role('table').default(command1_return_qqdata_Field_default).description('歌曲返回信息的字段选择<br>[➣ 点我查看该API返回内容示例](https://api.xingzhige.com/API/QQmusicVIP/?songid=499449053&br=2&uin=2&skey=2&key=)'),

            command1_return_wyydata_Field: Schema.array(Schema.object({
                data: Schema.string().description('返回的字段'),
                describe: Schema.string().description('对该字段的中文描述'),
                type: Schema.union([
                    Schema.const('text').description('文本（text）'),
                    Schema.const('image').description('图片（image）'),
                    Schema.const('audio').description('语音（audio）'),
                    Schema.const('video').description('视频（video）'),
                    Schema.const('file').description('文件（file）'),
                ]).description('字段发送类型'),
                enable: Schema.boolean().default(true).description('是否启用')
            })).role('table').default(command1_return_wyydata_Field_default).description('歌曲返回信息的字段选择<br>[➣ 点我查看该API返回内容示例](https://api.xingzhige.com/API/NetEase_CloudMusic_new/?name=%E8%94%9A%E8%93%9D%E6%A1%88&n=1&key=)'),

        }).description('星之阁API返回设置'),

        Schema.object({
            serverSelect: Schema.const('command4').required(),
            xingzhigeAPIkey: Schema.string().role('secret').description('星之阁的音乐API的请求key<br>（默认值是作者自己的哦，如果失效了请你自己获取一个）<br>请前往 QQ群 905188643 <br>添加QQ好友 3556898686 <br>私聊发送 `/getapikey` 获得你的APIkey以填入此处 ')
                .default("xhsP7Q4MulpzDU6BVwHSKB-j-NfvBxaqiT37hx8djyE="),
            command4: Schema.string().default('酷狗音乐').description('酷狗-星之阁API的指令名称'),
            command4_kugouQuality: Schema.number().default(1).description('音乐默认下载音质。音质，默认为1'),
            command4_return_data_Field: Schema.array(Schema.object({
                data: Schema.string().description('返回的字段'),
                describe: Schema.string().description('对该字段的中文描述'),
                type: Schema.union([
                    Schema.const('text').description('文本（text）'),
                    Schema.const('image').description('图片（image）'),
                    Schema.const('audio').description('语音（audio）'),
                    Schema.const('video').description('视频（video）'),
                    Schema.const('file').description('文件（file）'),
                ]).description('字段发送类型'),
                enable: Schema.boolean().default(true).description('是否启用')
            })).role('table').default(command4_return_data_Field_default).description('歌曲返回信息的字段选择<br>[➣ 点我查看该API返回内容示例](https://api.xingzhige.com/API/Kugou_GN_new/?name=蔚蓝档案&pagesize=20&br=2&key=)'),
        }).description('酷狗-星之阁API返回设置'),

        Schema.object({
            serverSelect: Schema.const('command5').required(),
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
            ]).description('音乐 **默认**使用的平台。').default('网易云'),
            /*
            command5_defaultQuality: Schema.union([
            Schema.const('128K').description('128K标准 [ 全部音乐源 ]<br>192K较高 [ 网易云 / QQ / Spotify / 咪咕 / 油管 ]'),
            Schema.const('320K').description('320K高品 [ 全部音乐源 ]'),
            Schema.const('16bit').description('16bit无损 [ 网易云 / QQ / 酷我 / Tidal / Qobuz / 咪咕 ]'),
            Schema.const('24bit').description('24bit无损 [ 网易云 / QQ / Tidal / Qobuz ]'),
            ]).role('radio').description('音乐 **默认**下载音质。').default('320K'),
            */
            command5_searchList: Schema.number().default(20).min(1).max(20).description('歌曲搜索的列表长度。返回的候选项个数。'),
            command5_page_setTimeout: Schema.number().default(15).min(1).description('等待页面完全加载的等待时间（秒）'),
            command5_return_data_Field: Schema.array(Schema.object({
                data: Schema.string().description('返回的字段'),
                describe: Schema.string().description('对该字段的中文描述'),
                type: Schema.union([
                    Schema.const('text').description('文本（text）'),
                    Schema.const('image').description('图片（image）'),
                    Schema.const('audio').description('语音（audio）'),
                    Schema.const('video').description('视频（video）'),
                    Schema.const('file').description('文件（file）'),
                ]).description('字段发送类型'),
                enable: Schema.boolean().default(true).description('是否启用'),
            })).role('table').description('歌曲返回信息的字段选择<br>').default(command5_return_data_Field_default),
        }).description('`music.gdstudio.xyz`返回设置'),

        Schema.object({
            serverSelect: Schema.const('command6'),
            command6: Schema.string().default('网易点歌').description('`网易点歌`的指令名称<br>输入歌曲ID，返回歌曲'),
            command6_searchList: Schema.number().default(20).min(1).max(100).description('歌曲搜索的列表长度。返回的候选项个数。'),
            maxDuration: Schema.natural().description('歌曲最长持续时间，单位为：秒').default(900),
            command6_useProxy: Schema.boolean().experimental().description('是否使用 Apifox Web Proxy 代理请求（适用于海外用户）').default(false),
            command6_usedAPI: Schema.union([
                Schema.const('api.injahow.cn').description('（稳定）黑胶只能30秒的`api.injahow.cn`后端（适合官方bot）'),
                Schema.const('meting.jmstrand.cn').description('（推荐）稳定性未知、全部可听的`meting.jmstrand.cn`后端').experimental(),
                Schema.const('api.qijieya.cn').description('（推荐）稳定性未知、全部可听的`api.qijieya.cn`后端').experimental(),
                Schema.const('metingapi.nanorocky.top').description('(不推荐 文件很大) 稳定性未知、无损音质、全部可听的`meting.jmstrand.cn`后端').experimental(),
            ]).description("选择 获取音乐直链的后端API").default("api.qijieya.cn"),
            command6_return_data_Field: Schema.array(Schema.object({
                data: Schema.string().description('返回的字段'),
                describe: Schema.string().description('对该字段的中文描述'),
                type: Schema.union([
                    Schema.const('text').description('文本（text）'),
                    Schema.const('image').description('图片（image）'),
                    Schema.const('audio').description('语音（audio）'),
                    Schema.const('video').description('视频（video）'),
                    Schema.const('file').description('文件（file）'),
                ]).description('字段发送类型'),
                enable: Schema.boolean().default(true).description('是否启用'),
            })).role('table').description('歌曲返回信息的字段选择<br>[➣ 点我查看该API返回内容示例](http://music.163.com/api/search/get/web?csrf_token=hlpretag=&hlposttag=&s=蔚蓝档案&type=1&offset=0&total=true&limit=10)').default(command6_return_data_Field_default),
        }).description('`网易点歌`返回设置'),

        Schema.object({
            serverSelect: Schema.const('command7').required(),
            command7: Schema.string().default('音乐搜索器').description('`音乐搜索器`的指令名称<br>使用 dev.iw233.cn 提供的网站'),
            command7_searchList: Schema.number().default(10).min(1).step(1).max(10).description('歌曲搜索的列表长度。返回的候选项个数。<br>为`网易云音乐`的组合'),
            command7_return_data_Field: Schema.array(Schema.object({
                data: Schema.string().description('返回的字段'),
                describe: Schema.string().description('对该字段的中文描述'),
                type: Schema.union([
                    Schema.const('text').description('文本（text）'),
                    Schema.const('image').description('图片（image）'),
                    Schema.const('audio').description('语音（audio）'),
                    Schema.const('video').description('视频（video）'),
                    Schema.const('file').description('文件（file）'),
                ]).description('字段发送类型'),
                enable: Schema.boolean().default(true).description('是否启用'),
            })).role('table').description('歌曲返回信息的字段选择<br>[➣ 点我查看该API返回内容示例](https://dev.iw233.cn/Music1/?name=%E8%94%9A%E8%93%9D%E6%A1%A3%E6%A1%88&type=netease) 需F12 网络标签页 预览响应 `Music1/`').default(command7_return_data_Field_default),
        }).description('`dev.iw233.cn`返回设置'),

        Schema.object({
            serverSelect: Schema.const('command8').required(),
            command8: Schema.string().default('龙珠搜索').description('龙珠API的指令名称'),
            // command8_wyyQuality: Schema.number().default(1).description('QQ音乐默认下载音质。`找不到对应音质，会自动使用标准音质`<br>1(标准音质)/2(极高音质)/3(无损音质)/4(Hi-Res音质)/5(高清环绕声)/6(沉浸环绕声)/7(超清母带)'),
            command8_searchList: Schema.number().default(20).min(1).max(100).description('歌曲搜索的列表长度。返回的候选项个数。'),

            command8_return_QQdata_Field: Schema.array(Schema.object({
                data: Schema.string().description('返回的字段'),
                describe: Schema.string().description('对该字段的中文描述'),
                type: Schema.union([
                    Schema.const('text').description('文本（text）'),
                    Schema.const('image').description('图片（image）'),
                    Schema.const('audio').description('语音（audio）'),
                    Schema.const('video').description('视频（video）'),
                    Schema.const('file').description('文件（file）'),
                ]).description('字段发送类型'),
                enable: Schema.boolean().default(true).description('是否启用')
            })).role('table').default(command8_return_QQdata_Field_default).description('音乐歌曲返回信息的字段选择<br>[➣ 点我查看该API返回内容示例](https://api.dragonlongzhu.cn/api/joox/juhe_music.php?msg=%E8%94%9A%E8%93%9D%E6%A1%A3%E6%A1%88&type=json&br=1&num=20&n=1)'),
        }).description('龙珠API返回设置'),

        Schema.object({
        }).description('↑ 请选择后端服务 ↑'),
    ]),

    Schema.object({
        enablemiddleware: Schema.boolean().description("是否自动解析JSON音乐卡片").default(false),
        middleware: Schema.boolean().description("`enablemiddleware`是否使用前置中间件监听<br>`中间件无法接受到消息可以考虑开启`").default(false),
        used_id: Schema.number().default(1).min(0).max(10).description("在歌单里默认选择的序号<br>范围`0-10`，无需考虑11-20，会自动根据JSON卡片的平台选择。若音乐平台不匹配 则在搜索项前十个进行选择。"),
    }).description('JSON卡片解析设置'),

    Schema.object({
        isfigure: Schema.boolean().default(false).description("`图片、文本`元素 使用合并转发，其余单独发送<br>`仅支持 onebot 适配器` 其他平台开启 无效").experimental(),
        isuppercase: Schema.boolean().default(false).description("将链接域名进行大写置换，仅适用于qq官方平台").experimental(),
        data_Field_Mode: Schema.union([
            Schema.const('text').description('富媒体置底：文字 > 图片 > 语音 ≥ 视频 ≥ 文件 （默认）'),
            Schema.const('image').description('仅图片置顶的 富媒体置底：图片 > 文字 ≥ 语音 ≥ 视频 ≥ 文件 （仅官方机器人考虑使用）'),
            Schema.const('raw').description('严格按照 `command_return_data_Field` 表格的顺序 （严格按照配置项表格的上下顺序）'),
        ]).role('radio').default("text").description('对 `command*_return_data_Field`配置项 排序的控制<br>优先级越高，顺序越靠前<br>[➣点我查看此配置项 效果预览图](https://i0.hdslb.com/bfs/article/6e8b901f9b9daa57f082bf0cece36102312276085.png)'),
        renameTempFile: Schema.boolean().default(false).description('是否对`临时音频文件`以`歌曲名称`重命名<br>否则会使用hash值为名称<br>（仅在部分协议端的`h.file`方法下见效）').experimental(),
        deleteTempTime: Schema.number().default(20).description('对于`file`类型的`Temp`临时文件的删除时间<br>若干`秒`后 删除下载的本地临时文件').experimental(),
    }).description('高级进阶设置'),

    Schema.object({
        loggerinfo: Schema.boolean().default(false).description('日志调试开关'),
    }).description('调试模式'),
]);

function apply(ctx, config) {

    const tempDir = path.join(__dirname, 'temp'); // h.file的临时存储 用于解决部分协议端必须上传本地URL
    let isTempDirInitialized = false;
    const tempFiles = new Set(); // 用于跟踪临时文件路径

    ctx.on('ready', async () => {

        ctx.i18n.define("zh-CN", {
            commands: {
                [config.command1]: {
                    description: `搜索歌曲`,
                    messages: {
                        "nokeyword": `请输入歌曲相关信息。\n➣示例：/${config.command1} 蔚蓝档案`,
                        "songlisterror": "无法获取歌曲列表，请稍后再试。",
                        "invalidNumber": "序号输入错误，已退出歌曲选择。",
                        "waitTime": "请在{0}秒内，\n输入歌曲对应的序号:\n➣示例：@机器人 1",
                        "waitTimeout": "输入超时，已取消点歌。",
                        "exitprompt": "已退出歌曲选择。",
                        "noplatform": "获取歌曲失败。",
                        "somerror": "解析歌曲详情时发生错误",
                    }
                },
                [config.command4]: {
                    description: `搜索酷狗音乐`,
                    messages: {
                        "nokeyword": `请输入歌曲相关信息。\n➣示例：/${config.command4} 蔚蓝档案`,
                        "songlisterror": "获取酷狗音乐数据时发生错误，请稍后再试。",
                        "invalidNumber": "序号输入错误，已退出歌曲选择。",
                        "waitTime": "请在{0}秒内，\n输入歌曲对应的序号:\n➣示例：@机器人 1",
                        "waitTimeout": "输入超时，已取消点歌。",
                        "exitprompt": "已退出歌曲选择。",
                        "noplatform": "获取歌曲失败。",
                        "somerror": "解析歌曲详情时发生错误",
                    }
                },
                [config.command5]: {
                    description: `歌曲搜索`,
                    messages: {
                        "nopuppeteer": "没有开启puppeteer服务",
                        "nokeyword": `请输入歌曲相关信息。\n➣示例：/${config.command5} 蔚蓝档案`,
                        "invalidplatform": "`不支持的平台: {0}`;",
                        "songlisterror": "无法获取歌曲列表，请稍后再试。",
                        "invalidNumber": "序号输入错误，已退出歌曲选择。",
                        "waitTime": "请在{0}秒内，\n输入歌曲对应的序号:\n➣示例：@机器人 1",
                        "waitTimeout": "输入超时，已取消点歌。",
                        "exitprompt": "已退出歌曲选择。",
                        "noplatform": "获取歌曲失败。",
                        "somerror": "解析歌曲详情时发生错误",
                        "noSearchResults": "没有找到相关的歌曲，请尝试更换关键词或平台。",

                    }
                },
                [config.command6]: {
                    description: `网易云点歌`,
                    messages: {
                        "nopuppeteer": "没有开启puppeteer服务",
                        "nokeyword": `请输入网易云歌曲的 名称 或 ID。\n➣示例：/${config.command6} 蔚蓝档案\n➣示例：/${config.command6} 2608813264`,
                        "invalidNumber": "序号输入错误，已退出歌曲选择。",
                        "waitTime": "请在{0}秒内，\n输入歌曲对应的序号:\n➣示例：@机器人 1",
                        "waitTimeout": "输入超时，已取消点歌。",
                        "exitprompt": "已退出歌曲选择。",
                        "noplatform": "获取歌曲失败。",
                        "somerror": "解析歌曲详情时发生错误",
                        "songlisterror": "无法获取歌曲列表，请稍后再试。",
                        "maxsongDuration": "歌曲持续时间超出限制，允许的单曲最大时长为 {0} 秒。",
                    }
                },
                [config.command7]: {
                    description: `音乐搜索器`,
                    messages: {
                        "nopuppeteer": "没有开启puppeteer服务",
                        "nokeyword": `请输入歌曲相关信息。\n➣示例：/${config.command7} 蔚蓝档案`,
                        "invalidNumber": "序号输入错误，已退出歌曲选择。",
                        "waitTime": "请在{0}秒内，\n输入歌曲对应的序号:\n➣示例：@机器人 1",
                        "waitTimeout": "输入超时，已取消点歌。",
                        "exitprompt": "已退出歌曲选择。",
                        "noplatform": "获取歌曲失败。",
                        "somerror": "解析歌曲详情时发生错误",
                        "songlisterror": "无法获取歌曲列表，请稍后再试。",
                    }
                },
                [config.command8]: {
                    description: `龙珠音乐`,
                    messages: {
                        "nopuppeteer": "没有开启puppeteer服务",
                        "nokeyword": `请输入歌曲相关信息。\n➣示例：/${config.command8} 蔚蓝档案`,
                        "invalidNumber": "序号输入错误，已退出歌曲选择。",
                        "waitTime": "请在{0}秒内，\n输入歌曲对应的序号:\n➣示例：@机器人 1",
                        "waitTimeout": "输入超时，已取消点歌。",
                        "exitprompt": "已退出歌曲选择。",
                        "noplatform": "获取歌曲失败。",
                        "somerror": "解析歌曲详情时发生错误",
                        "songlisterror": "无法获取歌曲列表，请稍后再试。",
                    }
                }
            }
        });

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
                            logInfo(JSON.stringify(jsonData, null, 2));


                            // 检查是否存在 musicMeta 和 tag
                            const musicMeta = jsonData?.meta?.music || jsonData?.meta?.news; // 尝试兼容两种结构
                            const tag = musicMeta?.tag;
                            if (musicMeta && tag.includes("音乐")) {

                                const title = musicMeta.title;
                                const desc = musicMeta.desc;
                                logInfo("↡--------------中间件解析--------------↡");
                                logInfo(tag);
                                logInfo(title);
                                logInfo(desc);
                                logInfo("↟--------------中间件解析--------------↟");
                                // 获取配置的指令名称
                                let command = config.serverSelect;
                                let commandName = config[command]; // 直接使用 config[command] 获取配置项的值
                                logInfo(commandName);
                                if (!commandName) {
                                    commandName = '歌曲搜索'; // 默认值，以防配置项不存在
                                    logger.error(`未找到配置项 ${command} 对应的指令名称，使用默认指令名称 '歌曲搜索'`);
                                }

                                // 如果选择了 command6 并且是网易云音乐卡片
                                if (command === 'command6' && tag === '网易云音乐') {
                                    // 直接提取歌曲 ID
                                    const jumpUrl = musicMeta.jumpUrl;
                                    const match = jumpUrl?.match(/id=(\d+)/); // 使用 ?. 确保 jumpUrl 不为 null 或 undefined
                                    if (match && match[1]) {
                                        const songId = match[1];
                                        logInfo(`提取到网易云音乐 ID: ${songId}`);

                                        // 执行 command6 指令
                                        await session.execute(`${commandName} ${songId}`);
                                        return; // 结束当前中间件处理
                                    } else {
                                        logger.error('未能在 jumpUrl 中找到歌曲 ID');
                                    }
                                } else {
                                    // 其他情况，按照原逻辑处理
                                    let usedId = config.used_id;
                                    if (tag === '网易云音乐') {
                                        if (config.serverSelect === "command1") { // command1 的网易云音乐是后 10 个
                                            usedId += 10;
                                        }
                                    }
                                    logInfo(`使用指令： ${command} ，选择序号：${usedId}`)

                                    if (command) {
                                        // 更通用的获取指令名称方式
                                        logInfo(`${commandName} -n ${usedId} “${title} ${desc}”`)
                                        await session.execute(`${commandName} -n ${usedId} “${title} ${desc}”`);
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    ctx.logger.error(error);
                    await session.send('处理消息时出错。');
                }
                // 如果没有匹配到任何 json 数据，继续下一个中间件
                return next();
            }, config.middleware);
        }

        if (config.serverSelect === "command1") {
            ctx.command(`${config.command1} <keyword:text>`)
                .option('quality', '-q <value:number> 品质因数')
                .option('number', '-n <number:number> 歌曲序号')
                .action(async ({ session, options }, keyword) => {
                    if (!keyword) return h.text(session.text(".nokeyword"));

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
                        logInfo(qq)
                    } catch (e) {
                        logger.error('获取QQ音乐数据时发生错误', e);
                    }

                    try {
                        netease = await searchXZG(ctx.http, 'NetEase Music',
                            {
                                name: keyword,
                                key: config.xingzhigeAPIkey

                            });
                    } catch (e) {
                        logger.error('获取网易云音乐数据时发生错误', e);
                    }

                    const qqData = qq?.data;
                    const neteaseData = netease?.data;
                    if (!qqData?.length && !neteaseData?.length) return h.text(session.text(`.songlisterror`));

                    const totalQQSongs = qqData?.length ?? 0;
                    const totalNetEaseSongs = neteaseData?.length ?? 0;

                    // 检查是不是可用序号
                    let serialNumber = options.number;
                    if (serialNumber) {
                        serialNumber = Number(serialNumber);
                        if (Number.isNaN(serialNumber) || serialNumber < 1 || serialNumber > (totalQQSongs + totalNetEaseSongs)) {
                            return h.text(session.text(`.invalidNumber`));
                        }
                    } else {
                        // 给用户选择序号
                        const qqListText = qqData?.length ? formatSongList(qqData, 'QQ Music', 0, 10) : '<b>QQ Music</b>: 无法获取歌曲列表';

                        const neteaseListText = neteaseData?.length ? formatSongList(neteaseData, 'NetEase Music', qqData?.length ? 0 : 10, 20) : '<b>NetEase Music</b>: 无法获取歌曲列表';
                        const listText = `${qqListText}<br /><br />${neteaseListText}`;
                        const exitCommands = config.exitCommand.split(/[,，]/).map(cmd => cmd.trim());
                        const exitCommandTip = config.menuExitCommandTip ? `退出选择请发[${exitCommands}]中的任意内容<br /><br />` : '';
                        let quoteId = session.messageId;

                        if (config.imageMode) {
                            const imageBuffer = await generateSongListImage(ctx.puppeteer, listText);
                            const payload = [
                                ...( config.enableReplySonglist ? [h.quote(session.messageId)] : [] ),
                                h.image(imageBuffer, 'image/png'),
                                h.text(`${exitCommandTip.replaceAll('<br />', '\n')}${h.text(session.text(`.waitTime`, [config.waitTimeout]))}`),
                            ];
                            const msg = await session.send(payload);
                            quoteId = msg.at(-1);
                        } else {
                            const payload = [
                                ...( config.enableReplySonglist ? [h.quote(session.messageId)] : [] ),
                                // h('b', {}, "qwq, hihi"), // 这样写就不会发送原始<b>文本了
                                parseBToH(`${listText.replaceAll('<br />', '\n')}\n\n${exitCommandTip.replaceAll('<br />', '\n')}${h.text(session.text(`.waitTime`, [config.waitTimeout]))}`)
                            ]
                            const msg = await session.send(payload);
                            // const msg = await session.send(`${listText.replaceAll('<br />', '\n')}\n\n${exitCommandTip.replaceAll('<br />', '\n')}${h.text(session.text(`.waitTime`, [config.waitTimeout]))}`);
                            quoteId = msg.at(-1);
                        }

                        const input = await session.prompt(config.waitTimeout * 1000);
                        if (!input) {
                            return `${quoteId ? h.quote(quoteId) : ''}${session.text(`.waitTimeout`)}`;

                        }
                        if (exitCommands.includes(input)) {
                            return h.text(session.text(`.exitprompt`));
                        }
                        serialNumber = +input;
                        if (Number.isNaN(serialNumber) || serialNumber < 1 || serialNumber > (totalQQSongs + totalNetEaseSongs)) {
                            return h.text(session.text(`.songlisterror`));
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
                    if (!platform) return h.text(session.text(`.noplatform`));

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
                                songDetails = generateResponse(session, data, config.command1_return_qqdata_Field);
                            } else {
                                songDetails = generateResponse(session, data, config.command1_return_wyydata_Field);
                            }
                            logInfo(songDetails);
                            return songDetails;
                        } catch (e) {
                            logger.error(e);
                            return h.text(session.text(`.somerror`));
                        }
                    } else {
                        logger.error(`获取歌曲失败：${JSON.stringify(song)}`);
                        return '获取歌曲失败：' + song.msg;
                    }
                });
        }

        if (config.serverSelect === "command4") {
            ctx.command(`${config.command4} <keyword:text>`)
                .option('quality', '-q <value:number> 音质因数')
                .option('number', '-n <number:number> 歌曲序号')
                .action(async ({ session, options }, keyword) => {
                    if (!keyword) return h.text(session.text(`.nokeyword`));

                    let kugou;
                    try {
                        kugou = await searchKugou(ctx.http, keyword, options.quality || config.command4_kugouQuality);
                        if (kugou.code !== 200) {
                            logger.error(kugou);
                            return h.text(`获取酷狗音乐数据时发生错误`);
                        }
                    } catch (e) {
                        logger.error('获取酷狗音乐数据时发生错误', e);
                        return h.text(session.text(`.songlisterror`));
                    }

                    const kugouData = kugou?.data;
                    if (!kugouData?.length) return h.text(session.text(`.songlisterror`));

                    const totalKugouSongs = kugouData.length;

                    // 检查是不是可用序号
                    let serialNumber = options.number;
                    if (serialNumber) {
                        serialNumber = Number(serialNumber);
                        if (Number.isNaN(serialNumber) || serialNumber < 1 || serialNumber > totalKugouSongs) {
                            return h.text(session.text(`.invalidNumber`));
                        }
                    } else {
                        // 给用户选择序号
                        const kugouListText = formatSongList(kugouData, '酷狗音乐', 0, 20);
                        const exitCommands = config.exitCommand.split(/[,，]/).map(cmd => cmd.trim());
                        const exitCommandTip = config.menuExitCommandTip ? `退出选择请发[${exitCommands}]中的任意内容<br /><br />` : '';
                        let quoteId = session.messageId;

                        if (config.imageMode) {
                            const imageBuffer = await generateSongListImage(ctx.puppeteer, kugouListText);
                            const payload = [
                                ...( config.enableReplySonglist ? [h.quote(session.messageId)] : [] ),
                                h.image(imageBuffer, 'image/png'),
                                h.text(`${exitCommandTip.replaceAll('<br />', '\n')}${h.text(session.text(`.waitTime`, [config.waitTimeout]))}`),
                            ];
                            const msg = await session.send(payload);
                            quoteId = msg.at(-1);
                        } else {
                            const payload = [
                                ...( config.enableReplySonglist ? [h.quote(session.messageId)] : [] ),
                                parseBToH(`${kugouListText.replaceAll('<br />', '\n')}<br /><br />${exitCommandTip.replaceAll('<br />', '\n')}${h.text(session.text(`.waitTime`, [config.waitTimeout]))}`)
                            ]
                            const msg = await session.send(payload);
                            quoteId = msg.at(-1);
                        }

                        const input = await session.prompt(config.waitTimeout * 1000);
                        if (!input) {
                            return `${quoteId ? h.quote(quoteId) : ''}${session.text(`.waitTimeout`)}`;
                        }
                        if (exitCommands.includes(input)) {
                            return h.text(session.text(`.exitprompt`));
                        }
                        serialNumber = +input;
                        if (Number.isNaN(serialNumber) || serialNumber < 1 || serialNumber > totalKugouSongs) {
                            return h.text(session.text(`.invalidNumber`));
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
                            const songDetails = generateResponse(session, data, config.command4_return_data_Field);
                            logInfo(songDetails);
                            return songDetails;
                        } catch (e) {
                            logger.error(e);
                            return h.text(session.text(`.somerror`));
                        }
                    } else {
                        logger.error(`获取歌曲失败：${JSON.stringify(song)}`);
                        return '获取歌曲失败：' + song.msg;
                    }
                }); 
        }

        
        if (config.serverSelect === "command5" ) {
            ctx.command(`${config.command5} <keyword:text>`)
                .option('platform', '-p <platform:string> 平台名称')
                .option('number', '-n <number:number> 歌曲序号')
                .example("歌曲搜索 -p QQ -n 1 蔚蓝档案")
                .action(async ({ session, options }, keyword) => {
                    await session.send("music command 5");
                    if (!ctx.puppeteer) {
                        await session.send(h.text(session.text(`.nopuppeteer`)));
                        return;
                    }
                    if (!keyword) return h.text(session.text(`.nokeyword`));

                    const page = await ctx.puppeteer.page(); // 主页面，用于搜索和双击
                    let searchResults = [];
                    let songDetails = {
                        musicUrl: undefined,
                        coverUrl: undefined,
                        lyric: undefined,
                        musicSize: undefined,
                        musicBr: undefined
                    };
                    // let timeoutId; // 移除 timeoutId
                    const exitCommands = config.exitCommand.split(/[,，]/).map(cmd => cmd.trim()); // 定义在action函数内

                    // 错误处理函数，用于处理 API 响应解析错误
                    const handleApiResponse = (text, type) => {
                        try {
                            const match = text.match(/^jQuery\w+\((.*)\)$/);
                            let jsonData;
                            if (match) {
                                jsonData = JSON.parse(match[1]);
                            } else {
                                jsonData = JSON.parse(text); // 尝试直接解析，可能不是 jQuery 回调
                            }

                            if (!jsonData) {
                                ctx.logger.warn(`无法解析 ${type} API 响应: 没有 JSON 数据`);
                                return null;
                            }
                            return jsonData;
                        } catch (error) {
                            ctx.logger.error(`解析 ${type} API 响应失败:`, error, text);
                            return null;
                        }
                    };

                    // 得放到page.on外面，不然没有本地化
                    // [W] i18n Error: missing scope for ".waitTime"
                    const exitCommandTip = config.menuExitCommandTip ? `退出选择请发[${exitCommands}]中的任意内容\n\n` : '';
                    const promptText = `${exitCommandTip}${h.text(session.text(`.waitTime`, [config.waitTimeout]))}`;
                    const waitTimeout = session.text(`.waitTimeout`)
                    const exitprompt = session.text(`.exitprompt`)
                    const invalidNumber = session.text(`.invalidNumber`)
                    let popupError;

                    async function checkAndHandlePopup(page) {
                        // layui-layer layui-layer-dialog layui-layer-border layui-layer-msg layui-layer-hui
                        const alert = await page.$('.layui-layer.layui-layer-msg.layui-layer-hui, .layui-layer-dialog.layui-layer-msg');
                        if (alert) {
                            // 修改 page.evaluate，从 alert 元素本身查找 .layui-layer-content
                            const alertText = await page.evaluate(alertElement => {
                                // 直接在 alertElement 中查询 .layui-layer-content
                                const alertContent = alertElement.querySelector('.layui-layer-content');
                                return alertContent ? alertContent.innerText : null;
                            }, alert);

                            if (alertText) {
                                if (alertText.includes('使用国内节点')) {
                                    logInfo('检测到国内节点提示弹窗');
                                    await page.evaluate(alertElement => {
                                        if (alertElement) alertElement.remove();
                                    }, alert);
                                    logInfo('已删除国内节点提示弹窗');

                                    // 使用 setTimeout 结合 Promise 实现等待 1 秒 以应对依次出现的弹窗
                                    await new Promise(resolve => ctx.setTimeout(resolve, 1000)); // 等待 1 秒

                                    logInfo('等待1秒后再次检查弹窗');
                                    const secondAlert = await page.$('.layui-layer.layui-layer-msg.layui-layer-hui, .layui-layer-dialog.layui-layer-msg');
                                    if (secondAlert) {
                                        logInfo('开始检测到第二个弹窗');
                                        const secondAlertText = await page.evaluate(alertElement => {
                                            const alertContent = alertElement.querySelector('.layui-layer-content');
                                            return alertContent ? alertContent.innerText : null;
                                        }, secondAlert);
                                        if (secondAlertText) {
                                            await page.close();
                                            logInfo(`${secondAlertText}`);
                                            return `${secondAlertText}`;
                                        }
                                    }
                                    return null; // 如果只处理了国内节点弹窗，没有其他错误弹窗，返回 null
                                }
                                if (alertText.includes('已达今日上限')) {
                                    await page.close();
                                    logInfo('该平台请求已达今日上限。');
                                    return `该平台请求已达今日上限。`;
                                }
                                if (alertText.includes('没有找到相关歌曲')) {
                                    await page.close();
                                    logInfo('没有找到相关歌曲，请切换其它音乐源。');
                                    return `没有找到相关歌曲，请切换其它音乐源。`;
                                }
                                if (alertText.includes('播放失败') || alertText.includes('已停止')) {
                                    await page.close();
                                    logInfo('获取失败。没有此歌曲的下载链接。');
                                    return `获取失败。没有此歌曲的下载链接。`;
                                }
                            }
                        }
                        return null; // 没有弹窗，返回 null
                    }




                    page.on('response', async response => {
                        const url = response.url();
                        if (url.includes('api.php?callback=jQuery')) { // 确保匹配正确的 API 请求
                            logInfo(url);
                            try {
                                const text = await response.text();
                                let jsonData = handleApiResponse(text, 'jQuery');

                                if (!jsonData) {
                                    return; // 如果解析失败，直接返回
                                }

                                if (Array.isArray(jsonData)) {
                                    if (searchResults.length === 0 && jsonData.length > 0 && jsonData[0] && jsonData[0].hasOwnProperty('artist')) {
                                        searchResults = jsonData;
                                        const extractedSearchResults = [];
                                        for (const item of searchResults) {
                                            if (item && item.name && item.artist) {
                                                extractedSearchResults.push({
                                                    songname: item.name,
                                                    name: item.artist.join('/')
                                                });
                                            }
                                        }

                                        // 移动到这里，在搜索结果返回后处理用户输入和歌曲选择
                                        if (!options.number) {
                                            const listText = formatSongList(extractedSearchResults, options.platform || config.command5_defaultPlatform, 0, config.command5_searchList);
                                            const screenshotPage = await ctx.puppeteer.browser.newPage();
                                            try {
                                                const screenshot = await generateSongListImage(ctx.puppeteer, listText, screenshotPage);
                                                await session.send([
                                                    // ...( config.enableReplySonglist ? [h.quote(session.messageId)] : [] ),
                                                    h.image(screenshot, 'image/png'),
                                                    h.text(promptText),
                                                ]);
                                            } finally {
                                                await screenshotPage.close();
                                            }

                                            // 等待用户输入
                                            const input = await session.prompt(config.waitTimeout * 1000);

                                            if (!input) {
                                                await session.send(h.text(waitTimeout));
                                                await page.close();
                                                return;
                                            }

                                            if (exitCommands.includes(input)) {
                                                await session.send(h.text(exitprompt));
                                                await page.close();
                                                return;
                                            }
                                            options.number = parseInt(input, 10);
                                        }

                                        if (isNaN(options.number) || options.number < 1 || options.number > config.command5_searchList || options.number > searchResults.length) {
                                            await session.send(h.text(invalidNumber));
                                            await page.close();
                                            return;
                                        }
                                        // 用户输入选择后，清除计时器 (实际上已经移除了)
                                        // clearTimeout(timeoutId);


                                        // 已经获取到搜索结果，并且用户选择了歌曲序号，则开始双击播放
                                        const selectedIndex = options.number - 1;
                                        const songElement = await page.$(`.list-item[data-no="${selectedIndex}"] .list-num`);
                                        if (!songElement) {
                                            await session.send('未找到歌曲元素，请检查页面结构。');
                                            await page.close();
                                            return;
                                        }
                                        // 模拟双击操作
                                        await page.evaluate((element) => {
                                            const dblclickEvent = new MouseEvent('dblclick', {
                                                bubbles: true,
                                                cancelable: true,
                                                view: window,
                                            });
                                            element.dispatchEvent(dblclickEvent);
                                        }, songElement);
                                        logInfo(`已双击歌曲序号: ${options.number}`);
                                        //  检查弹窗
                                        popupError = await checkAndHandlePopup(page);
                                        if (popupError) {
                                            await session.send(h.text(popupError));
                                            return;
                                        }
                                    }
                                } else if (jsonData && jsonData.url && !(jsonData.url && /\.(jpg|png|gif)/i.test(jsonData.url))) {
                                    // 下载链接
                                    if (!songDetails.musicUrl) {
                                        songDetails.musicUrl = jsonData.url;
                                        songDetails.musicSize = `${(jsonData.size / 1024 / 1024).toFixed(2)}MB`;
                                        songDetails.musicBr = jsonData.br;
                                        logInfo("捕获到音乐下载链接 API 响应");
                                        logInfo(`下载链接: ${jsonData.url}`);
                                        logInfo(`文件大小: ${jsonData.size}`);
                                        logInfo(`比特率: ${jsonData.br}`);
                                    }
                                } else if (jsonData && jsonData.lyric) {
                                    // 歌词
                                    if (!songDetails.lyric) {
                                        songDetails.lyric = jsonData.lyric;
                                        logInfo("捕获到歌词 API 响应");
                                        logInfo(`歌词: ${jsonData.lyric ? jsonData.lyric.substring(0, 100) + '...' : '无'}`);
                                    }
                                } else if (jsonData && (jsonData.url || (jsonData.url && /\.(jpg|png|gif)/i.test(jsonData.url)))) {
                                    // 封面
                                    if (!songDetails.coverUrl) {
                                        songDetails.coverUrl = jsonData.url;
                                        logInfo("捕获到封面 API 响应");
                                        logInfo(`封面链接: ${songDetails.coverUrl}`);
                                    }
                                }
                                //  检查弹窗
                                popupError = await checkAndHandlePopup(page);
                                if (popupError) {
                                    await session.send(h.text(popupError));
                                    return;
                                }
                                // 检查是否所有信息都已获取
                                if (songDetails.musicUrl && songDetails.coverUrl && songDetails.lyric) {
                                    logInfo("已获取所有必要信息，准备关闭 Puppeteer");
                                    logInfo("-----------------------------------------------------------");
                                    // await clearTimeout(timeoutId); // 清除超时定时器 (实际上已经移除了)
                                    await page.close(); // 提前关闭页面

                                    // 整理响应数据
                                    const selectedSong = searchResults[options.number - 1];
                                    const responseData = {
                                        name: selectedSong.name,
                                        artist: selectedSong.artist.join('/'),
                                        album: selectedSong.album,
                                        source: selectedSong.source,
                                        musicUrl: songDetails.musicUrl,
                                        coverUrl: songDetails.coverUrl,
                                        lyric: songDetails.lyric,
                                        fileSize: songDetails.musicSize,
                                        br: songDetails.musicBr
                                    };
                                    // .map((song, index) => `${index + startIndex + 1}. ${song.songname || song.title || song.name} -- ${song.name || song.author}`)
                                    const response = await generateResponse(session, responseData, config.command5_return_data_Field);
                                    await session.send(response); // 发送响应数据
                                }

                            } catch (error) {
                                ctx.logger.error('处理API响应失败:', error);
                            }
                        }
                    });

                    try {
                        await page.goto('https://music.gdstudio.xyz/', { waitUntil: 'networkidle2' });
                        const announcement = await page.$('.layui-layer-btn0');
                        if (announcement) await announcement.click();
                        const searchButton = await page.$('span[data-action="search"]');
                        if (!searchButton) return '未找到搜索按钮，请检查页面结构。';
                        await searchButton.click();
                        await page.waitForSelector('#search-area', { visible: true });
                        await page.type('#search-wd', keyword);
                        const platform = options.platform || config.command5_defaultPlatform;
                        const platformValue = platformMap[platform];
                        if (!platformValue) {
                            return h.text(session.text(`.invalidplatform`, [platform]));
                        }
                        const platformSelector = `input[name="source"][value="${platformValue}"]`;
                        const platformRadio = await page.$(platformSelector);
                        if (platformRadio) {
                            await platformRadio.click();
                        } else {
                            return h.text(session.text(`.invalidplatform`, [platform]));
                        }
                        logInfo(`已选择平台: ${platform}`);
                        const selectedPlatform = await page.$eval('input[name="source"]:checked', el => el.value);
                        logInfo(`当前选中的平台: ${selectedPlatform}`);

                        const submitButton = await page.$('.search-submit');
                        if (!submitButton) return '未找到搜索提交按钮，请检查页面结构。';
                        await submitButton.click();

                        //  检查弹窗
                        popupError = await checkAndHandlePopup(page);
                        if (popupError) {
                            await session.send(h.text(popupError));
                            return;
                        }

                    } catch (error) {
                        ctx.logger.error('音乐搜索插件出错:', error);
                        if (page && !page.isClosed()) {
                            await page.close();
                        }
                        return h.text(session.text(`.somerror`));
                    }
                });
        }

        if (config.serverSelect === "command6") {
            ctx.command(`${config.command6} <keyword:text>`)
                .example("网易点歌 2608813264")
                .example("网易点歌 蔚蓝档案")
                .option('number', '-n <number:number> 歌曲序号')
                .action(async ({ session, options }, keyword) => {
                    if (!keyword) return h.text(session.text(`.nokeyword`));

                    const isSongId = /^\d+$/.test(keyword.trim());
                    const useApi = config.command6_usedAPI; // 获取用户选择的 API

                    if (isSongId && !options.number) {
                        try {
                            // 获取歌曲直链 (根据选择的 API 调整)
                            let songUrl = '';
                            if (useApi === 'api.injahow.cn') {
                                songUrl = `https://api.injahow.cn/meting/?type=url&id=${selectedSongId}`;
                            } else if (useApi === 'meting.jmstrand.cn') {
                                songUrl = `https://meting.jmstrand.cn/?type=url&id=${selectedSongId}`;
                            } else if (useApi === 'api.qijieya.cn') {
                                songUrl = `https://api.qijieya.cn/meting/?type=url&id=${selectedSongId}`;
                            } else if (useApi === 'metingapi.nanorocky.top') {
                                songUrl = `https://metingapi.nanorocky.top/?server=netease&type=url&id=${selectedSongId}`;
                            }

                            logInfo("请求 API (songUrl):", songUrl);
                            // 请求 163 API 获取歌曲详情 (用于获取歌曲名称、艺术家、图片等信息，与获取直链的 API 无关)
                            const apiBase = `http://music.163.com/api/song/detail/?id=${keyword}&ids=[${keyword}]`;
                            logInfo("请求 API (ID点歌):", apiBase);

                            let apiResponse;
                            if (config.command6_useProxy) {
                                // 使用代理请求
                                apiResponse = await requestWithProxy(apiBase);
                            } else {
                                // 直接请求
                                apiResponse = await ctx.http.get(apiBase);
                            }

                            let parsedApiResponse;
                            try {
                                parsedApiResponse = JSON.parse(apiResponse);
                            } catch (e) {
                                ctx.logger.error("JSON 解析失败:", e);
                                return h.text(session.text(`.songlisterror`));
                            }

                            if (!parsedApiResponse || parsedApiResponse.code !== 200 || !parsedApiResponse.songs || parsedApiResponse.songs.length === 0) {
                                return h.text(session.text(`.songlisterror`));
                            }

                            const songData = parsedApiResponse.songs[0];
                            if (!songData) {
                                ctx.logger.error('网易单曲点歌插件出错， 获取歌曲信息失败');
                                return h.text(session.text(`.songlisterror`));
                            }


                            // 处理歌词 (仍然使用 163 的 API)
                            let lyric = '歌词获取失败';
                            try {
                                const lyricApiUrl = `https://music.163.com/api/song/lyric?id=${keyword}&lv=1&kv=1&tv=-1`;

                                let lyricResponse;
                                if (config.command6_useProxy) {
                                    // 使用代理请求
                                    lyricResponse = await requestWithProxy(lyricApiUrl);
                                } else {
                                    // 直接请求
                                    lyricResponse = await ctx.http.get(lyricApiUrl);
                                }
                                const parsedLyricResponse = JSON.parse(lyricResponse);
                                if (parsedLyricResponse.code === 200 && parsedLyricResponse.lrc && parsedLyricResponse.lrc.lyric) {
                                    lyric = `\n${parsedLyricResponse.lrc.lyric}`;
                                } else {
                                    ctx.logger.error(`获取歌词失败: ${lyricApiUrl}，返回代码: ${parsedLyricResponse.code}`);
                                    ctx.logger.error(lyricResponse);
                                }
                            } catch (error) {
                                ctx.logger.error(`获取歌词失败:`, error);
                            }

                            const processedSongData = {
                                name: songData.name,
                                artist: songData.artists.map(artist => artist.name).join('/'),
                                url: songUrl,
                                lrc: lyric,
                                pic: songData.album.picUrl,
                                id: songData.id,
                            };
                            logInfo(processedSongData);
                            const response = generateResponse(session, processedSongData, config.command6_return_data_Field);
                            return response;
                        } catch (error) {
                            ctx.logger.error('网易单曲点歌插件出错 (ID点歌):', error);
                            return h.text(session.text(`.somerror`));
                        }
                    } else {
                        // 歌名搜索
                        try {
                            const searchApiUrl = `http://music.163.com/api/search/get/web?csrf_token=hlpretag=&hlposttag=&s=${encodeURIComponent(keyword)}&type=1&offset=0&total=true&limit=${config.command6_searchList}`;
                            logInfo("请求搜索 API:", searchApiUrl);

                            let searchApiResponse;
                            if (config.command6_useProxy) {
                                // 使用代理请求
                                searchApiResponse = await requestWithProxy(searchApiUrl);
                            } else {
                                // 直接请求
                                searchApiResponse = await ctx.http.get(searchApiUrl);
                            }

                            let parsedSearchApiResponse;
                            try {
                                parsedSearchApiResponse = JSON.parse(searchApiResponse);
                            } catch (e) {
                                ctx.logger.error("搜索结果 JSON 解析失败:", e);
                                return h.text(session.text(`.songlisterror`));
                            }
                            const searchData = parsedSearchApiResponse.result;


                            if (!searchData || !searchData.songs || searchData.songs.length === 0) {
                                return h.text(session.text(`.songlisterror`));
                            }

                            const songList = searchData.songs.map((song, index) => {
                                return {
                                    id: song.id,
                                    name: song.name,
                                    artists: song.artists.map(artist => artist.name).join('/'),
                                    albumName: song.album.name,
                                    duration: song.duration
                                };
                            });
                            let input = options.number;

                            if (!options.number) {
                                const formattedList = songList.map((song, index) => `${index + 1}. ${song.name} - ${song.artists} - ${song.albumName}`).join('<br />');
                                const exitCommands = config.exitCommand.split(/[,，]/).map(cmd => cmd.trim());
                                const exitCommandTip = config.menuExitCommandTip ? `退出选择请发[${exitCommands}]中的任意内容<br /><br />` : '';
                                let quoteId = session.messageId;

                                if (config.imageMode) {
                                    const imageBuffer = await generateSongListImage(ctx.puppeteer, formattedList);
                                    const payload = [
                                        ...( config.enableReplySonglist ? [h.quote(session.messageId)] : [] ),
                                        h.image(imageBuffer, 'image/png'),
                                        h.text(`${exitCommandTip.replaceAll('<br />', '\n')}${h.text(session.text(`.waitTime`, [config.waitTimeout]))}`),
                                    ];
                                    const msg = await session.send(payload);
                                    quoteId = msg.at(-1);
                                } else {
                                    const payload = [
                                        ...( config.enableReplySonglist ? [h.quote(session.messageId)] : [] ),
                                        parseBToH(`${formattedList.replaceAll('<br />', '\n')}\n\n${exitCommandTip.replaceAll('<br />', '\n')}${h.text(session.text(`.waitTime`, [config.waitTimeout]))}`)
                                    ]
                                    const msg = await session.send(payload);
                                    quoteId = msg.at(-1);
                                }

                                input = await session.prompt(config.waitTimeout * 1000);
                                if (!input) {
                                    return `${quoteId ? h.quote(quoteId) : ''}${session.text(`.waitTimeout`)}`;
                                }
                                if (exitCommands.includes(input)) {
                                    return h.text(session.text(`.exitprompt`));
                                }
                            }

                            const serialNumber = +input;
                            if (Number.isNaN(serialNumber) || serialNumber < 1 || serialNumber > songList.length) {
                                return h.text(session.text(`.invalidNumber`));
                            }

                            const selectedSongId = songList[serialNumber - 1].id;
                            const selectedinterval = songList[serialNumber - 1].duration / 1000; // selected 的 duration 秒数
                            logInfo("音乐时长：", selectedinterval)
                            if (selectedinterval > config.maxDuration) {
                                return h.text(session.text(`.maxsongDuration`, [config.maxDuration]));
                            }
                            // 获取歌曲详情 (用于获取歌曲名称、艺术家、图片等，与获取直链的 API 无关)
                            const detailApiUrl = `http://music.163.com/api/song/detail/?id=${selectedSongId}&ids=[${selectedSongId}]`;
                            logInfo("请求歌曲详情 API:", detailApiUrl);

                            let detailApiResponse;
                            if (config.command6_useProxy) {
                                // 使用代理请求
                                detailApiResponse = await requestWithProxy(detailApiUrl);
                            } else {
                                // 直接请求
                                detailApiResponse = await ctx.http.get(detailApiUrl);
                            }
                            const detailParsedApiResponse = JSON.parse(detailApiResponse);

                            if (!detailParsedApiResponse || detailParsedApiResponse.code !== 200 || !detailParsedApiResponse.songs || detailParsedApiResponse.songs.length === 0) {
                                return h.text(session.text(`.songlisterror`));
                            }
                            const songData = detailParsedApiResponse.songs[0];


                            // 获取歌曲直链 (根据选择的 API 调整)
                            let songUrl = '';
                            if (useApi === 'api.injahow.cn') {
                                songUrl = `https://api.injahow.cn/meting/?type=url&id=${selectedSongId}`;
                            } else if (useApi === 'meting.jmstrand.cn') {
                                songUrl = `https://meting.jmstrand.cn/?type=url&id=${selectedSongId}`;
                            } else if (useApi === 'api.qijieya.cn') {
                                songUrl = `https://api.qijieya.cn/meting/?type=url&id=${selectedSongId}`;
                            } else if (useApi === 'metingapi.nanorocky.top') {
                                songUrl = `https://metingapi.nanorocky.top/?server=netease&type=url&id=${selectedSongId}`;
                            }

                            logInfo("请求 API (songUrl):", songUrl);

                            // 处理歌词 (仍然使用 163 的 API)
                            let lyric = '歌词获取失败';
                            try {
                                const lyricApiUrl = `https://music.163.com/api/song/lyric?id=${selectedSongId}&lv=1&kv=1&tv=-1`;

                                let lyricResponse;
                                if (config.command6_useProxy) {
                                    // 使用代理请求
                                    lyricResponse = await requestWithProxy(lyricApiUrl);
                                } else {
                                    // 直接请求
                                    lyricResponse = await ctx.http.get(lyricApiUrl);
                                }
                                const parsedLyricResponse = JSON.parse(lyricResponse);
                                if (parsedLyricResponse.code === 200 && parsedLyricResponse.lrc && parsedLyricResponse.lrc.lyric) {
                                    lyric = `\n${parsedLyricResponse.lrc.lyric}`;
                                } else {
                                    ctx.logger.error(`获取歌词失败: ${lyricApiUrl}，返回代码: ${parsedLyricResponse.code}`);
                                }
                            } catch (error) {
                                ctx.logger.error(`获取歌词失败:`, error);
                            }

                            const processedSongData = {
                                name: songData.name,
                                artist: songData.artists.map(artist => artist.name).join('/'),
                                url: songUrl,
                                lrc: lyric,
                                pic: songData.album.picUrl,
                                id: songData.id,
                            };
                            logInfo(processedSongData)

                            const response = generateResponse(session, processedSongData, config.command6_return_data_Field,);
                            return response;


                        } catch (error) {
                            ctx.logger.error('网易点歌插件出错 (歌名搜索):', error);
                            return h.text(session.text(`.somerror`));
                        }
                    }
                });
        }

        if (config.serverSelect === "command7") {
            ctx.command(`${config.command7} <keyword:text>`)
                .option('number', '-n <number:number> 歌曲序号')
                .example("音乐搜索器 -n 1 蔚蓝档案")
                .action(async ({ session, options }, keyword) => {
                    if (!ctx.puppeteer) {
                        await session.send(h.text(session.text(`.nopuppeteer`)));
                        return;
                    }
                    if (!keyword) return h.text(session.text(`.nokeyword`));

                    let neteasePage = null;
                    let neteaseResponseData = [];
                    let resolveNetEaseDataFetch;
                    let neteaseDataFetched = false;

                    const neteaseDataFetchPromise = new Promise(resolve => resolveNetEaseDataFetch = resolve);

                    // 添加一个超时 Promise，如果在指定时间内没有获取到数据，则 reject
                    const timeoutPromise = new Promise((resolve, reject) => {
                        ctx.setTimeout(() => {
                            reject(new Error('超时未获取到足够的数据'));
                        }, 30000); // 设置超时时间为 30 秒
                    });


                    try {
                        neteasePage = await ctx.puppeteer.page();


                        neteasePage.on('response', async response => {
                            const url = response.url();
                            if (url === 'https://dev.iw233.cn/Music1/') {
                                const contentType = response.headers()['content-type'];
                                if (contentType && contentType.includes('json')) {
                                    try {
                                        const json = await response.json();
                                        if (json && json.data) {
                                            neteaseResponseData.push(...json.data);
                                        }
                                    } catch (error) {
                                        ctx.logger.error('网易云 - 解析网络响应 JSON 失败', error);
                                    } finally {
                                        neteaseDataFetched = true;
                                        resolveNetEaseDataFetch();
                                    }
                                }
                            }
                        });


                        // 打开网易云音乐搜索页面
                        await neteasePage.goto(`https://dev.iw233.cn/Music1/?name=${keyword}&type=netease`, { waitUntil: 'networkidle2' });


                        await Promise.race([neteaseDataFetchPromise, timeoutPromise]); // 竞速等待

                        const combinedData = [...neteaseResponseData]; // 仅使用网易云音乐数据
                        if (combinedData.length === 0) {
                            return h.text(session.text(`.songlisterror`));
                        }

                        // 根据 config.command7 searchList 截取总数，防止超出预期
                        const finalCombinedData = combinedData.slice(0, config.command7_searchList);

                        // 直接使用网易云音乐数据  生成网易云音乐歌单文本
                        const neteaseListText = formatSongList(finalCombinedData, '网易云音乐', 0, config.command7_searchList);
                        const listText = `${neteaseListText}`; // 仅网易云音乐歌单

                        const screenshot = await generateSongListImage(ctx.puppeteer, listText);

                        // 返回图文消息
                        const exitCommands = config.exitCommand.split(/[,，]/).map(cmd => cmd.trim());
                        const exitCommandTip = config.menuExitCommandTip ? `退出选择请发[${exitCommands}]中的任意内容\n\n` : '';
                        const promptText = `${exitCommandTip}${h.text(session.text(`.waitTime`, [config.waitTimeout]))}`;

                        // 获取用户输入的序号
                        let selectedIndex;
                        if (options.number) {
                            // 如果用户通过 -n 指定了序号，则直接使用
                            selectedIndex = options.number;
                        } else {
                            await session.send([
                                ...( config.enableReplySonglist ? [h.quote(session.messageId)] : [] ),
                                h.image(screenshot, 'image/png'),
                                h.text(promptText),
                            ]);

                            // 否则等待用户输入
                            const input = await session.prompt(config.waitTimeout * 1000); // 超时时间
                            if (!input) return h.text(session.text(`.waitTimeout`));
                            if (exitCommands.includes(input)) {
                                return h.text(session.text(`.exitprompt`));
                            }
                            selectedIndex = parseInt(input, 10);
                        }

                        // 检查序号是否有效 (针对合并后的数据)
                        if (isNaN(selectedIndex) || selectedIndex < 1 || selectedIndex > finalCombinedData.length) {
                            return h.text(session.text(`.invalidNumber`));
                        }

                        // 获取用户选择的歌曲 (从合并后的数据中获取)
                        const selectedSong = finalCombinedData[selectedIndex - 1];
                        if (!selectedSong) {
                            return h.text(session.text(`.noplatform`));
                        }
                        // 返回自定义字段
                        const response = generateResponse(session, selectedSong, config.command7_return_data_Field);

                        logInfo(response)
                        return response;

                    } catch (error) {
                        ctx.logger.error('音乐搜索器插件出错:', error);
                        return h.text(session.text(`.somerror`));
                    } finally {
                        if (neteasePage && !neteasePage.isClosed()) {
                            await neteasePage.close();
                        }
                    }
                });
        }

        if (config.serverSelect === "command8") {
            ctx.command(`${config.command8} <keyword:text>`)
                .option('quality', '-q <value:number> 品质因数')
                .option('number', '-n <number:number> 歌曲序号')
                .action(async ({ session, options }, keyword) => {
                    if (!keyword) {
                        await session.send(h.text(session.text(".nokeyword")));
                        return;
                    }

                    let songList = [];  // 初始化歌曲列表

                    // 获取歌曲列表
                    try {
                        const searchUrl = `https://api.dragonlongzhu.cn/api/joox/juhe_music.php?msg=${encodeURIComponent(keyword)}&type=json&br=1&num=${config.command8_searchList}`;
                        logInfo(searchUrl);
                        const response = await ctx.http.get(searchUrl);

                        if (!response || !Array.isArray(response)) {
                            throw new Error(`Failed to get song list`);
                        }

                        logInfo(JSON.stringify(response));

                        // API返回的是数组，根据配置项截取长度
                        songList = response.slice(0, config.command8_searchList);
                    } catch (error) {
                        logger.error('获取龙珠音乐列表时发生错误', error);
                        return '无法获取音乐列表，请稍后再试。';
                    }

                    // 确保歌曲列表非空
                    if (songList.length === 0) {
                        return '没有找到相关歌曲。';
                    }

                    const totalSongs = songList.length;

                    // 检查是否有指定序号
                    let index = options.number;
                    if (index) {
                        index = Number(index);
                        if (Number.isNaN(index) || index < 1 || index > totalSongs) {
                            return '输入的序号无效。若要点歌请重新发起。';
                        }
                    } else {
                        // 显示歌曲列表供用户选择
                        const songListDisplay = songList.map((song, idx) => {
                            const title = song.title || '未知歌曲';
                            const singer = song.singer || '未知歌手';
                            return `${idx + 1}. ${title} -- ${singer}`;
                        });

                        const exitCommands = config.exitCommand.split(/[,，]/).map(cmd => cmd.trim());
                        const exitCommandTip = config.menuExitCommandTip ? `退出选择请发[${exitCommands}]中的任意内容\n\n` : '';
                        const promptText = `${exitCommandTip}${h.text(session.text(`.waitTime`, [config.waitTimeout]))}`;

                        // 歌曲列表消息
                        const songListMessage = songListDisplay.join('\n');

                        let quoteId;

                        // 判断是否使用图片模式
                        if (config.imageMode) {
                            const listText = songListMessage.replace(/\n/g, '<br />');
                            const imageBuffer = await generateSongListImage(ctx.puppeteer, listText);
                            const payload = [
                                ...( config.enableReplySonglist ? [h.quote(session.messageId)] : [] ),
                                h.image(imageBuffer, 'image/png'),
                                h.text(`${promptText}`)
                            ]
                            await session.send( payload );
                        } else {
                            const payload = [
                                ...( config.enableReplySonglist ? [h.quote(session.messageId)] : [] ),
                                `以下是搜索结果：\n${songListMessage}\n${promptText}`
                            ]
                            quoteId = await session.send(payload);
                        }

                        // 用户回复序号
                        const songChoice = await session.prompt(config.waitTimeout * 1000);
                        if (!songChoice) {
                            // return '输入超时，已取消点歌。';
                            return `${quoteId ? h.quote(quoteId) : ''}${session.text(`.waitTimeout`)}`;
                        }

                        // 检查是否是退出命令
                        if (exitCommands.includes(songChoice.trim())) {
                            return session.text('.exitprompt');
                        }

                        index = parseInt(songChoice, 10);
                        if (isNaN(index) || index < 1 || index > totalSongs) {
                            return '输入的序号无效。若要点歌请重新发起。';
                        }
                    }

                    // 获取选中歌曲的详细信息
                    let songDetails = null;
                    try {
                        const detailUrl = `https://api.dragonlongzhu.cn/api/joox/juhe_music.php?msg=${encodeURIComponent(keyword)}&type=json&br=1&num=${config.command8_searchList}&n=${index}`;
                        logInfo(detailUrl);
                        const detailResponse = await ctx.http.get(detailUrl);

                        if (!detailResponse) {
                            throw new Error(`Failed to get song details`);
                        }
                        const detailResponseData = detailResponse.data
                        logInfo(JSON.stringify(detailResponseData));

                        // 检查API返回状态
                        if (detailResponseData.code !== 200) {
                            throw new Error(`API返回错误: ${detailResponseData.msg || '未知错误'}`);
                        }

                        // 检查歌曲链接是否可用
                        if (!detailResponseData.url) {
                            return '歌曲链接为空，请稍后再试。';
                        }

                        // 处理歌词字段（可能为null）
                        const processedSong = {
                            ...detailResponseData,
                            lyric: detailResponseData.lyric || '暂无歌词'
                        };

                        // 生成返回结果
                        songDetails = generateResponse(session, processedSong, config.command8_return_QQdata_Field);
                    } catch (error) {
                        logger.error('获取龙珠音乐详情时发生错误', error);
                        return '无法获取歌曲详情，请稍后再试。';
                    }

                    if (!songDetails) {
                        return '无法获取歌曲详情。';
                    }

                    return songDetails;
                });
        }

        // 代理请求函数
        async function requestWithProxy(targetUrl) {
            const proxyUrl = 'https://web-proxy.apifox.cn/api/v1/request';
            logInfo(`使用${proxyUrl}代理请求${targetUrl}`)
            try {
                const response = await ctx.http.post(proxyUrl, {}, {
                    headers: {
                        'api-u': targetUrl,
                        'api-o0': 'method=GET, timings=true, timeout=3000',
                        'Content-Type': 'application/json'
                    }
                });
                return response;
            } catch (error) {
                logger.error('代理请求失败', error);
                throw error;
            }
        }

        async function ensureTempDir() {
            if (!isTempDirInitialized) {
                await fs.mkdir(tempDir, { recursive: true });
                isTempDirInitialized = true;
            }
        }

        async function downloadFile(url, songname) {
            await ensureTempDir();

            try {
                const file = await ctx.http.file(url);

                // 获取正确的文件扩展名
                const contentType = file.type || file.mime;
                logInfo(file)

                let ext = '.mp3';
                if (contentType) {
                    if (contentType.includes('audio/mpeg')) {
                        ext = '.mp3';
                    } else if (contentType.includes('audio/mp4')) {
                        ext = '.m4a';
                    } else if (contentType.includes('audio/wav')) {
                        ext = '.wav';
                    } else if (contentType.includes('audio/flac')) {
                        ext = '.flac';
                    }
                }

                let filename;
                if (config.renameTempFile && songname) {
                    // 移除非法字符
                    const safeSongname = songname.replace(/[<>:"/\\|?*\x00-\x1F\s]/g, '-').trim();
                    filename = safeSongname + ext;
                } else {
                    filename = crypto.randomBytes(8).toString('hex') + ext;
                }

                const filePath = path.join(tempDir, filename);

                // 将 ArrayBuffer 转换为 Buffer
                const buffer = Buffer.from(file.data);

                // 将文件数据写入文件系统
                await fs.writeFile(filePath, buffer);
                return filePath;
            } catch (error) {
                logger.error('文件下载失败:', error);
                return null;
            }
        }

        async function safeUnlink(filePath, maxRetries = 5, interval = 1000) {
            let retries = 0;
            while (retries < maxRetries) {
                try {
                    await fs.access(filePath); // 先检查文件是否存在
                    await fs.unlink(filePath);
                    return;
                } catch (error) {
                    if (error.code === 'ENOENT') return; // 文件不存在直接返回
                    if (error.code === 'EBUSY') {
                        retries++;
                        await new Promise(resolve => ctx.setTimeout(resolve, interval));
                    } else {
                        throw error;
                    }
                }
            }
            throw new Error(`Failed to delete ${filePath} after ${maxRetries} retries`);
        }

        async function generateResponse(session, data, platformconfig) {
            // 按类型分类存储
            const textElements = [];
            const imageElements = [];
            const mediaElements = [];
            const fileElements = [];
            const rawElements = [];

            // 用于合并转发的内容
            const figureContentElements = []; // 存储 figure 内部的元素

            // 遍历配置项，根据类型收集元素
            for (const field of platformconfig) {
                if (!field.enable) continue;

                const value = data[field.data];
                if (!value) continue;

                let element = null;
                switch (field.type) {
                    case 'text':
                        let textValue = data[field.data];

                        // 类型检查和默认值
                        if (typeof textValue === 'string') {
                            if (config.isuppercase) {
                                // 使用正则表达式匹配 URL 中的域名部分
                                textValue = textValue.replace(/(https?:\/\/)([^/]+)/, (match, protocol, domain) => {
                                    return `${protocol}${domain.toUpperCase()}`;
                                });
                            }
                        } else {
                            // 如果 textValue 不是字符串，则使用空字符串作为默认值或进行其他处理
                            textValue = textValue ? String(textValue) : ''; // 转换为字符串或使用空字符串
                            // 或者，如果 textValue 为 null 或 undefined，则不进行任何操作
                            // textValue = '';
                        }

                        element = h.text(`${field.describe}：${textValue}`);
                        textElements.push(element);
                        break;

                    case 'image':
                        element = h.image(value);
                        imageElements.push(element);
                        break;
                    case 'audio':
                        element = h.audio(value);
                        mediaElements.push(element);
                        break;
                    case 'video':
                        element = h.video(value);
                        mediaElements.push(element);
                        break;
                    case 'file':
                        try {
                            const songname = data.songname || data.title || data.name || "TempSongFileName";
                            const localFilePath = await downloadFile(value, songname);
                            if (localFilePath) {
                                element = h.file(url.pathToFileURL(localFilePath).href);
                                fileElements.push(element);
                                tempFiles.add(localFilePath);

                                // 定时删除逻辑
                                if (config.deleteTempTime > 0) {
                                    ctx.setTimeout(async () => {
                                        await safeUnlink(localFilePath).catch(() => { });
                                        logInfo(`正在执行： tempFiles.delete(${localFilePath})`)
                                        tempFiles.delete(localFilePath);
                                    }, config.deleteTempTime * 1000);
                                }
                            }
                        } catch (error) {
                            logger.error('文件处理失败:', error);
                        }
                        break;
                }
                if (config.data_Field_Mode === 'raw' && element) {
                    rawElements.push(element); // 'raw' 模式下，按配置顺序添加元素
                }
            }

            let responseElements = [];

            // 根据 data_Field_Mode 排序元素
            switch (config.data_Field_Mode) {
                case 'image':
                    responseElements = [...imageElements, ...textElements, ...mediaElements, ...fileElements];
                    break;
                case 'raw':
                    responseElements = rawElements; // 严格按照配置顺序
                    break;
                case 'text': // 默认模式
                default:
                    responseElements = [...textElements, ...imageElements, ...mediaElements, ...fileElements];
                    break;
            }

            // 如果启用了合并转发，处理文本和图片
            if (config.isfigure && (session.platform === "onebot" || session.platform === "red")) {
                logInfo(`使用合并转发，正在收集图片和文本。`);

                // 创建 figureContentElements
                for (const element of responseElements) {
                    if (element.type === 'text' || element.type === 'image' || element.type === 'img') { // 图片是 img 元素
                        const attrs = {
                            userId: session.userId,
                            nickname: session.author?.nickname || session.username,
                        };
                        figureContentElements.push(h('message', attrs, element));
                    }
                }

                // 创建 figure 元素
                const figureContent = h('figure', {
                    children: figureContentElements
                });
                logInfo(JSON.stringify(figureContent, null, 2));

                // 发送合并转发消息
                await session.send(figureContent);

                // 发送剩余的媒体和文件
                for (const element of responseElements) {
                    if (element.type === 'audio' || element.type === 'video' || element.type === 'file') {
                        await session.send(element);
                    }
                }
                return; // 结束函数，不再返回字符串
            } else {
                // 如果没有启用合并转发，按顺序发送所有元素
                responseElements = responseElements.join('\n')
                logInfo(responseElements);
                return responseElements;
            }
        }

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

        function formatSongList(data, platform, startIndex, endIndex) {
            if (!data || data.length === 0) {
                return `<b>${platform}</b>: 无法获取歌曲列表`; //  处理无数据的情况
            }
            // 确保 endIndex 不超过数据长度
            const actualEndIndex = Math.min(endIndex, data.length);
            const formattedList = data.slice(startIndex, actualEndIndex) // 使用 slice 截取数据
                .map((song, index) => `${index + startIndex + 1}. ${song.songname || song.title || song.name} -- ${song.name || song.author}`)
                .join('<br />');
            return `<b>${platform}</b>:<br />${formattedList}`;
        }

        function parseBToH(htmlString) {
            const elements = [];
            // 匹配 <b>...</b>, <br/>, <br> 标签，以及两者之间的普通文本
            // 使用非贪婪匹配 .*? 来确保 <b> 和 </b> 之间匹配尽可能少的内容
            const parts = htmlString.split(/(<b>.*?<\/b>|<br\s*\/?>)/i);

            parts.forEach(part => {
                if (!part) return; // 跳过空字符串

                if (part.toLowerCase().startsWith('<b>') && part.toLowerCase().endsWith('</b>')) {
                    // 匹配到 <b>...</b>
                    const boldText = part.slice(3, -4); // 移除 <b> 和 </b>
                    elements.push(h('b', {}, boldText));
                } else if (part.toLowerCase() === '<br/>' || part.toLowerCase() === '<br />' || part.toLowerCase() === '<br>') {
                    // 匹配到 <br/> 或 <br>
                    elements.push(h.br());
                } else {
                    // 其他文本内容
                    elements.push(h.text(part));
                }
            });

            return h('fragment', {}, elements);
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

        function logInfo(message, message2) {
            if (config.loggerinfo) {
                if (message2) {
                    logger.info(`${message}${message2}`)
                } else {
                    logger.info(message);
                }
            }
        }

    });

}
exports.apply = apply;
exports.Config = Config;
exports.name = name;
exports.usage = usage;
exports.inject = inject;
exports.reusable = true; // 声明可重用