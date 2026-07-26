# koishi-plugin-jrys-prpr

[![npm](https://img.shields.io/npm/v/koishi-plugin-jrys-prpr?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-jrys-prpr)

今日运势插件。

## 功能

- 生成今日运势卡片
- 支持原图查询
- 支持分离文本模式
- 支持 QQ 官方机器人 Markdown 发送
- 支持本地图片、网络图片作为背景

## 依赖

- `puppeteer`
- `canvas`
- `assets`，仅 QQ 官方机器人 Markdown 转公网链接时需要
- `monetary`，仅开启货币系统时需要
- `glyph`，仅自定义字体时需要

## 命令

### `jrysprpr`

查看今日运势。

示例：

```text
/jrysprpr
/jrysprpr -s
```

`-s` 表示分离模式，输出图文消息而不是完整渲染卡片。

### `原图` / 自定义原图命令

默认命令为 `查看运势背景图`，也可以在配置里修改为你自己的名字。

用法：

```text
/查看运势背景图 <消息ID>
```

也可以直接回复一张运势图后再输入该命令。

## 配置

### 基础设置

- `command`：今日运势主命令，默认 `jrysprpr`
- `command2`：原图命令，默认 `查看运势背景图`
- `GetOriginalImageCommand`：是否启用原图命令
- `autocleanjson`：获取原图后是否清理对应记录
- `Checkin_HintText`：签到提示语，`unset` 表示不发送
- `recallCheckin_HintText`：发送结果后是否撤回签到提示
- `GetOriginalImage_Command_HintText`：
  - `0`：不渲染图片，仅返回【原始背景图+运势文字提示】的图文消息
  - `1`：不返回文字提示，仅返回渲染图片
  - `2`：返回文字提示，且为【渲染图片+文字消息】
  - `3`：返回文字提示，且为【渲染图片】+【单独发送的文字消息】

### 运势概率

- `FortuneProbabilityAdjustmentTable`：运势抽取概率表，权重总和为 `0` 时使用默认配置

### 背景图

- `BackgroundURL`：背景图列表
- 支持：
  - 本地文件路径
  - 文件夹路径
  - 网络图片 URL

### 渲染面板

- `screenshotquality`：渲染截图压缩质量
- `HTML_setting.UserNameColor`
- `HTML_setting.MaskColor`
- `HTML_setting.Maskblurs`
- `HTML_setting.HoroscopeTextColor`
- `HTML_setting.luckyStarGradientColor`
- `HTML_setting.HoroscopeDescriptionTextColor`
- `HTML_setting.DashedboxThickn`
- `HTML_setting.Dashedboxcolor`
- `HTML_setting.font`

### QQ 官方机器人 Markdown

- `markdown_button_mode`
  - `unset`：不使用 QQ 原生 Markdown
  - `raw`：使用原生 Markdown

当 `markdown_button_mode = raw` 时，可配置：

- `raw_markdown_button_content`：Markdown 内容
- `raw_markdown_button_keyboard`：按钮 JSON

## 行为说明

- 普通模式下，插件会渲染一张完整运势卡片再发送。
- 当 `GetOriginalImage_Command_HintText = 0` 时，插件会发送简版图文消息。
- QQ 官方机器人在 `raw` 模式下，会把图片转成可用于 Markdown 的公网链接后再发送。
- 原图命令只负责查询历史记录，不再自动删除图片记录。

## 示例

### 普通运势卡片

```text
/jrysprpr
```

### 分离模式

```text
/jrysprpr -s
```

### 获取原图

```text
/查看运势背景图 123456789012345
```

## 说明

- 如果你使用 QQ 官方机器人并开启了 Markdown 模式，建议同时安装并启用 `assets-qqbot-part-file` 插件服务。
- 如果没有 `canvas` 或 `puppeteer`，部分渲染能力会受限。
