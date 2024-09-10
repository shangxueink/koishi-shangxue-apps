# koishi-plugin-baidu-image-search

[![npm](https://img.shields.io/npm/v/koishi-plugin-baidu-image-search?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-baidu-image-search)

/*图片搜索*/🎴根据文字搜索一张图片！百度搜图、搜狗搜图。提供快速的图片搜索，并具备自动切换至备用搜索接口的能力，以确保在主要接口不可用时的稳定性和连续性。

## 安装

在koishi插件市场搜索【baidu-image-search】并根据提示安装即可。

## 使用方法

### 使用插件

在您的 Koishi 应用实例中开启 `baidu-image-search` 
插件安装后，您可以在对话中使用以下命令执行图片搜索：

- **百度图片搜索**：`baidu-image-search <关键词>`

如果用户未提供关键词，插件会随机生成一个两字母关键词进行搜索。

## 错误处理

如果主要搜索接口发生错误（例如网络问题、返回404或403状态码），插件将自动尝试备用接口，并提供以下提示：

- 当主接口失败时："接口错误。尝试备用接口搜索ing......"
- 当备用接口没有找到相关内容时："备用接口也没有找到相关内容哦~"
- 当备用接口搜索失败时："备用接口搜索失败，请稍后重试。"
