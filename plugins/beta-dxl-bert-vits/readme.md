# koishi-plugin-beta-dxl-bert-vits

[![npm](https://img.shields.io/npm/v/koishi-plugin-beta-dxl-bert-vits?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-beta-dxl-bert-vits)


## 基本用法

开启插件后，直接在聊天框输入指令即可使用。

```
++betavits 你好啊，这是一段测试的模板语音
```

你也可以通过指令选项来自定义语音参数，例如：

```
++betavits -s "角色名 (标识)" -n 0.8 "你好世界"
```

使用 `-h` 选项查看所有可用的指令选项。

---

## 如何添加更多模型

如果你找到了一个新的、可用的`ModelScope Bert Vits`模型，可以按照以下步骤添加它：

### 步骤 1: 安装浏览器脚本

1.  在你的浏览器（推荐Chrome、Firefox、Edge）中安装 [Tampermonkey](https://www.tampermonkey.net/)（篡改猴）扩展。
2.  进入Tampermonkey的“管理面板”，点击“+”号标签页创建一个新脚本。
3.  将项目路径下 `script/modelscope-data-exporter.user.js` 文件中的所有代码复制并粘贴到新脚本中。
4.  保存脚本 (Ctrl+S)。

### 步骤 2: 查找并下载模型数据

1.  访问 https://www.modelscope.cn/studios?name=bert%20vits&page=1&type=interactive-programmatic 并寻找你感兴趣的 `bert-vits` 模型。
2.  点击进入模型的Gradio界面。
3.  如果脚本安装成功，你会在页面右下角的“Submit”按钮旁边看到一个黄色的 **“下载数据JSON”** 按钮。
4.  点击该按钮，浏览器会自动生成并下载一个符合本插件格式的 `.json` 文件。

### 步骤 3: 贡献模型

1.  Fork本仓库。
2.  将你下载的 `.json` 文件重命名，格式为 `speakers_作者名_模型标识.json`（例如 `speakers_aiboycoder_Taffy-Bert-VITS2.json`），并将其放入项目的 `resources` 目录下。
3.  提交一个Pull Request。

一旦你的PR被合并，这个新的模型就会在插件的下个版本中对所有用户可用！