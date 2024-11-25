"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.inject = exports.name = void 0;

const { Schema, h } = require("koishi");
const fs = require('node:fs').promises;
const path = require('node:path');

exports.name = "ba-voice";
exports.inject = {
  optional: ['ffmpeg', "silk"]
};

exports.Config = Schema.intersect([
  Schema.object({
    defaultLanguage: Schema.union([
      Schema.const('日配').description('日配'),
      Schema.const('中配').description('中配'),
      Schema.const('韩配').description('韩配'),
    ]).role('radio').description("未指定语言时使用的默认语言").default("日配"),
    maxGuessTime: Schema.number().default(60 * 1).description("猜角色限定最大时长（单位：秒） 超时视为失败"),
    maxGuessTime_Times: Schema.number().default(3).description("允许猜错次数（单位：次）默认三次 猜错3次视为失败"),
  }).description('基础设置'),

  Schema.object({
    enableLogging: Schema.boolean().default(false).description("日志调试模式"),
    qqrawmarkdown: Schema.boolean().default(false).description("启用QQ平台原生md格式").experimental(),
  }).description('调试设置'),
]);

async function apply(ctx, config) {
  const loggerinfo = (message) => {
    if (config.enableLogging) {
      ctx.logger.info(message);
    }
  };

  ctx.command("猜角色 [language]", { authority: 1 })
    .action(async ({ session }, language) => {
      let selectedLanguage;
      if (!language) {
        selectedLanguage = config.defaultLanguage;
      } else if (['日配', '中配', '韩配'].includes(language)) {
        selectedLanguage = language;
      }
      loggerinfo(`使用的语言: ${selectedLanguage}`);

      const jsonDir = path.resolve(__dirname, '../json');
      const files = await fs.readdir(jsonDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      let randomFile, data, voices, randomVoice;
      do {
        randomFile = jsonFiles[Math.floor(Math.random() * jsonFiles.length)];
        const filePath = path.join(jsonDir, randomFile);
        data = JSON.parse(await fs.readFile(filePath, 'utf-8'));

        voices = data[selectedLanguage];
        if (voices && voices.length > 0) {
          randomVoice = voices[Math.floor(Math.random() * voices.length)];
        }
      } while (!randomVoice || !randomVoice.url);

      loggerinfo(`选择的文件: ${randomFile}`);

      const correctCharacter = path.basename(randomFile, '.json');
      const characterNames = jsonFiles.map(file => path.basename(file, '.json'));
      const options = new Set();

      while (options.size < 5) {
        const randomName = characterNames[Math.floor(Math.random() * characterNames.length)];
        if (randomName !== correctCharacter) {
          options.add(randomName);
        }
      }
      options.add(correctCharacter);

      const shuffledOptions = Array.from(options).sort(() => Math.random() - 0.5);

      await session.send(h.audio(randomVoice.url));
      const optionsMessage = shuffledOptions.map((char, index) => `${index + 1}. ${char}`).join('\n');
      if (config.qqrawmarkdown) {
        const buttons = shuffledOptions.map((char, index) => ({
          "render_data": {
            "label": `${index + 1}. ${char}`,
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": `${index + 1}`,
            "enter": true
          }
        }));
        const markdownMessage = {
          "msg_type": 2,
          "msg_id": session.messageId,
          "markdown": {
            "content": `请选择对应的学生序号吧：\n${optionsMessage}`
          },
          "keyboard": {
            "content": {
              "rows": [
                { "buttons": buttons.slice(0, 2) },
                { "buttons": buttons.slice(2, 4) },
                { "buttons": buttons.slice(4, 6) },
                // 添加“再来一次”按钮
                {
                  "buttons": [
                    {
                      "render_data": {
                        "label": "🔁再来一次",
                        "style": 2
                      },
                      "action": {
                        "type": 2,
                        "permission": {
                          "type": 2
                        },
                        "data": "/猜角色",
                        "enter": true
                      }
                    }
                  ]
                }
              ]
            }
          }
        };


        if (session.event.guild?.id) {
          await session.qq.sendMessage(session.channelId, markdownMessage);
        } else {
          await session.qq.sendPrivateMessage(session.event.user?.id, markdownMessage);
        }
      } else {
        await session.send(h.text(`请选择对应的学生序号吧：\n${optionsMessage}`));
      }

      const startTime = Date.now();
      let remainingTime = config.maxGuessTime;
      let attempts = 0;

      while (remainingTime > 0 && attempts < config.maxGuessTime_Times) {
        try {
          const userInput = await session.prompt(remainingTime * 1000);
          const userChoice = parseInt(userInput, 10) - 1;

          // 添加日志以调试用户输入和选项
          loggerinfo(`用户输入: ${userInput}, 解析后索引: ${userChoice}`);
          loggerinfo(`正确角色: ${correctCharacter}, 打乱后的选项: ${shuffledOptions}`);

          if (userChoice >= 0 && userChoice < shuffledOptions.length && shuffledOptions[userChoice] === correctCharacter) {
            // 正确答案的处理逻辑
            const successMessage = `${h.image("https://i1.hdslb.com/bfs/archive/5d2326373c31dce252deaa3de787a9324ad02e7c.jpg")} 不愧是老师，果然猜对了呢！ 这个学生是${correctCharacter}哦！`;
            await session.send(successMessage);
            return;
          } else {
            attempts++;
            const elapsedTime = (Date.now() - startTime) / 1000;
            remainingTime = config.maxGuessTime - elapsedTime;
            if (remainingTime > 0 && attempts < config.maxGuessTime_Times) {
              const retryMessage = `猜错了哦，你还有${Math.floor(remainingTime)}秒，剩余尝试次数：${config.maxGuessTime_Times - attempts}`;
              await session.send(retryMessage);
            }
          }
        } catch {
          break;
        }
      }

      await session.send(`${h.image("https://i2.hdslb.com/bfs/archive/16ef94d8-18a1d58c0c5.jpeg")} 作战失败了，老师。正确答案是${correctCharacter}。不要气馁，下次加油吧！`);
    });
}

exports.apply = apply;
