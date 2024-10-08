import { Context, Schema, h, Tables } from 'koishi';
import { } from 'koishi-plugin-puppeteer';

export const name = 'deer-pipe';

export interface Config {
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

<h3>签到</h3>
<ul>
<li><strong>指令</strong>: <code>🦌 [艾特用户]</code> 或 <code>鹿管 [艾特用户]</code></li>
<li><strong>作用</strong>: 签到当天。（推荐在【指令管理】设置每天调用上限）</li>
<li><strong>示例</strong>: <code>🦌</code>（自己签到） / <code>🦌 @猫猫</code>（帮他鹿）</li>
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

</body>
</html>
`;

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    enable_deerpipe: Schema.boolean().description('开启后，重复签到会返回签到日历`关闭就只剩下文字提示了`').default(true),
  }).description('签到设置'),
  Schema.object({
    leaderboard_people_number: Schema.number().description('排行榜显示人数').default(5),
  }).description('排行榜设置'),
  Schema.object({
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
  resigntimes: number;
}

declare module 'koishi' {
  interface Tables {
    deerpipe: DeerPipeTable;
  }
}

export const inject = ['database', 'puppeteer'];

export function apply(ctx: Context, config: Config) {
  ctx.model.extend('deerpipe', {
    userid: 'string', // 用户ID
    username: 'string', // 名字。用于排行榜
    channelId: 'string', // 频道ID，用于排行榜
    recordtime: 'string', // 最新签到的年月，用于记录更新
    checkindate: 'list', // 当前月份的签到的日期号
    resigntimes: 'integer', // 剩余的补签次数，限制用户补签
    totaltimes: 'integer', // 鹿管签到总次数。用于排行榜
  }, {
    primary: ['userid'],
  });

  ctx.command('🦌 [user]', '鹿管签到', { authority: 1 })
    .alias('鹿管')
    .action(async ({ session }, user) => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const currentDay = currentDate.getDate();
      const recordtime = `${currentYear}-${currentMonth}`;
      let targetUserId = session.userId;

      if (user) {
        // 提取目标用户ID
        targetUserId = h.parse(user)[0]?.attrs?.id || user;
      }

      // 获取目标用户的签到记录
      let [targetRecord] = await ctx.database.get('deerpipe', { userid: targetUserId });
      if (!targetRecord) {
        // 如果没有记录，创建新的签到记录
        targetRecord = {
          userid: targetUserId,
          username: targetUserId,
          channelId: session.channelId,
          recordtime,
          checkindate: [currentDay.toString()],
          totaltimes: 1,
          resigntimes: 0,
        };
        await ctx.database.create('deerpipe', targetRecord);
      } else {
        // 如果是新月份，重置签到记录
        if (targetRecord.recordtime !== recordtime) {
          targetRecord.recordtime = recordtime;
          targetRecord.checkindate = [];
        }

        // 检查是否当天已经签到
        if (!targetRecord.checkindate.includes(currentDay.toString())) {
          targetRecord.checkindate.push(currentDay.toString());
          targetRecord.totaltimes += 1;
          await ctx.database.set('deerpipe', { userid: targetUserId }, {
            checkindate: targetRecord.checkindate,
            totaltimes: targetRecord.totaltimes,
            recordtime: targetRecord.recordtime,
          });
        } else {
          // 检查是否允许重复签到
          if (config.enable_deerpipe) {
            // 生成并发送签到日历图像
            const imgBuf = await renderSignInCalendar(ctx, targetUserId, currentYear, currentMonth);
            const calendarImage = h.image(imgBuf, 'image/png');
            await session.send(calendarImage);
          }
          await session.send('今天已经签过到了，请明天再来签到吧\~');
          return;
        }
      }

      // 如果帮助其他用户签到，增加补签机会
      if (targetUserId !== session.userId) {
        ctx.logger.info('判断成功：是邀请别人');

        // 获取帮助者的记录
        let [helperRecord] = await ctx.database.get('deerpipe', { userid: session.userId });
        if (!helperRecord) {
          // 帮助者第一次签到，创建记录并增加补签次数
          helperRecord = {
            userid: session.userId,
            username: session.username,
            channelId: session.channelId,
            recordtime,
            checkindate: [],
            totaltimes: 0,
            resigntimes: 1,
          };
          await ctx.database.create('deerpipe', helperRecord);
        } else {
          // 已经签到过，增加补签次数
          helperRecord.resigntimes += 1;
          await ctx.database.set('deerpipe', { userid: session.userId }, {
            resigntimes: helperRecord.resigntimes,
          });
        }

        // 通知用户获得补签机会
        await session.send(`${h.at(session.userId)} 你成功帮助 ${targetUserId} 签到，并获得了一次补签机会！`);
      }

      // 生成并发送签到日历图像
      const imgBuf = await renderSignInCalendar(ctx, targetUserId, currentYear, currentMonth);
      const calendarImage = h.image(imgBuf, 'image/png');
      await session.send(calendarImage);
      await session.send(`${h.at(targetUserId)} 你已经签到${targetRecord.totaltimes}天啦\~ 继续加油咪\~`);
    });



  ctx.command('鹿管排行榜', '查看签到排行榜', { authority: 1 })
    .alias('🦌榜')
    .action(async ({ session }) => {
      const records = await ctx.database.get('deerpipe', { channelId: session.channelId });
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
align-items: center;
min-height: 100vh;
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
      const imgBuf = await leaderboardElement.screenshot({ captureBeyondViewport: false });
      const leaderboardImage = h.image(imgBuf, 'image/png');

      await page.close();

      await session.send(leaderboardImage);
    });

  ctx.command('补🦌 <day>', '补签某日', { authority: 1 })
    .action(async ({ session }, day: string) => {
      const dayNum = parseInt(day, 10);
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
        await session.send('请输入有效的日期。\n示例： 补🦌  1');
        return
      }

      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const recordtime = `${currentYear}-${currentMonth}`;

      let [record] = await ctx.database.get('deerpipe', { userid: session.userId });

      if (!record || record.resigntimes <= 0) {
        await session.send('你没有补签机会了。');
        return;
      }

      if (record.checkindate.includes(dayNum.toString())) {
        await session.send(`${h.at(session.userId)} 你已经补签过${dayNum}号了。`);
        return;
      }

      record.checkindate.push(dayNum.toString());
      record.totaltimes += 1;
      record.resigntimes -= 1;

      await ctx.database.set('deerpipe', { userid: session.userId }, {
        checkindate: record.checkindate,
        totaltimes: record.totaltimes,
        resigntimes: record.resigntimes,
      });

      const imgBuf = await renderSignInCalendar(ctx, session.userId, currentYear, currentMonth);
      const calendarImage = h.image(imgBuf, 'image/png');

      await session.send(calendarImage);
      await session.send(`${h.at(session.userId)} 你已成功补签${dayNum}号。`);
    });

  ctx.command('戒🦌 [day]', '取消某日签到', { authority: 1 })
    .action(async ({ session }, day?: string) => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const currentDay = currentDate.getDate();
      const recordtime = `${currentYear}-${currentMonth}`;

      const dayNum = day ? parseInt(day, 10) : currentDay;
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
        await session.send('请输入有效的日期。\n示例： 戒🦌  1');
        return;
      }

      let [record] = await ctx.database.get('deerpipe', { userid: session.userId });

      if (record && record.checkindate.includes(dayNum.toString())) {
        if (dayNum !== currentDay) {
          await session.send(`${h.at(session.userId)} 你确定要取消${dayNum}号的签到吗？请再次输入命令确认。`);
          return;
        }

        record.checkindate = record.checkindate.filter(date => date !== dayNum.toString());
        record.totaltimes -= 1;
        await ctx.database.set('deerpipe', { userid: session.userId }, {
          checkindate: record.checkindate,
          totaltimes: record.totaltimes,
          recordtime: record.recordtime,
        });

        const imgBuf = await renderSignInCalendar(ctx, session.userId, currentYear, currentMonth);
        const calendarImage = h.image(imgBuf, 'image/png');

        await session.send(calendarImage);
        await session.send(`${h.at(session.userId)} 你已成功取消${dayNum}号的签到。`);
      } else {
        await session.send(`${h.at(session.userId)} 你没有在${dayNum}号签到。`);
      }
    });
}

async function renderSignInCalendar(ctx: Context, userId: string, year: number, month: number): Promise<Buffer> {
  const [record] = await ctx.database.get('deerpipe', { userid: userId });
  const checkinDates = record?.checkindate || [];

  const calendarDayData = generateCalendarHTML(checkinDates, year, month);

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
bottom: 5px;
left: 5px;
font-size: 14px;
color: black;
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

function generateCalendarHTML(checkinDates, year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();

  let calendarHTML = `
<div class="calendar">
<div class="calendar-header">${year}-${month.toString().padStart(2, '0')} 签到</div>
<div class="calendar-subheader">下次一定</div>
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
    const checkedIn = checkinDates.includes(day.toString());
    calendarHTML += `
<div class="calendar-day">
<img src="https://i0.hdslb.com/bfs/article/bfb250ffe0c43f74533331451a5e0a32312276085.png" class="deer-image" alt="Deer">
${checkedIn ? `<img src="https://i0.hdslb.com/bfs/article/7b55912ee718a78993f6365a6d970e98312276085.png" class="check-image" alt="Check">` : ''}
<div class="day-number">${day}</div>
</div>
`;
  }

  calendarHTML += `
</div>
</div>
`;

  return calendarHTML;
}