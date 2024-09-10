# koishi-plugin-booru-custom-api

[![npm](https://img.shields.io/npm/v/koishi-plugin-booru-custom-api?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-booru-custom-api)


本插件，旨在提供一种简便方法，通过指定的API获取图片，方便在Koishi框架的环境下，通过`booru`插件使用。

## 功能
- 通过配置的API地址获取图片。
- 可配置的API URL。
- 错误处理机制，保证插件稳定运行。

## 安装

1. 确保你的Koishi机器人项目已经安装了`koishi-plugin-booru`。
2. 将`booru-custom-api`，从插件市场安装到你的koishi内。
3. 配置`booru-custom-api`的API ，然后开启即可！

## 配置

插件配置非常简单，只需要提供一个可以返回图片的API URL即可。

请确保你的 API URL 是有效可以访问的，并且能直接返回图片数据。

这里给出一个示例API，你可以用它来进行一些测试。

```
https://source.unsplash.com/1600x900

```

## 免责声明

请注意：此API URL（`https://source.unsplash.com/1600x900`）仅为示例，实际使用时请替换为你的具体API URL。
请确保API的合法性和稳定性，本插件不对从API获取的内容承担责任。

