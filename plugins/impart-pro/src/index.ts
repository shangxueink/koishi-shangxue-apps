import { Context, Schema, h, Tables } from 'koishi';
import { } from 'koishi-plugin-puppeteer';
import { } from 'koishi-plugin-monetary'
export const name = 'impart-pro';

export interface Config {
  duelLossCurrency: number;
  maintenanceCostPerUnit: any;
  currency: string;
  duelWinRateFactor: any;
  exerciseCooldownTime: number;
  imagemode: any;
  notallowtip: any;
  onlybotowner_list: any;
  permissionScope: any;
  enableAllChannel: any;
  leaderboardPeopleNumber: any;
  duelLossReductionRange: any;
  duelWinGrowthRange: any;
  duelWinRateFactor2: any;
  duelCooldownTime: number;
  exerciseLossReductionRange: any;
  exerciseRate: any;
  loggerinfo: any;
  defaultLength: any;
  exerciseWinGrowthRange: any;
}

export const usage = `
<h2><a href="https://www.npmjs.com/package/koishi-plugin-impart-pro" target="_blank">点我查看完整README</a></h2>

<hr>

<table>
<thead>
<tr>
<th>指令</th>
<th>说明</th>
</tr>
</thead>
<tbody>
<tr>
<td>开导 [@某人]</td>
<td>长牛牛</td>
</tr>
<tr>
<td>决斗 [@某人]</td>
<td>战斗！爽~</td>
</tr>
<tr>
<td>重开牛牛</td>
<td>牛牛很差怎么办？稳了！直接重开！</td>
</tr>
<tr>
<td>牛牛排行榜</td>
<td>查看牛牛排行榜</td>
</tr>
<tr>
<td>看看牛牛 [@某人]</td>
<td>查询自己或者别人牛牛数据</td>
</tr>
<tr>
<td>锁牛牛 [@某人]</td>
<td>开启/关闭 某人/某频道 的牛牛大作战</td>
</tr>
</tbody>
</table>

<hr>

<h3>配置项里有 形如 10 ± 45% 的数值</h3>

<p>举例说明：<br>
每次锻炼成功后，牛牛长度的增长范围。<br>
以默认值 <code>[10, 45]</code> 为例，表示成功锻炼后牛牛长度增长的基数为 10 厘米，同时允许有 ±45% 的浮动：</p>
<ul>
<li><strong>最大值</strong>: 10 + 10 × 0.45 = 14.5 厘米</li>
<li><strong>最小值</strong>: 10 - 10 × 0.45 = 5.5 厘米</li>
</ul>
<p>因此，锻炼成功时，牛牛的长度会在 5.5 厘米到 14.5 厘米之间随机增长。</p>

<hr>

`;

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    defaultLength: Schema.tuple([Number, Number]).description("【初始生成】的牛牛长度（cm）<br>右侧代表最大的偏差百分比（%）（默认在 18 ± 45%）").default([18, 45]),
    exerciseRate: Schema.array(Schema.object({
      minlength: Schema.number().description('区间最小值'),
      maxlength: Schema.number().description('区间最大值'),
      rate: Schema.number().description('成功概率'),
    })).role('table').description("【锻炼成功】每个长度段位对应的概率。<br>找不到对应区间的时候，默认成功率为 50%").default([
      {
        "rate": 100,
        "maxlength": 0,
        "minlength": -999999999999
      },
      {
        "minlength": 0,
        "maxlength": 100,
        "rate": 80
      },
      {
        "minlength": 100,
        "maxlength": 300,
        "rate": 70
      },
      {
        "minlength": 300,
        "maxlength": 500,
        "rate": 60
      },
      {
        "minlength": 500,
        "maxlength": 1000,
        "rate": 50
      },
      {
        "minlength": 1000,
        "maxlength": 2000,
        "rate": 40
      },
      {
        "minlength": 2000,
        "maxlength": 10000,
        "rate": 30
      },
      {
        "minlength": 10000,
        "maxlength": 50000,
        "rate": 20
      },
      {
        "minlength": 50000,
        "maxlength": 100000,
        "rate": 10
      },
      {
        "minlength": 100000,
        "maxlength": 999999999999,
        "rate": 0
      }
    ]),
    //exerciseRate: Schema.number().role('slider').min(0).max(100).step(1).default(80).description("【锻炼成功】概率。"),
    exerciseWinGrowthRange: Schema.tuple([Number, Number]).description("【锻炼成功】增长的牛牛长度（cm）<br>右侧代表最大的偏差百分比（%）（默认在 10 ± 45%）").default([10, 45]),
    exerciseLossReductionRange: Schema.tuple([Number, Number]).description("【锻炼失败】减少的牛牛长度（cm）<br>右侧代表最大的偏差百分比（%）（默认在 12 ± 45%）").default([12, 45]),
    exerciseCooldownTime: Schema.number().role('slider').min(0).max(30).step(1).default(5).description("【锻炼牛牛】间隔休息时间（秒）"),
  }).description('牛牛设置'),

  Schema.object({
    duelWinRateFactor: Schema.array(Schema.object({
      minlength: Schema.number().description('区间最小值'),
      maxlength: Schema.number().description('区间最大值'),
      rate: Schema.number().description('成功概率'),
    })).role('table').description("【获胜概率 和 牛子长度】之间的关联性。<br>双方牛子长度【差值的绝对值】越大，获胜概率越小").default([
      {
        "rate": 100,
        "maxlength": 10,
        "minlength": 0
      },
      {
        "minlength": 10,
        "maxlength": 50,
        "rate": 80
      },
      {
        "minlength": 50,
        "maxlength": 100,
        "rate": 60
      },
      {
        "minlength": 100,
        "maxlength": 300,
        "rate": 40
      },
      {
        "minlength": 300,
        "maxlength": 1000,
        "rate": 20
      },
      {
        "minlength": 1000,
        "maxlength": 999999999999,
        "rate": 0
      }
    ]),
    duelWinRateFactor2: Schema.number().role('slider').min(-100).max(100).step(1).default(-10).description("【获胜概率 和 牛子长度】之间的额外概率。<br>其实就是为某一方单独加一点概率<br>为0时，双方概率按上表。<br>为100时，较长的一方必胜。<br>为-100时，较短的一方必胜。"),
    duelWinGrowthRange: Schema.tuple([Number, Number]).description("【决斗胜利】增长长度（cm）<br>右侧代表最大的偏差百分比（%）（默认在 10 ± 50%）").default([10, 50]),
    duelLossReductionRange: Schema.tuple([Number, Number]).description("【决斗失败】减少长度（cm）<br>右侧代表最大的偏差百分比（%）（默认在 15 ± 50%）").default([15, 50]),
    duelCooldownTime: Schema.number().role('slider').min(0).max(100).step(1).default(15).description("【决斗】间隔休息时间（秒）"),
    duelLossCurrency: Schema.number().role('slider').min(0).max(100).step(1).default(80).description("【决斗】战败方，缩短长度转化为【货币】的比率（百分比）"),
  }).description('对决设置'),

  Schema.object({
    imagemode: Schema.boolean().description('开启后，排行榜将使用 puppeteer 渲染图片发送').default(true),
    leaderboardPeopleNumber: Schema.number().description('排行榜显示人数').default(15).min(3),
    enableAllChannel: Schema.boolean().description('开启后，排行榜将展示全部用户排名`关闭则仅展示当前频道的用户排名`').default(false),
  }).description('排行设置'),

  Schema.object({
    permissionScope: Schema.union([
      Schema.const('all').description('所有用户'),
      Schema.const('admin').description('仅管理员'),
      Schema.const('owner').description('仅群主'),
      Schema.const('owner_admin').description('仅管理员 + 群主'),
      Schema.const('onlybotowner').description('仅下面的名单可用（onlybotowner_list）'),
      Schema.const('onlybotowner_admin_owner').description('onlybotowner_list + 管理员 + 群主'),
    ]).role('radio').description('允许使用【开始银趴/结束银趴】的人（需要适配器支持获取群员角色）').default("owner_admin"),
    onlybotowner_list: Schema.array(String).role('table').description('允许使用【开始银趴/结束银趴】的用户ID').default(["114514"]),
    notallowtip: Schema.boolean().description('当禁止的对象尝试触发<br>开启后。对禁止的玩家/频道发送提示语<br>关闭，则不做反应').default(false),
  }).description('管理设置'),

  Schema.object({
    currency: Schema.string().default('impartpro').description('monetary 数据库的 currency 字段名称'),
    maintenanceCostPerUnit: Schema.number().role('slider').min(0).max(1).step(0.01).default(0.1).description("【保养】钱币与长度的转化比率。0.1则为`10:1`，十个货币换 1 cm"),
  }).description('monetary·通用货币设置'),

  Schema.object({
    loggerinfo: Schema.boolean().description('debug日志输出模式').default(false),
  }).description('调试设置'),
]);



