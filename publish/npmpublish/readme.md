# koishi-plugin-image-save-path

[![npm](https://img.shields.io/npm/v/koishi-plugin-image-save-path?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-image-save-path)

`koishi-plugin-image-save-path`插件，允许用户将图片保存到服务器上特定的路径。


## 功能

- 允许用户指定图片的保存路径。
- 支持多个路径选择。
- 自定义图片的后缀名。
- 支持快速保存模式，直接保存到默认路径。
- 允许对需要保存的图片进行重命名。



## 效果预览
<li><a href="https://i0.hdslb.com/bfs/article/0b293dc3751bea6f6f73dfc3c2eac439312276085.png" target="_blank">交互保存图片</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/b0feedf358c1a29e2475ac8c1991b222312276085.png" target="_blank">回复保存图片</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/a3f0844195795fc7e51f947e689fd744312276085.png" target="_blank">批量保存图片</a></li>
<li><a href="https://i0.hdslb.com/bfs/article/23e26c25d805e0d5d5d76958e5950d56312276085.png" target="_blank">中间件批量保存图片</a></li>


## 指令说明

此插件提供了`保存图片`指令，允许用户保存图片到特定路径。

基本上用户需要像这样交互
```
用户：保存图片
```
```
机器人： 请选择路径的序号：
```

```
用户：[路径序号名称]
```
```
机器人：请发送图片：
```
```
用户：[图片]
```


不过也可以像下面这样：
```
用户：保存图片  [路径名称]
```

```
机器人：请发送图片：
```

```
用户：[图片]
```

此外本插件还提供了两个选项：-n 和 -e，以增强其功能。

-n 选项：这个选项允许用户为保存的图片指定一个具体的文件名。在命令中使用 -n 后跟上所需的文件名。
```
保存图片 -n 测试文件
```
-e 选项：这个选项允许用户指定图片的后缀名。在命令中使用 -e 后跟上所需的图片后缀名。
```
保存图片 -e webp
```

你也可以一次性指定所有的选项，例如：
```
交互保存图片 路径序号 -n 图片名 -e webp
```

对于`保存图片`指令，同时也支持从回复的消息里获取图片。


### 配置项说明
- **defaultImageExtension**：默认的图片后缀名，如`png`或`jpg`。
- **imageSaveMode**：开启后，用户在保存图片时不进行路径选择交互，图片直接保存到`savePaths`的第一行的路径。
- **savePaths**：用于设置图片保存路径的名称和地址映射。在控制台中，用户需要填写路径的`name`和对应的`path`。

在配置了配置项内容后，用户可以直接输入 `指令名称 路径序号  文件命名` 快捷触发保存。


## 注意事项

- 确保提供的路径是服务器上有效且具有写入权限的路径。

- 如果图片无法下载或保存，请检查网络连接和服务器配置。

