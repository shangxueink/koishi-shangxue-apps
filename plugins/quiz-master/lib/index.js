"use strict";
const koishi = require("koishi");
const { Schema } = require('koishi');
const fs = require("node:fs").promises;
const path = require('node:path');
const logger = new koishi.Logger('quiz-master');

exports.name = "quiz-master";
exports.usage = `
开启插件即可触发！
指令有【开始答题】【过】【不玩了】等情况。尽情游戏吧\~
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
      { StartPrompt: '答题', SkipPrompt: '下一题', EndPrompt: '退出' },
      { StartPrompt: '答题大师', SkipPrompt: '过', EndPrompt: '不玩了' },
      { StartPrompt: '开始答题', SkipPrompt: '下一个', EndPrompt: '结束' },
    ]),
    autoEnd: Schema.boolean().description("开启后，答错`autoSkip`次自动结束游戏。关闭后答错`autoSkip`次自动下一题").default(true),
    autoSkip: Schema.number().default(3).description('答错/触发错误若干次后，自动下一题'),
  }).description('进阶设置'),
]);
const quizSession = new Map();
const userData = new Map(); // 用于存储用户数据

async function getQuiz() {
    try {
        const filePath = path.join(__dirname, 'quiz.json');
        const data = await fs.readFile(filePath, 'utf8');
        const quizzes = JSON.parse(data);
        if (quizzes.length === 0) {
            throw new Error('题库文件为空');
        }
        const randomIndex = Math.floor(Math.random() * quizzes.length);
        return quizzes[randomIndex];
    } catch (error) {
        logger.error('读取题目失败:', error);
    }
    return null;
}

async function startGame(session) {
    const quiz = await getQuiz();
    if (!quiz) {
        await session.send("获取题目失败，请稍后重试。");
        return;
    }
    userData.set(session.userId, { wrongGuessCount: 0 }); // 初始化用户数据
    quizSession.set(session.userId, quiz);
    await session.send(`题目来啦！\n${quiz.question}\n\n选项：\n${quiz.options}`);
}

async function nextQuiz(session) {
    const previousQuiz = quizSession.get(session.userId);
    const quiz = await getQuiz();
    if (!quiz) {
        await session.send("获取题目失败，请稍后重试。");
        return;
    }
    await session.send(`上一题的答案是：${previousQuiz.answer}。\n继续继续，下一题是：\n${quiz.question}\n\n选项：\n${quiz.options}`);
    quizSession.set(session.userId, quiz);
    userData.get(session.userId).wrongGuessCount = 0; // 重置错误计数
}

async function guessAnswer(session, answer, config, skipPrompts) {
    // 清除答案中包含在尖括号 <> 内的内容
    answer = answer.replace(/<[^>]*>/g, '').trim();
    const quiz = quizSession.get(session.userId);
    if (!quiz) {   
        return;
    }
    if (!answer || answer === "undefined") {
        await session.send("您没有输入内容呢\~请输入【你的答案】以交互哦\~");
        return;
    }
    answer = answer.trim(); // 清除答案前后的空格
    // 首先判断是否是跳过谜题的指令
    if (skipPrompts.includes(answer)) {
        await session.send(`没关系，跳过这一题。上题答案是：${quiz.answer}`);
        await nextQuiz(session); // 输出当前谜底并跳到下一题
        return; // 跳过后直接返回，不再检查答案
    }
    const user = userData.get(session.userId);
    // 判断用户答案是否匹配谜底
    if (answer === quiz.answer.trim()) {
        await session.send("回答正确！继续继续，下一题是：");
        await nextQuiz(session); // 答对后直接跳到下一题
        user.wrongGuessCount = 0; // 重置错误计数
    } else {
        // 用户答案错误，并且不是跳过的情况
        user.wrongGuessCount += 1; // 增加错误计数
        await session.send(`卟卟！答错了。不要气馁，再试试看吧！\n回复【过】可以跳过本题哦\~\n当前错误次数：${user.wrongGuessCount}`);
        // 判断是否达到自动处理错误次数的限制
        if (user.wrongGuessCount >= config.autoSkip) {
            if (config.autoEnd) {
                await session.send(`您已经连续答错${config.autoSkip}次，游戏自动结束。`);
                await stopGame(session); // 结束游戏
            } else {
                await session.send(`您已经连续答错${config.autoSkip}次，自动跳到下一题。`);
                await nextQuiz(session); // 跳到下一题
            }
        }
    }
}

async function stopGame(session) {
    const quiz = quizSession.get(session.userId);
    if (!quiz) {
        await session.send("游戏尚未开始。");
        return;
    }
    await session.send(`游戏结束，最后一题的答案是：${quiz.answer}。\n\n游戏结束啦！\n期待你的再次挑战！`);
    quizSession.delete(session.userId);
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
        } 
        // 检查是否为跳过题目的触发词
        else if (skipPrompts.includes(content) && activeSessions.has(userId)) {
            await nextQuiz(session);
        }
        // 检查是否为结束游戏的触发词
        else if (endPrompts.includes(content) && activeSessions.has(userId)) {
            await stopGame(session);
            activeSessions.delete(userId);
        } 
        // 检查是否为数字 0-4
        // 使用预处理后的 content 变量进行检查
        else if (/^[0-4]$/.test(content) && activeSessions.has(userId)) {
            await guessAnswer(session, content, config, skipPrompts);
        }
        // 检查是否为数字 5-9
        else if (/^[5-9]$/.test(content) && activeSessions.has(userId)) {
            await session.send("喂喂\~你确定有这个选项吗？");
        } 

        return next();
    });
};
