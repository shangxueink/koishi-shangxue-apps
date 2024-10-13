"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const koishi = require("koishi");
exports.name = 'translation-youdao';
const logger = new koishi.Logger('translation-youdao');

const translationApis = [
  {
  url: 'https://findmyip.net/api/translate.php?text={content}',
  parseResponse: (data) => data.code === 200 && data.data && data.data.translate_result,
  },
  {
  url: 'https://api.suyanw.cn/api/fanyi2.php?msg={content}',
  parseResponse: (data) => data.match(/结果：(.*)/),
  },
  {
  url: 'http://hbkgds.com/api/fanyi.php?msg={content}',
  parseResponse: (data) => data.match(/翻译后：(.*)/),
  },
  {
  url: 'https://api.lolimi.cn/API/qqfy/api.php?msg={content}',
  parseResponse: (data) => data.match(/翻译内容：(.*)/),
  },
];

var zh_CN_default = { 
  commands: { 
    "translation-youdao": { 
          description: "中英互译", 
          messages: {
            "expect_text": "请输入要发送的文本。",
            "translating": "正在翻译，请稍候...",
            "translation_result": "翻译结果：",
            "translation_failed": "翻译失败，请稍后再试。"
          },
    "有道翻译": { 
          description: "中英互译", 
          messages: {
            "expect_text": "请输入要发送的文本。",
            "translating": "正在翻译，请稍候...",
            "translation_result": "翻译结果：",
            "translation_failed": "翻译失败，请稍后再试。"
          }
      } 
    } 
  } 
};


async function translate(ctx, content) {
  const encodedContent = encodeURIComponent(content.replace(/\n/g, "\\n"));
  for (const api of translationApis) {
      try {
          const response = await ctx.http.get(api.url.replace('{content}', encodedContent));
          const result = typeof api.parseResponse === 'function' ? api.parseResponse(response) : api.parseResponse;
          if (result && (Array.isArray(result) ? result[1] : result)) {
              let finalResult = Array.isArray(result) ? result[1] : result;
              finalResult = finalResult.replace(/\\\\n/g, "\n").replace(/\\n/g, "\n");
              return finalResult;
          }
      } catch (error) {
          logger.error(`API request to ${api.url} failed:`, error);
      }
  }
  throw new Error('All translation APIs failed.');
}

async function apply(ctx) {
  ctx.i18n.define("zh-CN", zh_CN_default);
  ctx.command('translation-youdao <content:text>')
      .alias('有道翻译')
      .action(async ({ session }, content) => {
          if (!content || content.trim() === '') {
              await session.send(session.text(".expect_text"));
              return;
          }
          await session.send(session.text(".translating"));
          try {
              const result = await translate(ctx, content);
              await session.send(session.text(".translation_result") +`\n\n`+ result);
          } catch (error) {
              logger.error('Translation failed:', error);
              await session.send(session.text(".translation_failed"));
          }
      });
}

exports.apply = apply;
