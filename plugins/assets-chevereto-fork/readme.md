# koishi-plugin-assets-chevereto-fork


## 使用方法

1. 安装并启用本插件
2. 关闭默认的 `assets-local` 插件
3. 配置你的 Chevereto 图床服务信息
4. 插件会自动处理消息中的图片资源转存

## API 接口

### ctx.assets.transform(content)

将消息文本中的资源全部转存，并将链接替换为永久链接。

- `content`: string - 要处理的消息文本
- 返回值: Promise<string> - 处理后的消息文本

### ctx.assets.stats()

获取服务状态信息。

- 返回值: Promise<Stats> - 服务状态信息

## 支持的图床服务

本插件支持所有兼容 Chevereto API 的图床服务，包括但不限于：

- Chevereto 官方服务
- 自建 Chevereto 实例
- 其他兼容 Chevereto API 的图床服务

## 注意事项

- 请确保你的图床服务支持 Chevereto API v1
- API Key 需要有上传权限
- 建议在生产环境中关闭详细日志输出

## 许可证

MIT License
