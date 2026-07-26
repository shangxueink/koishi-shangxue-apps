# koishi-plugin-emojihub-bili

[![npm](https://img.shields.io/npm/v/koishi-plugin-emojihub-bili?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-emojihub-bili)   [![npm downloads](https://img.shields.io/npm/dm/koishi-plugin-emojihub-bili)](https://www.npmjs.com/package/koishi-plugin-emojihub-bili)

欢迎使用 **emojihub-bili**，这是**emojihub**插件的复刻版本！

一个基于 Koishi 的表情包插件，支持从本地文件夹、本地图片、本地 txt 链接库和网络图片中发送表情包。

## 支持内容

- 自定义表情包指令列表
- `随机表情包`
- `再来一张`
- QQ 官方机器人 Markdown 按钮发送
- 本地图片自动上传后转成可用于 Markdown 的公网链接
- 本地图片文件名、大小、修改时间、路径模板输出
- 自动表情包触发
- 撤回消息

## 主要命令

- `emojihub-bili`：显示表情包列表
- `emojihub-bili/<子命令>`：发送对应表情包
- `emojihub-bili/再来一张`：重复上一次表情包
- `emojihub-bili/随机表情包`：随机发送一个表情包

## 表情包来源

`MoreEmojiHubList` 中每一项包含：

- `command`：子命令名
- `source_url`：来源路径

支持的 `source_url`：

- 本地文件夹
- 本地图片文件
- 本地 `txt` 文件
- `http` / `https` 图片链接

## QQ Markdown

插件支持 QQ 官方机器人的 Markdown 发送模式。

当图片来自本地时，流程为：

1. 先读取本地图片宽高
2. 再上传到 `assets` 服务
3. 最后把公网链接嵌入 Markdown

列表菜单按钮由插件自动生成，不再依赖外部自定义静态模板。

## 常用配置

- `emojihub_bili_command`：父级命令
- `emojihub_onemore`：再来一张命令
- `emojihub_randompic`：随机表情包命令
- `MoreEmojiHubList`：表情包列表
- `deleteMsg` / `deleteMsgtime`：自动撤回
- `maxexecutetime`：单次最多发送数量
- `repeatCommandDifferentiation`：按用户或频道记录“再来一张”
- `searchSubfolders`：是否递归子文件夹
- `searchSubfoldersWithfilename`：递归时是否把子文件夹名计入匹配
- `localPictureToName`：本地图片的文本输出模板
- `markdown_button_mode`：QQ Markdown 模式
- `autoEmoji`：自动表情包模式
- `groupListmapping`：自动表情包触发映射
- `allgroupautoEmoji`：全群自动表情包
- `LocalSendNetworkPicturesList`：将网络图下载到本地后再发送
- `consoleinfo`：调试日志

## 本地图片模板变量

`localPictureToName` 可用变量：

- `${IMAGE}`：图片本体
- `${NAME}`：文件名
- `${SIZE}`：文件大小
- `${TIME}`：修改时间
- `${PATH}`：绝对路径

## 说明

- 插件依赖 `canvas` 和 `assets` 服务时，相关功能才可正常工作。
- 本地路径请优先使用绝对路径或 `file:///` 路径。
- QQ Markdown 下，图片链接必须是可访问的公网 URL。

## 免责声明 🤝

本插件（**emojihub-bili**）中的所有表情包内容均来源于哔哩哔哩（Bilibili）网站。这些表情包的版权归原作者及哔哩哔哩网站所有。本插件仅提供访问这些内容的途径，并不声称对这些表情包内容拥有任何形式的所有权或知识产权。
