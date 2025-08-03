# koishi-plugin-image-upscale-bigjpg

[![npm](https://img.shields.io/npm/v/koishi-plugin-image-upscale-bigjpg?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-image-upscale-bigjpg)



## 功能特性

- 支持将图片通过指定的风格进行放大，支持风格化和降噪处理
- 支持自动查询任务状态，根据配置返回放大后的图片链接、图片或者原始 JSON 数据
- 提供灵活的配置选项，包括超时时间、自动查询间隔、自定义提示信息等
- 提供日志调试功能，帮助用户追踪和解决问题

## 配置项说明

| 配置项                | 类型                       | 默认值                        | 描述                                                                                |
| --------------------- | -------------------------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| `apiKey`              | `string`                   | 无                            | **必填**，Bigjpg API 密钥，必须从 [Bigjpg](https://bigjpg.com/zh) 获取              |
| `timeout`             | `number`                   | 30                            | 等待上传图片的超时时间（单位：秒），默认 30 秒，最小 5 秒，最大 90 秒               |
| `wait_text_tip`       | `string`                   | "已经提交任务咯\~ 任务ID为：" | 提交任务后返回的自定义文字提示                                                      |
| `bigjpg_style`        | `'art' / 'photo'`          | `art`                         | 图片放大风格，支持卡通插画和照片两种风格                                            |
| `bigjpg_noise`        | `'-1' / '0'`               | `0`                           | 降噪程度，`-1` 表示无降噪，`0` 表示低降噪                                           |
| `bigjpg_x2`           | `'1' / '2' / '3' / '4'`    | `2`                           | 放大倍数，分别表示 2x、4x、8x、16x 倍                                               |
| `auto_query`          | `boolean`                  | `true`                        | 提交任务后是否自动查询任务状态                                                      |
| `auto_query_time`     | `number`                   | `10`                          | 自动查询任务的时间间隔（单位：秒），默认 10 秒，范围 1-600 秒                       |
| `query_response_mode` | `'text' / 'image' / 'raw'` | `text`                        | 返回任务查询的模式，`text` 返回图片链接，`image` 返回图片，`raw` 返回原始 JSON 数据 |
| `loggerinfo`          | `boolean`                  | `false`                       | 是否启用日志调试模式                                                                |

## 使用方法

<h2>获取 API 密钥</h2>
<p>在使用本插件之前，你需要前往 <a href="https://bigjpg.com/zh" target="_blank">Bigjpg 官网 https://bigjpg.com/zh</a> 注册并获取 API 密钥。此密钥是调用图片放大服务的必需参数。</p>
<p><a href="https://i0.hdslb.com/bfs/article/e2de1d0d0dea0c9b9ab4a1507202841a312276085.png" target="_blank">点击查看获取 API KEY 图解</a></p>

<p><a href="https://i0.hdslb.com/bfs/article/ea2d3a1aa6a060eb5981ea8b7416e899312276085.png" target="_blank">点击查看 Bigjpg 价格表</a></p>


### 图片放大指令

用户可以通过 `bigjpg/放大图片` 命令来上传并放大图片。可以指定放大风格、降噪程度和放大倍数：

- **指令格式**：
  ```
  /bigjpg/放大图片 -s <style> -n <noise> -x <x2>
  ```

  - `-s <style>`：指定放大风格，支持 `art`（卡通插画）和 `photo`（照片）。
  - `-n <noise>`：指定降噪程度，支持 `-1`（无降噪）和 `0`（低降噪）。
  - `-x <x2>`：指定放大倍数，支持 `1`（2x）、`2`（4x）、`3`（8x）、`4`（16x）。

  例子：
  ```
  /bigjpg/放大图片 -s art -n 0 -x 2
  ```

### 查询任务状态

用户可以使用 `bigjpg/查询任务状态 <taskIds...>` 来查询已提交任务的状态。任务状态会根据配置返回图片、链接或者 JSON 数据。

例子：
```
/bigjpg/查询任务状态 dfed390aaa154bf7a9e10dabf93fd7a9
```

## 日志调试

如果需要调试日志信息，可以在配置中启用 `loggerinfo`，这样所有请求和响应的信息都会记录到 Koishi 日志中，帮助你追踪问题。

## 获取 API 密钥

在使用本插件之前，你需要前往 [Bigjpg 官网](https://bigjpg.com/zh) 注册并获取 API 密钥。此密钥是调用图片放大服务的必需参数。