# 编辑 / 开发 / 更新 此文档

欢迎参与此文档的开发与维护！无论是修复问题、改进内容，还是添加新功能，我们都非常期待你的贡献。

## 快速开始

1. **Fork 仓库**  
   先将此仓库 Fork 至你的账号下，
   
   注意取消勾选 `Copy the main branch only`，确保包含所有分支。

2. **克隆 docs 分支**
   ```bash
   git clone --branch docs --single-branch https://github.com/你的用户名/koishi-shangxue-apps.git
   ```

3. **进入项目目录**
   ```bash
   cd koishi-shangxue-apps
   ```

4. **安装依赖**
   ```bash
   yarn install
   ```

5. **启动开发服务器**
   ```bash
   yarn dev
   ```
   打开浏览器访问 `http://localhost:5173/koishi-shangxue-apps/` 即可实时预览文档。

## 开发指南

### 文档结构
- 文档源文件位于 `docs` 目录下
- 使用 VitePress 构建，支持 Markdown 和 Vue 组件
- 分支说明：
  - `docs` 分支：文档开发和编辑
  - `main` 分支：主分支（自动部署）

### 编辑流程

1. **直接编辑**：在 `docs` 分支下直接修改文档文件
2. **实时预览**：运行 `yarn dev` 查看更改效果
3. **提交更改**：
   ```bash
   git add .
   git commit -m "描述你的更改"
   git push origin docs
   ```
4. **创建 Pull Request**：
   - 前往你的 GitHub 仓库页面
   - 点击 **Pull requests** → **New pull request**
   - 选择将你的 `docs` 分支合并到原仓库的 `docs` 分支
   - 填写清晰的 PR 描述

## 文档更新

### 自动更新
通常情况下，你无需手动更新文档。当 `docs` 分支的文档内容发生变更时，GitHub Actions 会自动构建并部署到 GitHub Pages。

工作流文件：[`.github/workflows/deploy-gh-pages.yml`](https://github.com/shangxueink/koishi-shangxue-apps/blob/docs/.github/workflows/deploy-gh-pages.yml)

### 手动触发
如需手动触发文档更新：

1. 访问 [GitHub Actions 页面](https://github.com/shangxueink/koishi-shangxue-apps/actions/workflows/deploy-gh-pages.yml)
2. 点击 **Run workflow** 按钮
3. 选择分支（默认 `main`），点击 **Run workflow**

构建进度可在 Actions 页面实时查看。

## 注意事项

- 请确保在 `docs` 分支上进行文档编辑
- 提交 PR 前请测试本地开发服务器是否正常
- 重大改动建议先在 Issue 中讨论

---

如有任何问题，欢迎通过 [Issues](https://github.com/shangxueink/koishi-shangxue-apps/issues) 反馈或讨论！