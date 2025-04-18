# Bilibili专栏原图链接提取2024改版

这是一个用户脚本，用于在PC端浏览B站专栏时获取所有图片的原图直链。此脚本可以帮助用户轻松地获取未经压缩的图片链接，方便使用其他工具批量下载原图。

---

## 功能

- 自动识别页面中的图片链接。
- 提供一键复制所有原图链接的功能，支持两种模式：
    - **整理为TXT文件：** 将所有链接整理为TXT格式，方便保存和管理。
    - **仅复制到剪贴板：** 快速复制所有链接到剪贴板，方便粘贴到其他应用。
- 界面友好，使用简单。

## 安装

要使用这个脚本，你需要先安装一个用户脚本管理器。

我们推荐使用 [Tampermonkey](https://www.tampermonkey.net/)，它支持多种浏览器，包括但不限于 Chrome、Firefox 和 Edge。

**注意：** 请按照 [tampermonkey#Q209](https://www.tampermonkey.net/faq.php#Q209) 操作，开启开发者模式。

作为备选，你也可以使用 [ScriptCat](https://docs.scriptcat.org/) 等其他脚本管理器。

安装脚本:
   - [点击此处安装 Bilibili专栏原图链接提取2024改版](https://greasyfork.org/zh-CN/scripts/521666-bilibili%E4%B8%93%E6%A0%8F%E5%8E%9F%E5%9B%BE%E9%93%BE%E6%8E%A5%E6%8F%90%E5%8F%962024%E6%94%B9%E7%89%88)

---

## 使用说明

安装扩展脚本后，打开哔哩哔哩专栏 -> https://search.bilibili.com/article/ ，在专栏中搜索您需要的图片素材。


**使用步骤：**

1.  **打开B站专栏页面：** 浏览你想要提取原图链接的B站专栏页面。
2.  **查找脚本按钮：** 脚本会在页面右下位置 添加两个按钮：
    -   **"获取原图链接"：** 点击此按钮后，所有图片的原图链接将被整理为TXT文件并自动下载。
    -   **"复制原图链接到剪贴板" (黄色按钮)：** 点击此按钮后，所有图片的原图链接将被直接复制到剪贴板。
3.  **根据需要选择按钮：**
    -   如果你需要保存所有链接到文件，点击 "获取原图链接"。
    -   如果你只需要快速复制链接到其他地方，点击 "复制原图链接到剪贴板"。

**配套表情包下载工具：**

为了更方便地下载表情包，我们还提供了一个配套的表情包下载页面 -> [MemeDownloader](https://shangxueink.github.io/koishi-shangxue-apps/MemeDownloader.html)。 

你可以使用此页面配合提取的链接进行批量下载。

---

## 许可证

本项目采用 `MIT` 许可证 发布。

## 致谢

感谢 [Hui-Shao](https://greasyfork.org/zh-CN/scripts/456497-bilibili%E4%B8%93%E6%A0%8F%E5%8E%9F%E5%9B%BE%E9%93%BE%E6%8E%A5%E6%8F%90%E5%8F%91) 的原始脚本，本脚本在其基础上进行了修改和增强。

如果你喜欢这个项目，请考虑支持原作者。

## 联系方式

由于本项目的初衷是为了给 `koishi-plugin-emojihub-bili` 提供一个方便用户的浏览器脚本。

如果你希望反馈此项目的问题，请前往 -> [GitHub Issue](https://github.com/shangxueink/koishi-shangxue-apps/issues)，我们会尽快予以回应。
