# koishi-plugin-universal-translation

[![npm](https://img.shields.io/npm/v/koishi-plugin-universal-translation.svg)](https://www.npmjs.com/package/koishi-plugin-universal-translation)

通用翻译插件，支持200+语种，开箱即用的翻译体验。添加默认目标语言的配置项，提供友好的用户交互反馈。

## 特点

- 支持200+语种的翻译。
- 添加了默认目标语言配置，可在插件配置中设置。
- 用户友好的错误提示与导引。
- 简单易用的命令式交互。
- 整合双接口，更加稳定！

## 安装教程

在 koishi 插件市场搜索 `universal-translation` 即可下载安装。

## 默认语言配置说明

- 在控制台填入目标语言的代码后，按下右上角的【重载配置】即可

## 插件使用方法说明

- 在群聊中或私聊中，通过发送命令调用翻译功能。

- 使用示例：

  - 翻译给定文本到指定语言：
    ```
    翻译 你好 -t en
    ```
    或者（【-t en】可以放在任意位置）
    ```
    翻译 -t en 你好
    ```
  - 如果您忘记输入翻译内容，将会收到提示：
    ```
    翻译 -t en
    ```
    返回提示：
    ```
    请输入需要翻译的内容。
    ```
  - 如果指定的语言代码无效或发生网络问题，系统将会给出相应的指示：
    ```
    翻译 -t xyz 你好
    ```
    返回提示：
    ```
    请求出错，请检查目标语言的代码是否正确后重试。
    ```

- 提示：您可以通过命令 `语言代码对照表` 获取支持的语言代码列表。
```
语言代码对照表
``` 
返回链接：
```
各国家语言代码对照表请见这里【http://www.lingoes.cn/zh/translator/langcode.htm】
```

## 更新说明
- **0.1.3** - ts重构
- **0.1.2** - ctx.http调用
- **0.1.1** - 请求URL时不再调用encodeURIComponent函数对text变量进行编码。
- **0.1.0** - package.json内加入service-implements，提供translator服务。
- **0.0.9** - 1.取消返回转接备用接口的提示，更加直白。对于不支持的语言和无法翻译的内容，会对两个API都进行尝试。
            - 2.优化交互返回和容错提示。
- **0.0.8** -发现suapi.net不稳定，换更快的可用接口作为主接口，并去掉suapi.net接口。
- **0.0.7** - 1.整合双接口。0.0.4版本的API恢复，把0.0.4的API作为主接口，0.0.5的接口作为备用接口。调用时若0.0.4-API失效，自动调用0.0.5-API。
            - 2.单独分出映射表languageMap.json，主体代码更简洁易懂。
- **0.0.6** - 部分语言（如日语）输入特定语句会翻译失败而返回空值。新增友好提示“翻译失败了呢~ 好像这个句子太难翻译了...呜喵”
- **0.0.5** - 换成临时的翻译API-0.0.5版本来用，同样支持多语言。
- **0.0.4** - 原本的API-0.0.4版可以用，但好像带参数就访问不了？



### 接口声明

0.0.4及以前使用
https://suapi.net/api/text/translate?to=${targetLanguage}&text[]=${encodeURIComponent(content)}

0.0.5 ~ 0.0.7
https://translate.cloudflare.jaxing.cc/?text=${encodeURIComponent(content)}&source_lang=zh&target_lang=${targetLanguage}

0.0.8 发现suapi.net不稳定，更换 更快的主接口
https://api.jaxing.cc/v2/Translate/Tencent?SourceText=${encodeURIComponent(content)}&Target=${targetLanguage}

0.1.1 请求URL时不再调用encodeURIComponent函数对text变量进行编码。
https://api.jaxing.cc/v2/Translate/Tencent?SourceText=${(content)}&Target=${targetLanguage}