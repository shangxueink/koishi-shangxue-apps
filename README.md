# <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Blue%20Heart.png" alt="Blue Heart" width="35" height="35" /> koishi-shangxue-apps 

## 项目简介  📚


欢迎来到 `koishi-shangxue-apps` 项目仓库！ ✨

这个仓库集合了我在 Koishi 上独立开发的所有插件。你可以在这里找到各种功能插件，帮助你更好地使用 Koishi。

- 有时候本项目代码上传并不及时，若与实际最新版有误差，请以 npm 平台为准。


## 如何在项目模板中开发此仓库（开发者指南） 🛠️

### 引入此仓库

1. **创建项目模板**  🚀
   ```shell
   yarn create koishi
   ```
   然后一路回车，直到弹出koishi的webUI。

2. **进入项目模板根目录**  📂

   先在koishi终端 按下 `Ctrl + C` 退出项目模板，然后 `cd` 进入目录：
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

### 插件语言说明 
<img src="https://raw.githubusercontent.com/MikeCodesDotNET/ColoredBadges/master/svg/dev/languages/js.svg" alt="js" style="max-width: 50%;">

在本项目中，部分插件是直接使用 JavaScript  编写的，而不是 TypeScript 编写后编译的。

此外，也有一些插件是用 TypeScript 开发的。

🔄 虽然都可以 HMR 热重载，但在进行二次开发时，请根据插件的编写语言进行区分来修改项目。


### 发布 npm 包 📦

本项目的贡献者可以在 `.publish/npmpublish` 目录下放置需要发布的 npm 包。

发布时，请确保将所有相关文件放在该目录中。

### 目录结构

```
publish/
├── npmpublish/
│   ├── lib 
│   ├── dist
│   ├── LICENSE.txt # 已经存在，无需上传
│   ├── package.json
│   ├── readme.md
│   └── ...  # 上传其他需要发布的文件
└── npmpublish_temp/
    └── LICENSE.txt # 模板文件，请勿改动
```

在 `npmpublish` 目录下，确保包含 `package.json` 和其他相关文件，以便顺利发布 npm 包。

具体实现效果 [请参见.github文件](.github/workflows/publish.yml)

当然，如果遇到部分资源文件过大等不方便上传发布的包

也可以在本地使用 ↓ 来发布
```
npm publish --registry=https://registry.npmjs.org/ --access=public
```


## 项目更新状态 ⚠️

如果你发现本项目的提交（commit）长时间未更新，这意味着作者暂停了本项目的更新，并且不再维护。

请自行判断项目的使用情况。


## 贡献指南

欢迎大家使用这些插件，并提出问题反馈。

⚠️ 然而，请注意 部分插件的 `package.json` 内名称包含 `@shangxueink` 的插件是我的私用插件，我不会接受关于这些插件的功能增改请求，仅接受 issue 反馈 bug。


## 许可证 📜

本项目采用 MIT 许可证，详情请参见 [LICENSE](./LICENSE) 文件。

---
