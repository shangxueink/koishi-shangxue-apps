# koishi-plugin-pingti-pingfen

[![npm](https://img.shields.io/npm/v/koishi-plugin-pingti-pingfen?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-pingti-pingfen)


`pingfen`插件。查询商品的评分，并将结果存储在数据库中，方便快速查询。

## 使用方法

此插件提供了一个命令，允许用户查询指定商品的评分。
```
 pingfen [商品名称]
```

### 注意事项
- 插件会使用网络API来查询商品评分，因此需要稳定的网络连接。
- 结果会被存储在数据库中，以便于快速再次查询。
