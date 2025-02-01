"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.usage = exports.inject = exports.name = void 0;

const { Schema, Logger } = require("koishi");
const koishi_plugin_booru = require("koishi-plugin-booru");


exports.inject = ['booru'];
exports.name = 'booru-custom-api';
exports.usage = `
<!DOCTYPE html>
<html>
<body>
  <h2>功能特性</h2>
  <ul>
    <li>支持多个图源并行配置</li>
    <li>基于标签的图源过滤系统</li>
    <li>权重控制请求优先级</li>    
  </ul>

  <h3>示例配置：</h3>
  <pre><code>
[
  {
    "APIurl": "https://t.mwm.moe/mp",
    "label": "moe"
  }
]
  </code></pre>

  <h2>使用示例</h2>
  <h3>基础指令格式：</h3>
  <pre><code>
booru -l &lt;标签&gt;
  </code></pre>

  <h3>具体使用示例：</h3>
  <table border="1">
    <tr>
      <th>指令</th>
      <th>触发图源</th>
      <th>匹配逻辑</th>
    </tr>
    <tr>
      <td><code>booru -l moe</code></td>
      <td>https://t.mwm.moe/mp</td>
      <td>匹配label包含"moe"的图源</td>
    </tr>
  </table>

  <h2>注意事项</h2>
  <ul>
    <li>标签匹配需要完全一致（区分大小写）</li>    
    <li>权重值影响图源的调用优先级（标签相同时）</li>
    <li>本地图源需要额外配置本地服务器</li>
  </ul>
</body>
</html>


`;

exports.Config = Schema.intersect([
  Schema.object({
    APItable: Schema.array(
      Schema.object({
        label: Schema.string().required().description('图源标签'),
        APIurl: Schema.string().required().description('API / URL 地址'),
        weight: Schema.number().min(1).max(100).default(1).description('权重'),
        // tags: Schema.array(Schema.string()).default([]).description('支持的标签'),
      })
    ).role('table').description('多图源配置表'),
  }),
]);

exports.apply = (ctx, config) => {
  class CustomizeImageSource extends koishi_plugin_booru.ImageSource {
    constructor(ctx, config) {
      super(ctx, config);
      this.languages = ['custom'];
      this.source = config.label;
      this.config = config;
    }

    async get(query) {
      try {
        const response = await this.ctx.http.get(this.config.APIurl);



        return [{
          urls: {
            original: this.parseImageUrl(response),
            large: this.parseImageUrl(response),
            medium: this.parseImageUrl(response),
            small: this.parseImageUrl(response),
            thumbnail: this.parseImageUrl(response),
          },
          // tags: this.config.tags,
          pageUrl: this.parsePageUrl(response),
          nsfw: this.checkNSFW(response),
        }];
      } catch (error) {
        ctx.logger.error(`[${this.config.label}] Error: ${error.message}`);
        return [];
      }
    }



    parseImageUrl(item) {
      return this.config.APIurl; // 直接返回配置的固定URL
    }

    parsePageUrl(item) {
      return this.config.APIurl;
    }

    checkNSFW(item) {
      return false;
    }
  }

  for (const sourceConfig of config.APItable) {
    ctx.booru.register(new CustomizeImageSource(ctx, {
      label: sourceConfig.label,
      APIurl: sourceConfig.APIurl,
      weight: sourceConfig.weight,
      // tags: sourceConfig.tags,
    }));
  }
};
