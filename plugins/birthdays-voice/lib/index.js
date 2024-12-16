"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.inject = exports.name = void 0;

const { Schema, h } = require("koishi");
const fs = require('node:fs').promises;
const path = require('node:path');
const character_birthdays = require('../character_birthdays.json');

exports.name = "birthdays-voice";
exports.inject = {
  optional: ['ffmpeg', "silk"]
};

exports.Config = Schema.intersect([

  Schema.object({
    keyword: Schema.string().default("我喜欢你").description("需要检测的关键词"),
    noteffect: Schema.union([
      Schema.const('noteffect').description('忽略处理'),
      Schema.const('defaultcharacters').description('使用固定学生的语音'),
    ]).role('radio').description("没匹配到对应的学生生日时，进行的行为").required(),
    defaultLanguage: Schema.union([
      Schema.const('日配').description('日配'),
      Schema.const('中配').description('中配'),
      Schema.const('韩配').description('韩配'),
    ]).role('radio').description("使用的默认语言").default("日配"),
  }).description('基础设置'),
  Schema.union([
    Schema.object({
      noteffect: Schema.const("defaultcharacters").required(),
      defaultcharactersname: Schema.string().default("爱丽丝").description("没匹配到对应的学生生日时，返回的默认角色的语音<br>注意需要与`character_birthdays.json`内的学生姓名一致"),
    }),
    Schema.object({}),
  ]),
  Schema.object({
    enableLogging: Schema.boolean().default(false).description("日志调试模式"),
  }).description('调试设置'),
]);

async function apply(ctx, config) {
  const loggerinfo = (message) => {
    if (config.enableLogging) {
      ctx.logger.info(message);
    }
  };

  ctx.middleware(async (session, next) => {
    if (!session.content.includes(config.keyword)) {
      return next();
    }

    const today = new Date();
    const currentDate = `${today.getMonth() + 1}月${today.getDate()}日`;
    loggerinfo(`Checking for birthdays on ${currentDate}`);

    let characterName = null;

    for (const character of character_birthdays) {
      if (character.birthday === currentDate) {
        characterName = character.name;
        loggerinfo(`Found birthday for character: ${characterName}`);
        break;
      }
    }

    if (!characterName) {
      if (config.noteffect === 'noteffect') {
        loggerinfo("No matching birthday found. Skipping processing.");
        return next();
      } else {
        characterName = config.defaultcharactersname;
        loggerinfo(`No birthday match. Using default character: ${characterName}`);
      }
    }

    try {
      const filePath = path.join(__dirname, `../json/${characterName}.json`);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const voiceData = JSON.parse(fileContent);

      let voices = voiceData[config.defaultLanguage];

      if (!voices || voices.length === 0) {
        loggerinfo(`No voice clips found in ${config.defaultLanguage}. Trying other languages.`);
        for (const language of ['日配', '中配', '韩配']) {
          if (language !== config.defaultLanguage) {
            voices = voiceData[language];
            if (voices && voices.length > 0) {
              loggerinfo(`Found voice clips in ${language}.`);
              break;
            }
          }
        }
      }

      if (voices && voices.length > 0) {
        const randomVoice = voices[Math.floor(Math.random() * voices.length)];
        const url = randomVoice.url;
        loggerinfo(`Sending voice clip: ${url}`);
        await session.send(h.audio(url));
      } else {
        loggerinfo(`No voice clips found for character: ${characterName} in any language.`);
        await session.send(`老师！${characterName}也很喜欢老师哦！`);
      }
    } catch (error) {
      loggerinfo(`Error reading voice data for character: ${characterName} - ${error.message}`);
    }

    return next();
  });
}

exports.apply = apply;
