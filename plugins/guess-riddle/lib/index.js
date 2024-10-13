"use strict";
const koishi = require("koishi");
const { Schema } = require('koishi');
const fs = require("node:fs").promises;
const path = require('node:path');
const logger = new koishi.Logger('guess-riddle');
exports.name = "guess-riddle";
exports.usage = `
指令有【猜谜】【过】【不玩了】等情况。尽情游戏吧\~
`;
exports.Config = Schema.intersect([
  Schema.object({
    PromptMapping: Schema.array(Schema.object({
      StartPrompt: Schema.string().description('开始游戏的触发词'),
      SkipPrompt: Schema.string().description('前往下一题的触发词'),
      EndPrompt: Schema.string().description('结束游戏的触发词'),
    }))
    .role('table')
    .description('触发词设定表')
    .default([
      { StartPrompt: '开始猜谜', SkipPrompt: '下一题', EndPrompt: '退出' },
      { StartPrompt: '猜谜', SkipPrompt: '过', EndPrompt: '不玩了' },
      { StartPrompt: '猜谜开始', SkipPrompt: '下一个', EndPrompt: '结束' },
    ]),
    autoEnd: Schema.boolean().description("开启后，答错`autoSkip`次自动结束游戏。关闭后答错`autoSkip`次自动下一题").default(true),
    autoSkip: Schema.number().default(3).description('答错/触发错误若干次后，自动下一题'),
    choice: Schema.union(['完全匹配', '正则匹配']).role('radio').default('正则匹配').description('推荐`正则匹配`，因为部分答案比较奇怪，使用`完全匹配`难以答对'),
  }).description('进阶设置'),
]);

const riddleSession = new Map();
const userData = new Map(); // 用于存储用户数据

async function getRiddle() {
  try {
    const filePath = path.join(__dirname, 'caimi.json');
    const data = await fs.readFile(filePath, 'utf8');
    const riddles = JSON.parse(data);
    if (riddles.length === 0) {
      throw new Error('谜题文件为空');
    }
    const randomIndex = Math.floor(Math.random() * riddles.length);
    return riddles[randomIndex];
  } catch (error) {
    logger.error('读取谜题失败:', error);
  }
  return null;
}

async function startGame(session) {
  const riddle = await getRiddle();
  if (!riddle) {
    await session.send("获取谜题失败，请稍后重试。");
    return;
  }
  userData.set(session.userId, { wrongGuessCount: 0 }); // 初始化用户数据
  riddleSession.set(session.userId, riddle);
  await session.send(`谜题来啦！\n谜题：${riddle.mt}\n\n#${riddle.lx}\n请${riddle.ts}\\~`);
}

async function nextRiddle(session) {
  const previousRiddle = riddleSession.get(session.userId);
  const riddle = await getRiddle();
  if (!riddle) {
    await session.send("获取下一题失败，请稍后重试。");
    return;
  }
  await session.send(`上一题的答案是：${previousRiddle.md}。\n继续继续！下一题是：${riddle.mt}\n\n#${riddle.lx}\n请${riddle.ts}\\~`);
  riddleSession.set(session.userId, riddle);
  userData.get(session.userId).wrongGuessCount = 0; // 重置错误计数
}

async function guessAnswer(session, answer, config, skipPrompts) {
  // 清除答案中包含在尖括号 <> 内的内容
  answer = answer.replace(/<[^>]*>/g, '').trim();
  const riddle = riddleSession.get(session.userId);
  if (!riddle) {
    await session.send("请先【开始游戏】。");
    return;
  }
  if (!answer || answer === "undefined") {
    await session.send("您没有输入内容呢\~请输入【你的答案】以交互哦\~");
    return;
  }
  answer = answer.trim(); // 清除答案前后的空格

  // 根据配置选择匹配方式
  const isMatch = (config.choice === '完全匹配') ? (answer === riddle.md) : (riddle.md.includes(answer));

  // 首先判断是否是跳过谜题的指令
  if (skipPrompts.includes(answer)) {
    await session.send(`没关系，跳过这一题。上题答案是：${riddle.md}`);
    await nextRiddle(session); // 输出当前谜底并跳到下一题
    return; // 跳过后直接返回，不再检查答案
  }

  const user = userData.get(session.userId);

  // 判断用户答案是否匹配谜底
  if (isMatch) {
    await session.send(`恭喜你答对啦！`);
    await nextRiddle(session); // 答对后直接跳到下一题
    user.wrongGuessCount = 0; // 重置错误计数
  } else {
    // 用户答案错误，并且不是跳过的情况
    user.wrongGuessCount += 1; // 增加错误计数
    await session.send(`猜错了哦\~
不要气馁，继续试试看吧！
回复【过】可以跳过本题哦\~
当前错误次数：${user.wrongGuessCount}`);

    // 判断是否达到自动处理错误次数的限制
    if (user.wrongGuessCount >= config.autoSkip) {
      if (config.autoEnd) {
        await session.send(`您已经连续答错${config.autoSkip}次，游戏自动结束。`);
        await stopGame(session); // 结束游戏
      } else {
        await session.send(`您已经连续答错${config.autoSkip}次，自动跳到下一题。`);
        await nextRiddle(session); // 跳到下一题
      }
    }
  }
}

async function stopGame(session) {
  const riddle = riddleSession.get(session.userId);
  if (!riddle) {
    await session.send("游戏尚未开始。");
    return;
  }
  await session.send(`游戏结束，最后一题的答案是：${riddle.md}。\n\n游戏结束啦！\n期待你的再次挑战！`);
  riddleSession.delete(session.userId);
  userData.delete(session.userId); // 清理用户数据
}

exports.apply = async function apply(ctx, config) {
  let activeSessions = new Set();
  const startPrompts = config.PromptMapping.map(item => item.StartPrompt);
  const skipPrompts = config.PromptMapping.map(item => item.SkipPrompt);
  const endPrompts = config.PromptMapping.map(item => item.EndPrompt);

  ctx.middleware(async (session, next) => {
    let content = session.content.trim();
    // 预处理 content 变量，移除尖括号内的内容
    content = content.replace(/<[^>]*>/g, '').trim();
    
    const userId = session.userId;
  
    // 检查是否为开始游戏的触发词
    if (startPrompts.includes(content)) {
      await startGame(session);
      activeSessions.add(userId);
      return next();
    }
  
    // 仅处理已经开始游戏的用户
    if (activeSessions.has(userId)) {
      // 检查是否为前往下一题的触发词
      if (skipPrompts.includes(content)) {
        await nextRiddle(session);
        return next();
      }
  
      // 检查是否为结束游戏的触发词
      if (endPrompts.includes(content)) {
        await stopGame(session);
        activeSessions.delete(userId);
        return next();
      }
  
      // 处理用户的猜测答案
      if (content.length >= 1 && content.length <= 8) {
        await guessAnswer(session, content, config, skipPrompts);
        return next();
      } else {
        return next();
      }
    }
  
    return next();
  });
  
};
