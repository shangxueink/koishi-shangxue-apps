# Koishi Market Registry Redirector

## 简介

本项目是一个用户脚本，旨在解决访问 `https://koishi.chat/zh-CN/market/` 时遇到的问题，通过将默认的官方注册表请求重定向到备用镜像源，确保用户能够获取最新的插件信息和版本。

## 功能

*   **注册表重定向:** 将 Koishi 插件市场的注册表请求从官方源自动重定向到备用镜像源。
*   **镜像源自动切换和重试:** 脚本会自动尝试多个镜像源，并在请求失败时自动切换到下一个，并具有重试机制。
*   **避免缓存:**  强制添加时间戳参数到 URL 中，防止浏览器缓存旧的注册表数据。
*   **时间修复:** 修复 Koishi 市场中插件发布时间显示不正确的问题。
*   **调试模式:**  提供调试模式，方便开发者查看脚本运行状态和重定向信息。

## 使用方法

1.  **安装用户脚本管理器:**  首先，你需要安装一个用户脚本管理器，例如 Tampermonkey (适用于 Chrome, Firefox, Safari, Edge) 或 Greasemonkey (适用于 Firefox)。注意：请按照 [tampermonkey#Q209](https://www.tampermonkey.net/faq.php#Q209) 操作，开启开发者模式。

2.  **安装脚本:**  将 `Koishi Market Registry Redirector.user.js` 文件添加到用户脚本管理器中。

    你可以直接[从 GitHub 地址复制](https://github.com/shangxueink/koishi-shangxue-apps/tree/main/scripts/Koishi%20Market%20Registry%20Redirector)脚本内容到管理器中，或者 [从 GreasyFork 安装](https://greasyfork.org/zh-CN/scripts/533105-koishi-market-registry-redirector)。

3.  **访问 Koishi 插件市场:**  打开 `https://koishi.chat/zh-CN/market/` 或 `https://koishi.chat/market/`，脚本会自动将注册表请求重定向到配置的镜像源。

## 配置

脚本顶部包含一个配置区域，你可以根据需要修改以下选项：

*   `sourceUrl`:  要被替换的原始 URL（Koishi 官方插件市场镜像地址）。
*   `mirrorUrls`:  备用镜像源列表，按优先级排序。
*   `debug`:  是否启用调试模式，在控制台输出详细信息。

**重要:**  请谨慎修改 `sourceUrl` 和 `mirrorUrls`，错误的配置可能导致脚本无法正常工作。

## 镜像源

脚本使用以下镜像源（按优先级排序）：

1.  `https://koishi-registry-cf.yumetsuki.moe`  
2.  `https://registry.koishi.t4wefan.pub/index.json`
3.  `https://kp.itzdrli.cc`
4.  `https://koi.nyan.zone/registry/index.json`
5.  `https://registry.koishi.chat/index.json` (官方源，作为最后的备选)

感谢 以上镜像地址及其团队们 提供稳定可靠的镜像服务。

## 贡献

欢迎任何形式的贡献，包括但不限于：

*   报告 Bug
*   提出新功能建议
*   提交代码改进
*   提供更多可用的镜像源

## 许可证

本项目使用 `MIT 许可证`。


## 其他

*   如果遇到任何问题，请在 [GitHub Issues](https://github.com/shangxueink/koishi-shangxue-apps/issues) 中提交 issue。
*   如果你喜欢这个脚本，欢迎给项目点个 Star!
