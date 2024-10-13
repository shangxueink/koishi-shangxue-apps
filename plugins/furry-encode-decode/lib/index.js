"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const koishi_1 = require("koishi");
const logger = new koishi_1.Logger('image-save-path');
const HowlingAnimalsTranslator = require('./shouyu.js'); // 引入本地的 shouyu.js

exports.name = 'furry-encode-decode';
exports.usage = `
1. **文本加密**：将普通文本转换为加密文本。

<code>furry-encode 文本内容</code>

2. **文本解密**：将加密文本还原为普通文本。

<code>furry-decode 文本内容</code>

`;

async function handleCommand(session, text, operation) {
  const translator = new HowlingAnimalsTranslator();
  if (!text) {
    await session.send('请输入要处理的文本。');
    return;
  }
  try {
    const resultText = operation === 'encode' ? translator.convert(text) : translator.deConvert(text);
    const action = operation === 'encode' ? '加密' : '解密';
    await session.send(`${action}成功！\n\n${resultText}`);
  } catch (error) {
    logger.error(error);
    await session.send(`${operation === 'encode' ? '加密' : '解密'}失败，请稍后重试。`);
  }
}

async function apply(ctx) {
  ctx.command('furry-encode <text>')
    .alias('兽音译者')
    .alias('兽音加密')
    .action(async ({ session }, text) => {
      await handleCommand(session, text, 'encode');
    });

  ctx.command('furry-decode <text>')
    .alias('兽音解密')
    .action(async ({ session }, text) => {
      await handleCommand(session, text, 'decode');
    });
}

exports.apply = apply;
