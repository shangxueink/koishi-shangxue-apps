# koishi-plugin-jrys-prpr
[![npm](https://img.shields.io/npm/v/koishi-plugin-jrys-prpr?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-jrys-prpr)
# 今日运势生成器
🌟 欢迎使用 `jrys-prpr` - 今日运势的插件！
## 💡 功能亮点
- 🔮 生成个性化的运势卡片。
- 🌈 支持自定义背景图片和颜色。
- 🖌️ 支持自定义字体和文字颜色。
- 🔁 支持QQ官方bot的“再来一张”按钮。
## 🚀 快速开始
在Koishi插件市场搜索`jrys-prpr`并安装！


### 使用方法
#### 指令：jrysprpr
发送指令 `jrysprpr` 即可获取一张个性化的运势卡片。

您还可以使用 `--split` 选项来获取图文模式的运势，只需发送 `jrysprpr -s` 即可。
#### 指令：原图
如果您想获取运势卡的背景图，可以直接回复一张已发送的运势卡图片并输入指令 `原图`。

-  或者使用配置项`GetOriginalImageCommand_HintText`，使用`原图 ********`来获取对应标识码的背景图

如果您使用的是QQ官方bot，也可以通过点击运势卡上的“查看原图”按钮来获取。

---

### 插件配置说明
#### FortuneProbabilityAdjustmentTable（运势抽取概率调节表）
| 配置项            | 说明                    |
| ----------------- | ----------------------- |
| Fortune           | 运势种类                |
| luckValue（隐藏） | 种类数值（隐藏）        |
| Probability       | 抽取权重，滑动选择0-100 |
注：权重均为0时使用默认配置项。
#### BackgroundURL（背景图片设置）
| 配置项        | 说明                                              |
| ------------- | ------------------------------------------------- |
| BackgroundURL | 背景图片，可以是本地路径、文件夹路径或网络图片URL |

需要注意的是：`原图`指令只会获取对于运势图的背景图链接，若使用随机图API作为背景图，会导致无法返回正确的背景图。

因此我们推荐此处的背景图片，建议参考[emojihub-bili](https://www.npmjs.com/package/koishi-plugin-emojihub-bili)的图片方法。

#### HTML_setting（渲染页面设置）
| 配置项                        | 说明                       |
| ----------------------------- | -------------------------- |
| UserNameColor                 | 用户名称的颜色             |
| MaskColor                     | 蒙版的颜色                 |
| HoroscopeTextColor            | 运势文字颜色               |
| luckyStarGradientColor        | 开启后运势星星使用彩色渐变 |
| HoroscopeDescriptionTextColor | 运势说明文字颜色           |
| DashedboxThickn               | 虚线框的粗细，滑动选择0-20 |
| Dashedboxcolor                | 虚线框的颜色               |
| textfont                      | 字体文件的绝对路径         |
#### markdown_setting（QQ官方机器人的markdown设置）
| 配置项     | 说明                                         |
| ---------- | -------------------------------------------- |
| mdid       | QQ官方bot 的 MarkDown模板ID，格式为数字_数字 |
| zlmdtext_1 | 指令MD参数MD文字参数1                        |
| zlmdtext_2 | 指令MD参数MD文字参数2                        |
| zltext_1   | 指令MD显示文字内容1，每次随机选一个发送      |
| zltext_2   | 指令MD显示文字内容2，每次随机选一个发送      |
| zlmdp_1    | 指令MD参数MD图片参数1，不需要设定图片宽高    |
| zlmdp_2    | 指令MD参数MD图片参数2                        |
| ButtonText | 指令MD按钮上再来一张功能显示的文字           |




### 默认JSON按钮模板示例

此外，以下是一个默认的JSON按钮的指令按钮模板示例，可供参考：
<details>
<summary>点击此处————查看源码</summary>

```
{
  "rows": [
    {
      "buttons": [
        {
          "render_data": {
            "label": "看看运势（图文版）😽",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/jrysprpr  -s",
            "enter": false
          }
        },
        {
          "render_data": {
            "label": "看看我的运势😽",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/jrysprpr ",
            "enter": false
          }
        }
      ]
    }
  ]
}
```
</details>

---


### 默认Markdown模板示例
此外，以下是一个默认的Markdown模板示例，可供参考：

<details>
<summary>点击此处————查看源码</summary>


```
{{.text1}}
{{.text2}}
{{.img}}{{.url}}
```
#### 配置模板参数示例
当然，上方的md模版，还有`配置模版参数`的示例参数值

参数        示例值
```
text1       这是第一段文字
text2       这是第二段文字
img         ![img]
url         (https://koishi.chat/logo.png)
```
    
</details>


---




## 更新日志


<details>
<summary>点击此处————查看更新日志</summary>

- **1.0.0**
    -   更新了好多东西。

- **0.6.2**
    -   兼容私聊markdown发送

- **0.6.1**
    -   优化qq平台的私聊，使用图文返回而不是markdown
    -   优化控制台文字说明
    -   增加bug反馈地址和项目地址

- **0.5.2**
    -   修复本地文件路径的file:/协议

- **0.4.4**
    -   新增`蒙版模糊半径`
    -   新增markdown按钮style调整配置项
    -   优化`原图`指令，取消别名

- **0.4.1**
    -   优化头像获取

- **0.4.0**
    -   优化今日运势的文字内容，对于部分过短内容进行补缺
    -   增量背景图片内容，对于部分背景进行重新收集
    -   新增背景图`白圣女`   

- **0.3.11**    修复部分情况下日期不更新的情况

- **0.3.9**     优化控制台说明

- **0.3.8**
    -   本地化支持
    -   取消配置项定义指令权限
    -   新增配置项，允许自定义`原图`指令的名称
    -   优化配置项`GetOriginalImageCommand_HintText`，改为选择配置项
    -   修改了一些小注释

- **0.3.7**
    -   新增壁纸`miku`
    -   增量壁纸`猫羽雫`
    -   优化readme说明

- **0.3.6** 
    -   优化`getJrys`函数，
        -   确保每一天生成的种子都会有所不同，尽可能实现不同日期的运势也不同。
    -   新增`split`选项，使用`-s`即可实现图文输出的今日运势
    -   优化json存储地址
    
- **0.3.5** 
    -   HTML优化：增加`background-clip: text;`以修复`未定义标准属性“background-clip”以实现兼容性`的警告   
    -   新增配置项`GetOriginalImageCommand_HintText`，在保留回复获取原图的基础上，允许使用指令来获取原图
    -   优化原图的匹配逻辑

- **0.3.4** 
    -   新增配置项`GetOriginalImageCommand`，允许用户使用`原图`指令来获取运势图片的背景图
    -   优化QQ官方markdown按钮，新增按钮`查看原图`
    -   暂时使用消息ID作为特征记录
        -   非官方bot使用`回复消息`触发指令来获取原图
        -   官方bot使用markdown按钮来获取
        -   暂不支持官方bot使用`回复消息`触发指令来获取原图
        -   暂不确定其他普通的兼容性，目前仅测试`onebot`平台

- **0.3.3** 
    -   优化权重抽取算法
    -   优化README说明文档

- **0.3.2** 
    -   优化调试日志输出
    -   优化README说明文档

- **0.3.0** 开始记录更新日志
    -   优化jrys的json内容。原本的运势概率分配不均。现优化json的文案内容，分布更加合理。
    -   新增配置项`FortuneProbabilityAdjustmentTable`，允许用户自定义运势抽取权重
    -   不再使用`jrys.js`，改为使用json存储文案
    -   优化文件夹结构，背景图片的txt放进文件夹`backgroundFolder`
    -   针对`FortuneProbabilityAdjustmentTable`表格配置运势概率全为`0`的情况的优化。

</details>
