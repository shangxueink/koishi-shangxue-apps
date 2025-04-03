# koishi-plugin-storeluna

[![npm](https://img.shields.io/npm/v/koishi-plugin-storeluna?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-storeluna)

Koishi 插件，提供本地插件市场数据镜像，支持从远程 URL 或本地文件加载数据，并能从 NPM 爬取数据生成本地镜像文件。

## 功能

*   **数据源灵活：**
    *   **远程 URL：**  直接从远程插件市场镜像（如官方市场或其他第三方镜像）同步数据。
    *   **本地文件：**  从本地 JSON 文件加载数据（`file://` 协议或绝对路径）。
    *   **NPM 爬取：**  从 NPM 平台爬取插件数据，生成本地 JSON 镜像文件，实现完全离线的插件市场。
*   **数据过滤：**
    *   **不安全插件过滤：**  自动过滤标记为 `insecure` 的插件。
    *   **自定义规则过滤：**  支持通过黑名单和白名单（关键词或正则表达式）过滤插件。
*   **性能优化：**
    *   **缓存机制：**  缓存已加载的数据，减少重复请求。
    *   **重试机制：**  网络请求失败时自动重试。
    *   **防抖动：**  控制 NPM 爬取时的请求频率，避免过于频繁。
*   **统计与报告：** 可配置定时日志报告，显示访问量、同步次数、成功次数和过滤的插件数量。
*  **与`market`插件高度整合** 可直接在`market`插件中设置使用此镜像

## 使用场景

1.  **加速插件市场访问：**  通过本地镜像或更快的第三方镜像，提高插件市场的加载速度。
2.  **内网/离线环境：**  在无法访问外网的环境中，通过本地 JSON 文件提供插件市场服务。
3.  **插件市场备份：**  定期从 NPM 爬取数据，生成本地备份，防止官方市场或其他镜像不可用。
4.  **自定义插件市场：**  通过规则过滤，创建只包含特定插件的定制化市场。

## 从 NPM 生成本地镜像

1.  **配置插件：**
    *   设置 `upstream` 为一个本地文件路径，例如：`file:///path/to/your/koishi/data/storeluna/index.json` (将 `/path/to/your/koishi/data` 替换为你的 Koishi 数据目录的绝对路径)。  或者直接填写绝对路径，如 `C:\koishi\data\storeluna\index.json`。
    *   （可选）调整其他配置项，如 `searchaddress`、`filterUnsafe`、`blacklist`、`whitelist` 等。
2.  **启动 插件：**  插件会自动从 NPM 爬取数据，并保存到 `cacheJSONpath` 指定的文件。
3.  **等待爬取完成：**  首次爬取可能需要较长时间（几分钟到几十分钟，取决于网络状况和插件数量）。可以在日志中查看进度。
4.  **使用本地镜像：**
    *   将 `upstream` 设置为上一步生成的本地文件路径（`file://` 开头或绝对路径）。
    *   在 `market` 插件中设置插件市场镜像为 storeluna 的文件挂载地址（`path` 配置的路径）。
    *   重启 Koishi。

## 注意事项

*   从 NPM 爬取生成的 JSON 文件可能较大（5MB 或更大），具体取决于 NPM 上的 Koishi 插件数量。
*   `syncInterval` 设置为大于 0 的值时：
    *   如果 `upstream` 是远程 URL，插件会定期同步。
    *   如果 `upstream` 是本地文件，插件会定期从 NPM 爬取并更新本地文件。

## 算法参考


生成模式的算法参考了 [Hoshino-Yumetsuki/koishi-registry](https://github.com/Hoshino-Yumetsuki/koishi-registry)。
