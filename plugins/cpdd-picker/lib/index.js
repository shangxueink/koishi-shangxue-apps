"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
const path = require('path');


const koishi = require('koishi');
const logger = new koishi.Logger('cpdd-picker');
const Schema = koishi.Schema; 

// 配置项
exports.Config = Schema.object({
  imageMode: Schema.boolean().default(true).description('开启后cp宇宙生成器返回图片，关闭后返回文本'),
});

exports.name = "cp-universe-picker";

module.exports = {
  apply(ctx, config) {
    // cpdd.json
    const cpddData = JSON.parse(fs.readFileSync(path.join(__dirname, 'cpdd.json'), 'utf8'));

    const nameRegex = /name="([^"]+)"/;


    ctx.command('cp-universe-picker <user1> <user2>')
    // cp短打生成器
    ctx.command('cp-universe-picker/cp短打生成器 <user1> <user2>')
      .action(async ({ session }, user1, user2) => {
        // 立即返回生成中的提示
        session.send('生成中——');
        // 解析提及的用户
        user1 = extractName(user1, nameRegex);
        user2 = extractName(user2, nameRegex);
        
        const randomText = getRandomText(cpddData);
        const textWithNames = randomText.text.replace(/<g>/g, user1).replace(/<s>/g, user2);
        return textWithNames;
      });

    // cp宇宙生成器
    ctx.command('cp-universe-picker/cp宇宙生成器 <user1> <user2>')
      .action(async ({ session }, user1, user2) => {
        // 立即返回生成中的提示
        session.send('生成中——');
     
        user1 = extractName(user1, nameRegex);
        user2 = extractName(user2, nameRegex);

        // 检查参数
        if (!user1 || !user2) {
          return '请提供两个名字参数。\n示例：【cp宇宙生成器 用户1 用户2】';
        }

        // cp短打
        if (session.subtype === 'cp短打生成器') {
          const randomText = getRandomText(cpddData);
          const textWithNames = randomText.text.replace(/<g>/g, user1).replace(/<s>/g, user2);
          return textWithNames;
        }


        // 名字长度
        if (user1.length > 6 || user2.length > 6) {
          return '名字最长只能6个字符哦~';
        }

        // API
        const apiURL = config.imageMode ?
          `https://api.xingzhige.com/API/cp_generate_2/?name1=${encodeURIComponent(user1)}&name2=${encodeURIComponent(user2)}&data=img` :
          `https://api.xingzhige.com/API/cp_generate_2/?name1=${encodeURIComponent(user1)}&name2=${encodeURIComponent(user2)}&data=json`;

 
        try {
          const response = await ctx.http.get(apiURL);

  
          if (config.imageMode) {
            return koishi.h.image(apiURL);
          } else {
            if (response.data && response.data.code === 0) {
              const data = response.data.data;
              return `${data.peopleA} X ${data.peopleB}\n此次抵达的是\n"${data.universeName}"\n
                      ---------------------\n
                      宇宙人设是\n
                      "${data.personaA}" ** X ** "${data.personaB}"\n
                      ----------------------\n
                      ${data.content}`;
            } else {
              throw new Error(`API Error: ${response.data.msg}`);
            }
          }
        } catch (error) {
          logger.error('Error fetching content from cp_generate API:', error);
          return '获取内容失败，请稍后再试。';
        }
      });
  },
  Config: exports.Config,
};

function getRandomText(cpddData) {
  const index = Math.floor(Math.random() * cpddData.length);
  return cpddData[index];
}


function extractName(input, regex) {
  if (input.match(regex)) {
    const match = regex.exec(input);
    return match[1]; 
  }
  return input; 
}