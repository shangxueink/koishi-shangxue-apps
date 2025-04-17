# koishi-plugin-commands-refresh

[![npm](https://img.shields.io/npm/v/@shangxueink/koishi-plugin-commands-refresh)](https://www.npmjs.com/package/@shangxueink/koishi-plugin-commands-refresh)


本插件是 `@koishijs/plugin-commands` 的 fork 版本，在保留原有功能的基础上增加了一些额外功能。

本插件将在 [#PR351](https://github.com/koishijs/webui/pull/351) 被合并后移除。

## 功能特点

- 允许覆盖和自定义 Koishi 命令的配置
- 提供命令管理界面，支持通过 Web UI 进行操作
- 支持创建、修改、删除命令及其别名
- 支持修改命令的父级命令、选项等配置

## 安装方法

1. 插件市场直接安装

2. 项目模板安装
```bash
yarn add @shangxueink/koishi-plugin-commands-refresh
```

3. koi 命令行安装
```bash
koi yarn -n default add @shangxueink/koishi-plugin-commands-refresh
```

## 使用方法

在 Koishi 应用中启用该插件后，你可以：

1. 通过 Web 控制台访问命令管理界面
2. 使用 `command` 指令进行命令管理

```
command <name> [options]
```

### 可用选项

- `-c, --create`: 创建指令
- `-a, --alias [name]`: 添加指令别名
- `-A, --unalias [name]`: 移除指令别名
- `-n, --rename [name]`: 修改显示名称
- `-p, --parent [name]`: 设置父指令
- `-P, --no-parent`: 移除父指令

## 依赖关系

- **必需依赖**: `koishi@^4.17.5`
- **可选依赖**: `@koishijs/plugin-console@^5.28.4`

## 许可证

MIT

## 相关链接

- [GitHub 仓库](https://github.com/shangxueink/koishi-shangxue-apps/)
- [问题反馈](https://github.com/shangxueink/koishi-shangxue-apps/issues)