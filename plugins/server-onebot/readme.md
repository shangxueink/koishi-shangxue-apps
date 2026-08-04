# koishi-plugin-server-onebot

[![npm](https://img.shields.io/npm/v/koishi-plugin-server-onebot?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-server-onebot)

A lightweight OneBot v11 server implementation for Koishi.

> This project is under active development.

<hr>

<table border="1" cellpadding="8" cellspacing="0" width="100%">
  <tr>
    <td align="center" width="18%">
      <b>OneBot clients</b><br>
      NoneBot2, Yunzai<br>
      AstrBot and others
    </td>
    <td align="center" width="10%">
      <b>OneBot</b><br>
      &lt;-&gt;
    </td>
    <td align="center" width="18%">
      <b>server-onebot</b><br>
      Protocol conversion<br>
      Message routing
    </td>
    <td align="center" width="10%">
      <b>Satori</b><br>
      &lt;-&gt;
    </td>
    <td align="center" width="18%">
      <b>Koishi Core</b><br>
      adapter-iirose<br>
      adapter-bilibili and others
    </td>
    <td align="center" width="16%">
      <b>Target platforms</b><br>
      iirose, bilibili<br>
      QQ and others
    </td>
  </tr>
</table>

<hr>

<details>
<summary>Cross-instance function calls</summary>

> Use `adapter-satori` + `server-onebot` + `server-satori` to call functions across Koishi instances.

<table border="1" cellpadding="6" cellspacing="0" width="100%">
  <tr>
    <td align="center" width="10%"><b>OneBot client</b></td>
    <td align="center" width="4%">-&gt;</td>
    <td align="center" width="10%"><b>server-onebot</b><br>Koishi A</td>
    <td align="center" width="4%">-&gt;</td>
    <td align="center" width="10%"><b>Koishi A</b><br>adapter-satori</td>
    <td align="center" width="4%">-&gt;</td>
    <td align="center" width="10%"><b>server-satori</b><br>Koishi B</td>
    <td align="center" width="4%">-&gt;</td>
    <td align="center" width="10%"><b>Koishi B</b><br>adapter-iirose</td>
    <td align="center" width="4%">-&gt;</td>
    <td align="center" width="30%"><b>Target platform</b><br>iirose and others</td>
  </tr>
</table>

- **Koishi A** enables `adapter-satori` and `server-onebot`; the OneBot client connects to A.
- **Koishi B** enables `server-satori`; A's `adapter-satori` connects to B's `server-satori`.

**Result:** Koishi B can call all functions exposed by the OneBot client as if the client were connected directly to Koishi B.

</details>

<hr>

### Message format conversion

The plugin converts messages between Satori and OneBot formats.

### Satori to OneBot

```javascript

[
  { type: 'text', attrs: { content: 'Hello ' } },
  { type: 'at', attrs: { id: '123456', name: 'user' } },
  { type: 'image', attrs: { src: 'https://example.com/image.jpg' } }
]


[
  { type: 'text', data: { text: 'Hello ' } },
  { type: 'at', data: { qq: '123456', name: 'user' } },
  { type: 'image', data: { file: 'https://example.com/image.jpg' } }
]
```

### OneBot to Satori

```javascript

[
  { type: 'text', data: { text: 'Hello ' } },
  { type: 'at', data: { qq: 'all' } },
  { type: 'face', data: { id: '123' } }
]


[
  h.text('Hello '),
  h('at', { type: 'all' }),
  h('face', { id: '123' })
]
```

## License

MIT

## Extending OneBot actions

When enabled, `server-onebot` is a complete OneBot v11 implementation. It starts the configured WebSocket server and/or reverse WebSocket clients, registers built-in actions, converts Koishi events into OneBot events, and dispatches incoming OneBot requests.

The implementation is exposed as the `onebot` Koishi service. Other plugins can inject it and add protocol extensions:

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

`registerAction()` returns an unregister function. Existing actions are protected by default; pass `{ override: true }` only when intentionally replacing a built-in action. `invoke()` uses the same action registry without WebSocket transport:

```ts
const status = await ctx.onebot.invoke('get_custom_status')
```

Forward WebSocket connections and reverse WebSocket connections use the same action registry and dispatcher. Handlers receive the original request, connection state, and endpoint metadata.
