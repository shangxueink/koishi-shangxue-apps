import { Context, Schema, h, isNullable } from 'koishi'
import { } from 'koishi-plugin-puppeteer'

import os from 'node:os';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import url from 'node:url';

export const name = 'music-voice'
export const inject = {
  required: ["logger", "http", "i18n"],
  optional: ['puppeteer']
}

export const usage = `

---

<a target="_blank" href="https://github.com/idranme/koishi-plugin-music-voice?tab=readme-ov-file#%E4%BD%BF%E7%94%A8%E8%AF%A5%E6%8F%92%E4%BB%B6%E6%90%9C%E7%B4%A2%E5%B9%B6%E8%8E%B7%E5%8F%96%E6%AD%8C%E6%9B%B2">➤ 食用方法点此获取</a>

本插件旨在 安装后即可语音点歌。

因各种不可抗力因素，目前仅支持使用网易云音乐。



---

## 开启插件前，请确保以下服务已经启用！

### 所需服务：

- [puppeteer服务](/market?keyword=puppeteer) （可选安装）

- [http服务](/market?keyword=http+email:shigma10826@gmail.com) （已默认开启）

- [logger服务](/market?keyword=logger+email:shigma10826@gmail.com) （已默认开启）

- i18n服务 （已默认开启）

此外可能还需要这些服务才能发送语音：


- [ffmpeg服务](/market?keyword=ffmpeg)  （可选安装）

- [silk服务](/market?keyword=silk)  （可选安装）


---
`

export const Config = Schema.intersect([
  Schema.object({
    commandName: Schema.string().description('使用的指令名称').default('music'),
    commandAlias: Schema.string().description('使用的指令别名').default('mdff'),
    generationTip: Schema.string().description('生成语音时返回的文字提示内容').default('生成语音中…'),
    waitForTimeout: Schema.natural().min(1).step(1).description('等待用户选择歌曲序号的最长时间 （秒）').default(45),
  }).description('基础设置'),

  Schema.object({
    imageMode: Schema.boolean().description('开启后 返回图片歌单（需要puppeteer服务）<br>关闭后 返回文本歌单').default(false),
  }).description('歌单渲染设置'),
  Schema.union([
    Schema.object({
      imageMode: Schema.const(true).required(),
      textChannel: Schema.string().description('图片歌单的文字颜色').role('color').default("rgba(255, 255, 255, 1)"),
      backgroundChannel: Schema.string().description('图片歌单的背景颜色').role('color').default("rgba(0, 0, 0, 1)"), // "rgba(42, 45, 62, 1)"
    }),
    Schema.object({}),
  ]),

  Schema.object({
    searchListCount: Schema.natural().description('搜索歌曲列表的数量').default(20),
    exitCommandList: Schema.array(String).role('table').description('退出选择指令。<br>一行一个指令').default(["0", "不听了"]),
    menuExitCommandTip: Schema.boolean().description('是否在歌单内容的后面，加上`退出选择指令`的文字提示').default(false),
    recall: Schema.boolean().description('是否在发送语音后撤回 `generationTip`').default(true),
    maxSongDuration: Schema.natural().min(1).step(1).description('歌曲最长持续时间（分钟）').default(30),
  }).description('进阶设置'),

  Schema.object({
    metingAPI: Schema.union([
      Schema.const('meting.jmstrand.cn').description('（推荐）`meting.jmstrand.cn`').experimental(),
      Schema.const('api.qijieya.cn').description('（推荐）`api.qijieya.cn`').experimental(),
    ]).description("获取音乐直链的后端API").default("api.qijieya.cn"),
    srcToWhat: Schema.union([
      Schema.const('text').description('文本 h.text'),
      Schema.const('audio').description('语音 h.audio'),
      Schema.const('audiobuffer').description('语音（buffer） h.audio'),
      Schema.const('video').description('视频 h.video'),
      Schema.const('file').description('文件 h.file'),
    ]).role('radio').default("audio").description('歌曲信息的的返回格式'),
  }).description('调试设置'),

  Schema.object({
    loggerinfo: Schema.boolean().default(false).description("日志调试模式"),
  }).description('开发者选项'),
])

interface SongData {
  id: number;
  name: string;
  artists: string;
  albumName: string;
  duration: number;
  lrc?: string;
}

interface NetEaseSearchResponse {
  result?: {
    songs?: NetEaseSongItem[];
  };
}

interface NetEaseSongItem {
  id: number;
  name: string;
  artists: { name: string }[];
  album: { name: string };
  duration: number;
}

