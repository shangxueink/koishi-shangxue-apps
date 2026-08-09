# transform-before-send

在消息发送前把本地文件引用转换为跨实例可访问的内容，适用于消息平台与 Koishi 插件运行实例不在同一台机器的情况。

## 功能

- 监听 `before-send`，递归处理 `img`、`audio`、`video`、`file` 元素。
- 支持 `file://`、Windows 绝对路径、相对 `ctx.baseDir` 路径。
- 已经是 URL 编码的 `file://` src 会原样保留。
- `file` 元素在 assets 模式下回退为 Base64，因为默认 assets 服务不支持 `file` 类型。

## 配置

- `mode`
  - `base64`：读取本地文件并编码为 data URL。
  - `assets`：通过 `ctx.assets` 将本地文件转存为公网链接。
  - 默认值：`base64`
- `loggerinfo`：是否输出调试日志，默认 `false`。

## 使用

启用插件后在配置项中选择转换方式即可。使用 assets 模式时，需要先启用一个可用的 assets 服务插件。
