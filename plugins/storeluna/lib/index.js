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

---

## 使用前

请你明确本插件的功能性：为长期挂载的koishi实例提供稳定的market镜像源

但是作为日常：我们更推荐您使用网络镜像源！

推荐使用：Q78KG（全球）：https://koishi-registry.yumetsuki.moe/index.json

---

<p>提供基于规则过滤的插件市场镜像服务，支持本地/远程数据源</p>
<p>提供生成插件市场镜像文件的工作模式，用于本地文件挂载，让你的market再也不 *无法连接到插件市场*</p>

## 算法参考

爬取模式的算法参考： [Hoshino-Yumetsuki/koishi-registry](https://github.com/Hoshino-Yumetsuki/koishi-registry)。

---

<li><a href="https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/storeluna" target="_blank">点我查看完整项目 README</a></li>

<li><a href="https://forum.koishi.xyz/t/topic/10511/2" target="_blank">点我查看 论坛插件使用教程（本地镜像源）</a></li>


---

为了更稳定与避免部分网络问题，部分方法暂未与原项目算法跟进：（更多的是npmjs访问问题）
- 部分npmjs已经declare的包在npmminnor上却正常使用。本插件仍全部使用npmminnor数据。


---
`;

exports.Config = Schema.intersect([
  Schema.object({
    type: Schema.union([
      Schema.const('URL').description('挂载模式（从镜像 定时获取）'),
      Schema.const('NPM').description('本地镜像初始化（爬取生成JSON）').experimental(),
    ]).default("URL").description('工作模式'),
  }).description("工作模式设置"),

  Schema.object({
    upstream: Schema.string().default("https://registry.koishi.chat/index.json").role('link').description("上游数据源地址，支持：<br>• HTTP URL （插件市场镜像）<br>• 本地文件路径 （插件市场镜像的JSON文件）"),
    path: Schema.string().default("/storeluna/index.json").description("监听路径，默认：http://localhost:5140/storeluna/index.json<br>可以填入`market`插件 以实现使用此镜像"),
    syncInterval: Schema.number().default(3600).min(0).description("数据 同步/请求 间隔（秒）`0 代表不更新`<br>从`upstream`定时获取。若`upstream`为本地地址 则定时从npm爬取"),
    reportInterval: Schema.number().default(0).min(0).description("统计数据——日志报告间隔（秒）`0 代表不报告`"),
    reportTemplate: Schema.string().role('textarea', { rows: [2, 4] }).default("访问量: {visits} 📈 | 同步次数: {syncs} 🔄 | 成功次数: {success} ✅ | 过滤插件: {filtered} 🛠️").description("统计日志报告——模板<br>效果：定时在日志打印"),
    filterUnsafe: Schema.boolean().default(false).description("过滤不安全插件（过滤 insecure 标记的插件）"),
    enableFilter: Schema.boolean().default(false).description("启用规则过滤功能"),
  }).description("挂载设置"),
  Schema.union([
    Schema.object({
      enableFilter: Schema.const(false),
    }),
    Schema.object({
      enableFilter: Schema.const(true),
      blacklist: Schema.array(String).role('table').description("屏蔽插件关键词（支持正则）"),
      whitelist: Schema.array(String).role('table').description("白名单关键词（优先级高于黑名单）"),
    }),
  ]),

  Schema.object({
    searchaddress: Schema.union([
      Schema.const('https://registry.npmjs.org/').description('官方 NPM 镜像 (registry.npmjs.org)'),
      Schema.const('https://registry.npmmirror.com/').description('淘宝 NPM 镜像 (registry.npmmirror.com)'),
    ]).default('https://registry.npmmirror.com/').description("使用的 NPM 平台地址<br>暂时仅支持npm淘宝镜像源，官方源有严重的问题").disabled().role('radio'),
    bundlePath: Schema.string().default('./bundle.json').description("分类文件（bundle.json）的相对路径。相对于本插件的`index.js`目录<br>存本地是为了解决网络问题，原地址：https://koishi-registry.github.io/categories/bundle.json<br>默认使用本地json。若此项非默认值，则使用网络json"),
    responsetimeout: Schema.number().default(25).min(10).description("请求数据的超时时间（秒）"),
    retryDelay: Schema.number().default(1).min(0.1).description("请求失败时的重试间隔（秒）"),
    maxRetries: Schema.number().default(3).min(1).description("最大重试次数"),
  }).description("爬取设置"),

  Schema.object({
    cacheJSONpath: Schema.string().default("./data/storeluna/index.json").description("从npm平台搜索整合的数据 缓存文件 保存地址。<br>相对路径，相对于koishi根目录"),
    packagelinks: Schema.boolean().default(false).description("包地址是否根据`searchaddress`自动修改。<br>开启后，如果你使用`registry.npmmirror.com`则会生成的是`https://npmmirror.com/package/***`"),
    repositoryWithoutHomepage: Schema.boolean().default(true).description("为仅有`homepage`地址的包，添加`repository`地址"),
  }).description("JSON输出设置"),

  Schema.object({
    progressinfo: Schema.boolean().default(true).description("NPM拉取进度的日志输出"),
    consoleinfo: Schema.boolean().default(false).description("日志调试模式"),
  }).description("开发者设置"),

]);


