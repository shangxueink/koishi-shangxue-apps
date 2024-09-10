"use strict";
const fs = require('fs');
const path = require('path');
const koishi = require("koishi");

exports.name = 'divine-oracle';

async function readFileContent(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf-8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(data);
    });
  });
}

async function sendRandomImage(session, folderPath, withStory = false) {
  try {
    const signFiles = fs.readdirSync(folderPath);
    const imageFiles = signFiles.filter(file => file.endsWith('.gif') || file.endsWith('.png') || file.endsWith('.jpg'));
    const randomIndex = Math.floor(Math.random() * imageFiles.length);
    const chosenImageFile = imageFiles[randomIndex];
    await session.send(koishi.segment.image(`file:///${path.join(folderPath, chosenImageFile)}`));

    if(withStory) {
      const chosenTxtFile = chosenImageFile.replace(path.extname(chosenImageFile), '.txt');
      const signContent = await readFileContent(path.join(folderPath, chosenTxtFile));
      const startStoryIndex = signContent.indexOf('故事');
      if (startStoryIndex !== -1) {
        const storyContent = "灵签故事：\n" +
          signContent.slice(signContent.indexOf('\n', startStoryIndex) + 1);
        await session.send(storyContent.trim());
      } else {
        throw new Error('故事内容未找到，请检查签文格式。');
      }
    }
  } catch (error) {
    console.error('Error processing divine-oracle:', error);
    return `获取灵签失败，请稍后重试。错误信息：${error.message}`;
  }
}

function createCommand(ctx, commandName, folderName, withStory) {
  ctx.command('抽灵签')
  ctx.command(commandName)
    .action(async ({ session }) => {
      const folderPath = path.join(__dirname, folderName);
      return sendRandomImage(session, folderPath, withStory);
    });
}

async function apply(ctx) {
  createCommand(ctx, '抽灵签/观音灵签', 'signs', true);
  createCommand(ctx, '抽灵签/车公灵签', 'chegong', false);
  createCommand(ctx, '抽灵签/佛祖灵签', 'fozu', false);
  createCommand(ctx, '抽灵签/关公灵签', 'guangong', false);
  createCommand(ctx, '抽灵签/吕祖灵签', 'luzu', false);
  createCommand(ctx, '抽灵签/妈祖灵签', 'mazu', false);
  createCommand(ctx, '抽灵签/玉帝灵签', 'yudi', false);
  createCommand(ctx, '抽灵签/诸葛神签', 'zhuge', false);
}

exports.apply = apply;