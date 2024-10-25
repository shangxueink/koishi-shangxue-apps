# koishi-plugin-deer-pipe

[![npm](https://img.shields.io/npm/v/koishi-plugin-deer-pipe?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-deer-pipe)

## 📖 介绍

一个🦌管签到小插件

> ➡️ 源想法和代码都来自这两个项目：
> 
> https://github.com/SamuNatsu/nonebot-plugin-deer-pipe
> 
> https://gitee.com/kyrzy0416/yunzai-plugin-deer-pipe/tree/master
> 
> ⚠️ 注：我们只是大自然的搬运工

## 📸 效果展示

![img](https://i0.hdslb.com/bfs/article/496e02d92547d2a74c17ff9280e8ab55312276085.png)


## 📦 命令合集

<details>
<summary>详细的命令合集列表 </summary>
<h3>签到</h3>
<ul>
<li><strong>指令</strong>: <code>🦌 [艾特用户]</code> 或 <code>鹿管 [艾特用户]</code></li>
<li><strong>作用</strong>: 签到当天。</li>
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
</details>



# 插件配置说明
<details>
<summary>详细的配置项功能列表 </summary>

该插件的配置项分为四大部分
## 1. 签到设置
- **`enable_deerpipe`**: 是否允许重复签到。  
- 说明: 开启后，允许用户多次签到。关闭后，用户只能签到一次。
- **`maximum_times_per_day`**: 每日签到次数上限。
- 说明: 用户每天最多签到的次数，最低设置为 2 次。
- **`enable_blue_tip`**: 是否开启补签提示。
- 说明: 开启后，签到时会加上【提示用户可以进行补签】的文字。
## 2. 排行榜设置
- **`leaderboard_people_number`**: 排行榜显示人数。
- 类型: `number`
- 默认值: `15`
- 说明: 排行榜上展示的用户数量，最低可以设置为 3。
- **`enable_allchannel`**: 是否展示全频道用户排名。
- 类型: `boolean`
- 默认值: `false`
- 说明: 开启后，排行榜将展示所有频道用户的排名。关闭后，仅展示当前频道用户排名。
- **`Reset_Cycle`**: 排行榜重置周期。
- 类型: `string`
- 可选值: `每月` 或 `不重置`
- 默认值: `每月`
- 说明: 每月重置签到排行榜，重置后重新开始排名。如果选择“不重置”，则不会重置排行榜。
## 3. 货币设置
- **`currency`**: 货币单位名称。
- 类型: `string`
- 默认值: `deerpipe`
- 说明: 用于显示货币单位的字段，代表用户获得或花费的货币名称。
- **`cost.checkin_reward`**: 签到时的货币变动。
- 类型: `array`
- 说明: 该字段控制不同签到相关命令的货币奖励或扣除。每个命令对应的 `cost` 表示执行该命令时货币的增减。
- **`cost.store_item`**: 商店道具价格表。
- 类型: `array`
- 说明: 用户可以在商店中购买的道具及其对应的价格（以货币为单位）。
## 4. 调试设置
- **`calendarimage`**: 每日签到日历图像的 Base64 编码。
- 类型: `string`
- 默认值: `data:image/png;base64,iVBO...`
- 说明: 用于显示每日签到的图片，需填入图片的 Base64 编码。
- **`loggerinfo`**: 是否启用 debug 日志模式。
- 类型: `boolean`
- 默认值: `false`
- 说明: 开启后，输出更多的 debug 日志信息，用于调试插件行为。
</details>

---
## monetary · 通用货币设置

这个配置项可以自定义 `monetary 的 currency 字段`

这是一个通用货币数据库，你可以让其他支持此功能的插件一起连通后互动数据。

如果你需要与  [koishi-plugin-monetary](https://www.npmjs.com/package/koishi-plugin-monetary) 插件联动

根据此插件的默认` currency `字段为 ` default `

那你需要修改本插件配置项为 ` default ` ， 然后重载本插件即可。

## calendarimage配置项说明

这里需要填入一个图片的base64编码后的内容。

我们在这里提供了一个不同于默认值的示例
```
data:image/png;base64,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
```

## 🚀 声明

* 文件借鉴了很多插件，精简个人认为可以精简的内容。
* 素材来源于网络，仅供交流学习使用
* 严禁用于任何商业用途和非法行为


## 注意事项
- 确保你已经正确配置了 Koishi 和 Impart-Pro 插件。
- 请根据你的需求调整配置项和数据库表结构。
- 如果遇到问题，请查看插件代码或寻求社区支持。