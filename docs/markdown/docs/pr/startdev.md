# 快速启动项目模板

常用的 Koishi 开发工作流和指令记录。

## 项目初始化

### 创建新项目
```bash
yarn create koishi
```

### 克隆常用依赖
```bash
# 克隆应用模板
yarn clone shangxueink/koishi-shangxue-apps

# 克隆常用插件
yarn clone shangxueink/koishi-plugin-puppeteer-without-canvas
yarn clone BSTluo/koishi-plugin-adapter-iirose
yarn clone Roberta001/koishi-plugin-adapter-bilibili-dm
yarn clone idranme/koishi-plugin-gif-reverse
yarn clone idranme/koishi-plugin-music-voice
```

## 发布管理

### 发布插件到 npm
```bash
# 构建插件
yarn build 插件名称

# 进入插件目录
cd plugins/插件名称

# 发布到 npm
npm publish --registry=https://registry.npmjs.org/ --access=public
```
