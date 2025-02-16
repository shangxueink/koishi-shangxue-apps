# koishi-plugin-music-voice

[![npm](https://img.shields.io/npm/v/koishi-plugin-music-voice?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-music-voice)

🎵 **语音点歌** - 搜索并提供QQ音乐和网易云音乐的歌曲，交互后发送语音消息，🤩付费的歌曲也可以欸？！

## 特点

- **搜索歌曲**：🤩 支持QQ音乐和网易云音乐的歌曲搜索。
- **友好交互**：📱 简单易用的指令，快速获取你喜欢的音乐。

## 安装

在 Koishi 插件市场搜索并安装 `music-voice`

## 使用该插件搜索并获取歌曲

**用户**：

```code
music <歌曲名称>
```

**机器人**：

```code
【歌曲列表】
请在■■秒内，输入歌曲对应的序号
```

**用户**：

```code
（选择的歌曲序号）
```

**机器人**：

```code
生成语音中…
```

```code
【一条时间较长的语音消息】
```

## 注意事项

- 本插件依赖外部 API 获取歌曲信息，请保持网络畅通
- adapter-qq 发送语音需要安装并启用 ffmpeg 和 silk 服务
