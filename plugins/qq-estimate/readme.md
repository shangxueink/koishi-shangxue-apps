# koishi-plugin-qq-estimate

[![npm](https://img.shields.io/npm/v/koishi-plugin-qq-estimate?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-qq-estimate)


这是一个用于估价 QQ 号的插件。通过调用外部 API 来分析并提供一个大致的 QQ 号价值评估。
请注意，本插件仅供娱乐，提供的估价结果仅供参考，实际价值可能与此不同。

## 功能

- 输入QQ号码，获取一个估计的价值。
- 显示QQ号的等级、注册天数和连续登录天数等信息。
- 当无法获取某些信息时，会提示 估价可能不准确。

## 安装
koishi插件市场搜索并安装qq-estimate

## 使用方法

使用以下指令进行QQ号估价：

```
【估价 <QQ号>】或者【估价 <@一个人>】
```

例如，估价 QQ 号 10001：

```
估价 10001
```

## 说明

- 确保机器人具有接收和发送消息的权限。
- API 可能会有延迟或不稳定，如果在使用时遇到问题，请稍后重试。
- 插件对于查询结果的准确性不做任何保证。

