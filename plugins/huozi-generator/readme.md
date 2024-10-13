# koishi-plugin-huozi-generator

[![npm](https://img.shields.io/npm/v/koishi-plugin-huozi-generator.svg)](https://www.npmjs.com/package/koishi-plugin-huozi-generator)
`huozi-generator` 是一个用于 Koishi 框架的 otto 活字印刷插件，能够根据输入的文本生成音频文件，并返回可通过 HTTP/HTTPS 访问的 URL 地址。
### 配置项说明
- **waitTip_Switch**：是否返回等待提示。可以为 `false` 不返回提示，或提供一个字符串作为提示内容。
- **apiEndpoint**：音频生成 API 的地址，默认为 `http://127.0.0.1:8989/api/make`。
- **default_inYsddMode**：是否使用原声大碟模式，默认值为 `false`。
- **default_norm**：是否统一音频的音量，默认值为 `false`。
- **default_reverse**：是否倒放生成的音频，默认值为 `false`。
- **default_speedMult**：音频速度倍数，范围为 0.5 到 2.0，默认值为 `1.0`。
- **default_pitchMult**：音频音调倍数，范围为 0.5 到 2.0，默认值为 `1.0`。
- **loggerinfo**：是否启用日志调试输出，默认值为 `false`。

## 使用方法
在 Koishi 插件市场里安装后，根据本插件的说明文档引导，部署后端，填入对应的 `apiEndpoint` 即可使用啦~

### 命令使用方法
在聊天中可以使用命令 `huozi-generator <content:text>` 来生成音频文件，其中 `<content:text>` 是要生成音频的文本内容。
示例：
```
/huozi-generator 你好啊
```
你也可以使用别名 `活字乱刷` 来调用此命令：
```
/活字乱刷 你好啊
```
此外，还可以通过添加各种选项来调整生成音频的参数：
- `-y` 或 `--ysddMode`：匹配到特定文字时使用原声大碟。
- `-n` 或 `--norm`：统一音频的音量。
- `-r` 或 `--reverse`：倒放生成的音频。
- `-s <speedMult>` 或 `--speedMult <speedMult>`：语音速度，范围 0.5 到 2.0，默认值为 1.0。
- `-p <pitchMult>` 或 `--pitchMult <pitchMult>`：语音音调，范围 0.5 到 2.0，默认值为 1.0。
示例：
- 倒放音频：
```
/活字乱刷 -r 你好啊
```
- 调整音频速度为 1.5 倍：
```
/活字乱刷 -s 1.5 你好啊
```
- 使用原声大碟模式并统一音量：
```
/活字乱刷 -y -n 你好啊
```
## 调试日志
如果需要启用调试日志，可以在配置中将 `loggerinfo` 设置为 `true`，以便查看详细的日志信息。

## 项目链接
- [GitHub 项目地址](https://github.com/shangxueink/HUOZI_koi)

## 如何部署后端
请参阅 [HUOZI_koi 后端部署项目](https://github.com/shangxueink/HUOZI_koi) 了解如何部署后端服务。