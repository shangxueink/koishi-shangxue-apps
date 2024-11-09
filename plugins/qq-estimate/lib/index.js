"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.usage = exports.name = void 0;

const { Schema, Logger, h } = require("koishi");

exports.Config = Schema.object({
  loggerinfo: Schema.boolean().default(false).description("日志调试模式`日常使用无需开启`"),
}).description('基础设置').hidden();

exports.usage = `
## 插件使用说明

### 指令一：QQ 估价

- **用法**: 
  在聊天窗口中输入以下命令来估价 QQ 号：
  \`\`\`
  估价 <QQ号>（或者@用户）
  \`\`\`
  
  
- **功能**:
  插件会查询该 QQ 号的相关信息，并返回以下内容：
  - QQ 号的等级
  - 注册天数
  - 估计的 QQ 号价值

- **注意事项**:
  该功能仅供娱乐，估价结果不具备实际参考价值。

### 指令二：注册时间查询

- **用法**:
  在聊天窗口中输入以下命令来查询 QQ 号的注册时间：
  \`\`\`
  注册时间 <QQ号>（或者@用户）
  \`\`\`
  
- **功能**:
  插件会返回该 QQ 号的精确注册时间。

- **注意事项**:
  请确保输入的 QQ 号是有效的数字。
  
## 常见问题

- 请确保网络连接正常。
- 如果遇到问题，请检查 API 的可用性。
`;


async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

async function apply(ctx, config) {
  ctx.command('qq查询', 'qq查询')
  ctx.command('qq查询/估价 [qq:text]', '估价QQ号')
    .action(async ({ session }, input) => {
      const qq = h.parse(input)[0].attrs.id || input;

      // 发送正在估价的消息
      await session.send(`正在为QQ号${qq}估价，请稍候\~\~\~`);

      try {
        // 第一个API请求
        const url1 = `https://www.showdev.me/api/qqbirthday?qq=${qq}`;
        const data1 = await fetchJson(url1);

        if (data1.status === "success") {
          const { nickname, qqLevel } = data1;

          // 如果qqLevel为0，返回提示信息
          if (qqLevel === 0) {
            await session.send('无法查询该用户的QQ等级，请换一个用户试试吧~');
            return;
          }

          // 第二个API请求
          const url2 = `https://api.pearktrue.cn/api/qq/money.php?qq=${qq}&level=${qqLevel}`;
          const data2 = await fetchJson(url2);

          if (data2.code === 200) {
            const { money, day } = data2.data;
            const dayText = day === '天' ? '■未知■' : day;
            let msg = `尊敬的${nickname}(${qq}), \n您的QQ等级为${qqLevel};\n注册天数${dayText};\n估价为${money}。\n\n【仅供娱乐，切勿当真\~】`;

            // 添加估价不准的提示
            if (dayText === '■未知■') {
              msg += '\n\n该QQ的部分信息查不到呢，估价不准哦\~';
            }

            // 发送文字
            await session.send(msg);
          } else {
            await session.send('估价信息获取失败，请稍后重试。');
          }
        } else {
          await session.send(`查不到这个QQ（${qq}）呢！`);
        }
      } catch (error) {
        ctx.logger.error('查询出错:', error);
        await session.send('查询发生错误，请稍后重试。');
      }
    });

  ctx.command('qq查询/注册时间 [qq:text]', '查询QQ号的注册时间')
    .action(async ({ session }, input) => {
      const qq = h.parse(input)[0].attrs.id || input;

      try {
        const url = `https://www.showdev.me/api/qqbirthday?qq=${qq}`;
        const data = await fetchJson(url);

        if (data.status === "success") {
          const { reg_time } = data;
          await session.send(`QQ号${qq}的注册时间为：${reg_time}`);
        } else {
          await session.send(`查不到这个QQ（${qq}）呢！`);
        }
      } catch (error) {
        ctx.logger.error('查询出错:', error);
        await session.send('查询发生错误，请稍后重试。');
      }
    });
}

exports.apply = apply;
