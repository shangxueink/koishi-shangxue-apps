# koishi-plugin-auto-config-on-install

安装插件后自动创建一份 Koishi 配置，适用于 `npm run start` 生产模式。

## 用法

在 `koishi.yml` 的 `plugins` 中添加：

```yaml
auto-config-on-install:xxxxxx: {}
```

插件依赖 `@koishijs/plugin-market` 和 `@koishijs/plugin-config`。它包装官方 `installer.install()`，因此覆盖插件市场页面、`plugin.install` 命令以及其他调用安装器的代码。目标项目还需要启用 `market` 插件。

默认行为：

- 只为本次新安装且尚未存在配置的插件创建空配置；
- 已存在配置实例时不重复创建；
- 升级和卸载不自动改动配置；
- `npm run dev` 与 `npm run start` 使用相同逻辑；生产模式也会直接写入 `koishi.yml`。

如果需要忽略 workspace 插件，可设置：

```yaml
auto-config-on-install:xxxxxx:
  includeWorkspaces: false
```

默认创建的是 `~plugin:id` 配置，因此会像 Koishi 控制台的“配置”入口一样保留配置但不立即启用插件。若希望安装成功后立即启用，设置 `enable: true`。
