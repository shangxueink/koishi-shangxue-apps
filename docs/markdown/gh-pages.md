# 编辑 / 开发 / 更新 此文档

欢迎参与此文档的开发与维护！

无论是修复问题、改进内容，还是添加新功能，我们都非常期待你的贡献。

## 编辑 / 开发 此文档

在 `docs` 分支下进行编辑或开发。

> https://github.com/shangxueink/koishi-shangxue-apps/tree/docs


### 开发环境配置

1. **Fork 仓库**  
   首先，请 Fork 本仓库的 `docs` 分支 到你的 GitHub 账号下。

2. **克隆仓库**  
   将你 Fork 的仓库克隆到本地：  
   ```bash
   git clone https://github.com/你的用户名/koishi-shangxue-apps.git
   ```

3. **安装依赖**  
   使用 Yarn 安装项目依赖：  
   ```bash
   cd koishi-shangxue-apps
   yarn install
   ```

4. **启动开发服务器**  
   运行以下命令启动 VitePress 开发模式：  
   ```bash
   yarn dev
   ```
   打开浏览器访问 `http://localhost:5173/koishi-shangxue-apps/` 即可查看文档。

   在本项目的 `docs` 分支下，编辑文档内容。

---

### 提交 Pull Request

1. **直接修改 `docs` 分支**  
   在本地 `docs` 分支上直接进行修改。

2. **提交更改**  
   完成修改后，提交你的更改：  
   ```bash
   git add .
   git commit -m "描述你的更改"
   git push origin docs
   ```

3. **创建 Pull Request**  

   前往 GitHub，进入你 Fork 的仓库，点击 **Compare & pull request** 按钮，
   
   选择 `docs` 分支作为目标分支，并填写 PR 描述。


我们会在收到 PR 后尽快审核并合并你的贡献！感谢你的支持！

## 更新 此文档

:::tip
一般你不需要手动更新：

当 `docs` 分支的 `docs` 目录变动时，`GitHub Actions` 会自动更新 `GitHub Pages`。

参见 -> [`.github/workflows/deploy-gh-pages.yml`](https://github.com/shangxueink/koishi-shangxue-apps/blob/docs/.github/workflows/deploy-gh-pages.yml)
:::

如果你需要手动触发 GitHub Actions 以更新文档，请按照以下步骤操作：

1. 访问 GitHub Actions 工作流页面：  
> https://github.com/shangxueink/koishi-shangxue-apps/actions/workflows/deploy-gh-pages.yml

2. 点击右上角的 **Run workflow** 按钮。

3. 选择分支（默认为 `main`），然后点击 **Run workflow**。

GitHub Actions 会自动构建并部署文档到 GitHub Pages。你可以在 Actions 页面查看构建进度和结果。

---

如有任何问题，欢迎通过 [Issues](https://github.com/shangxueink/koishi-shangxue-apps/issues) 反馈或讨论！