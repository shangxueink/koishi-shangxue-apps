# koishi-plugin-lmarena-api

[![npm](https://img.shields.io/npm/v/koishi-plugin-lmarena-api?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-lmarena-api)

相关地址：

- <https://github.com/shskjw/astrbot_plugin_shoubanhua/blob/master/_conf_schema.json>
- <https://github.com/HydroGest/lmarena>
- <https://moyuu.cc/keys>
- <https://platform.agnes-ai.com/settings/apiKeys>
- <https://docs-model.skyengine.com.cn/api-reference/examples/images/openai-image>

## 使用示例

```text
// 直接文生图
imagen -d 生成一个哆啦A梦

// 图生图
imagen 把下面图片里的文字删掉 [图片]

// 返回多张
imagen -n 2 把下面图片里的文字删掉 [图片] [图片]
```

## 特殊请求体配置示例

（非openai标准协议）

以 `https://platform.sensenova.cn/docs` 为例：

```yaml
apiUrl: https://token.sensenova.cn/v1
apiKey: 你的APIKey
```

apiParams_generations:
（点击右侧的`编辑JSON` 然后粘贴进去即可）

```json
{
  "model": "sensenova-u1.5-lite",
  "prompt": "{{prompt}}",
  "size": "auto",
  "n": "1",
  "output_format": "png",
  "response_format": "b64_json",
  "watermark": "false",
  "prompt_extend": "false"
}
```

apiParams_edits:
（点击右侧的`编辑JSON` 然后粘贴进去即可）

```json
{
  "model": "sensenova-u1.5-lite",
  "images": "js: ({ files }) => files.map((file) => ({ image_url: `data:${file.mime};base64,${file.data}` }))",
  "prompt": "{{prompt}}",
  "size": "auto",
  "response_format": "b64_json",
  "watermark": "false",
  "prompt_extend": "false"
}
```

SenseNova 图生图直接在 `apiParams_edits.images` 字段值里写 JS 代码。配置值以 `js:` 开头或直接写成箭头函数/函数表达式时会被后端执行；

函数只会收到一个上下文对象 `{ body, files, prompt }`，推荐用解构 `({ files }) => ...` 取值，不依赖参数顺序。`files` 里每个元素的 `data` 是 Base64 字符串。

注意 `size` 的宽高需要是 32 的倍数，`n` 仅支持 1。
