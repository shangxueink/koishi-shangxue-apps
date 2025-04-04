import { Context, Schema, h } from 'koishi'
import { } from 'koishi-plugin-ffmpeg'
import { join, resolve } from 'node:path'
import * as fs from 'node:fs'

export const name = 'piano'

export interface Config {
  default_instrument: any
  loggerinfo: any
}
export const inject = {
  required: ['ffmpeg']
}
export const Config: Schema<Config> = Schema.object({
  default_instrument: Schema.union(['钢琴', '八音盒', '古筝', '吉他', '萨克斯', '小提琴', '吹箫', '西域琴']).default('钢琴').description('默认的乐器'),
  loggerinfo: Schema.boolean().default(false).description('日志调试模式')
})

export const usage = `
---

## 弹琴小插件

本插件仅能实现基本的音符音乐

### 支持的乐器
- 钢琴
- 八音盒
- 古筝
- 吉他
- 萨克斯
- 小提琴
- 吹箫
- 西域琴

### 使用方法

#### 基本用法
\`\`\`
弹琴  1 1___ 5 5___ 6 6___ 5 - 4 4___ 3 3___ 2 2___ 1 
\`\`\`
以上命令将使用默认乐器（钢琴）以默认速度拼接并播放音符序列，其中需要注意的就是音符需要使用双引号包裹以准确解析。

#### 指定乐器
\`\`\`
弹琴 -i 吉他  1 1___ 5 5___ 6 6___ 5 - 4 4___ 3 3___ 2 2___ 1 
\`\`\`
以上命令将使用吉他乐器拼接并播放音符序列。

#### 指定播放速度
\`\`\`
弹琴 -s 10  1 1___ 5 5___ 6 6___ 5 - 4 4___ 3 3___ 2 2___ 1 
\`\`\`
以上命令将以速度10（较快）拼接并播放音符序列。

#### 同时指定乐器和速度
\`\`\`
弹琴 -i 小提琴 -s 10  2 1 1___ 5 5___ 6 6___ 5 - 4 4___ 3 3___ 2 2___ 1 
\`\`\`
以上命令将使用小提琴乐器并以速度2（较慢）拼接并播放音符序列。

### 音符表示法
- 数字（如1, 2, 3）表示音符。
- 下划线（_）表示延长音符时长。
  - \`_\` 表示延长0.5倍时长。
  - \`__\` 表示延长0.25倍时长。
  - \`___\` 表示延长0.125倍时长。
- 连字符（-）表示一个短暂停顿。

### 示例
\`\`\`
弹琴  1 1___ 5 5___ 6 6___ 5 - 4 4___ 3 3___ 2 2___ 1 
\`\`\`
将拼接并播放音符序列，使用默认乐器和速度。

\`\`\`
弹琴 -i 吉他 -s 10  1 1___ 5 5___ 6 6___ 5 - 4 4___ 3 3___ 2 2___ 1
\`\`\`
将使用吉他乐器并以速度10拼接并播放音符序列。

---

`;

export function apply(ctx: Context, config: Config) {
  ctx.on('ready', async () => {
    ctx.command('弹琴 <notes:text>', '拼接并发送音频文件')
      .option('instrument', '-i <instrument:string> 指定乐器', { fallback: config.default_instrument })
      .option('speed', '-s <speed:number> 指定播放速度', { fallback: 5 })
      .action(async ({ session, options }, notes) => {
        if (notes.length === 0) {
          return '请输入要拼接的音符序列。'
        }

        const instrument = options.instrument
        const speed = options.speed

        const validInstruments = ['钢琴', '八音盒', '古筝', '吉他', '萨克斯', '小提琴', '吹箫', '西域琴']
        if (!validInstruments.includes(instrument)) {
          return `无效的乐器选项。可选乐器为：${validInstruments.join(', ')}`
        }

        logInfo(`Speed: ${speed}`)
        logInfo(`Instrument: ${instrument}`)
        logInfo(`Notes: ${notes}`)

        try {
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

          const audioFolderPath = resolve(__dirname, './../tanqin', instrumentFolders[instrument])
          if (speed < 0.5 || speed > 100) {
            return '播放速度必须在0.5到100之间。'
          }

          // 解析音符和空格间隔
          const noteSequence = notes
          const { noteFiles, missingNotes } = parseNotesWithSpacing(noteSequence, audioFolderPath, ctx.logger)
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

          // 创建临时文件夹
          const tempFolderPath = resolve(__dirname, './../temp')
          if (!fs.existsSync(tempFolderPath)) {
            await fs.promises.mkdir(tempFolderPath)
          }

          // 生成随机文件名
          const random = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
          const tempOutputFileName = `temp_output_${random}.mp3`
          const tempOutputFilePath = join(tempFolderPath, tempOutputFileName)

          // 使用 ffmpeg 插件服务拼接音频
          await ctx.ffmpeg.builder()
            .input(fileListPath)
            .inputOption('-f', 'concat', '-safe', '0')  // 设置输入格式和参数
            .outputOption('-c', 'copy')                 // 设置输出编码参数
            .run('file', tempOutputFilePath)            // 指定输出到文件

          // 调整播放速度
          const outputFilePath = join(audioFolderPath, 'output.mp3')
          await ctx.ffmpeg.builder()
            .input(tempOutputFilePath)
            .outputOption('-filter:a', `atempo=${speed}`) // 添加音频滤镜
            .outputOption('-vn')                         // 禁用视频流
            .run('file', outputFilePath)                // 指定输出到文件

          // 发送拼接后的音频文件
          await session.send(h.audio(`file:///${outputFilePath.replace(/\\/g, '/')}`))

          // 清理临时文件
          await Promise.all([
            fs.promises.unlink(fileListPath),
            fs.promises.unlink(tempOutputFilePath),
            fs.promises.unlink(outputFilePath),
          ])
        } catch (error) {
          ctx.logger.error('音频处理失败:', error)
          return '音频处理过程中发生错误: ' + error.message
        }
      })

    function logInfo(message: string) {
      if (config.loggerinfo) {
        ctx.logger.info(message);
      }
    }

    // 解析音符并处理空格间隔
    function parseNotesWithSpacing(noteString: string, folderPath: string, logger: Context['logger']) { // 接收 logger
      const notes = noteString.split(/([\s]+)/) // 使用正则表达式将空格作为分隔符保留
      const noteFiles = []
      const missingNotes = []
      const silenceFilePath = join(folderPath, '-.mp3')

      if (!fs.existsSync(silenceFilePath)) {
        logger.warn(`静音文件 ${silenceFilePath} 不存在。`) // 使用传入的 logger
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
          logger.warn(`文件 ${filePath} 不存在。`) // 使用传入的 logger
          missingNotes.push(cleanNote)
        }
      }

      return { noteFiles, missingNotes }
    }


  })
}
