import { Context, Schema, h, isNullable, Time } from 'koishi'
import type { } from 'koishi-plugin-puppeteer'

export const name = 'music-voice'
export const inject = {
  required: ['http'],
  optional: ['puppeteer']
}

export const usage = `
<a target="_blank" href="https://github.com/idranme/koishi-plugin-music-voice?tab=readme-ov-file#%E4%BD%BF%E7%94%A8%E8%AF%A5%E6%8F%92%E4%BB%B6%E6%90%9C%E7%B4%A2%E5%B9%B6%E8%8E%B7%E5%8F%96%E6%AD%8C%E6%9B%B2">➤ 食用方法点此获取</a>
`

export interface Config {
  xingzhigeAPIkey: string
  generationTip: string
  waitTimeout: number
  exitCommand: string
  menuExitCommandTip: boolean
  recall: boolean
  imageMode: boolean
  darkMode: boolean
  maxDuration: number
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    xingzhigeAPIkey: Schema.string().role('secret').description('星之阁的音乐API的请求key<br>（默认值是作者自己的哦，如果失效了请你自己获取一个）<br>请前往 QQ群 905188643 <br>添加QQ好友 3556898686 <br>私聊发送 `/getapikey` 获得你的APIkey以填入此处 <br>目前已经用完了`用完了申请新的key也是用完了，所以你得自己申请啦`').default("up8bpg7bItrfvuCaEdG6vrU-Kr5u68LSKpbGUMHSmsM="),
    generationTip: Schema.string().description('生成语音时返回的文字提示内容').default('生成语音中…'),
    waitTimeout: Schema.natural().role('ms').min(Time.second).step(Time.second).description('等待用户选择歌曲序号的最长时间')
      .default(45 * Time.second)
  }).description('基础设置'),
  Schema.object({
    imageMode: Schema.boolean().description('开启后返回图片歌单，关闭后返回文本歌单').required(),
    darkMode: Schema.boolean().description('是否开启图片歌单暗黑模式').default(true)
  }).description('歌单设置'),
  Schema.object({
    exitCommand: Schema.string().description('退出选择指令，多个指令间请用逗号分隔开').default('0, 不听了'),
    menuExitCommandTip: Schema.boolean().description('是否在歌单内容的后面，加上退出选择指令的文字提示').default(false),
    recall: Schema.boolean().description('是否在发送语音后撤回 generationTip').default(true),
    maxDuration: Schema.natural().role('ms').min(Time.minute).step(Time.minute).description('歌曲最长持续时间，单位为毫秒')
      .default(30 * Time.minute)
  }).description('进阶设置')
])

interface SongData {
  [x: string]: number | string
  songname: string
  name: string
  album: string
  songid?: number
  interval?: string
  songurl: string
  src?: string
  id?: number
}

interface SearchXZGResponse {
  code: number
  msg: string
  data: SongData[] | SongData
}

interface SearchXZGParams {
  name?: string
  key?: string
  n?: number
  songid?: number
  pagesize?: number
  max?: number
}

interface SearchQQResponse {
  code: number
  ts: number
  start_ts: number
  traceid: string
  request: {
    code: number
    data: {
      body: {
        item_song: {
          action: {
            msgdown: number
          }
          album: {
            name: string
          }
          id: number
          mid: string
          name: string
          singer: {
            name: string
          }[]
          title: string
        }[]
      },
      code: number
      feedbackURL: string
      meta: unknown
      ver: number
    }
  }
}

type Platform = 'QQ Music' | 'NetEase Music'

function formatSongList(data: SongData[], platform: Platform, startIndex: number) {
  const formatted = data.map((song, index) => {
    let item = `${index + startIndex + 1}. ${song.songname} -- ${song.name}`
    if (song.msgdown) {
      item = `<s>${item}</s>`
    }
    return item
  }).join('<br/>')
  return `<b>${platform}</b>:<br/>${formatted}`
}

function timeStringToSeconds(timeStr: string): number {
  // timeStr: "mm"分"ss"秒
  const arr = timeStr.replace('秒', '').split('分').map(Number)
  if (arr.length === 2) {
    return arr[0] * 60 + arr[1]
  } else {
    return arr[0]
  }
}

