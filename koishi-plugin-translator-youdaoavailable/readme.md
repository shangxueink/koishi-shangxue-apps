# koishi-plugin-translator-youdaoavailable

[![npm](https://www.npmjs.com/package/koishi-plugin-translator-youdaoavailable)](https://www.npmjs.com/package/koishi-plugin-translator-youdaoavailable)

这是一个集成了中英互译功能的插件，以有道翻译为主。提供了开箱即用的翻译功能。多个备用API，确保翻译的可用性。

## 安装
通过koishi插件市场安装这个插件：
插件市场搜索 `translator-youdaoavailable`，按照指引安装即可。

## 使用方法

### 执行翻译命令
插件应用后，您可以在聊天机器人或应用程序中使用以下命令进行翻译：
```
translation-youdao <内容>
```
将 `<内容>` 替换为您想要翻译的文本。

### 示例
用户与命令的交互示例：
**用户**: `translation-youdao 你好，世界！`
**机器人**: `正在翻译，请稍候...`
**机器人**: `翻译结果：Hello, world!`

### 错误处理
如果主要翻译服务失败，该插件将自动尝试备用服务。
除非全部失效，否则用户在整个过程中不被告知，仅控制台日志会输出相关问题。


### 更新日志
- **0.2.0** 
    - 维护功能性正常
    - 支持`i18n`本地化
    - 取消提供翻译服务

- **0.1.2**  使用ctx.http，取消axios

- **0.1.1**  package.json内加入service-implements，提供translator服务。

- **0.1.0**  1.优化代码整体结构。2.修复换行bug。 3.不再将使用备用API的提示发给用户，而是遇到错误输出到日志。