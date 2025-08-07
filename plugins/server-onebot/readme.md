# koishi-plugin-server-onebot

[![npm](https://img.shields.io/npm/v/koishi-plugin-server-onebot?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-server-onebot)

简要的 OneBot v11 服务器实现，用于 Koishi 框架。

> 暂时仅为初步实现

## 消息格式转换

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
