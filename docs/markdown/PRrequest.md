# 开发者指南 🛠️

### 如何在项目模板中开发此仓库

1.  **创建项目模板** 🚀

    ```shell
    yarn create koishi
    ```

    一路回车，直到弹出 Koishi 的 WebUI。

2.  **进入项目模板根目录** 📂

    先在 Koishi 终端按下 `Ctrl + C` 退出项目模板，然后 `cd` 进入目录：

    ```shell
    cd koishi-app
    ```

3.  **克隆本仓库** ⬇️

    ```shell
    yarn clone shangxueink/koishi-shangxue-apps
    ```

4.  **修改 Koishi 根工作区的 `tsconfig.json`** 📝
    ::: tip
    如果你要开发本仓库的`.ts`项目，那么这一步是必须的：（`.js`项目可略过）
    ::: 
    在 `tsconfig.json` 中添加以下内容，以使 `hmr` 正常工作：

    ```json
    "koishi-plugin-*": [
        "external/*/src",
        "external/*/packages/core/src",
        "packages/*/src",
        "plugins/*/src",
        "external/koishi-shangxue-apps/plugins/*/src" // 添加这一行
    ],
    ```

5.  **以开发模式启动** 🚧
    
    ```shell
    yarn dev
    ```

---


### 插件语言说明

本项目中，部分插件直接使用 JavaScript 编写，而非 TypeScript 编译。

同时，也有部分插件使用 TypeScript 开发。

🔄 两者都支持 HMR 热重载，但在进行二次开发时，请根据插件的编写语言进行区分。


---

### 发布 npm 包 📦

本项目的贡献者可以在 [`./publish/npmpublish`](https://github.com/shangxueink/koishi-shangxue-apps/tree/main/publish/npmpublish) 目录下放置需要发布的 npm 包。

发布时，请确保将所有相关文件放在该目录中。

### publish 目录结构

```shell
└───publish/
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

具体实现逻辑 请参见本仓库的 [`./.github/workflows/publish.yml`](https://github.com/shangxueink/koishi-shangxue-apps/blob/main/.github/workflows/publish.yml)

---

::: tip
如果遇到资源文件过大等不方便上传发布的情况，可以在本地使用以下命令发布：

```shell
npm publish --registry=https://registry.npmjs.org/ --access=public
```
::: 