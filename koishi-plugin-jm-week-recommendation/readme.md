# koishi-plugin-jm-week-recommendation

[![npm](https://www.npmjs.com/package/koishi-plugin-jm-week-recommendation)](https://www.npmjs.com/package/koishi-plugin-jm-week-recommendation)

/*一本好书*/👍精选 JmComic 周排行top10

## 功能特色

- **精选书籍**：插件每周更新，精选 JmComic 平台上的 top10 推荐书籍，为用户提供高质量的阅读选择。

- **图文展示**：启用 `imageMode` 功能，用户将收到书籍的封面图像，以丰富阅读体验。

## `imageMode` 配置项使用说明

在插件的配置文件中，默认 `imageMode` 选项设置为 `false`。

**在启用此功能前，务必确认您的网络环境能够访问 [https://18comic.vip/](https://18comic.vip/)。** 

我们强烈建议用户在启用 `imageMode` 前，能够仔细阅读本文档，了解相关内容。

**特别提醒：启用后，书籍封面图片可能包含成人内容或其他敏感元素，用户需要对此给予充分的注意。** 

## 版权与免责声明
本插件所收集和展示的所有书籍信息及封面图片来源于 JmComic 平台，其版权均归原作者及平台所有。本插件仅用于推广阅读和分享知识，不对任何法律责任承担。

## 使用提醒
在分享书籍信息时，请用户充分考虑所在群组和平台的适宜性，严格遵守相关法律法规，尊重版权，文明分享。


## 更新日志

- **0.2.8** 使用国内可访问的cdn节点展示图片

- **0.2.7** 维护更新。

- **0.2.6** 完善在控制台的说明文字

- **0.2.5** 1.支持配置项自定义开关是否发送封面！ 感谢 [mmzzxx](https://github.com/mmzzxx114514) 的优秀建议。 2.维护更新书籍至 2024/3/29 。

- **0.2.4** 维护更新。

- **0.2.3** 修复 JSON 读取错误。

- **0.2.2** 删除 picACG 相关指令，优化代码结构，更新至 2024 年 2 月 2 日的数据。