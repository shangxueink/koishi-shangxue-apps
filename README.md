# <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Blue%20Heart.png" alt="Blue Heart" width="35" height="35" /> koishi-shangxue-apps 

## 项目简介  📚

欢迎来到 `koishi-shangxue-apps` 项目仓库！ ✨

这个仓库集合了我在 Koishi 上独立开发的所有插件。你可以在这里找到各种功能插件，帮助你更好地使用 Koishi。

- 有时候本项目代码上传并不及时，若与实际最新版有误差，请以 npm 平台为准。


## 如何在项目模板中引入此仓库

1. **创建项目模板**  🚀
   ```shell
   yarn create koishi
   ```
   然后一路回车。

2. **进入项目模板根目录**  📂

   先按 `Ctrl + C` 退出项目模板，然后 `cd` 进入目录：
   ```shell
   cd koishi-app
   ```

3. **克隆本仓库** ⬇️
   ```shell
   yarn clone shangxueink/koishi-shangxue-apps
   ```

4. **修改 Koishi 根工作区的 `tsconfig.json`** 📝

   在 `tsconfig.json` 中添加以下内容：
   ```json
   "koishi-plugin-*": [
       "external/*/src",
       "external/*/packages/core/src",
       "packages/*/src",
       "plugins/*/src",
       "external/koishi-shangxue-apps/plugins/*/src" // 添加这一行
   ],
   ```
 
5. **以开发模式启动**  🚧
   ```shell
   yarn dev
   ```

## 插件语言说明 
<img src="https://raw.githubusercontent.com/MikeCodesDotNET/ColoredBadges/master/svg/dev/languages/js.svg" alt="js" style="max-width: 100%;">


在本项目中，部分插件是直接使用 JavaScript  编写的，而不是 TypeScript 编写后编译的。

此外，也有一些插件是用 TypeScript 开发的。

🔄 虽然都可以 HMR 热重载，但在进行二次开发时，请根据插件的编写语言进行区分来修改项目。


## 贡献指南

欢迎大家使用这些插件，并提出问题反馈。

⚠️ 然而，请注意 部分插件的 `package.json` 内名称包含 `@shangxueink` 的插件是我的私用插件，我不会接受关于这些插件的功能增改请求，仅接受 issue 反馈 bug。


## 许可证 📜

本项目采用 MIT 许可证，详情请参见 [LICENSE](./LICENSE) 文件。

---
