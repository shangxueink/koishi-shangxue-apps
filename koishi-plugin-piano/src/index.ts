import { Context, Schema, h } from 'koishi'
import { exec } from 'child_process'
import { promisify } from 'util'
import { join, resolve } from 'path'
import * as fs from 'fs'

export const name = 'piano'

export interface Config {
  default_instrument: any
  loggerinfo: any
  ffmpegPath: string
}

export const Config: Schema<Config> = Schema.object({
  ffmpegPath: Schema.path().description('FFmpeg 可执行文件<br>下载安装 ffmpeg 插件，然后选择./downloads/ffmpeg···/ffmpeg.exe'),
  default_instrument: Schema.union(['钢琴', '八音盒', '古筝', '吉他', '萨克斯', '小提琴', '吹箫', '西域琴']).default('钢琴').description('默认的乐器'),
  loggerinfo: Schema.boolean().default(false).description('日志调试模式')
})

const execAsync = promisify(exec)

export function apply(ctx: Context, config: Config) {
  ctx.command('弹琴 <notes...>', '拼接并发送音频文件')
    .option('instrument', '-i <instrument:string> 指定乐器', {
      fallback: config.default_instrument
    })
    .option('speed', '-s <speed:number> 指定播放速度', {
      fallback: 5
    })
    .action(async ({ session, options }, ...notes: string[]) => {
      if (notes.length === 0) {
        return '请输入要拼接的音符序列。'
      }

      const instrument = options.instrument
      const speed = options.speed

      const validInstruments = ['钢琴', '八音盒', '古筝', '吉他', '萨克斯', '小提琴', '吹箫', '西域琴']
      if (!validInstruments.includes(instrument)) {
        return `无效的乐器选项。可选乐器为：${validInstruments.join(', ')}`
      }

      // 打印调试信息
      logInfo(`ffmpegPath: ${resolve(ctx.baseDir, config.ffmpegPath)}`)
      logInfo(`Speed: ${speed}`)
      logInfo(`Instrument: ${instrument}`)
      logInfo(`Notes: ${notes}`)

      try {
        const ffmpegPath = resolve(ctx.baseDir, config.ffmpegPath)
        const instrumentFolders = {
          '钢琴': 'gangqin/',
          '八音盒': 'ba/',
          '古筝': 'gu/',
          '吉他': 'jita/',
          '萨克斯': 'sa/',
          '小提琴': 'ti/',
          '吹箫': 'xiao/',
          '西域琴': 'xiyu/',
        }

        const audioFolderPath = resolve(__dirname, 'tanqin', instrumentFolders[instrument])
        if (speed < 0.5 || speed > 100) {
          return '播放速度必须在0.5到100之间。'
        }

        // 解析音符和空格间隔
        const noteSequence = notes.join(' ')
        const { noteFiles, missingNotes } = parseNotesWithSpacing(noteSequence, audioFolderPath)
        if (noteFiles.length === 0) {
          return '未能解析任何有效的音符。'
        }

        if (missingNotes.length > 0) {
          return `以下音符没有对应的音频文件：${missingNotes.join(', ')}`
        }

        // 创建文件列表
        const fileListPath = join(audioFolderPath, 'filelist.txt')
        const fileListContent = noteFiles.map(file => `file '${file.path}'`).join('\n')
        await fs.promises.writeFile(fileListPath, fileListContent, 'utf8')

        // 拼接音频文件
        const tempOutputFilePath = join(audioFolderPath, 'temp_output.mp3')
        const commandConcat = `"${ffmpegPath}" -f concat -safe 0 -i "${fileListPath}" -c copy "${tempOutputFilePath}"`
        await execAsync(commandConcat)

        // 调整播放速度
        const outputFilePath = join(audioFolderPath, 'output.mp3')
        const commandSpeed = `"${ffmpegPath}" -i "${tempOutputFilePath}" -filter:a "atempo=${speed}" -vn "${outputFilePath}"`
        await execAsync(commandSpeed)

        // 发送拼接后的音频文件
        const outputUrl = `file:///${outputFilePath.replace(/\\/g, '/')}`
        await session.send(h.audio(outputUrl))

        // 删除临时文件
        await fs.promises.unlink(fileListPath)
        await fs.promises.unlink(tempOutputFilePath)
        await fs.promises.unlink(outputFilePath)
      } catch (error) {
        console.error(error)
        return '拼接音频文件时发生错误。'
      }
    })

  function logInfo(message: string) {
    if (config.loggerinfo) {
      ctx.logger.info(message);
    }
  }

}

// 解析音符并处理空格间隔
function parseNotesWithSpacing(noteString: string, folderPath: string) {
  const notes = noteString.split(/([\s]+)/) // 使用正则表达式将空格作为分隔符保留
  const noteFiles = []
  const missingNotes = []
  const silenceFilePath = join(folderPath, '-.mp3')

  if (!fs.existsSync(silenceFilePath)) {
    console.warn(`静音文件 ${silenceFilePath} 不存在。`)
    return { noteFiles, missingNotes }
  }

  for (const note of notes) {
    if (/^\s+$/.test(note)) {
      // 空格表示延迟，根据空格长度计算间隔时长
      const spaceCount = note.length
      for (let i = 0; i < spaceCount; i++) {
        noteFiles.push({ path: silenceFilePath, duration: 0.25 }) // 每个空格代表0.25秒的间隔
      }
      continue
    }

    let duration = 1.0
    let cleanNote = note

    // 判断音符时长
    if (note.includes('___')) {
      duration = 0.125
      cleanNote = note.replace(/___/g, "")
    } else if (note.includes('__')) {
      duration = 0.25
      cleanNote = note.replace(/__/g, "")
    } else if (note.includes('_')) {
      duration = 0.5
      cleanNote = note.replace(/_/g, "")
    }

    if (cleanNote === '') {
      // 空字符串表示一个间隔
      continue
    }

    const filePath = join(folderPath, `${cleanNote}.mp3`)
    if (fs.existsSync(filePath)) {
      noteFiles.push({ path: filePath, duration })
    } else {
      console.warn(`文件 ${filePath} 不存在。`)
      missingNotes.push(cleanNote)
    }
  }

  return { noteFiles, missingNotes }
}
