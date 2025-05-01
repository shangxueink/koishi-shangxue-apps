# koishi-plugin-commands-fuck

[![npm](https://img.shields.io/npm/v/koishi-plugin-commands-fuck?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-commands-fuck)

通过 `fuck` 命令纠正你输入的错误命令，并自动执行正确的命令。

- 模仿命令行工具 `thefuck` 的功能，让你的 Koishi 机器人更加智能和便捷。

## 特性

- **自动纠错**: 自动识别并纠正用户输入的错误命令。
- **多种纠错方式**: 支持回复消息纠错和最近一次命令纠错。
- **相似度匹配**: 查找与错误命令相似的命令，并提供选择。
- **参数保留**: 纠正命令时，保留原始命令的参数。
- **灵活配置**: 提供多种配置选项，以满足不同需求。

## 使用方法

当你输入一个错误的命令后，可以使用 `fuck` 命令来尝试纠正你的错误并执行正确的命令。

插件会优先尝试纠正你回复的消息，如果没有回复消息，则会尝试纠正你最近一次输入的命令。

### 示例：

#### 1. 回复消息进行纠正：

[点我查看效果图](https://i0.hdslb.com/bfs/openplatform/af951636c3092d0e19350b324e675d20cb51294b.png)

1. 用户输入：`hekp -H`（错误的命令）
2. 用户回复这条消息，并输入：`fuck`
3. 插件会自动执行：`help -H`

#### 2. 使用最近一次命令进行纠正：

[点我查看效果图](https://i0.hdslb.com/bfs/openplatform/d4da3cdb2353ba4902e2697263c963de9d58ea87.png)

1. 用户输入：`hekp -H`（错误的命令）
2. 然后输入：`fuck`
3. 插件会自动执行：`help -H`

如果有多个相似的命令，可以使用：

[点我查看效果图](https://i0.hdslb.com/bfs/openplatform/07c2283e70a1f5dc7e96fe95368f0bae8729b824.png)

- `fuck` - 执行最匹配的命令
- `fuck fuck` - 执行第二匹配的命令
- `fuck fuck fuck` - 执行第三匹配的命令
- 以此类推...

## 配置项

| 属性                      | 类型    | 默认值   | 描述                                                                                                                                                      |
| ------------------------- | ------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `commandName`             | string  | `"fuck"` | 指令名称。可以自定义 `fuck` 命令的名称。                                                                                                                  |
| `maxHistoryLength`        | number  | `3`      | 记录每个用户的（最近）历史消息数量。                                                                                                                      |
| `similarityThreshold`     | number  | `0.4`    | 命令相似度阈值，超过此值才会被认为是相似命令。                                                                                                            |
| `chineseCommandThreshold` | number  | `0.3`    | 中文命令相似度阈值，针对中文命令设置更宽松的匹配标准。                                                                                                    |
| `commandInfo`             | boolean | `false`  | 返回即将执行的指令内容提示，与 `-i` 选项效果一致。<br>[⇒点我查看效果](https://i0.hdslb.com/bfs/openplatform/c6e71eccd095913310d2c8b61943ec006b62697d.png) |
| `loggerinfo`              | boolean | `false`  | 日志调试：一般输出。<br>提 issue 时请使用此功能。                                                                                                         |
| `loggeruserinputinfo`     | boolean | `false`  | 日志输出用户输入。                                                                                                                                        |

## 指令选项

- `-i, --info`: 输出纠正的指令。
- `-l, --list`: 输出所有匹配指令。


## 注意事项

- 插件会记录用户的历史消息，用于纠错。请注意保护用户隐私。
- 相似度阈值会影响纠错的准确性。请根据实际情况调整。
- 日志调试选项会输出大量信息，仅在调试时启用。

## 贡献

欢迎提交 issue 和 pull request!

## License

MIT