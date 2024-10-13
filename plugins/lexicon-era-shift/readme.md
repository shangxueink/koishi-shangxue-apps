# koishi-plugin-lexicon-era-shift

[![npm](https://img.shields.io/npm/v/koishi-plugin-lexicon-era-shift?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-lexicon-era-shift)


生成含有词语和释义的图片，来帮助用户了解新词汇的意义和用法。

## 功能特点
- **动态生成图片**：根据用户输入的词语和解释，动态生成展示这些信息的图片。
- **支持 Puppeteer**：利用 Puppeteer 在后端生成含有自定义 HTML 内容的截图。
- **日志调试支持**：可配置的日志调试模式，帮助开发者跟踪问题。


## 使用方法
直接使用命令 `词语新解` 或其别名 `成语新解`，会自动生成随机的词语新解：
```
词语新解
```

当然，你也可以在聊天中使用命令 `词语新解 <词语> <解释>` 或其别名 `成语新解` 来请求生成图片：
```
词语新解 坚韧不拔 牙齿又硬又有韧性，确实不好拔！
```
如果词语超过6个字符，插件将提示错误。
