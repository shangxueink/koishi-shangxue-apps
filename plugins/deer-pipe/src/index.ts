import { Context, Schema, h, Tables } from 'koishi';
import { } from 'koishi-plugin-puppeteer';
import { } from 'koishi-plugin-monetary'
export const name = 'deer-pipe';

export interface Config {
  calendarimage: any;
  currency: string;
  Reset_Cycle: string;
  //enable_use_key_to_help: boolean;
  cost: any;
  maximum_times_per_day: any;
  enable_blue_tip: any;
  enable_allchannel: any;
  enable_deerpipe: boolean;
  leaderboard_people_number: number;
  loggerinfo: boolean;
}

export const usage = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Deer Pipe 插件使用指南</title>
</head>
<body>

<h1>Deer Pipe 插件使用指南</h1>
<h2><a href="https://www.npmjs.com/package/koishi-plugin-deer-pipe" target="_blank">点我查看README</a></h2>
<details>
<summary>详细的配置项功能列表 </summary>
<h3>签到</h3>
<ul>
<li><strong>指令</strong>: <code>🦌 [艾特用户]</code> 或 <code>鹿管 [艾特用户]</code></li>
<li><strong>作用</strong>: 签到当天，可重复签到，默认上限五次。</li>
<li><strong>示例</strong>: <code>🦌</code>（自己签到） / <code>🦌 @猫猫</code>（帮他鹿）</li>
</ul>


<h3>允许/禁止被鹿</h3>
<ul>
<li><strong>指令</strong>: <code>戴锁</code> 或 <code>脱锁</code></li>
<li><strong>作用</strong>: 允许/禁止别人帮你鹿</li>
<li><strong>示例</strong>: <code>戴锁</code> / <code>脱锁</code></li>
</ul>

<h3>查看签到日历</h3>
<ul>
<li><strong>指令</strong>: <code>看看日历 [艾特用户]</code> 或 <code>查看日历 [艾特用户]</code></li>
<li><strong>作用</strong>: 查看自己或指定用户的签到日历。</li>
<li><strong>示例</strong>: <code>看看日历</code>（查看自己的日历） / <code>看看日历 @猫猫</code>（查看猫猫的日历）</li>
</ul>

<h3>查看排行榜</h3>
<ul>
<li><strong>指令</strong>: <code>鹿管排行榜</code> 或 <code>🦌榜</code></li>
<li><strong>作用</strong>: 查看谁签到最多。</li>
<li><strong>示例</strong>: <code>鹿管排行榜</code></li>
</ul>

<h3>补签</h3>
<ul>
<li><strong>指令</strong>: <code>补🦌 [日期]</code></li>
<li><strong>作用</strong>: 补签到指定日期。例如补签当月的15号。</li>
<li><strong>示例</strong>: <code>补🦌 15</code></li>
</ul>

<h3>取消签到</h3>
<ul>
<li><strong>指令</strong>: <code>戒🦌 [日期]</code></li>
<li><strong>作用</strong>: 取消某天的签到。例如取消签到当月的10号。</li>
<li><strong>示例</strong>: <code>戒🦌 10</code> （若省略<code>10</code>，会取消签到今天的）</li>
</ul>

<h3>购买</h3>
<ul>
<li><strong>指令</strong>: <code>购买</code></li>
<li><strong>作用</strong>: 用于买道具。</li>
<li><strong>示例</strong>: <code>购买 锁</code> 、 <code>购买 钥匙</code></li>

锁可以禁止别人帮你鹿，钥匙可以强制鹿戴锁的人

(暂时就这两个道具 有想法从上面的【问题反馈】提)
</ul>

</details>

---

本插件理想的艾特元素内容是<code>< at id="114514" name="这是名字"/></code>

如果你的适配器的艾特元素是<code>< at id="114514"/></code> 那么排行榜功能就会出现用户ID的内容。

这个时候只需要让用户自己签到一次即可恢复，并且在不同的群签到，会存为对应的用户名称。

---

