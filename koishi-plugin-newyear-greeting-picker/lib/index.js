"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
const path = require('path');

exports.name = "newyear-greeting-picker";

module.exports = {
  apply(ctx) {
    // 读取并解析 zhufu.json 文件
    const greetingsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'zhufu.json'), 'utf8'));
    // 用于存储最近10条发送的祝福语ID
    let recentGreetings = [];

    // 定义 newyear-greeting-picker 命令
    ctx.command('newyear-greeting-picker')
      .action(async () => {
        let randomGreeting;
        // 无限循环直到找到一个未用过的祝福语
        do {
          randomGreeting = getRandomGreeting(greetingsData);
        } while (recentGreetings.includes(randomGreeting.id));

        // 如果已经记录了10条最近的祝福语，移除最旧的一条
        if (recentGreetings.length === 10) {
          recentGreetings.shift();
        }
        // 添加最新的祝福语ID到最近的祝福语列表
        recentGreetings.push(randomGreeting.id);

        return `${randomGreeting.text}`;
      });
  }
}

// 随机获取一条祝福语的函数
function getRandomGreeting(greetingsData) {
  const index = Math.floor(Math.random() * greetingsData.length);
  return greetingsData[index];
}
