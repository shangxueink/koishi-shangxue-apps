# Koishi Market Registry Redirector

## 简介

本项目是一个用户脚本，旨在解决访问 `https://koishi.chat/zh-CN/market/` (Koishi 插件市场) 时可能遇到的问题，通过将默认的官方注册表请求重定向到更新更完整的镜像源，确保用户能够获取最新的插件信息和版本。

## 功能

*   **注册表重定向:** 将 Koishi 插件市场的注册表请求从官方源自动重定向到备用镜像源。
*   **镜像源可配置:**  脚本内部配置了镜像源地址，方便用户根据需要进行修改。
*   **避免缓存:**  可选的时间戳参数可以添加到 URL 中，以防止浏览器缓存旧的注册表数据。
*   **调试模式:**  提供调试模式，方便开发者查看脚本运行状态和重定向信息。

## 使用方法

1.  **安装用户脚本管理器:**  首先，你需要安装一个用户脚本管理器，例如 Tampermonkey (适用于 Chrome, Firefox, Safari, Edge) 或 Greasemonkey (适用于 Firefox)。注意：请按照 [tampermonkey#Q209](https://www.tampermonkey.net/faq.php#Q209) 操作，开启开发者模式。

2.  **安装脚本:**  将 `Koishi Market Registry Redirector.user.js` 文件添加到用户脚本管理器中。  你可以直接复制脚本内容到管理器中，或者从GreasyFork安装。

3.  **访问 Koishi 插件市场:**  打开 `https://koishi.chat/zh-CN/market/` 或 `https://koishi.chat/market/`，脚本会自动将注册表请求重定向到配置的镜像源。

## 配置

脚本顶部包含一个配置区域，你可以根据需要修改以下选项：

*   `sourceUrl`:  要被替换的原始 URL（koishi官方插件市场镜像地址）。
*   `targetUrl`:  替换成的目标镜像源 URL。
*   `debug`:  是否启用调试模式，在控制台输出详细信息。
*   `avoidCache`:  是否在 URL 后添加时间戳以避免缓存。

## 镜像源

默认情况下，脚本使用 `https://koishi-registry-cf.yumetsuki.moe/index.json` 作为镜像源。  感谢 `yumetsuki.moe` 提供稳定可靠的镜像服务。

## 贡献

欢迎任何形式的贡献，包括但不限于：

*   报告 Bug
*   提出新功能建议
*   提交代码改进
*   提供更多可用的镜像源

## 许可证

本项目使用 `MIT 许可证`。

## 致谢

*   感谢 Koishi 团队开发出优秀的插件框架。
*   感谢 [Hoshino-Yumetsuki/koishi-registry](https://github.com/Hoshino-Yumetsuki/koishi-registry) 提供 Koishi 插件市场镜像服务。

## 其他

*   如果遇到任何问题，请在 [GitHub Issues](https://github.com/shangxueink/koishi-shangxue-apps/issues) 中提交 issue。
*   如果你喜欢这个脚本，欢迎给项目点个 Star!
