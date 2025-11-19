# koishi-plugin-manosaba-memes

[![npm](https://img.shields.io/npm/v/koishi-plugin-manosaba-memes?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-manosaba-memes)

## 📝 简介

本插件是为 Koishi 设计的表情包生成器，灵感来源于 `nonebot-plugin-manosaba-memes` 和网站 `manosaba.com`。

目前实现了以下两种表情包的生成：

- **夏目安安说**：生成夏目安安发表锐评的表情包。
- **艾玛和希罗的审判**：生成艾玛或希罗进行论证对决的表情包。

## ⚙️ 配置项

本插件支持以下配置项：

| 配置项  | 类型      | 默认值  | 说明                                                                                    |
| ------- | --------- | ------- | --------------------------------------------------------------------------------------- |
| `debug` | `boolean` | `false` | **调试模式**：开启后，在图片渲染失败时不会自动关闭 Puppeteer 页面，便于开发者进行检查。 |

## 🎮 使用说明

### 1. manosaba.安安说

生成夏目安安表情包。

- **指令格式**：`manosaba.安安说 [text:text]`
- **选项**：
  - `-f, --face <face:string>`: 指定表情，默认为 `base`。

- **可用表情**：`默认`, `base`, `害羞`, `生气`, `病娇`, `无语`, `开心`。
- **示例**：
  - `manosaba.安安说 吾辈命令你现在【猛击自己的魔丸一百下】`
  - `manosaba.安安说 -f 害羞 吾辈命令你现在【猛击自己的魔丸一百下】`
  - `manosaba.安安说 吾辈命令你现在【猛击自己的魔丸一百下】[开心]` (在文本末尾用方括号指定表情)

### 2. manosaba.审判

生成艾玛或希罗的审判表情包。

- **指令格式**：`manosaba.审判 <options:string>`
- **选项**：
  - `-r, --role <role:string>`: 指定角色，可选值为 `ema` (艾玛) 或 `hiro` (希罗)，默认为 `ema`。

- **用法说明**：
  - 选项文本由一个或多个 `陈述:文本` 对组成，使用分号 (`;` 或 `；`) 分隔。
  - 陈述和文本之间使用冒号 (`:` 或 `：`) 分隔。
  - **可用陈述**：`赞同`, `疑问`, `伪证`, `反驳`。

- **示例**：
  - `manosaba.审判 赞同：一定是汉娜干的`
  - `manosaba.审判 --role hiro 伪证：我和艾玛不是恋人；赞同：我们初中的时候就确认关系了`
  - `manosaba.审判 -r 艾玛 疑问：汉娜和雪莉约会没有邀请我 很可疑`

## 🙏 致谢

- **灵感来源**: [nonebot-plugin-manosaba-memes](https://github.com/zhaomaoniu/nonebot-plugin-manosaba-memes)
- **在线体验**: [manosaba.com](https://manosaba.com/)