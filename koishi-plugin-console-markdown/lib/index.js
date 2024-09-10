"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.inject = exports.name = void 0;

const koishi_1 = require("koishi");
const logger = new koishi_1.Logger('console-markdown');

exports.name = "console-markdown";
exports.usage = "编辑你的markdown，看看控制台的展示效果";

// 默认Markdown内容
const defaultMarkdown = `- **加粗文本**
- *斜体文本*
- [链接](https://example.com)
- 列表项
  - 嵌套列表项

> 引用文本
`;

// 配置定义
exports.Config = koishi_1.Schema.intersect([
  koishi_1.Schema.object({
    markdown: koishi_1.Schema.string().role('textarea', { rows: [10, 4] })
      .description('编辑markdown，看看控制台展示效果')
      .default(defaultMarkdown),
    loggerinfo: koishi_1.Schema.boolean().default(true)
      .description("日志调试模式`记录每次加载的markdown内容`"),
  }).description('基础设置'),
]);

async function apply(ctx, config) {
  try {
    // 将config.markdown内容赋值给exports.usage
    exports.usage = config.markdown;

    // 记录当前的Markdown内容
    if (config.loggerinfo && config.markdown.length > 0) {
      logger.info(`当前markdown内容: \n${config.markdown}`);
    } //else {      logger.warn("Markdown内容为空或日志调试模式未开启。");    }
  } catch (error) {
    logger.error(`应用配置时发生错误: ${error.message}`);
  }
}

exports.apply = apply;
