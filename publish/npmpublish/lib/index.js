"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.usage = exports.inject = exports.name = void 0;
const fs = require('node:fs').promises;
const path = require("node:path");
const url = require("node:url");
const { Schema, h } = require("koishi");

exports.inject = {
  required: ["server"]
};
exports.name = 'storeluna';
exports.reusable = true;
exports.usage = `
<h2>StoreLuna 插件市场镜像</h2>
<p>提供基于规则过滤的插件市场镜像服务，支持本地/远程数据源</p>
`;

exports.Config = Schema.intersect([
  Schema.object({
    upstream: Schema.string()
      .default("https://registry.koishi.chat/index.json")
      .description("上游数据源地址，支持：<br>• HTTP URL<br>• 本地文件路径 (绝对路径或 file:// 协议)"),
    path: Schema.string()
      .default("/storeluna/index.json")
      .description("监听路径，默认：http://localhost:5140/storeluna/index.json"),
    syncInterval: Schema.number()
      .default(60)
      .min(10)
      .description("数据同步间隔（秒）"),
  }).description("基础设置"),

  Schema.object({
    reportInterval: Schema.number()
      .default(600)
      .min(60)
      .description("统计数据——报告间隔（秒）"),
    reportTemplate: Schema.string()
      .role('textarea', { rows: [2, 4] })
      .default("访问量: {visits} 📈 | 同步次数: {syncs} 🔄 | 成功次数: {success} ✅ | 过滤插件: {filtered} 🛠️")
      .description("统计报告——模板<br>效果：定时在日志打印"),
    filterUnsafe: Schema.boolean()
      .default(false)
      .description("过滤不安全插件（过滤 insecure 标记的插件）"),
  }).description("日志报告设置"),

  Schema.object({
    enableFilter: Schema.boolean()
      .default(false)
      .description("启用规则过滤功能"),
  }).description("过滤规则"),
  Schema.union([
    Schema.object({
      enableFilter: Schema.const(false),
    }),
    Schema.object({
      enableFilter: Schema.const(true),
      blacklist: Schema.array(String)
        .role('table')
        .description("屏蔽插件关键词（支持正则）"),
      whitelist: Schema.array(String)
        .role('table')
        .description("白名单关键词（优先级高于黑名单）"),
    }),
  ]),

  Schema.object({
    consoleinfo: Schema.boolean().default(false).description("日志调试模式"),
  }).description("调试设置"),
]);

async function apply(ctx, config) {
  const loggerinfo = (message) => {
    if (config.consoleinfo) {
      ctx.logger.info(message);
    }
  };


  if (!ctx.server) {
    ctx.logger.error("需要启用 server 插件");
    return;
  }

  // 状态统计
  const stats = {
    visits: 0,
    syncs: 0,
    success: 0,
    filtered: 0,
  };

  // 主数据缓存
  let marketData = null;
  let filteredPlugins = [];

  // 初始化数据
  try {
    [marketData, filteredPlugins] = await fetchMarketData(config);
    stats.syncs++;
    stats.success++;
    ctx.logger.info(`初始同步成功，插件总数：${marketData.objects.length}`);
  } catch (error) {
    ctx.logger.error("初始化失败：" + error.message);
    return;
  }

  // 定时同步
  ctx.setInterval(async () => {
    loggerinfo("同步镜像中...");
    try {
      [marketData, filteredPlugins] = await fetchMarketData(config);
      stats.syncs++;
      stats.success++;
    } catch (error) {
      ctx.logger.warn("同步失败：" + error.message);
    }
  }, config.syncInterval * 1000);

  // 统计报告
  ctx.setInterval(() => {
    const report = config.reportTemplate
      .replace('{visits}', stats.visits)
      .replace('{syncs}', stats.syncs)
      .replace('{success}', stats.success)
      .replace('{filtered}', filteredPlugins.length);
    ctx.logger.info(report);
  }, config.reportInterval * 1000);

  // 注册路由
  ctx.server.get(config.path, (ctx) => {
    ctx.status = 200;
    ctx.body = marketData;
    stats.visits++;
  });
  ctx.logger.info(`路由已注册：${config.path}`);

  // 核心函数：获取并处理市场数据
  async function fetchMarketData() {
    let rawData;
    const upstream = normalizePath(config.upstream);

    // 本地文件处理
    if (upstream.startsWith('file://') || path.isAbsolute(upstream)) {
      const filePath = upstream.startsWith('file://')
        ? url.fileURLToPath(upstream)
        : upstream;
      rawData = await fs.readFile(filePath, 'utf8');
    } else {
      // 远程请求
      rawData = await ctx.http.get(upstream);
    }

    const data = JSON.parse(rawData);
    return applyFilters(data, config);
  }

  // 数据过滤逻辑
  function applyFilters(data, config) {
    const filtered = [];
    const originalCount = data.objects.length;

    // 不安全插件过滤
    if (config.filterUnsafe) {
      data.objects = data.objects.filter(item => {
        if (item.insecure) {
          filtered.push(item);
          return false;
        }
        return true;
      });
    }

    // 规则过滤
    if (config.enableFilter) {
      data.objects = data.objects.filter(item => {
        const isBlacklisted = checkRules(item, config.blacklist);
        const isWhitelisted = checkRules(item, config.whitelist);

        if (isWhitelisted) return true;
        if (isBlacklisted) {
          filtered.push(item);
          return false;
        }
        return true;
      });
    }

    loggerinfo(`过滤完成，原始插件数：${originalCount} → 当前插件数：${data.objects.length}`);
    return [data, filtered];
  }

  // 规则检查工具函数
  function checkRules(item, rules) {
    if (!rules || !rules.length) return false;

    return rules.some(rule => {
      const regex = new RegExp(rule, 'i');
      return (
        regex.test(item.shortname) ||
        regex.test(item.package.description) ||
        regex.test(item.package.publisher?.email)
      );
    });
  }

  // 路径标准化处理
  function normalizePath(input) {
    try {
      const parsed = new url.URL(input);
      return parsed.href;
    } catch {
      return input.replace(/\\/g, '/');
    }
  }
}

exports.apply = apply;
