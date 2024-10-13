# koishi-plugin-verse-match

[![npm](https://img.shields.io/npm/v/koishi-plugin-verse-match?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-verse-match)

一个简单的小插件，用于自动对联，即用户提供上联，插件通过API接口返回匹配的下联。
使用本插件，你可以和机器人进行对对联的游戏，快速获取智能下联，体验传统文化的魅力。


## 使用方法


`verse-match <上联>`: 用户输入上联，插件返回对应的下联。

## 示例
**执行对对联命令**
用户：`verse-match 寂寞寒窗空守寡`

机器人：
```
▲上联:寂寞寒窗空守寡
==============
▼下联:相思明月总缠绵
▼下联:相思明月总缠绵
```


### 注意事项

- 上联只支持中文字符，不支持英文或特殊符号输入。

- 确保网络畅通，因为插件需要调用在线API进行对联生成。
