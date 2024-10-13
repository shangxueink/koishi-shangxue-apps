# koishi-plugin-freexiaoxue-api

[![npm](https://img.shields.io/npm/v/koishi-plugin-freexiaoxue-api?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-freexiaoxue-api)


## 功能
- 使用 Puppeteer 模拟网页交互，实现与 AI 模型的对话。
- 通过本地端口提供 API 接口，接收输入并返回 AI 的回复。
- 插件可集成在其他系统中，方便进行二次开发。


目前支持的网站模型：

- [Gemini AI](https://gemini.ai4you.top/) （当前为唯一支持的模型）


## 接口说明
### 请求方式：
- **HTTP GET 请求**
- 默认端口：`10721`
### 接口 URL：
```
http://127.0.0.1:10721?input=<您的输入文本>
```

### 响应：
- 成功：返回 AI 生成的文本回复。

## 配置项
在 `config` 中可对插件进行配置，默认设置如下：
- **port**：运行的端口，默认为 `10721`。
- **timeout**：等待 AI 回复的超时时间（单位：秒），默认为 `30`。
- **Interface_Selection**：当前只支持 `gemini` 模型。
- **loggerinfo**：是否开启日志调试选项，默认为 `false`。
## 常见问题
1. **服务启动后访问无响应怎么办？**
   - 请确保端口 `10721` 未被占用。
   - 确认配置中 `puppeteer` 的安装和网站访问是否正常。
2. **AI 返回空结果或者超时？**
   - 请检查网络是否能正常访问 `https://gemini.ai4you.top/`。
   - 超时问题可以通过修改配置文件中的 `timeout` 参数来适当延长等待时间。
3. **如何集成到其他系统？**
   - 你可以通过 HTTP 请求直接调用该服务的 API，将其集成到任何支持 HTTP 的系统中。
## 未来发展
- 计划支持更多的 AI 模型。
- 增加更多的网页自动化场景。

## 更新日志

<details>
<summary>点击此处 可查看更新日志</summary>

-   **0.1.0**   什么什么？

</details>  