# koishi-plugin-storeluna

[![npm](https://img.shields.io/npm/v/koishi-plugin-storeluna?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-storeluna)

Koishi 插件，提供本地插件市场数据，支持两种工作模式：挂载模式 和 生成模式。

## 功能

*   **挂载模式 (推荐)**: 将远程插件市场（如官方市场或第三方市场）的数据直接挂载到 Koishi 实例。
*   **生成模式**: 从npm平台抓取数据，生成一个本地的 JSON 文件，作为静态插件市场镜像。可用于搭建完全离线的插件市场。
*   支持重试机制和缓存，提高数据加载的稳定性。

## 工作模式

### 1. 挂载模式 (推荐)

这种模式下，插件直接从 `远程插件市场 或者 本地JSON绝对路径` 获取数据，并将数据“挂载”到 Koishi 实例。用户可以直接通过 Koishi 的插件市场界面浏览和安装插件。

**优点：**

*   节省本地存储空间。
*   无需手动同步插件数据。
*   配置简单。

### 2. 生成模式

这种模式下，插件会从npm平台抓取所有插件的元数据，并生成一个本地的 JSON 文件。你可以将这个 JSON 文件部署到静态文件服务器上，搭建一个完全离线的插件市场。

**优点：**

*   完全离线可用。
*   可以作为插件市场的备份。
*   本地文件 加载响应速度 远超网络镜像


**生成本地 JSON 文件：**

1.  首先，将 `工作模式` 设置为`爬取生成模式`。
2.  启动 插件。插件会自动从npm平台抓取数据。
3.  抓取完成后，插件会在 Koishi 的数据目录 (`data` 文件夹) 下生成一个名为 `storeluna/index.json` 的文件。
4.  将 `工作模式` 设置为`挂载模式`。将 `upstream` 修改为 `file:///path/to/your/koishi/data/storeluna/index.json` (将 `/path/to/your/koishi/data` 替换为你的 Koishi 数据目录的绝对路径)。 
5. 在market插件里设置插件市场镜像为 storeluna 的文件挂载地址。
6. 重新启动 Koishi。

**算法参考:**

生成模式的算法参考了 [Hoshino-Yumetsuki/koishi-registry](https://github.com/Hoshino-Yumetsuki/koishi-registry)。


## 注意事项

*   生成模式下生成的 JSON 文件可能非常大（5MB左右），具体取决于远程插件市场包含的插件数量。
*   挂载模式下，插件数据的刷新间隔由 `refreshInterval` 配置项控制。（对网络镜像有效）