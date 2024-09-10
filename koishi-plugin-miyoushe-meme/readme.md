# koishi-plugin-miyoushe-meme

[![npm](https://www.npmjs.com/package/koishi-plugin-miyoushe-meme)](https://www.npmjs.com/package/koishi-plugin-miyoushe-meme)

用于从米游社获取和发送表情包

## 功能

- 根据编号发送特定的米游社表情包。
- 不输入编号时随机发送一个米游社表情包。
- 发送表情包预览列表。

## 安装
koishi插件市场搜索`miyoushe-meme`并安装


## 指令

- `miyoushe-meme [id]` - 发送编号为 `id` 的表情包，如果不输入 `id` 则随机发送一个表情包。
- `米-表情包预览列表` - 显示表情包预览列表，并提供获取特定表情包的指令。


## 声明
本插件仅供娱乐

## 更新日志

- **0.0.4** 1.预览列表使用网络下载，而不是直接放在插件包里，优化包体积。 2.dependencies加入axios。

- **0.0.3** 加入预览列表

- **0.0.1** 基本实现米游社调用表情包