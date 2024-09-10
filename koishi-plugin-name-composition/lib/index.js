"use strict";
const koishi_1 = require('koishi');
const logger = new koishi_1.Logger('name-composition');
exports.name = 'composition';
exports.usage = '查看你是由什么组成的';

async function apply(ctx) {
  ctx.command('composition <name...>') 
  .action(async ({ session }, ...names) => {  
    const name = names.join(' '); 
  // 检查输入是否为空或者是 "undefined"
  if (!name || name === 'undefined') {
    await session.send('请输入一个指定内容 或@一个人');
    return;
    }
    
    let atRegex = name;
    
    // 在 'red' 平台下进行艾特输入检测
    if (session.platform === 'red' ) {
    atRegex = koishi_1.h.select(name, 'at')  ||  /<at id="(\d+)" name="(.+?)"/;
    const match = name.match(atRegex);
    if (match) {
    name = match[2]; 
    }
    } 
    

    
    //logger.error(atRegex);
    //logger.error(name);
    // 构建 API 请求 URL
    const url = `https://api.lolimi.cn/API/name/api.php?msg=${encodeURIComponent(atRegex)}`;
    try {
      // 发送 API 请求
      const response = await ctx.http.get(url);
      //logger.error(response);
      if (response.code === 1) {
        await session.send(response.text);
      } else {
        await session.send('获取失败，请稍后重试。');
      }
    } catch (error) {
      logger.error(error);
      await session.send('获取失败，请稍后重试。');
    }
  });
}

exports.apply = apply;