async function apply(ctx, config) {

  const loggerinfo = (message) => {
    if (config.consoleinfo) {
      ctx.logger.info(message);
    }
  };

  // 获取包的短名称
  function getPackageShortname(name) {
    if (name.startsWith('@koishijs/')) {
      return name.replace('@koishijs/plugin-', '')
    } else if (name.startsWith('@')) {
      const [scope, pkgName] = name.split('/')
      return `${scope}/${pkgName.replace('koishi-plugin-', '')}`
    } else {
      return name.replace('koishi-plugin-', '')
    }
  }

  // 验证包是否为官方包
  function isVerifiedPackage(name) {
    return name.startsWith('@koishijs/')
  }

  // 使用 ctx.http.get 的重试函数, 包含详细错误日志和自定义重试间隔
  async function fetchWithRetry(url, options = {}, retries = config.maxRetries) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await ctx.http.get(url, {
          timeout: config.responsetimeout * 1000,
          responseType: 'text', // 强制作为文本
          ...options,
        });
        return JSON.parse(response); // 手动解析
      } catch (error) {
        loggerinfo(`[${i + 1}/${retries}] 请求 ${url} 失败: ${error.message || error}`);
        if (error.response) {
          loggerinfo(`状态码: ${error.response.status}`);
          if (error.response.data) {
            try {
              loggerinfo(`响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
            } catch (e) {
              // loggerinfo(`响应数据解析失败: ${error.response.data}`);
            }
          }
        }

        if (i === retries - 1) {
          ctx.logger.error(`所有重试均失败，不再重试: ${url}`);
          throw error; // 抛出最终的错误
        }

        const delay = config.retryDelay * 1000 * (i + 1); // 递增延迟
        loggerinfo(`等待 ${delay / 1000} 秒后重试...`);
        await new Promise((resolve) => ctx.setTimeout(resolve, delay));
      }
    }
  }

  // 确保 NPM 地址以 / 结尾
  function normalizeNpmUrl(url) {
    return url.endsWith('/') ? url : url + '/';
  }

  // 获取分类数据
  const CATEGORIES_API_URL = 'https://koishi-registry.github.io/categories/bundle.json';
  let categoriesCache = null;
  let categoriesLoading = null;

  async function fetchCategories() {
    try {
      let categoryData;
      if (config.bundlePath === "./bundle.json") {
        // 使用本地文件路径
        const bundlePath = path.resolve(__dirname, config.bundlePath);
        const bundleContent = await fs.readFile(bundlePath, 'utf8');
        categoryData = JSON.parse(bundleContent);
      } else {
        // 使用远程 URL
        categoryData = await fetchWithRetry(CATEGORIES_API_URL);
      }

      const categories = new Map();
      for (const [category, plugins] of Object.entries(categoryData)) {
        for (const plugin of plugins) {
          categories.set(plugin.trim(), category);
        }
      }
      return categories;
    } catch (error) {
      ctx.logger.error('分类数据加载失败（已尝试所有重试）:', error);
      return new Map(); // 加载失败时返回一个空的 Map
    }
  }


  async function loadCategories() {
    if (categoriesCache) {
      return categoriesCache;
    }
    if (categoriesLoading) {
      return await categoriesLoading;
    }
    categoriesLoading = fetchCategories();
    try {
      categoriesCache = await categoriesLoading;
      return categoriesCache;
    } finally {
      categoriesLoading = null;
    }
  }

  async function getCategory(packageName) {
    const categories = await loadCategories();
    return categories.get(packageName) || 'other';
  }


  // 评分计算函数
  function calculatePackageScore({
    packageInfo,
    versionInfo,
    timeInfo,
    maintainers,
    contributors,
    packageLinks
  }) {
    // 质量评分 (0-1)
    const quality = calculateQualityScore({
      hasDescription: !!versionInfo.description,
      hasRepository: !!packageLinks.repository,
      hasHomepage: !!packageLinks.homepage,
      hasBugs: !!packageLinks.bugs,
      hasTypes: !!versionInfo.types || !!versionInfo.typings,
      maintainersCount: maintainers.length,
      contributorsCount: contributors.length,
      hasLicense: !!versionInfo.license
    })

    // 维护性评分 (0-1)
    const maintenance = calculateMaintenanceScore({
      lastUpdated: new Date(timeInfo.modified),
      commitFrequency: calculateCommitFrequency(timeInfo),
      maintainersCount: maintainers.length
    })

    // 流行度评分 (0-1)
    const popularity = calculatePopularityScore({
      downloadCount: packageInfo.downloads?.lastMonth || 0,
      dependentsCount: packageInfo.dependents || 0,
      starsCount: 0 // 如果有 GitHub API 可以添加
    })

    // 最终评分 (0-1)
    const final = (quality * 0.4 + maintenance * 0.35 + popularity * 0.25) * 10

    return {
      final,
      quality: quality * 10,
      popularity: popularity * 10,
      maintenance: maintenance * 10
    }
  }

  function calculateQualityScore({
    hasDescription,
    hasRepository,
    hasHomepage,
    hasBugs,
    hasTypes,
    maintainersCount,
    contributorsCount,
    hasLicense
  }) {
    let score = 0
    if (hasDescription) score += 0.2
    if (hasRepository) score += 0.15
    if (hasHomepage) score += 0.1
    if (hasBugs) score += 0.1
    if (hasTypes) score += 0.15
    if (hasLicense) score += 0.1
    score += Math.min(maintainersCount * 0.1, 0.1)
    score += Math.min(contributorsCount * 0.05, 0.1)
    return Math.min(score, 1)
  }

  function calculateMaintenanceScore({
    lastUpdated,
    commitFrequency,
    maintainersCount
  }) {
    const now = new Date()
    const monthsSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60 * 24 * 30)

    let score = 0
    score += Math.max(0, 1 - monthsSinceUpdate / 12)
    score += Math.min(commitFrequency, 1) * 0.5
    score += Math.min(maintainersCount * 0.2, 0.5)

    return Math.min(score / 2, 1)
  }

  function calculatePopularityScore({
    downloadCount,
    dependentsCount,
    starsCount
  }) {
    const downloadScore = Math.min(downloadCount / 1000, 1)
    const dependentsScore = Math.min(dependentsCount / 10, 1)
    const starsScore = Math.min(starsCount / 100, 1)

    return downloadScore * 0.6 + dependentsScore * 0.3 + starsScore * 0.1
  }

  function calculateCommitFrequency(timeInfo) {
    const versions = Object.keys(timeInfo).filter(
      (key) => !['created', 'modified'].includes(key)
    )
    if (versions.length < 2) return 0

    const firstVersion = new Date(timeInfo[versions[0]])
    const lastVersion = new Date(timeInfo[versions[versions.length - 1]])
    const months = (lastVersion - firstVersion) / (1000 * 60 * 60 * 24 * 30)

    return months === 0 ? 0 : Math.min(versions.length / months, 1)
  }

  // 获取单个包的详细信息
  async function fetchPackageDetails(name, searchResult) {
    try {
      const npmUrl = normalizeNpmUrl(config.searchaddress);
      const pkgUrl = `${npmUrl}${name}`;
      const pkgData = await fetchWithRetry(pkgUrl);

      const latestVersion = pkgData['dist-tags']?.latest;
      const versionInfo = latestVersion ? pkgData.versions?.[latestVersion] : {};

      // 检查包是否被弃用
      if (versionInfo.deprecated || pkgData.deprecated) {
        return null;
      }

      // 检查是否有 peerDependencies
      const peerDeps = versionInfo.peerDependencies || {};
      if (!peerDeps.koishi) {
        return null;
      }

      const koishiManifest = versionInfo.koishi || pkgData.koishi || {};
      if (koishiManifest.hidden === true || koishiManifest.description?.hidden !== undefined) {
        return null;
      }

      const timeInfo = pkgData.time || {};
      const publisher = {
        name: versionInfo._npmUser?.name || '',
        email: versionInfo._npmUser?.email || '',
        username: versionInfo._npmUser?.name || ''
      };

      const maintainers = (pkgData.maintainers || []).map((maintainer) => ({
        name: maintainer.name || '',
        email: maintainer.email || '',
        username: maintainer.name || ''
      }));

      const contributors = Array.isArray(versionInfo.contributors) ? versionInfo.contributors.map(
        (contributor) => {
          if (typeof contributor === 'string') {
            return { name: contributor }
          }
          return {
            name: contributor.name || '',
            email: contributor.email || '',
            url: contributor.url || '',
            username: contributor.name || ''
          }
        }
      ) : [];


      const npmLink = config.packagelinks
        ? (config.searchaddress.startsWith("https://registry.npmjs.org") ? `https://www.npmjs.com/package/${name}` : `https://npmmirror.com/package/${name}`)
        : `https://www.npmjs.com/package/${name}`; // 默认使用官方 NPM 链接


      const packageLinks = {
        npm: npmLink,
      };
      if (versionInfo.bugs?.url) {
        packageLinks.bugs = versionInfo.bugs.url;
      }

      let repoUrl = null;
      if (versionInfo.repository) {
        if (typeof versionInfo.repository === 'object' && versionInfo.repository.url) {
          repoUrl = versionInfo.repository.url;
        } else if (typeof versionInfo.repository === 'string') {
          repoUrl = versionInfo.repository;
        }
      }

      // 处理 homepage 和 repository
      if (versionInfo.homepage) {
        packageLinks.homepage = versionInfo.homepage;
      } else if (config.repositoryWithoutHomepage && repoUrl) {
        const homepageUrl = repoUrl.replace(/^git\+/, ''); // 移除 "git+" 前缀
        packageLinks.homepage = homepageUrl;
      }

      if (repoUrl) {
        packageLinks.repository = repoUrl;
      }



      const isVerified = isVerifiedPackage(name);
      const shortname = getPackageShortname(name);

      if (!koishiManifest.description) {
        koishiManifest.description = { zh: versionInfo.description || '' };
      }

      const score = calculatePackageScore({
        packageInfo: searchResult,
        versionInfo,
        timeInfo,
        maintainers,
        contributors,
        packageLinks
      });

      const downloads = {
        lastMonth: searchResult.downloads?.all || 0 // 如果有下载量数据
      };
      const isInsecure = koishiManifest.insecure === true;

      // 获取分类
      const category = await getCategory(name);

      return {
        category: category || 'other',
        shortname,
        createdAt: timeInfo.created,
        updatedAt: timeInfo.modified,
        updated: timeInfo.modified,
        portable: false, // 根据需要设置
        verified: isVerified,
        score,
        rating: score.final,
        license: versionInfo.license || pkgData.license || '',
        package: {
          name,
          keywords: versionInfo.keywords || [],
          version: latestVersion,
          description: versionInfo.description || '',
          publisher,
          maintainers,
          license: versionInfo.license || pkgData.license || '',
          date: timeInfo[latestVersion],
          links: packageLinks,
          contributors
        },
        flags: {
          insecure: isInsecure ? 1 : 0
        },
        manifest: koishiManifest,
        publishSize: versionInfo.dist?.unpackedSize || 0,
        installSize: versionInfo.dist?.size || 0,
        dependents: 0, // 根据需要设置
        downloads,
        insecure: isInsecure,
        ignored: false
      };
    } catch (error) {
      ctx.logger.error(`Error fetching ${name}:`, error);
      return null;
    }
  }

  // 从 NPM 搜索并获取 Koishi 插件列表
  async function fetchKoishiPlugins() {
    // 预加载分类
    await loadCategories();

    const plugins = [];
    let fromOffset = 0;
    const size = 250; // 每次请求的数量
    let totalPackages = null;
    // 添加防抖动
    let lastRequestTime = 0;
    const requestInterval = 200; // 200毫秒间隔

    while (true) {
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;

      if (timeSinceLastRequest < requestInterval) {
        await new Promise((resolve) => ctx.setTimeout(resolve, requestInterval - timeSinceLastRequest));
      }

      const npmUrl = normalizeNpmUrl(config.searchaddress);
      const params = new URLSearchParams({
        text: 'koishi-plugin-', // 搜索关键词
        size: size,
        from: fromOffset
      });

      const searchUrl = `${npmUrl}-/v1/search?${params}`;

      lastRequestTime = Date.now(); // 更新请求时间
      const data = await fetchWithRetry(searchUrl);

      if (!totalPackages) {
        totalPackages = data.total;
      }

      const results = data.objects || [];
      if (!results.length) break;

      // 过滤出有效的包
      const validPackages = results
        .filter(result => /^(?:@[^/]+\/koishi-plugin-|@koishijs\/plugin-|koishi-plugin-)[\w-]+/.test(result.package?.name))
        .map(result => ({
          name: result.package.name,
          result: {
            ...result,
            downloads: result.downloads || { all: 0 } // 获取下载量
          }
        }));


      // 并行获取包的详细信息
      const batchPromises = validPackages.map(({ name, result }) =>
        fetchPackageDetails(name, result)
      );

      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter(Boolean); // 过滤掉 null 值
      plugins.push(...validResults);

      fromOffset += results.length;
      if (config.progressinfo) {
        ctx.logger("storeluna-updating").info(`进度: ${fromOffset}/${totalPackages} | 已收录: ${plugins.length}`);
      }

      if (fromOffset >= totalPackages) break;
    }

    ctx.logger("storeluna-updating").info(`\n扫描完成：`);
    ctx.logger("storeluna-updating").info(`- 总扫描数量: ${totalPackages}`);
    ctx.logger("storeluna-updating").info(`- 最终收录: ${plugins.length}`);

    return plugins;
  }

  // 保存数据到 JSON 文件
  async function saveMarketData(data) {
    const output = {
      time: new Date().toUTCString(),
      total: data.length,
      version: 1,
      objects: data,
    };

    const filePath = path.resolve(ctx.baseDir, config.cacheJSONpath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(output, null, 2), 'utf8');
    ctx.logger("storeluna-updating").info(`数据已保存到文件, 绝对路径：${filePath}`);
  }

  // 数据过滤逻辑 
  function applyFilters(data) {
    const filtered = [];
    const originalCount = data.length;

    // 不安全插件过滤
    if (config.filterUnsafe) {
      data = data.filter(item => {
        if (item.insecure) {
          filtered.push(item);
          return false;
        }
        return true;
      });
    }

    // 规则过滤
    if (config.enableFilter) {
      data = data.filter(item => {
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

    ctx.logger.info(`过滤完成，原始插件数：${originalCount} → 当前插件数：${data.length}`);
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


  // 状态统计
  const stats = {
    visits: 0,
    syncs: 0,
    success: 0,
    filtered: 0,
  };

  // 主数据缓存, 立即初始化
  let marketData = {
    time: new Date().toUTCString(),
    total: 0,
    version: 1,
    objects: [],
  };
  let filteredPlugins = [];

  // 🔒 添加一个锁，防止多个操作同时进行
  let isUpdating = false;

  // 初始化或从缓存/上游加载数据
  async function loadData() {
    try {
      let rawData;
      if (config.type === 'URL') {
        // 从上游 URL 或本地文件加载
        const upstream = config.upstream;

        if (upstream.startsWith('file://') || path.isAbsolute(upstream)) {
          const filePath = upstream.startsWith('file://')
            ? url.fileURLToPath(upstream)
            : upstream;
          rawData = await fs.readFile(filePath, 'utf8');
        } else {
          rawData = await ctx.http.get(upstream, { responseType: 'text' });
        }
        const loadedData = JSON.parse(rawData);
        [marketData.objects, filteredPlugins] = applyFilters(loadedData.objects || loadedData, config); // 兼容旧格式
        marketData.total = marketData.objects.length;
        marketData.time = loadedData.time || new Date().toUTCString(); // 更新时间

        stats.syncs++;
        stats.success++;
        ctx.logger.info(`从上游同步成功，插件总数：${marketData.total}`);

      } else { // 如果是 NPM 模式，尝试创建空 JSON
        const filePath = path.resolve(ctx.baseDir, config.cacheJSONpath);
        try {
          await fs.access(filePath); // 检查文件是否存在
          // 读取空的 JSON
          rawData = await fs.readFile(filePath, 'utf8');
          const loadedData = JSON.parse(rawData);
          [marketData.objects, filteredPlugins] = applyFilters(loadedData.objects || loadedData, config); // 兼容旧格式
          marketData.total = marketData.objects.length;
        } catch (error) { // 文件不存在，创建
          await saveMarketData([]); // 创建一个空的
        }

        ctx.logger.info(`已加载本地 JSON 文件，插件总数：${marketData.total}`);
      }

      // 延迟 ctx.inject 到 loadData 完成后
      ctx.inject(['console', 'console.services.market'], async (ctx) => {
        const consoleService = ctx.console;
        loggerinfo("强制刷新 market 插件中...");
        if (consoleService && consoleService.services && consoleService.services.market) {
          const marketService = consoleService.services.market;
          marketService['_error'] = null;
          marketService.start();
        }
      });

    } catch (error) {
      ctx.logger.error("加载数据失败：" + error.message);
    }
  }

  // 更新数据 (NPM 模式)
  async function updateDataFromNPM() {
    if (isUpdating) {
      ctx.logger.warn("已经在更新中，请勿重复操作。");
      return;
    }
    isUpdating = true;

    try {
      ctx.logger("storeluna-updating").info("storeluna 当前为 NPM 更新模式，将从 NPM 获取数据并更新本地文件。");
      ctx.logger("storeluna-updating").info("即将从npm地址拉取内容，请不要重载插件！");
      let plugins = await fetchKoishiPlugins();
      [marketData.objects, filteredPlugins] = applyFilters(plugins, config);
      marketData.total = marketData.objects.length;
      marketData.time = new Date().toUTCString();
      await saveMarketData(marketData.objects);
      stats.syncs++;
      stats.success++;
      ctx.logger("storeluna-updating").info(`从 NPM 同步成功，插件总数：${marketData.total}`);
      if (config.type === 'NPM') {
        ctx.logger.info(`请将配置项 "工作模式" 改为 "从上游镜像获取"，并且填入上述文件绝对路径，然后重启 Koishi 以切换到挂载模式。`);
      }
    } catch (error) {
      ctx.logger.error("从 NPM 更新数据失败：" + error.message);
    } finally {
      isUpdating = false; // 无论成功失败，都释放锁
    }
  }

  // 从上游同步数据 (URL 模式)
  async function syncDataFromUpstream() {
    if (isUpdating) {
      ctx.logger.warn("已经在更新中，请勿重复操作。");
      return;
    }
    isUpdating = true;

    try {
      ctx.logger.info("storeluna 当前为 URL 模式，将从上游同步数据。");
      const upstream = config.upstream;
      let rawData;

      if (upstream.startsWith('file://') || path.isAbsolute(upstream)) {
        const filePath = upstream.startsWith('file://')
          ? url.fileURLToPath(upstream)
          : upstream;
        rawData = await fs.readFile(filePath, 'utf8');
      } else {
        rawData = await ctx.http.get(upstream, { responseType: 'text' });
      }

      const loadedData = await JSON.parse(rawData);
      [marketData.objects, filteredPlugins] = applyFilters(loadedData.objects || loadedData, config);
      marketData.total = marketData.objects.length;
      marketData.time = loadedData.time || new Date().toUTCString();

      stats.syncs++;
      stats.success++;
      ctx.logger.info(`从上游同步成功，插件总数：${marketData.total}`);

    } catch (error) {
      ctx.logger.error("从上游同步数据失败：" + error.message);
    } finally {
      isUpdating = false;
    }
  }

  ctx.on('ready', async () => {
    // 根据模式决定是否立即更新
    if (config.type === 'NPM') {
      updateDataFromNPM();
    } else {
      // 如果是 URL 模式，则加载现有数据
      await loadData();

      // 注册路由 (仅在 URL 模式下)
      ctx.server.get(config.path, (ctx) => {
        if (marketData) {
          ctx.status = 200;
          ctx.body = marketData; // 直接返回 marketData
        } else {
          ctx.status = 503; // Service Unavailable
          ctx.body = { message: "Market data is still loading." };
        }
        stats.visits++;
      });
      ctx.logger.info(`路由已注册：${config.path}`);

      // 定时同步 (仅在 URL 模式下)
      if (config.syncInterval > 0) {
        ctx.setInterval(() => {
          if (config.upstream && (config.upstream.startsWith('file://') || path.isAbsolute(config.upstream))) {
            // 如果 upstream 是本地文件，从 NPM 更新
            updateDataFromNPM();
          } else {
            // 否则，从 upstream 同步
            syncDataFromUpstream();
          }
        }, config.syncInterval * 1000);
      }

    }

    // 统计报告 (与之前相同, 但只在 URL 模式下)
    if (config.reportInterval > 0) {
      ctx.setInterval(() => {
        const report = config.reportTemplate
          .replace('{visits}', stats.visits)
          .replace('{syncs}', stats.syncs)
          .replace('{success}', stats.success)
          .replace('{filtered}', filteredPlugins.length);
        ctx.logger.info(report);
      }, config.reportInterval * 1000);
    }
  });

  ctx.on('dispose', () => {
    // 在插件停用时取消更新
    isUpdating = false;
    ctx.logger.warn('插件已停用，已取消当前更新任务。');
  });

}

exports.apply = apply;