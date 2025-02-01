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
    <li>并发请求API</li>    
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
    consoleinfo: Schema.boolean().default(false).description('日志调试模式'),
  }),
]);

exports.apply = (ctx, config) => {
  const loggerinfo = (message) => {
    if (config.consoleinfo) {
      ctx.logger.info(message);
    }
  };

  class CustomizeImageSource extends koishi_plugin_booru.ImageSource {
    constructor(ctx, config) {
      super(ctx, config);
      this.languages = ['custom'];
      this.source = config.label;
      this.config = config;
    }

    async get(query) {
      try {
        const count = query.count || 1;
        loggerinfo(`[${this.config.label}] 开始请求 ${count} 张图片`);

        // 创建多个并发的请求
        const requests = Array.from({ length: count }, (_, i) => {
          loggerinfo(`[${this.config.label}] 正在请求第 ${i + 1} 张图片`);
          return this.ctx.http.get(this.config.APIurl)
            .then(response => {
              loggerinfo(`[${this.config.label}] 第 ${i + 1} 张图片获取成功`);
              return {
                urls: {
                  original: this.parseImageUrl(response),
                },
                pageUrl: this.parsePageUrl(response),
                nsfw: this.checkNSFW(response),
              };
            })
            .catch(error => {
              this.ctx.logger.error(`[${this.config.label}] 第 ${i + 1} 张图片失败: ${error.message}`);
              return null; // 返回 null 表示请求失败
            });
        });

        // 等待所有请求完成
        const images = await Promise.all(requests);

        // 过滤掉失败的请求
        const successfulImages = images.filter(image => image !== null);

        loggerinfo(`[${this.config.label}] 成功获取 ${successfulImages.length} 张图片`);
        loggerinfo(`----------------------------------------------------------`);
        return successfulImages;
      } catch (error) {
        this.ctx.logger.error(`[${this.config.label}] 请求失败: ${error.message}`);
        return [];
      }
    }

    parseImageUrl(response) {
      // 将二进制数据转换为Base64
      const base64 = Buffer.from(response).toString('base64');
      return `data:image/jpeg;base64,${base64}`;
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
