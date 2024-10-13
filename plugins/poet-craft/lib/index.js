"use strict";
const koishi = require("koishi");
const logger = new koishi.Logger('poet-craft');
exports.name = 'poet-craft';
exports.usage = 'poet-craft ';


async function apply(ctx) {
      ctx.command('赛博作诗')
      ctx.command('赛博作诗/意境作词 <subject_headings...>')
        .action(async ({ session }, subject_headings) => {

          if (!subject_headings || subject_headings.length === 0) {
            await session.send('请输入至少一个主题词哦\~');
            return;
          }

          await session.send('正在作诗中...请耐心等待~');

          const prompt = Array.isArray(subject_headings) ? subject_headings.join(',') : subject_headings;

          const url = `https://api.pearktrue.cn/api/aipoem/?prompt=${prompt}`;

          try {
            const response = await ctx.http(url);
            if (response.status === 200 && response.data.code === 200) {
              let poem = response.data.data.join('\n');
              poem += `\n\n您输入的主旨词为\n{${prompt}}`;
              await session.send(poem);
            } else {
              await session.send('作诗失败，接口不好使呢~请过会再重试吧~');
            }
          } catch (error) {
            logger.error(error);
            await session.send('作诗失败，接口不好使呢~请过会再重试吧~');
          }
        });



      ctx.command('赛博作诗/五言藏头诗 <文本>')
        .action(async ({ session }, text) => {
          if (!text || text.length === 0) {
            await session.send('请输入至少五个中文字符哦\~');
            return;
          }
          await generatePoem(session, 'wuyan', 'head', text);
        });


      ctx.command('赛博作诗/七言藏头诗 <文本>')
        .action(async ({ session }, text) => {
          if (!text || text.length === 0) {
            await session.send('请输入至少七个中文字符哦\~');
            return;
          }
          await generatePoem(session, 'qiyan', 'head', text);
        });


      ctx.command('赛博作诗/五言藏尾诗 <文本>')
        .action(async ({ session }, text) => {
          if (!text || text.length === 0) {
            await session.send('请输入至少五个中文字符哦\~');
            return;
          }
          await generatePoem(session, 'wuyan', 'trail', text);
        });


      ctx.command('赛博作诗/七言藏尾诗 <文本>')
        .action(async ({ session }, text) => {
          if (!text || text.length === 0) {
            await session.send('请输入至少七个中文字符哦\~');
            return;
          }
          await generatePoem(session, 'qiyan', 'trail', text);
        });


      async function generatePoem(session, type, model, text) {
        await session.send('作诗作诗咯\~');
        const prompt = text.split(/\s+/).join(',');
        const url = `https://api.pearktrue.cn/api/poem_generate/?type=${type}&model=${model}&text=${prompt}`;
        try {
          const response = await ctx.http.get(url);
          if (response.code === 200) {
            const poem = response.data.result.join('\n');
            await session.send(`=========\n${poem}\n=========\n关键词{${text}}\n格式：${type === 'wuyan' ? '五言' : '七言'}${model === 'head' ? '藏头诗' : '藏尾诗'}`);
          } else {
            await session.send('生成失败，接口不好使呢\~请过会再重试吧\~');
          }
        } catch (error) {
          logger.error(error);
          await session.send('生成失败，接口不好使呢\~请过会再重试吧\~');
        }
      }
}
exports.apply = apply;