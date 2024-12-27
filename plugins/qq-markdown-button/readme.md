
# @shangxueink/koishi-plugin-qq-markdown-button

[![npm](https://img.shields.io/npm/v/@shangxueink/koishi-plugin-qq-markdown-button?style=flat-square)](https://www.npmjs.com/package/@shangxueink/koishi-plugin-qq-markdown-button)




---


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
            "label": "再来一张😽",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/emojihub ",
            "enter": false
          }
        },
        {
          "render_data": {
            "label": "随机一张😼",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/随机表情包",
            "enter": true
          }
        },
        {
          "render_data": {
            "label": "返回列表😸",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/表情包列表",
            "enter": true
          }
        }
      ]
    }
  ]
}

```


此外，以下是一个默认的JSON按钮的本插件的json配置文件，可供参考：

```
{
    "msg_id": "${session.messageId}",
    "msg_type": 2,
    "content": "",
    "keyboard": {
        "id": "${config.json_setting.json_button_id}"
    }
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
    
此外，以下是一个相对应的本插件的json使用示例
```
{
    "msg_type": 2,
    "msg_id": "${session.messageId}",
    "markdown": {
        "custom_template_id": "${config.markdown_setting.markdown_id}",
        "params": [
            {
                "key": "text1",
                "values": [
                    "第一个文字参数"
                ]
            },
            {
                "key": "text2",
                "values": [
                    "第二个文字参数"
                ]
            },
            {
                "key": "img",
                "values": [
                    "![img#338px #250px]"
                ]
            },
            {
                "key": "url",
                "values": [
                    "(https://i0.hdslb.com/bfs/note/457c42064e08c44ffef1b047478671db3f06412f.jpg)"
                ]
            }
        ],
        "keyboard": {
            "id": "${config.markdown_setting.json_button_id}"
        }
    }
}
```
</details>


---

### 默认原生markdown的json文件写法示例
此外，以下是一个默认的原生markdown的json文件模板示例，可供参考：

<details>
<summary>点击此处————查看源码</summary>

#### JSON 源码
```
{
    "msg_type": 2,
    "msg_id": "${session.messageId}",
    "markdown": {
        "content": "${markdown}"
    },
    "keyboard": {
        "content": {
            "rows": [
                {
                    "buttons": [
                        {
                            "render_data": {
                                "label": "再来一次",
                                "style": 2
                            },
                            "action": {
                                "type": 2,
                                "permission": {
                                    "type": 2
                                },
                                "data": "/表情包",
                                "enter": true
                            }
                        }
                    ]
                }
            ]
        }
    }
}
```

#### markdown 源码
```
# 你好啊 

这是一个markdown消息哦~

```
    
</details>

## 许可证

本项目采用 MIT 许可证。

---