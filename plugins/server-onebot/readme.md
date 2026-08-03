# koishi-plugin-server-onebot

[![npm](https://img.shields.io/npm/v/koishi-plugin-server-onebot?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-server-onebot)

用于 Koishi 框架的简易 OneBot v11 服务器实现。

> 目前仅为初步实现

<hr>

<table border="1" cellpadding="8" cellspacing="0" width="100%">
  <tr>
    <td align="center" width="18%">
      <b>OneBot客户端</b><br>
      Nonebot2、Yunzai<br>
      AstrBot等
    </td>
    <td align="center" width="10%">
      <b>OneBot</b><br>
      ←→
    </td>
    <td align="center" width="18%">
      <b>server-onebot</b><br>
      协议转换<br>
      消息路由
    </td>
    <td align="center" width="10%">
      <b>Satori</b><br>
      ←→
    </td>
    <td align="center" width="18%">
      <b>Koishi Core</b><br>
      adapter-iirose<br>
      adapter-bilibili等
    </td>
    <td align="center" width="16%">
      <b>目标平台</b><br>
      iirose、bilibili<br>
      qq等
    </td>
  </tr>
</table>

<hr>

<details>
<summary>点击展开：跨实例功能调用场景</summary>

> 通过 `adapter-satori` + `server-onebot` + `server-satori` 实现跨实例功能调用

<table border="1" cellpadding="6" cellspacing="0" width="100%">
  <tr>
    <td align="center" width="10%">
      <b>OneBot客户端</b><br>
    </td>
    <td align="center" width="4%">
      →
    </td>
    <td align="center" width="10%">
      <b>server-onebot</b><br>
      Koishi A接入
    </td>
    <td align="center" width="4%">
      →
    </td>
    <td align="center" width="10%">
      <b>Koishi A</b><br>
      adapter-satori
    </td>
    <td align="center" width="4%">
      →
    </td>
    <td align="center" width="10%">
      <b>server-satori</b><br>
      Koishi B开启
    </td>
    <td align="center" width="4%">
      →
    </td>
    <td align="center" width="10%">
      <b>Koishi B</b><br>
      adapter-iirose等
    </td>
    <td align="center" width="4%">
      →
    </td>
    <td align="center" width="30%">
      <b>目标平台</b><br>
      iirose等
    </td>
  </tr>
</table>

- **Koishi A**：开启 `adapter-satori` + `server-onebot`，OneBot客户端接入 A 实例
- **Koishi B**：开启 `server-satori`，A 实例的 `adapter-satori` 连接到 B 实例的 `server-satori`

**实现效果**：在 Koishi B 实例中可以直接调用 OneBot客户端 的所有功能，就像 OneBot客户端 直接连接到 Koishi B 一样。

</details>

<hr>

### 消息格式转换

处理 Satori 和 OneBot 消息格式之间的转换：

### Satori → OneBot

```javascript
// Satori 格式
[
  { type: 'text', attrs: { content: 'Hello ' } },
  { type: 'at', attrs: { id: '123456', name: 'user' } },
  { type: 'image', attrs: { src: 'https://example.com/image.jpg' } }
]

// 转换为 OneBot 格式
[
  { type: 'text', data: { text: 'Hello ' } },
  { type: 'at', data: { qq: '123456', name: 'user' } },
  { type: 'image', data: { file: 'https://example.com/image.jpg' } }
]
```

### OneBot → Satori

```javascript
// OneBot 格式
[
  { type: 'text', data: { text: 'Hello ' } },
  { type: 'at', data: { qq: 'all' } },
  { type: 'face', data: { id: '123' } }
]

// 转换为 Satori 格式
[
  h.text('Hello '),
  h('at', { type: 'all' }),
  h('face', { id: '123' })
]
```

## 许可证

MIT

## 扩展 OneBot 动作

`server-onebot` 在启用时是一个完整的 OneBot v11 实现。它会启动配置的 WebSocket 服务器和/或反向 WebSocket 客户端，注册内置动作，将 Koishi 事件转换为 OneBot 事件，并分发传入的 OneBot 请求。

该实现以 `onebot` Koishi 服务的形式暴露。其他插件可以注入它并添加协议扩展：

```ts
import { Context } from 'koishi'
import { OneBotActionError } from 'koishi-plugin-server-onebot'

export const inject = {
  required: ['onebot'],
}

export function apply(ctx: Context) {
  ctx.onebot.registerAction('get_custom_status', async (params, client, request) => {
    return {
      self_id: request?.endpoint.selfId,
      status: 'ready',
    }
  })

  ctx.onebot.useAction('get_group_info', async (request, next) => {
    const response = await next()
    if (response.status === 'failed') {
      throw new OneBotActionError('group info is unavailable', 1404)
    }
    return response
  })
}
```

`registerAction()` 返回一个注销函数。现有动作默认受保护；仅在有意替换内置实现时传入 `{ override: true }`。`invoke()` 在内部调用相同的动作注册表，不通过 WebSocket，直接返回动作数据：

```ts
const status = await ctx.onebot.invoke('get_custom_status')
```

正向 WebSocket 连接和反向 WebSocket 连接使用相同的动作注册表和分发器。处理程序通过其第三个参数接收原始请求、连接状态和端点元数据。