不支持QQ官方机器人是因为无法收到<code>< at id="ABCDEFG"/></code> 的消息元素
</body>
</html>
`;

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    enable_deerpipe: Schema.boolean().description('开启后，允许重复签到<br>关闭后就没有重复签到的玩法').default(false),
    maximum_times_per_day: Schema.number().description('每日签到次数上限`小鹿怡..什么伤身来着`').default(3).min(2),
    enable_blue_tip: Schema.boolean().description('开启后，签到后会返回补签玩法提示').default(false),
    //enable_use_key_to_help: Schema.boolean().description('开启后，允许使用【钥匙】强制开锁').default(true),
  }).description('签到设置'),
  Schema.object({
    leaderboard_people_number: Schema.number().description('签到次数·排行榜显示人数').default(15).min(3),
    enable_allchannel: Schema.boolean().description('开启后，排行榜将展示全部用户排名`关闭则仅展示当前频道的用户排名`').default(false),
    Reset_Cycle: Schema.union(['每月', '不重置']).default("每月").description("签到数据重置周期。（相当于重新开始排名）"),
  }).description('签到次数·排行榜设置'),
  Schema.object({
    currency: Schema.string().default('deerpipe').description('monetary 的 currency 字段'),
    cost: Schema.object({

      checkin_reward: Schema.array(Schema.object({
        command: Schema.union(['戴锁', '鹿', '补鹿', '戒鹿', '帮鹿']).description("交互指令"),
        cost: Schema.number().description("货币变动"),
      })).role('table').description('【获取硬币】本插件指令的货币变动').default([{ "command": "鹿", "cost": 100 }, { "command": "帮鹿", "cost": 200 }, { "command": "戴锁", "cost": 0 }, { "command": "补鹿", "cost": -100 }, { "command": "戒鹿", "cost": -100 }]),

      store_item: Schema.array(Schema.object({
        item: Schema.string().description("物品名称"),
        cost: Schema.number().description("货币变动"),
      })).role('table').default([{ "item": "锁", "cost": -50 }, { "item": "钥匙", "cost": -250 }]).description('【购买】商店道具货价表'),

    }).collapse().description('货币平衡设置<br>涉及游戏平衡，谨慎修改'),
  }).description('monetary·通用货币设置'),
  Schema.object({
    calendarimage: Schema.string().role('textarea', { rows: [4, 8] }).default('data:image/png;base64,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')
      .description('日历的每日图像（填入图片的base64编码）<br>可以[参考readme](https://www.npmjs.com/package/koishi-plugin-deer-pipe)'),
    loggerinfo: Schema.boolean().description('debug日志输出模式').default(false),
  }).description('调试设置'),
]);
interface DeerPipeTable {
  userid: string;
  username: string;
  channelId: string;
  recordtime: string;
  checkindate: string[];
  totaltimes: number;
  //resigntimes: number;
  allowHelp: boolean;
  itemInventory: string[];
}

declare module 'koishi' {
  interface Tables {
    deerpipe: DeerPipeTable;
  }
}

export const inject = ['database', 'puppeteer', 'monetary'];

export function apply(ctx: Context, config: Config) {
  ctx.model.extend('deerpipe', {
    userid: 'string', // 用户ID
    username: 'string', // 名字。用于排行榜
    channelId: 'string', // 频道ID，用于排行榜
    recordtime: 'string', // 最新签到的年月，用于记录更新
    allowHelp: 'boolean', // 是否允许被别人帮助签到，默认为 true
    checkindate: 'list', // 当前月份的签到的日期号
    // resigntimes: 'integer', // 剩余的补签次数，限制用户补签  // 不需要了，改为使用点数。
    totaltimes: 'integer', // 鹿管签到总次数。用于排行榜
    itemInventory: 'list',    // 道具清单，记录该玩家拥有的道具
  }, {
    primary: ['userid'],
  });

  const zh_CN_default = {
    commands: {
      "戴锁": {
        description: "允许/禁止别人帮你鹿",
        messages: {
          "tip": "你已经{0}别人帮助你签到。",
          "notfound": "用户未找到，请先进行签到。",
          "no_item": "你没有道具【锁】，无法执行此操作。\n请使用指令：购买 锁",
          "no_balance": "余额不足，无法执行此操作。当前余额为 {0}。",
          "successtip": "操作成功！{0}别人帮你鹿，消耗道具【锁】，当前余额为 {1}。",
        }
      },
      "鹿": {
        description: "鹿管签到",
        messages: {
          "Already_signed_in": "今天已经签过到了，请明天再来签到吧~",
          "Help_sign_in": "你成功帮助 {0} 签到！获得 {1} 点货币。",
          "invalid_input_user": "请艾特指定用户。\n示例： 🦌  @用户",
          "invalid_userid": "不可用的用户，请换一个用户帮他签到吧~",
          "enable_blue_tip": "还可以帮助未签到的人签到，以获取补签次数哦！\n使用示例： 鹿  @用户",
          "Sign_in_success": "你已经签到{0}次啦~ 继续加油咪~\n本次签到获得 {1} 点货币。",
          "not_allowHelp": "该用户已禁止他人帮助签到。",
          "use_key_to_help": "你使用了一个【钥匙】打开了{0}的锁！"
        }
      },
      "看鹿": {
        description: "查看用户签到日历",
        messages: {
          "invalid_input_user": "请艾特指定用户。\n示例： 🦌  @用户",
          "invalid_userid": "不可用的用户，请换一个用户帮他签到吧~",
          "notfound": "未找到该用户的签到记录。",
          "balance": "你当前的货币点数余额为：{0}"
        }
      },
      "鹿管排行榜": {
        description: "查看签到排行榜",
        messages: {
          //"Leaderboard_title": "{0}月鹿管排行榜"
        }
      },
      "补鹿": {
        description: "补签某日",
        messages: {
          "No_record": "暂无你的签到记录哦，快去签到吧~",
          "invalid_day": "日期不正确，请输入有效的日期。\n示例： 补🦌  1",
          "Already_resigned": "你已经补签过{0}号了。",
          "Resign_success": "你已成功补签{0}号。点数变化：{1}",
          "Insufficient_balance": "货币点数不足。快去帮别人签到获取点数吧",
          "maximum_times_per_day": "{0}号的签到次数已经达到上限 {1} 次，请换别的日期补签吧\~"
        }
      },
      "戒鹿": {
        description: "取消某日签到",
        messages: {
          //"Cancel_sign_in_confirm": "你确定要取消{0}号的签到吗？请再次输入命令确认。",
          "invalid_day": "日期不正确，请输入有效的日期。\n示例： 戒🦌  1",
          "Cancel_sign_in_success": "你已成功取消{0}号的签到。点数变化：{1}",
          "No_sign_in": "你没有在{0}号签到。"
        }
      }
    }
  };

  ctx.i18n.define("zh-CN", zh_CN_default);

  ctx.command('deerpipe', '鹿管签到')

  ctx.command('deerpipe/购买 [item]', '购买签到道具', { authority: 1 })
    .userFields(["id"])
    .action(async ({ session }, item) => {
      const userId = session.userId;
      const storeItems = config.cost.store_item; // 从配置中获取商店商品列表
      const targetItem = storeItems.find(i => i.item === item);

      if (!targetItem) {
        const availableItems = storeItems.map(i => `${i.item}（${i.cost}点）`).join('\n');
        await session.send(`未找到商品：${item}，你可以购买以下商品：\n${availableItems}`);
        return;
      }

      const { cost } = targetItem;

      // 获取用户余额
      const balance = await getUserCurrency(ctx, session.user.id);
      if (balance < Math.abs(cost)) {
        await session.send(`余额不足，无法购买 ${item}，当前余额为 ${balance}。`);
        return;
      }

      try {
        // 执行货币扣除
        await updateUserCurrency(ctx, session.user.id, cost);

        // 检查用户记录是否存在
        let [userRecord] = await ctx.database.get('deerpipe', { userid: userId });
        if (!userRecord) {
          // 初始化用户记录
          userRecord = {
            userid: userId,
            username: session.username,
            channelId: session.channelId,
            recordtime: '',
            checkindate: [],
            totaltimes: 0,
            allowHelp: true,
            itemInventory: [item], // 添加购买的物品
          };
          await ctx.database.create('deerpipe', userRecord);
        } else {
          // 如果用户记录存在，更新道具清单
          if (!userRecord.itemInventory) {
            userRecord.itemInventory = []; // 避免 itemInventory 为 null
          }
          userRecord.itemInventory.push(item);
          await ctx.database.set('deerpipe', { userid: userId }, { itemInventory: userRecord.itemInventory });
        }

        // 返回购买成功的提示和余额信息
        const newBalance = balance - Math.abs(cost);
        await session.send(`购买成功！已购买 ${item}，剩余点数为 ${newBalance}。`);

      } catch (error) {
        ctx.logger.error(`用户 ${userId} 购买 ${item} 时出错: ${error}`);
        await session.send(`购买 ${item} 时出现问题，请稍后再试。`);
      }
    });

  ctx.command('deerpipe/戴锁', '允许/禁止别人帮你鹿', { authority: 1 })
    .alias('脱锁')
    .alias('带锁')
    .userFields(["id"])
    .action(async ({ session }) => {
      const userId = session.userId;
      const [user] = await ctx.database.get('deerpipe', { userid: userId });

      if (!user) {
        await session.send(session.text(`.notfound`));
        return;
      }


      if (!user.itemInventory || !user.itemInventory.includes('锁')) {
        await session.send(session.text('.no_item'));
        return;
      }

      const cost = config.cost.checkin_reward.find(c => c.command === '戴锁').cost;

      const balance = await getUserCurrency(ctx, session.user.id);
      if (balance + cost < 0) {
        await session.send(session.text(`.no_balance`, [balance]));
        return;
      }

      user.allowHelp = !user.allowHelp;
      await ctx.database.set('deerpipe', { userid: userId }, { allowHelp: user.allowHelp });
      const status = user.allowHelp ? '允许' : '禁止';

      const index = user.itemInventory.indexOf('锁');
      if (index !== -1) {
        user.itemInventory.splice(index, 1);
      }
      await ctx.database.set('deerpipe', { userid: userId }, { itemInventory: user.itemInventory });

      await updateUserCurrency(ctx, session.user.id, cost);

      await session.send(session.text(`.successtip`, [status, balance + cost]));
    });

  //看看日历
  ctx.command('deerpipe/看鹿 [user]', '查看用户签到日历', { authority: 1 })
    .alias('看🦌')
    .alias('看看日历')
    .userFields(["id"])
    .example('看鹿  @用户')
    .action(async ({ session }, user) => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      let targetUserId = session.userId;
      let targetUsername = session.username;
      if (user) {
        const parsedUser = h.parse(user)[0];
        if (parsedUser?.type === 'at') {
          const { id, name } = parsedUser.attrs;
          if (!id) {
            await session.send(session.text('.invalid_userid'));
            return;
          }

          targetUserId = id;
          targetUsername = name || targetUserId;
        } else {
          await session.send(session.text('.invalid_input_user'));
          return;
        }
      }

      const [targetRecord] = await ctx.database.get('deerpipe', { userid: targetUserId });
      if (!targetRecord) {
        await session.send('未找到该用户的签到记录。');
        return;
      }
      // 获取用户余额
      const balance = await getUserCurrency(ctx, session.user.id);
      const imgBuf = await renderSignInCalendar(ctx, targetUserId, targetUsername, currentYear, currentMonth);
      const calendarImage = h.image(imgBuf, 'image/png');
      await session.send(h.text(session.text(`.balance`, [balance])));
      await session.send(calendarImage);
    });


  ctx.command('deerpipe/鹿 [user]', '鹿管签到', { authority: 1 })
    .alias('🦌')
    .userFields(["id"])
    .example('鹿  @用户')
    .action(async ({ session }, user) => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const currentDay = currentDate.getDate();
      const recordtime = `${currentYear}-${currentMonth}`;
      const cost = config.cost.checkin_reward.find(c => c.command === '鹿').cost;
      let targetUserId = session.userId;
      let targetUsername = session.username;

      if (user) {
        const parsedUser = h.parse(user)[0];
        if (parsedUser?.type === 'at') {
          const { id, name } = parsedUser.attrs;
          if (!id) {
            await session.send(session.text('.invalid_userid'));
            return;
          }

          targetUserId = id;
          targetUsername = name || id;
        } else {
          await session.send(session.text('.invalid_input_user'));
          return;
        }
      }

      // 获取目标用户的签到记录
      let [targetRecord] = await ctx.database.get('deerpipe', { userid: targetUserId });

      // 检查是否需要重置数据
      if (targetRecord && config.Reset_Cycle === '每月') {
        const [recordYear, recordMonth] = targetRecord.recordtime.split('-').map(Number);
        if (currentYear > recordYear || (currentYear === recordYear && currentMonth > recordMonth)) {
          // 重置用户数据
          targetRecord = {
            userid: targetUserId,
            username: targetUsername,
            channelId: session.channelId,
            recordtime,
            checkindate: [],
            totaltimes: 0,
            allowHelp: true,
            itemInventory: [],
          };
          await ctx.database.set('deerpipe', { userid: targetUserId }, targetRecord);
        }
      }

      if (!targetRecord) {
        targetRecord = {
          userid: targetUserId,
          username: targetUsername,
          channelId: session.channelId,
          recordtime,
          checkindate: [`${currentDay}=1`],
          totaltimes: 1,
          allowHelp: true,
          itemInventory: [],
        };
        await ctx.database.create('deerpipe', targetRecord);
      } else {
        const has_user_name = user && h.parse(user)[0]?.attrs?.name;
        if (has_user_name) {
          targetRecord.username = targetUsername;
        }

        if (targetRecord.recordtime !== recordtime) {
          targetRecord.recordtime = recordtime;
          targetRecord.checkindate = [];
        }

        const dayRecordIndex = targetRecord.checkindate.findIndex(date => date.startsWith(`${currentDay}`));
        let dayRecord = dayRecordIndex !== -1 ? targetRecord.checkindate[dayRecordIndex] : `${currentDay}=0`;
        const [day, count] = dayRecord.includes('=') ? dayRecord.split('=') : [dayRecord, '1'];

        const currentSignInCount = parseInt(count) || 0;

        if (currentSignInCount >= config.maximum_times_per_day) {
          await session.send(`今天的签到次数已经达到上限 ${config.maximum_times_per_day} 次，请明天再来签到吧~`);
          return;
        }
        const newCount = currentSignInCount + 1;

        if (config.enable_deerpipe || newCount === 1) {
          if (dayRecordIndex !== -1) {
            targetRecord.checkindate[dayRecordIndex] = `${day}=${newCount}`;
          } else {
            targetRecord.checkindate.push(`${day}=${newCount}`);
          }
          targetRecord.totaltimes += 1;
        }

        await ctx.database.set('deerpipe', { userid: targetUserId }, {
          username: targetUsername,
          checkindate: targetRecord.checkindate,
          totaltimes: targetRecord.totaltimes,
          recordtime: targetRecord.recordtime,
        });

        if (!config.enable_deerpipe && newCount > 1) {
          const imgBuf = await renderSignInCalendar(ctx, targetUserId, targetUsername, currentYear, currentMonth);
          const calendarImage = h.image(imgBuf, 'image/png');
          if (config.enable_blue_tip) {
            await session.send(calendarImage + `<p>` + session.text('.Already_signed_in') + session.text('.enable_blue_tip')); // + `<p>`
          } else {
            await session.send(calendarImage + `<p>` + session.text('.Already_signed_in'));
          }
          return;
        }
      }

      // 检查目标用户是否允许别人帮助签到
      if (targetUserId !== session.userId) {
        let [helperRecord] = await ctx.database.get('deerpipe', { userid: session.userId });

        if (!helperRecord) {
          helperRecord = {
            userid: session.userId,
            username: session.username,
            channelId: session.channelId,
            recordtime,
            checkindate: [],
            totaltimes: 0,
            allowHelp: true,
            itemInventory: [],
          };
          await ctx.database.create('deerpipe', helperRecord);
        }

        if (!targetRecord.allowHelp) {
          const hasKey = helperRecord.itemInventory.includes('钥匙');
          if (hasKey) { // && config.enable_use_key_to_help
            const keyIndex = helperRecord.itemInventory.indexOf('钥匙');
            if (keyIndex !== -1) {
              helperRecord.itemInventory.splice(keyIndex, 1);
              await ctx.database.set('deerpipe', { userid: session.userId }, {
                itemInventory: helperRecord.itemInventory,
              });
              await session.send(session.text('.use_key_to_help', [targetUserId]));
            }
          } else {
            await session.send(session.text('.not_allowHelp'));
            return;
          }
        }

        const reward = cost * 1.5;
        await updateUserCurrency(ctx, session.user.id, reward);
        await session.send(`${h.at(session.userId)} ${session.text('.Help_sign_in', [targetUserId, reward])}`);
      }

      const imgBuf = await renderSignInCalendar(ctx, targetUserId, targetUsername, currentYear, currentMonth);
      const calendarImage = h.image(imgBuf, 'image/png');
      await updateUserCurrency(ctx, session.user.id, cost);
      if (config.enable_blue_tip) {
        await session.send(calendarImage + `<p>` + h.at(targetUserId) + `<p>` + session.text('.Sign_in_success', [targetRecord.totaltimes, cost]) + session.text('.enable_blue_tip'));
      } else {
        await session.send(calendarImage + `<p>` + h.at(targetUserId) + `<p>` + session.text('.Sign_in_success', [targetRecord.totaltimes, cost]));
      }
      return;
    });

  ctx.command('deerpipe/鹿管排行榜', '查看签到排行榜', { authority: 1 })
    .alias('🦌榜')
    .alias('鹿榜')
    .action(async ({ session }) => {
      const enableAllChannel = config.enable_allchannel;
      const query = enableAllChannel ? {} : { channelId: session.channelId };
      const records = await ctx.database.get('deerpipe', query);

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const currentRecordtime = `${currentYear}-${currentMonth}`;

      records.forEach(record => {
        if (record.recordtime !== currentRecordtime) {
          record.recordtime = currentRecordtime;
          record.checkindate = [];
        }
      });

      const sortedRecords = records.sort((a, b) => b.totaltimes - a.totaltimes);
      const topRecords = sortedRecords.slice(0, config.leaderboard_people_number);

      const rankData = topRecords.map((record, index) => ({
        order: index + 1,
        card: record.username,
        sum: record.totaltimes,
      }));

      const leaderboardHTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>鹿管排行榜</title>
<style>
body {
font-family: 'Microsoft YaHei', Arial, sans-serif;
background-color: #f0f4f8;
margin: 0;
padding: 20px;
display: flex;
justify-content: center;
align-items: flex-start;
}
.container {
background-color: white;
border-radius: 10px;
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
padding: 30px;
width: 100%;
max-width: 500px;
}
h1 {
text-align: center;
color: #2c3e50;
margin-bottom: 30px;
font-size: 28px;
}
.ranking-list {
list-style-type: none;
padding: 0;
margin: 0;
}
.ranking-item {
display: flex;
align-items: center;
padding: 15px 10px;
border-bottom: 1px solid #ecf0f1;
transition: background-color 0.3s;
}
.ranking-item:hover {
background-color: #f8f9fa;
}
.ranking-number {
font-size: 18px;
font-weight: bold;
margin-right: 15px;
min-width: 30px;
color: #7f8c8d;
}
.medal {
font-size: 24px;
margin-right: 15px;
}
.name {
flex-grow: 1;
font-size: 18px;
}
.count {
font-weight: bold;
color: #e74c3c;
font-size: 18px;
}
.count::after {
content: ' 次';
font-size: 14px;
color: #95a5a6;
}
</style>
</head>
<body>
<div class="container">
<h1>🦌 ${currentMonth}月鹿管排行榜 🦌</h1>
<ol class="ranking-list">
${rankData.map(deer => `
<li class="ranking-item">
<span class="ranking-number">${deer.order}</span>
${deer.order === 1 ? '<span class="medal">🥇</span>' : ''}
${deer.order === 2 ? '<span class="medal">🥈</span>' : ''}
${deer.order === 3 ? '<span class="medal">🥉</span>' : ''}
<span class="name">${deer.card}</span>
<span class="count">${deer.sum}</span>
</li>
`).join('')}
</ol>
</div>
</body>
</html>
`;

      const page = await ctx.puppeteer.page();
      await page.setContent(leaderboardHTML, { waitUntil: 'networkidle2' });
      const leaderboardElement = await page.$('.container');


      const boundingBox = await leaderboardElement.boundingBox();
      await page.setViewport({
        width: Math.ceil(boundingBox.width),
        height: Math.ceil(boundingBox.height),
      });

      const imgBuf = await leaderboardElement.screenshot({ captureBeyondViewport: false });
      const leaderboardImage = h.image(imgBuf, 'image/png');

      await page.close();

      await session.send(leaderboardImage);
      return;
    });

  ctx.command('deerpipe/补鹿 <day>', '补签某日', { authority: 1 })
    .alias('补🦌')
    .userFields(["id"])
    .example('补🦌  1')
    .action(async ({ session }, day: string) => {
      const dayNum = parseInt(day, 10);
      const cost = config.cost.checkin_reward.find(c => c.command === '补鹿').cost;
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const currentDay = currentDate.getDate();
      const recordtime = `${currentYear}-${currentMonth}`;

      // 校验输入日期
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 31 || dayNum > currentDay) {
        await session.send(session.text('.invalid_day'));
        return;
      }

      // 获取用户记录
      let [record] = await ctx.database.get('deerpipe', { userid: session.userId });
      if (!record) {
        await session.send(session.text('.No_record'));
        return;
      }

      // 获取用户余额
      const balance = await getUserCurrency(ctx, session.user.id);
      if (balance < Math.abs(cost)) {
        await session.send(session.text('.Insufficient_balance'));
        return;
      }

      // 更新用户名
      const username = session.username;
      if (record.username !== username) {
        record.username = username;
      }

      // 更严格的日期匹配逻辑，确保找到确切的 dayNum
      const dayRecordIndex = record.checkindate.findIndex(date => {
        const [dayStr] = date.split('=');
        return parseInt(dayStr, 10) === dayNum;
      });

      let dayRecord = dayRecordIndex !== -1 ? record.checkindate[dayRecordIndex] : `${dayNum}=0`;
      const [dayStr, count] = dayRecord.includes('=') ? dayRecord.split('=') : [dayRecord, '0'];
      const currentSignInCount = parseInt(count) || 0; // 当前当天签到次数

      // 检查是否超过签到次数上限
      if (currentSignInCount >= config.maximum_times_per_day) {
        await session.send(session.text('.maximum_times_per_day', [dayStr, config.maximum_times_per_day]));
        return;
      }

      // 更新签到次数
      let newCount = currentSignInCount + 1;
      if (dayRecordIndex !== -1 && !config.enable_deerpipe && currentSignInCount > 0) {
        await session.send(`${h.at(session.userId)} ${session.text('.Already_resigned', [dayNum])}`);
        return;
      }

      // 更新或插入签到记录
      if (dayRecordIndex !== -1) {
        record.checkindate[dayRecordIndex] = `${dayStr}=${newCount}`;
      } else {
        record.checkindate.push(`${dayNum}=1`);
      }

      // 更新总签到次数
      record.totaltimes += 1;

      // 执行货币扣除
      await updateUserCurrency(ctx, session.user.id, cost);

      // 更新数据库
      await ctx.database.set('deerpipe', { userid: session.userId }, {
        username: record.username,
        checkindate: record.checkindate,
        totaltimes: record.totaltimes,
      });

      // 渲染签到日历
      const imgBuf = await renderSignInCalendar(ctx, session.userId, username, currentYear, currentMonth);
      const calendarImage = h.image(imgBuf, 'image/png');

      // 发送签到成功信息
      await session.send(calendarImage + `<p>` + h.at(session.userId) + `<p>` + session.text('.Resign_success', [dayNum, cost]));
      return;
    });

  ctx.command('deerpipe/戒鹿 [day]', '取消某日签到', { authority: 1 })
    .alias('戒🦌')
    .alias('寸止')
    .userFields(["id"])
    .example('戒🦌  1')
    .action(async ({ session }, day?: string) => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const currentDay = currentDate.getDate();
      const recordtime = `${currentYear}-${currentMonth}`;

      const dayNum = day ? parseInt(day, 10) : currentDay;
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 31 || dayNum > currentDay) {
        await session.send(session.text('.invalid_day'));
        return;
      }

      let [record] = await ctx.database.get('deerpipe', { userid: session.userId });

      if (record) {
        // 更新用户名
        const username = session.username;
        if (record.username !== username) {
          record.username = username;
        }

        // 查找并更新签到记录
        const dayRecordIndex = record.checkindate.findIndex(date => date.startsWith(`${dayNum}`));
        if (dayRecordIndex !== -1) {
          const [dayStr, count] = record.checkindate[dayRecordIndex].split('=');
          let newCount = (parseInt(count) || 0) - 1;

          if (newCount > 0) {
            record.checkindate[dayRecordIndex] = `${dayStr}=${newCount}`;
          } else {
            record.checkindate.splice(dayRecordIndex, 1);
          }

          record.totaltimes -= 1;

          // 从配置中获取取消签到的奖励或费用
          const cost = config.cost.checkin_reward.find(c => c.command === '戒鹿').cost;

          // 更新用户货币
          await updateUserCurrency(ctx, session.user.id, cost);

          await ctx.database.set('deerpipe', { userid: session.userId }, {
            username: record.username,
            checkindate: record.checkindate,
            totaltimes: record.totaltimes,
            recordtime: record.recordtime,
          });

          const imgBuf = await renderSignInCalendar(ctx, session.userId, username, currentYear, currentMonth);
          const calendarImage = h.image(imgBuf, 'image/png');
          await session.send(calendarImage + `<p>` + h.at(session.userId) + `<p>` + session.text('.Cancel_sign_in_success', [dayNum, cost]));

        } else {
          await session.send(`${h.at(session.userId)} ${session.text('.No_sign_in', [dayNum])}`);
        }
      } else {
        await session.send(`${h.at(session.userId)} ${session.text('.No_sign_in', [dayNum])}`);
      }
    });


  function loggerinfo(message) {
    if (config.loggerinfo) {
      ctx.logger.info(message);
    }
  }

  async function updateUserCurrency(ctx: Context, uid, amount: number, currency: string = config.currency) {
    try {
      const numericUserId = Number(uid); // 将 userId 转换为数字类型

      //  通过 ctx.monetary.gain 为用户增加货币，
      //  或者使用相应的 ctx.monetary.cost 来减少货币
      if (amount > 0) {
        await ctx.monetary.gain(numericUserId, amount, currency);
        loggerinfo(`为用户 ${uid} 增加了 ${amount} ${currency}`);
      } else if (amount < 0) {
        await ctx.monetary.cost(numericUserId, -amount, currency);
        loggerinfo(`为用户 ${uid} 减少了 ${-amount} ${currency}`);
      }

      return `用户 ${uid} 成功更新了 ${Math.abs(amount)} ${currency}`;
    } catch (error) {
      ctx.logger.error(`更新用户 ${uid} 的货币时出错: ${error}`);
      return `更新用户 ${uid} 的货币时出现问题。`;
    }
  }
  async function getUserCurrency(ctx, uid, currency = config.currency) {
    try {
      const numericUserId = Number(uid);
      const [data] = await ctx.database.get('monetary', {
        uid: numericUserId,
        currency,
      }, ['value']);

      return data ? data.value : 0;
    } catch (error) {
      ctx.logger.error(`获取用户 ${uid} 的货币时出错: ${error}`);
      return 0; // Return 0 
    }
  }

  async function renderSignInCalendar(ctx: Context, userId: string, username: string, year: number, month: number): Promise<Buffer> {
    const [record] = await ctx.database.get('deerpipe', { userid: userId });
    const checkinDates = record?.checkindate || [];

    const calendarDayData = generateCalendarHTML(checkinDates, year, month, username);
    // ../assets/MiSans-Regular.ttf 这个字体，emmm怎么说呢，无所谓了，不要了
    const fullHTML = `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
  <meta charset="UTF-8">
  <title>签到日历</title>
  <style>
  @font-face {
  font-family: 'MiSans';
  src: url('../assets/MiSans-Regular.ttf') format('truetype');
  }
  body {
  font-family: 'MiSans', sans-serif;
  }
  .calendar {
  width: 320px;
  margin: 20px;
  border: 1px solid #ccc;
  padding: 10px;
  box-sizing: border-box;
  }
  .calendar-header {
  font-weight: bold;
  font-size: 18px;
  margin-bottom: 5px;
  text-align: left;
  }
  .calendar-subheader {
  text-align: left;
  margin-bottom: 10px;
  }
  .weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 12px;
  margin-bottom: 5px;
  }
  .calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
  }
  .calendar-day {
  position: relative;
  text-align: center;
  }
  .deer-image {
  width: 100%;
  height: auto;
  }
  .check-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: auto;
  }
  .day-number {
  position: absolute;
  bottom: 2px;
  left: 2px;
  font-size: 14px;
  color: black;
  }
  .multiple-sign {
  position: absolute;
  bottom: -2px;
  right: 0px;
  font-size: 12px;
  color: red;
  font-weight: bold;
  }
  </style>
  </head>
  <body>
  ${calendarDayData}
  </body>
  </html>
  `;

    const page = await ctx.puppeteer.page();
    await page.setContent(fullHTML, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.deer-image');

    const calendarElement = await page.$('.calendar');
    const imgBuf = await calendarElement.screenshot({ captureBeyondViewport: false });

    await page.close();
    return imgBuf;
  }

  function generateCalendarHTML(checkinDates, year, month, username) {
    const daysInMonth = new Date(year, month, 0).getDate();

    let calendarHTML = `
  <div class="calendar">
  <div class="calendar-header">${year}-${month.toString().padStart(2, '0')} 签到</div>
  <div class="calendar-subheader">${username}</div>
  <div class="weekdays">
  <div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div>
  </div>
  <div class="calendar-grid">
  `;

    const startDay = new Date(year, month - 1, 1).getDay();
    for (let i = 0; i < startDay; i++) {
      calendarHTML += `<div></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayRecord = checkinDates.find(date => date.startsWith(`${day}=`) || date === `${day}`);
      const [dayStr, countStr] = dayRecord ? dayRecord.split('=') : [null, null];
      const count = countStr ? parseInt(countStr) : 1;
      const checkedIn = dayRecord !== undefined;

      calendarHTML += `
  <div class="calendar-day">
  <img src="${config.calendarimage}" class="deer-image" alt="Deer">
  ${checkedIn ? `<img src="data:image/png;base64,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" class="check-image" alt="Check">` : ''}
  <div class="day-number">${day}</div>
  ${checkedIn && count > 1 ? `<div class="multiple-sign">×${count}</div>` : ''}
  </div>
  `;
    }

    calendarHTML += `
  </div>
  </div>
  `;

    return calendarHTML;
  }


}