interface impartproTable {
  userid: string;
  username: string;
  channelId: string;
  length: number;
  growthFactor: number;
  lastGrowthTime: string;
  locked: boolean;
}

declare module 'koishi' {
  interface Tables {
    impartpro: impartproTable;
  }
}

export const inject = {
  required: ["database", "monetary"],
  optional: ['puppeteer']
};
export function apply(ctx: Context, config: Config) {
  // 扩展数据库表
  ctx.model.extend('impartpro', {
    userid: 'string',// 用户ID唯一标识
    username: 'string', // 用户名
    channelId: 'string', // 频道名称
    length: 'float', // 牛牛长度
    growthFactor: 'float', // 牛牛成长值
    lastGrowthTime: 'string', // 双方对战使用的，记录时间用的。用于冷却时间的计算    
    locked: 'boolean'
  }, {
    primary: ['userid'],
  });

  ctx.command('impartpro/保养', '通过花费货币来增加牛牛的长度')
    .alias("保养牛牛")
    .userFields(["id"])
    .action(async ({ session }) => {

      const userId = session.userId;
      // 检查是否被禁止触发
      if (!await isUserAllowed(ctx, userId, session.channelId)) {
        if (config.notallowtip) {
          await session.send('你没有权限触发这个指令。');
        }
        return;
      }

      // 获取用户记录
      let [userRecord] = await ctx.database.get('impartpro', { userid: userId });
      if (!userRecord) {
        await session.send('你还没有数据，请先进行初始化。');
        return;
      }

      // 获取用户货币余额
      const userCurrency = await getUserCurrency(session.user.id);
      const costPerUnit = config.maintenanceCostPerUnit;

      // 计算可以购买的最大长度
      const maxPurchasableLength = Math.floor(userCurrency / (1 / costPerUnit));

      if (maxPurchasableLength <= 0) {
        await session.send('你的货币不足以进行保养。');
        return;
      }

      // 提示用户输入想要购买的长度
      await session.send(`你可以购买的最大长度为 ${maxPurchasableLength} cm。请输入你想购买的长度：`);

      // 等待用户输入
      const response = await session.prompt();
      const desiredLength = parseInt(response);

      // 检查输入有效性和货币是否足够
      if (isNaN(desiredLength) || desiredLength <= 0) {
        await session.send('输入无效，请输入一个有效的长度值。');
        return;
      }

      if (desiredLength > maxPurchasableLength) {
        await session.send('你的货币不足以购买这么多长度，请输入一个较小的值。');
        return;
      }

      // 增加长度并扣除货币
      userRecord.length += desiredLength;
      await updateUserCurrency(session.user.id, -desiredLength / costPerUnit);

      // 更新记录
      await ctx.database.set('impartpro', { userid: userId }, {
        length: userRecord.length,
      });

      await session.send(`你花费了 ${desiredLength / costPerUnit} 货币，增加了 ${desiredLength} cm。`);
      return;
    });

  ctx.command('impartpro/开导 [user]', '让牛牛成长！')
    .alias('打胶')
    .example("开导 @用户")
    .userFields(["id"])
    .action(async ({ session }, user) => {
      let userId = session.userId;
      let username = session.username;
      const currentTime = Date.now(); // 使用 Date.now() 获取当前时间戳

      // 检查是否被禁止触发
      if (!await isUserAllowed(ctx, session.userId, session.channelId)) {
        if (config.notallowtip) {
          await session.send('你没有权限触发这个指令。');
        }
        return;
      }

      if (user) {
        const parsedUser = h.parse(user)[0];
        if (parsedUser?.type === 'at') {
          const { id, name } = parsedUser.attrs;
          if (!id || (session.userId === id)) { // 不可以决斗自己
            await session.send('不可用的用户！请换一个用户吧~');
            return;
          }
          userId = id;
          username = name || userId;
        } else {
          await session.send('不可用的用户！请检查输入');
          return;
        }
      } else {
        // 更新用户名称
        await ctx.database.set('impartpro', { userid: userId }, {
          username: username
        });
      }

      // 获取用户记录
      let [userRecord] = await ctx.database.get('impartpro', { userid: userId });

      // 如果用户记录不存在，初始化用户数据
      if (!userRecord) {
        const initialLength = randomLength(config.defaultLength);
        const growthFactor = Math.random();
        userRecord = {
          userid: userId,
          username: username,
          channelId: session.channelId,
          length: initialLength,
          growthFactor: growthFactor,
          lastGrowthTime: new Date().toISOString(), // 使用 ISO 字符串
          locked: false
        };
        await ctx.database.create('impartpro', userRecord);
        await session.send(`自动初始化成功！你的牛牛初始长度为 ${initialLength.toFixed(2)} cm。初始生长系数为：${growthFactor.toFixed(2)}`);
        return;
      }

      // 检查冷却时间
      const lastGrowthTime = new Date(userRecord.lastGrowthTime).getTime();
      const cooldownTime = config.exerciseCooldownTime * 1000;
      if (isNaN(lastGrowthTime)) {
        await session.send('用户数据有误，无法解析最后锻炼时间。');
        return;
      }

      if (currentTime - lastGrowthTime < cooldownTime) {
        const remainingTime = Math.ceil((cooldownTime - (currentTime - lastGrowthTime)) / 1000);
        await session.send(`${h.at(userId)} 处于冷却中，无法进行锻炼。冷却还剩 ${remainingTime} 秒。`);
        return;
      }

      // 获取原有长度
      const originalLength = userRecord.length;


      // 动态确定锻炼成功概率
      const rateConfig = config.exerciseRate.find(item =>
        originalLength >= item.minlength && originalLength < item.maxlength
      );

      // 找不到区间的时候，设置默认成功率为 50%
      const successRate = rateConfig ? rateConfig.rate : 50;
      const isSuccess = Math.random() * 100 < successRate;
      let growthChange = 0;
      let expectedGrowth = 0;
      let expectedReduction = 0;

      if (isSuccess) {
        // 锻炼成功
        const [baseGrowth, growthVariance] = config.exerciseWinGrowthRange;
        expectedGrowth = randomLength([baseGrowth, growthVariance]);
        const growthCoefficient = 1 + userRecord.growthFactor;
        growthChange = expectedGrowth * growthCoefficient;
      } else {
        // 锻炼失败
        const [baseReduction, reductionVariance] = config.exerciseLossReductionRange;
        expectedReduction = randomLength([baseReduction, reductionVariance]);
        growthChange = -expectedReduction;
      }

      // 计算强化后长度
      const enhancedLength = originalLength + growthChange;

      // 更新用户记录
      userRecord.length = enhancedLength;
      userRecord.lastGrowthTime = new Date().toISOString(); // 使用 ISO 字符串

      // 记录详细信息
      loggerinfo(`用户ID: ${userId}`);
      loggerinfo(`原有长度: ${originalLength.toFixed(2)} cm`);
      loggerinfo(`本应该的成长值: ${isSuccess ? expectedGrowth.toFixed(2) : expectedReduction.toFixed(2)} cm`);
      loggerinfo(`实际应用的成长值: ${growthChange.toFixed(2)} cm`);
      loggerinfo(`牛牛增长因数: ${userRecord.growthFactor.toFixed(2)}`);
      loggerinfo(`计算公式: 原有长度 + 本应该的成长值 * (1 + 牛牛增长因数) `);
      loggerinfo(`计算结果: ${originalLength.toFixed(2)} + ${growthChange.toFixed(2)} = ${enhancedLength.toFixed(2)} cm`);
      loggerinfo(`锻炼结果: ${isSuccess ? '成功' : '失败'}`);

      // 更新数据库
      await ctx.database.set('impartpro', { userid: userId }, {
        length: userRecord.length,
        lastGrowthTime: userRecord.lastGrowthTime,
      });

      await session.send(`${h.at(userId)} 锻炼${isSuccess ? '成功' : '失败'}！牛牛强化后长度为 ${enhancedLength.toFixed(2)} cm。`);
      return;
    });

  ctx.command('impartpro/决斗 [user]', '决斗牛牛！')
    //.alias('挑战')
    .alias('嗦牛牛')
    .example("决斗 @用户")
    .userFields(["id"])
    .action(async ({ session }, user) => {
      let userId = session.userId;
      let username = session.username;
      const currentTime = Date.now();

      // 检查是否被禁止触发
      if (!await isUserAllowed(ctx, session.userId, session.channelId)) {
        if (config.notallowtip) {
          await session.send('你没有权限触发这个指令。');
        }
        return;
      }

      if (user) {
        const parsedUser = h.parse(user)[0];
        if (parsedUser?.type === 'at') {
          const { id, name } = parsedUser.attrs;
          if (!id || (session.userId === id)) { // 不可以决斗自己
            await session.send('不可用的用户！请换一个用户吧~');
            return;
          }
          userId = id;
          username = name || userId;
        } else {
          await session.send('不可用的用户！请检查输入');
          return;
        }
      } else {
        await session.send('请指定一个决斗用户！\n示例：决斗  @猫猫');
        return;
      }

      // 获取当前用户记录
      let [attackerRecord] = await ctx.database.get('impartpro', { userid: session.userId });
      if (!attackerRecord) {
        await session.send('你还没有数据，请先进行初始化。');
        return;
      }

      // 获取目标用户记录
      let [defenderRecord] = await ctx.database.get('impartpro', { userid: userId });
      if (!defenderRecord) {
        await session.send('目标用户还没有数据，无法进行决斗。');
        return;
      }

      // 检查冷却时间
      const lastAttackerTime = new Date(attackerRecord.lastGrowthTime).getTime();
      const lastDefenderTime = new Date(defenderRecord.lastGrowthTime).getTime();
      const cooldownTime = config.duelCooldownTime * 1000;

      if (currentTime - lastAttackerTime < cooldownTime || currentTime - lastDefenderTime < cooldownTime) {
        const remainingAttackerTime = Math.max(0, cooldownTime - (currentTime - lastAttackerTime));
        const remainingDefenderTime = Math.max(0, cooldownTime - (currentTime - lastDefenderTime));
        const remainingTime = Math.max(remainingAttackerTime, remainingDefenderTime);

        await session.send(`你或目标用户处于冷却中，无法进行决斗。\n冷却还剩 ${Math.ceil(remainingTime / 1000)} 秒。`);
        return;
      }

      // 计算长度差值
      const lengthDifference = attackerRecord.length - defenderRecord.length;

      // 根据长度差值确定基础胜率
      const rateConfig = config.duelWinRateFactor.find(item =>
        Math.abs(lengthDifference) >= item.minlength && Math.abs(lengthDifference) < item.maxlength
      );
      let baseWinRate = rateConfig ? rateConfig.rate : 50;

      // 确保长的一方胜率更高
      const attackerIsLonger = attackerRecord.length > defenderRecord.length;
      const attackerWinProbability = attackerIsLonger ? baseWinRate - config.duelWinRateFactor2 : baseWinRate + config.duelWinRateFactor2;
      const finalWinProbability = Math.min(100, Math.max(0, attackerWinProbability));

      // 确定决斗结果
      const isAttackerWin = Math.random() * 100 < finalWinProbability;
      let growthChange = 0;
      let reductionChange = 0;
      let currencyGain = 0;
      if (isAttackerWin) {
        // 攻击者胜利
        const [baseGrowth, growthVariance] = config.duelWinGrowthRange;
        growthChange = randomLength([baseGrowth, growthVariance]);

        const [baseReduction, reductionVariance] = config.duelLossReductionRange;
        reductionChange = randomLength([baseReduction, reductionVariance]);

        attackerRecord.length += growthChange;
        defenderRecord.length -= reductionChange;

        // 战败方获得货币
        currencyGain = reductionChange * (config.duelLossCurrency / 100);
        await updateUserCurrency(await updateIDbyuserId(userId, session.platform), currencyGain); // 这里的是被挑战的人战败了，获取他的数据库ID，加经验货币

      } else {
        // 防御者胜利
        const [baseGrowth, growthVariance] = config.duelWinGrowthRange;
        growthChange = randomLength([baseGrowth, growthVariance]);

        const [baseReduction, reductionVariance] = config.duelLossReductionRange;
        reductionChange = randomLength([baseReduction, reductionVariance]);

        defenderRecord.length += growthChange;
        attackerRecord.length -= reductionChange;

        // 战败方获得货币
        currencyGain = reductionChange * (config.duelLossCurrency / 100);
        await updateUserCurrency(session.user.id, currencyGain); // 这里的 session.user.id 是对的
      }

      // 更新双方记录
      attackerRecord.lastGrowthTime = new Date(currentTime).toISOString();
      defenderRecord.lastGrowthTime = new Date(currentTime).toISOString();

      await ctx.database.set('impartpro', { userid: session.userId }, {
        length: attackerRecord.length,
        lastGrowthTime: attackerRecord.lastGrowthTime,
      });

      await ctx.database.set('impartpro', { userid: userId }, {
        length: defenderRecord.length,
        lastGrowthTime: defenderRecord.lastGrowthTime,
      });

      // 输出双方胜率
      loggerinfo(`攻击者ID: ${session.userId}, 胜率: ${finalWinProbability.toFixed(2)}%`);
      loggerinfo(`防御者ID: ${userId}, 胜率: ${(100 - finalWinProbability).toFixed(2)}%`);

      // 发送决斗结果
      await session.send( // <p>  是换行哦
        `${h.at(session.userId)} 决斗${isAttackerWin ? '胜利' : '失败'}！ <p>` +
        `${h.at(session.userId)} ${isAttackerWin ? '增加' : '减少'}了 ${growthChange.toFixed(2)} cm， <p>` +
        `${h.at(userId)} ${isAttackerWin ? '减少' : '增加'}了 ${reductionChange.toFixed(2)} cm。<p> ` +
        `战败方获得了 ${currencyGain.toFixed(2)} 点经验（货币）。`
      );
      return;
    });

  ctx.command('impartpro/重开牛牛', '重开一个牛牛~')
    .alias('生成牛牛')
    .userFields(["id"])
    .action(async ({ session }) => {
      const userId = session.userId;
      const username = session.username;
      const initialLength = randomLength(config.defaultLength);
      const growthFactor = Math.random();
      const currentTime = new Date().toISOString();
      // 检查是否被禁止触发
      if (!await isUserAllowed(ctx, session.userId, session.channelId)) {
        if (config.notallowtip) {
          await session.send('你没有权限触发这个指令。');
        }
        return;
      }
      // 获取用户记录
      let [userRecord] = await ctx.database.get('impartpro', { userid: userId });

      if (userRecord) {
        // 如果用户记录存在，重置数据
        await ctx.database.set('impartpro', { userid: userId }, {
          length: initialLength,
          growthFactor: growthFactor,
          lastGrowthTime: currentTime,
        });
        await session.send(`牛牛重置成功，当前长度为 ${initialLength.toFixed(2)} cm，成长系数为 ${growthFactor.toFixed(2)}。`);
        return;
      } else {
        // 如果用户记录不存在，初始化用户数据
        userRecord = {
          userid: userId,
          username: username,
          channelId: session.channelId,
          length: initialLength,
          growthFactor: growthFactor,
          lastGrowthTime: currentTime,
          locked: false
        };

        await ctx.database.create('impartpro', userRecord);
        await session.send(`牛牛初始化成功，当前长度为 ${initialLength.toFixed(2)} cm，成长系数为 ${growthFactor.toFixed(2)}。`);
        return;
      }
    });

  ctx.command('impartpro/牛牛排行榜', '查看牛牛排行榜')
    .alias('牛子排行榜')
    .userFields(["id"])
    .action(async ({ session }) => {
      // 检查是否被禁止触发
      if (!await isUserAllowed(ctx, session.userId, session.channelId)) {
        if (config.notallowtip) {
          await session.send('你没有权限触发这个指令。');
        }
        return;
      }

      const leaderboardPeopleNumber = config.leaderboardPeopleNumber;
      const enableAllChannel = config.enableAllChannel;
      const channelId = enableAllChannel ? undefined : session.channelId;

      // 获取排行榜数据并过滤掉特殊记录
      const records = await ctx.database.get('impartpro', channelId ? { channelId } : {});
      const validRecords = records.filter(record => record.username !== '频道');

      if (validRecords.length === 0) {
        await session.send('当前没有可用的排行榜数据。');
        return;
      }

      validRecords.sort((a, b) => b.length - a.length);

      const topRecords = validRecords.slice(0, leaderboardPeopleNumber);
      const rankData = topRecords.map((record, index) => ({
        order: index + 1,
        username: record.username,
        length: record.length.toFixed(2),
      }));

      if (config.imagemode) {

        if (!ctx.puppeteer) {
          await session.send("没有开启 puppeteer 服务");
          return;
        }
        // 使用图片渲染
        const leaderboardHTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>牛牛排行榜</title>
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
.length {
font-weight: bold;
color: #e74c3c;
font-size: 18px;
}
.length::after {
content: ' cm';
font-size: 14px;
color: #95a5a6;
}
</style>
</head>
<body>
<div class="container">
<h1>牛牛排行榜</h1>
<ol class="ranking-list">
${rankData.map(record => `
<li class="ranking-item">
<span class="ranking-number">${record.order}</span>
${record.order === 1 ? '<span class="medal">🥇</span>' : ''}
${record.order === 2 ? '<span class="medal">🥈</span>' : ''}
${record.order === 3 ? '<span class="medal">🥉</span>' : ''}
<span class="name">${record.username}</span>
<span class="length">${record.length}</span>
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
      } else {
        // 使用文本渲染
        const leaderboard = topRecords.map((record, index) => `${index + 1}. ${record.username}: ${record.length} cm`).join('\n');
        await session.send(`牛牛排行榜：\n${leaderboard}`);
      }
    });

  ctx.command('impartpro/看看牛牛 [user]', '查看牛牛')
    .example("看看牛牛 @用户")
    .userFields(["id"])
    .action(async ({ session }, user) => {
      let userId = session.userId;
      let username = session.username;
      // 检查是否被禁止触发
      if (!await isUserAllowed(ctx, userId, session.channelId)) {
        if (config.notallowtip) {
          await session.send('你没有权限触发这个指令。');
        }
        return;
      }

      if (user) {
        const parsedUser = h.parse(user)[0];
        if (parsedUser?.type === 'at') {
          userId = parsedUser.attrs.id;
          username = parsedUser.attrs.name || userId;
        } else {
          await session.send('不可用的用户！请检查输入');
          return;
        }
      }

      const [userRecord] = await ctx.database.get('impartpro', { userid: userId });
      const balance = await getUserCurrency(await updateIDbyuserId(userId, session.platform)); // 使用 userId 对应的 aid 获取余额
      if (!userRecord) {
        await session.send(`暂时没有${h.at(userId)} 的记录。快输入【生成牛牛】进行初始化吧`);
        return;
      }
      await session.send(`${h.at(userId)} 的牛牛长度为 ${userRecord.length.toFixed(2)} cm，成长系数为 ${userRecord.growthFactor.toFixed(2)} 。<p>剩余点数为：${balance.toFixed(2)}`);
      return;
    });

  ctx.command('impartpro/锁牛牛 [user]', '开启/禁止牛牛大作战')
    .alias('开启牛牛大作战')
    .alias('关闭牛牛大作战')
    .example("锁牛牛 @用户")
    .userFields(["id"])
    .action(async ({ session }, user) => {
      const permissionScope = config.permissionScope;
      const onlybotownerList = config.onlybotowner_list;

      // 权限检查
      const isAllowed = checkPermission(session, permissionScope, onlybotownerList);
      if (!isAllowed) {
        await session.send('你没有权限执行此操作。');
        return;
      }

      const channelId = session.channelId;
      let userId;
      let username;

      if (user) {
        const parsedUser = h.parse(user)[0];
        if (parsedUser?.type === 'at') {
          userId = parsedUser.attrs.id;
          username = parsedUser.attrs.name || userId;
        } else {
          await session.send('不可用的用户！请检查输入');
          return;
        }

        // 针对特定用户
        const [record] = await ctx.database.get('impartpro', { userid: userId, channelId });

        if (!record) {
          // 初始化用户记录
          await ctx.database.create('impartpro', { userid: userId, username, channelId, locked: true });
          await session.send(`用户 ${username} 已被禁止触发牛牛大作战。`);
        } else {
          // 切换用户状态
          const newStatus = !record.locked;
          await ctx.database.set('impartpro', { userid: userId, channelId }, { locked: newStatus });
          await session.send(`用户 ${username} 已${newStatus ? '被禁止' : '可以'}触发牛牛大作战。`);
        }
      } else {
        // 针对整个频道
        const specialUserId = `channel_${channelId}`;
        const [channelRecord] = await ctx.database.get('impartpro', { userid: specialUserId, channelId });

        if (!channelRecord) {
          // 初始化频道记录
          await ctx.database.create('impartpro', { userid: specialUserId, username: '频道', channelId, locked: true });
          await session.send(`牛牛大作战已在本频道被禁止。`);
        } else {
          // 切换频道状态
          const newStatus = !channelRecord.locked;
          await ctx.database.set('impartpro', { userid: specialUserId, channelId }, { locked: newStatus });
          await session.send(`牛牛大作战已在本频道${newStatus ? '被禁止' : '开启'}。`);
        }
      }
    });

  async function updateIDbyuserId(userId, platform) {
    // 查询数据库的 binding 表
    const [bindingRecord] = await ctx.database.get('binding', {
      pid: userId,
      platform: platform,
    });

    // 检查是否找到了匹配的记录
    if (!bindingRecord) {
      throw new Error('未找到对应的用户记录。');
    }

    // 返回 aid 字段作为对应的 id
    return bindingRecord.aid;
  }

  async function isUserAllowed(ctx, userId, channelId) {
    // 检查频道级别的锁定状态
    const specialUserId = `channel_${channelId}`;
    const [channelRecord] = await ctx.database.get('impartpro', { userid: specialUserId, channelId });
    if (channelRecord && channelRecord.locked) {
      // 如果频道被锁定，直接返回 false
      return false;
    }

    // 检查用户级别的锁定状态
    const [userRecord] = await ctx.database.get('impartpro', { userid: userId, channelId });
    if (userRecord) {
      // 如果用户被锁定，返回 false
      return !userRecord.locked;
    }

    // 如果没有用户记录，默认允许
    return true;
  }

  // 权限检查函数
  function checkPermission(session, scope, allowedList) {
    const { userId, role } = session;
    if (scope === 'all') return true;
    if (scope === 'admin' && isAdmin(session)) return true;
    if (scope === 'owner' && role === 'owner') return true;
    if (scope === 'owner_admin' && (role === 'owner' || isAdmin(session))) return true;
    if (scope === 'onlybotowner' && allowedList.includes(userId)) return true;
    if (scope === 'onlybotowner_admin_owner' && (allowedList.includes(userId) || role === 'owner' || isAdmin(session))) return true;
    return false;
  }

  // 判断是否为管理员
  function isAdmin(session) {
    const sessionRoles = session.event?.member?.roles || [];
    return sessionRoles.includes('admin') || sessionRoles.includes('owner');
  }

  // 随机生成长度
  function randomLength([base, variance]: [number, number]): number {
    const min = base * (1 - variance / 100);
    const max = base * (1 + variance / 100);
    return min + Math.random() * (max - min);
  }

  function loggerinfo(message) {
    if (config.loggerinfo) {
      ctx.logger.info(message);
    }
  }

  async function updateUserCurrency(uid, amount: number, currency: string = config.currency) {
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

  async function getUserCurrency(uid, currency = config.currency) {
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
}

