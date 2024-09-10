# koishi-plugin-aivideo-bigmodel

[![npm](https://img.shields.io/npm/v/koishi-plugin-aivideo-bigmodel?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-aivideo-bigmodel)

## 介绍

`aivideo-bigmodel`插件是一个基于 Koishi 框架的视频生成插件。利用智谱AI开发的 CogVideoX 模型，

用户只需输入文本或图片即可生成视频。该插件通过调用 CogVideoX 的视频生成接口，自动化地生成视频并发送给用户。

## 功能

- 通过命令 `生成视频 [prompt]` 生成视频
- 支持文本和图片输入
- 自动轮询生成进度并在完成后发送视频
- 支持多API Key负载均衡

## 安装
请确保你已经安装了 Koishi 框架，然后将插件代码放置到你的实例中。


## 使用方法

1. 启动 Koishi 机器人。
2. 在聊天中输入命令 `生成视频 [prompt]`，例如 `生成视频 开心开心一家人`。
3. 机器人会提示 `请发送图片：`。
4. 用户发送图片。
5. 机器人会在 3~5 分钟内生成视频并发送给用户。

### 示例

```
用户： 生成视频 开心开心一家人
机器人：请发送图片：
用户：[图片消息]
机器人：[视频消息]
```

## 注意事项

- 生成一个视频大约需要 5 分钟左右，一般情况下 3~4 分钟。
- 请确保你的 API Key 有效并且具有足够的调用额度。

## Key获取

前往 [GLM开放平台](https://bigmodel.cn/usercenter/apikeys) 获取 API Key：

1. 使用手机号注册账号。
2. 生成多个 API Key。
3. 将生成的 API Key 填入配置文件中。

## 负载均衡

为了提高稳定性和效率，可以使用多个 API Key 实现负载均衡。只需在配置文件中添加多个 API Key 即可：

请替换内置的 API Key，因为这些 Key 可能已经被其他用户使用。