export function apply(ctx: Context, config) {
  ctx.on('ready', async () => {

    const logger = ctx.logger('music-voice')

    ctx.i18n.define("zh-CN", {
      commands: {
        [config.commandName]: {
          description: `搜索歌曲并播放网易云音乐`,
          messages: {
            "nokeyword": `请输入歌曲相关信息。\n➣示例：/${config.commandName} 蔚蓝档案`,
            "songlisterror": "无法获取歌曲列表，请稍后再试。",
            "invalidKeyword": "无法获取歌曲列表，请尝试更换关键词。",
            "exitCommandTip": "退出选择请发 [{0}] 中的任意内容<br/><br/>",
            "imageGenerationFailed": "生成图片歌单失败，请检查 puppeteer 服务是否正常。",
            "imageListPrompt": "{0}请在 {1} 秒内，\n输入歌曲对应的序号",
            "textListPrompt": "{0}<br/><br/>{1}请在 {2} 秒内，<br/>输入歌曲对应的序号",
            "promptTimeout": "输入超时，已取消点歌。",
            "exitPrompt": "已退出歌曲选择。",
            "invalidNumber": "序号输入错误，已退出歌曲选择。",
            "durationExceeded": "歌曲持续时间超出限制。",
            "getSongFailed": "获取歌曲失败，请稍后再试。",
          }
        },
      }
    });

    ctx.command(`${config.commandName || "music"} <keyword:text>`)
      .alias(config.commandAlias || "mdff")
      .option('number', '-n <number:number> 歌曲序号')
      .action(async ({ session, options }, keyword) => {
        if (!keyword) return session.text(".nokeyword")
        logInfo(session.stripped.content)
        let neteaseData: SongData[] = [];
        try {
          neteaseData = await searchNetEase(keyword, config.searchListCount)

        } catch (err) {
          logger.warn('获取网易云音乐数据时发生错误', err.message)
          return session.text(".songlisterror")
        }

        if (!neteaseData.length) return session.text(".invalidKeyword")

        const neteaseListText = neteaseData.length ? formatSongList(neteaseData, 'NetEase Music', 0) : '<b>NetEase Music</b>: 无法获取歌曲列表'

        const listText = `${neteaseListText}`
        const exitCommands = config.exitCommandList;
        const exitCommandTip = config.menuExitCommandTip ? session.text(".exitCommandTip", [exitCommands.join(', ')]) : ''
        let selected: SongData;
        let quoteId = session.messageId;

        if (options.number !== undefined) { // 如果用户提供了 -n 选项
          const serialNumber = options.number;
          if (!Number.isInteger(serialNumber) || serialNumber < 1 || serialNumber > neteaseData.length) {
            // 如果序号无效，返回错误提示
            return `${h.quote(quoteId)}` + session.text(".invalidNumber");
          }
          selected = neteaseData[serialNumber - 1]; // 直接根据序号选择歌曲

        } else {

          if (config.imageMode) {
            const imageBuffer = await generateSongListImage(listText, config)
            if (!imageBuffer) { // 检查 imageBuffer 是否为 null
              return session.text(".imageGenerationFailed");
            }
            const payload = [
              h.quote(quoteId),
              h.image(imageBuffer, 'image/png'),
              h.text(session.text(".imageListPrompt", [exitCommandTip.replaceAll('<br/>', '\n'), config.waitForTimeout]))
            ]
            const msg = await session.send(payload)
            quoteId = msg.at(-1)
          } else {
            const payload = `${h.quote(quoteId)}` + session.text(".textListPrompt", [listText, exitCommandTip, config.waitForTimeout])
            const msg = await session.send(h.unescape(payload))
            quoteId = msg.at(-1)
          }

          const input = await session.prompt((session) => {
            quoteId = session.messageId
            return h.select(session.elements, 'text').join('')
          }, { timeout: config.waitForTimeout * 1000 })

          if (isNullable(input)) return `${quoteId ? h.quote(quoteId) : ''}` + session.text(".promptTimeout")

          if (exitCommands.includes(input)) {
            return `${h.quote(quoteId)}` + session.text(".exitPrompt")
          }

          const serialNumber = +input
          if (!Number.isInteger(serialNumber) || serialNumber < 1 || serialNumber > neteaseData.length) {
            return `${h.quote(quoteId)}` + session.text(".invalidNumber")
          }

          selected = neteaseData[serialNumber - 1]
        }
        const interval = selected.duration / 1000;
        const [tipMessageId] = await session.send(h.quote(quoteId) + `` + h.text(config.generationTip))
        try {
          let src: string = '';
          if (config.metingAPI === 'meting.jmstrand.cn') {
            src = `https://meting.jmstrand.cn/?type=url&id=${selected.id}`;
          } else if (config.metingAPI === 'api.qijieya.cn') {
            src = `https://api.qijieya.cn/meting/?type=url&id=${selected.id}`;
          }
          logInfo(selected)
          logInfo(src)
          logInfo(config.srcToWhat)
          if (interval * 1000 > config.maxSongDuration * 1000 * 60) {
            if (config.recall) session.bot.deleteMessage(session.channelId, tipMessageId)
            return `${h.quote(quoteId)}` + session.text(".durationExceeded")
          }
          switch (config.srcToWhat) {
            case 'text':
              await session.send(h.text(src));
              break;
            case 'audio':
              await session.send(h.audio(src));
              break;
            case 'audiobuffer': {
              const srcFile = (await ctx.http.file(src)).data;
              const srcBuffer = Buffer.from(srcFile);
              await session.send(h.audio(srcBuffer, 'audio/mpeg'));
              break;
            }
            case 'video': {
              await session.send(h.video(src));
              break;
            }
            case 'file': {
              const tempFilePath = await downloadFile(src);
              const fileUrl = url.pathToFileURL(tempFilePath).href;
              logInfo(fileUrl)
              await session.send(h.file(fileUrl));
              await fs.unlinkSync(tempFilePath);
              break;
            }
            default:
              ctx.logger.error(`Unsupported send type: ${config.srcToWhat}`);
              return
          }

          if (config.recall) session.bot.deleteMessage(session.channelId, tipMessageId)
        } catch (error) {
          if (config.recall) session.bot.deleteMessage(session.channelId, tipMessageId)
          logger.error('获取歌曲详情或发送语音失败', error);
          return `${h.quote(quoteId)}` + session.text(".getSongFailed")
        }
      })

    async function downloadFile(url: string) {
      try {
        const file = await ctx.http.file(url);
        const contentType = file.type || file.mime;
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
        let filename = crypto.randomBytes(8).toString('hex') + ext;
        const filePath = path.join(os.tmpdir(), filename);
        const buffer = Buffer.from(file.data);
        await fs.writeFileSync(filePath, buffer);
        return filePath;
      } catch (error) {
        logger.error('文件下载失败:', error);
        return null;
      }
    }

    function logInfo(...args: any[]) {
      if (config.loggerinfo) {
        (logger.info as (...args: any[]) => void)(...args);
      }
    }

    async function searchNetEase(keyword: string, limit: number = 10): Promise<SongData[]> {
      const searchApiUrl = `https://music.163.com/api/search/get/web?csrf_token=hlpretag=&hlposttag=&s=${encodeURIComponent(keyword)}&type=1&offset=0&total=true&limit=${limit}`;
      try {
        const searchApiResponse = await ctx.http.get(searchApiUrl);
        const parsedSearchApiResponse: NetEaseSearchResponse = JSON.parse(searchApiResponse);
        const searchData = parsedSearchApiResponse.result;

        if (!searchData || !searchData.songs || searchData.songs.length === 0) {
          return [];
        }

        const songList: SongData[] = searchData.songs.map((song) => {
          return {
            id: song.id,
            name: song.name,
            artists: song.artists.map(artist => artist.name).join('/'),
            albumName: song.album.name,
            duration: song.duration
          };
        });
        logInfo(songList)
        return songList;
      } catch (error) {
        logger.error('网易云音乐搜索出错', error);
        return [];
      }
    }

    async function generateSongListImage(listText: string, config) {
      if (!ctx.puppeteer) {
        logger.warn('puppeteer 服务未启用，无法生成图片歌单。');
        return null;
      }
      const content = `
      <!DOCTYPE html>
      <html lang="zh">
        <head>
          <title>music</title>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body {
              margin: 0;
              font-family: "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Noto Sans SC", "Microsoft YaHei", SimSun, sans-serif;
              font-size: 16px;
              background: ${config.backgroundChannel};
              color: ${config.textChannel};
              min-height: 100vh;
            }
            #song-list {
              padding: 20px;
              display: inline-block; 
              max-width: 100%; 
              white-space: nowrap; 
              transform: scale(0.9);
            }
            s {
              text-decoration-thickness: 1.5px;
            }
          </style>
        </head>
        <body>
          <div id="song-list">${listText}</div>
        </body>
      </html>
    `
      const page = await ctx.puppeteer.page()
      await page.setContent(content)
      const list = await page.$('#song-list')
      if (!list) return null; // 避免 list 为 null 导致报错
      const screenshot = await list.screenshot({})
      page.close()
      return screenshot
    }

    function formatSongList(data: SongData[], platform: string, startIndex: number) {
      const formatted = data.map((song, index) => {
        let item = `${index + startIndex + 1}. ${song.name} -- ${song.artists} -- ${song.albumName}`
        return item
      }).join('<br/>')
      return `<b>${platform}</b>:<br/>${formatted}`
    }

  })
}