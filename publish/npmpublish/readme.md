# koishi-plugin-spell-wrong

[![npm](https://img.shields.io/npm/v/koishi-plugin-spell-wrong?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-spell-wrong)

> 当用户拼错指令时，给予友好提示。当用户输入不是有效指令时，插件会自动返回一个友好的提示，帮助用户正确使用机器人功能。

## 功能特点

- 自动检测用户输入是否为有效指令
- 支持自定义提示消息和行为
- 可配置是否仅在@机器人时触发
- 灵活控制中间件优先级，可选择是否让其他功能(如AI对话)优先处理

![效果预览](https://i0.hdslb.com/bfs/openplatform/efff3a76e737a7c986f670b4c64ad878ec527927.png)

## 安装

```bash
npm install koishi-plugin-spell-wrong
```

或者在 Koishi 控制台中搜索并安装 `spell-wrong`。

## 配置项

### 基本设置

- **onlyHasAt**: 是否仅在@机器人时触发检测（默认：`false`）
- **returnNext**: 使用临时中间件确保只处理未被其他功能捕获的消息（默认：`true`）
  - 开启后，其他功能（如AI对话）会优先处理用户消息
  - 关闭后，本插件会立即处理不符合指令格式的消息

### 提示行为

- **tipAction**: 自定义提示行为的代码
  - 可使用 `session`、`h`、`ctx`、`logger`、`config` 变量
  - 默认会提示用户输入 `help` 查看可用指令

## 使用示例

### 默认配置

插件安装后，当用户输入不符合指令格式的消息时，会自动提示：

```
您输入的不是有效指令，请输入 help 查看可用指令。
```

### 自定义提示行为

您可以在配置中自定义 `tipAction` 来实现更复杂的提示行为，例如：

```javascript
// 提供更详细的帮助信息
await session.send(h.quote(session.messageId) + '您输入的不是有效指令。\n可用指令前缀：/ 或 .\n常用指令：help, ping, echo\n输入 /help 查看完整指令列表。');
```

## 注意事项

- 当 `returnNext` 设为 `true` 时，如果有其他插件（如AI对话）已经处理了用户消息，本插件的提示将不会触发
- 当 `onlyHasAt` 设为 `true` 时，只有@机器人的消息才会被检测

## 许可证

MIT