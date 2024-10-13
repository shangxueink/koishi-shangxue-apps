"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.usage = exports.inject = exports.name = void 0;

const koishi = require('koishi');

//exports.logger = new koishi.Logger("qq-estimate");

const logger = new koishi.Logger("qq-estimate");

exports.Config = koishi.Schema.object({
  loggerinfo: koishi.Schema.boolean().default(false).description("日志调试模式`日常使用无需开启`"),
}).description('基础设置');

//
exports.usage = `

1. 在聊天窗口中输入命令，例如：
   \`\`\`
   qq-estimate 1919810
   \`\`\`
   或者
   \`\`\`
   @某某人
   \`\`\`
   （如果某某人是你想要估价的 QQ 号）

2. 插件会返回正在估价的提示信息。

3. 插件会查询 QQ 号的相关信息，并返回以下内容：
   - QQ 号的等级
   - 注册天数
   - 连续登录天数
   - 估计的 QQ 号价值
   - QQ 头像

4. 如果查询失败，插件会提示相关错误信息。


## 注意事项
- 请确保输入的 QQ 号是有效的数字。
- 该插件仅供娱乐，估价结果不具备实际参考价值。
- 在使用过程中，如果遇到任何问题，请检查网络连接和 API 可用性。

`;


async function apply(ctx, config) {
  ctx.command('qq-estimate [qq:text]', '估价QQ号')
    .alias('qq估价')
    .action(async ({ session }, input) => {
      let qq;
      const atRegex = /id="(\d+)"/i;
      const qqRegex = /^\d+$/;
      if (atRegex.test(input)) {
        [, qq] = input.match(atRegex);
      } else if (qqRegex.test(input)) {
        qq = input;
      } else {
        await session.send('请检查您的输入是否正确\~');
        return;
      }

      // 发送正在估价的消息
      await session.send(`正在为QQ号${qq}估价，请稍候\~\~\~`);

      // API获取QQ等级信息
      const url1 = `https://api.suyanw.cn/api/qqinfo.php?qq=${qq}`;
      try {
        const response1 = await ctx.http(url1);
        //if (!response1.ok) throw new Error(`HTTP error! status: ${response1.status}`);
        ////////        logger.error(response1);
        const data1 = await response1.data;
        if (config.loggerinfo) {
          logger.error(data1);
        }

        if (data1.code === 200) {
          const data = data1.data;
          if (!data.avatar) {
            await session.send(`查不到这个QQ（${qq}）呢！`);
            return;
          }
          const sNickName = data.nickname || '暂无昵称';
          const faceUrl = data.avatar;

          // 调用第二个API
          const url2 = `https://api.pearktrue.cn/api/qq/money.php?qq=${qq}&level=${data.level}`;
          const response2 = await ctx.http(url2);
          //if (!response2.ok) throw new Error(`HTTP error! status: ${response2.status}`);
          const data2 = await response2.data;
          if (config.loggerinfo) {
            logger.error(data2);
          }

          if (data2.code === 200) {
            const data2Result = data2.data;
            const dayText = data2Result.day === '天' ? '■未知■' : data2Result.day;
            let msg = `尊敬的${sNickName}(${qq}), \n您的QQ等级为${data.level};\n注册天数${dayText};\n连续登录${data.login_days}天; \n估价为${data2Result.money}。\n\n【仅供娱乐，切勿当真\~】`;

            // 添加估价不准的提示
            if (dayText === '■未知■') {
              msg += '\n\n该QQ的部分信息查不到呢，估价不准哦\~';
            }

            // 发送图片和文字
            const imageSegment = koishi.segment.image(faceUrl);
            await session.send(`${imageSegment}\n${msg}`);
          } else {
            await session.send('估价信息获取失败，请稍后重试。');
          }
        } else {
          await session.send(`查不到这个QQ（${qq}）呢！`);
        }
      } catch (error) {
        logger.error('查询出错:', error);
        await session.send('查询发生错误，请稍后重试。');
      }
    });
}

exports.apply = apply;