export function apply(ctx: Context, cfg: Config) {
  const logger = ctx.logger('music-voice')

  function searchXZG(platform: Platform, params: SearchXZGParams) {
    const path = platform === 'NetEase Music' ? '/NetEase_CloudMusic_new/' : '/QQmusicVIP/'
    return ctx.http.get<SearchXZGResponse>(`https://api.xingzhige.com/API${path}`, { params })
  }

  function searchQQ(query: string) {
    return ctx.http.post<SearchQQResponse>('https://u6.y.qq.com/cgi-bin/musicu.fcg', {
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
          highlight: 0,
          nqc_flag: 0,
          page_id: 1,
          grp: 1
        }
      }
    }, { responseType: 'json' })
  }

  async function generateSongListImage(listText: string, cfg: Config) {
    const textChannel = cfg.darkMode ? 255 : 0
    const backgroundChannel = cfg.darkMode ? 0 : 255
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
              background: rgb(${backgroundChannel} ${backgroundChannel} ${backgroundChannel});
              color: rgb(${textChannel} ${textChannel} ${textChannel});
              min-height: 100vh;
            }
            #song-list {
              padding: 20px;
              display: inline-block; /* 使div适应内容宽度 */
              max-width: 100%; /* 防止内容溢出 */
              white-space: nowrap; /* 防止歌曲名称换行 */
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
    const screenshot = await list.screenshot({})
    page.close()
    return screenshot
  }

  ctx.command('music <keyword:text>', '搜索歌曲并生成语音')
    .alias('mdff', '点歌')
    .action(async ({ session }, keyword) => {
      if (!keyword) return '请输入歌曲相关信息。'

      let qq: SearchXZGResponse, netease: SearchXZGResponse
      try {
        const res = await searchQQ(keyword)
        const item = res.request?.data?.body?.item_song
        qq = {
          code: res.code,
          msg: '',
          data: Array.isArray(item) ? item.map(v => {
            return {
              songname: v.title,
              album: v.album.name,
              songid: v.id,
              songurl: `https://y.qq.com/n/ryqq/songDetail/${v.mid}`,
              name: v.singer.map(v => v.name).join('/'),
              msgdown: v.action.msgdown
            }
          }) : []
        }
      } catch (err) {
        logger.warn('获取QQ音乐数据时发生错误', err.message)
      }
      try {
        netease = await searchXZG('NetEase Music',
          {
            name: keyword,
            key: cfg.xingzhigeAPIkey
          })
      } catch (err) {
        logger.warn('获取网易云音乐数据时发生错误', err.message)
      }

      const qqData = qq?.data as SongData[] ?? []
      const neteaseData = netease?.data as SongData[] ?? []
      if (!qqData.length && !neteaseData.length) return '无法获取歌曲列表，请稍后再试。'

      const qqListText = qqData.length ? formatSongList(qqData, 'QQ Music', 0) : '<b>QQ Music</b>: 无法获取歌曲列表'
      const neteaseListText = neteaseData.length ? formatSongList(neteaseData, 'NetEase Music', qqData.length) : '<b>NetEase Music</b>: 无法获取歌曲列表'

      const listText = `${qqListText}<br/><br/>${neteaseListText}`
      const exitCommands = cfg.exitCommand.split(/[,，]/).map(cmd => cmd.trim())
      const exitCommandTip = cfg.menuExitCommandTip ? `退出选择请发[${exitCommands}]中的任意内容<br/><br/>` : ''

      let quoteId = session.messageId

      if (cfg.imageMode) {
        if (!ctx.puppeteer) throw new Error('发送图片歌单需启用 puppeteer 服务')
        const imageBuffer = await generateSongListImage(listText, cfg)
        const payload = [
          h.quote(quoteId),
          h.image(imageBuffer, 'image/png'),
          h.text(`${exitCommandTip.replaceAll('<br/>', '\n')}请在 `),
          h('i18n:time', { value: cfg.waitTimeout }),
          h.text('内，\n'),
          h.text('输入歌曲对应的序号')
        ]
        const msg = await session.send(payload)
        quoteId = msg.at(-1)
      } else {
        const payload = `${h.quote(quoteId)}${listText}<br/><br/>${exitCommandTip}请在 <i18n:time value="${cfg.waitTimeout}"/>内，<br/>输入歌曲对应的序号`
        const msg = await session.send(payload)
        quoteId = msg.at(-1)
      }

      const input = await session.prompt((session) => {
        quoteId = session.messageId
        return h.select(session.elements, 'text').join('')
      }, { timeout: cfg.waitTimeout })

      if (isNullable(input)) return `${quoteId ? h.quote(quoteId) : ''}输入超时，已取消点歌。`
      if (exitCommands.includes(input)) {
        return `${h.quote(quoteId)}已退出歌曲选择。`
      }

      const serialNumber = +input
      if (!Number.isInteger(serialNumber) || serialNumber < 1 || serialNumber > qqData.length + neteaseData.length) {
        return `${h.quote(quoteId)}序号输入错误，已退出歌曲选择。`
      }

      const songData: SongData[] = []
      if (qqData.length) {
        songData.push(...qqData)
      }
      if (neteaseData.length) {
        songData.push(...neteaseData)
      }

      let platform: Platform, songid: number
      const selected = songData[serialNumber - 1]
      if (selected.songurl.includes('.163.com/')) {
        platform = 'NetEase Music'
        songid = selected.id
      } else if (selected.songurl.includes('.qq.com/')) {
        platform = 'QQ Music'
        songid = selected.songid
      }
      if (!platform) return `${h.quote(quoteId)}获取歌曲失败。`

      const [tipMessageId] = await session.send(h.quote(quoteId) + cfg.generationTip)

      const song = await searchXZG(platform, {
        songid,
        key: cfg.xingzhigeAPIkey
      })
      const { channelId } = session
      if (song.code === 0) {
        const { src, interval } = song.data as SongData
        if (!src || src.startsWith('无法')) {
          if (cfg.recall) session.bot.deleteMessage(channelId, tipMessageId)
          ctx.logger.warn(src)
          return `${h.quote(quoteId)}获取歌曲失败。`
        }
        try {
          const duration = timeStringToSeconds(interval)
          if (duration * 1000 > cfg.maxDuration) {
            if (cfg.recall) session.bot.deleteMessage(channelId, tipMessageId)
            return `${h.quote(quoteId)}歌曲持续时间超出限制。`
          }
          /*const url = new URL(src)
          if (url.host.startsWith('ws.stream')) {
            url.host = url.host.replace('ws.stream', 'isure6.stream')
          }*/
          await session.send(h.audio(src, { duration }))
        } catch (err) {
          if (cfg.recall) session.bot.deleteMessage(channelId, tipMessageId)
          throw err
        }
        if (cfg.recall) session.bot.deleteMessage(channelId, tipMessageId)
      } else {
        if (cfg.recall) session.bot.deleteMessage(channelId, tipMessageId)
        let msg = song.msg || ''
        if (msg) {
          if ([',', '.', '!', '，', '。', '！'].includes(msg.at(-1))) {
            msg = msg.slice(0, -1)
          }
          msg += '，'
        }
        return `${h.quote(quoteId)}${msg}获取歌曲失败。`
      }
    })
}
