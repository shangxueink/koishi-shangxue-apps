# koishi-plugin-emojihub-bili

[![npm](https://img.shields.io/npm/v/koishi-plugin-emojihub-bili?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-emojihub-bili)
[![npm downloads](https://img.shields.io/npm/dm/koishi-plugin-emojihub-bili)](https://www.npmjs.com/package/koishi-plugin-emojihub-bili)

🐱🌟欢迎使用 **EmojiHub-bili**，这是**EmojiHub**插件的复刻版本！拥有丰富多彩的表情包指令！😍 您还可以自定义添加或删除表情包！几乎每个指令都包含上千张精选表情包！

## 功能亮点 ✨

- **超多表情包**：提供各种风格和主题的表情包，满足不同场合的需求。
- **自定义添加/删除**：根据您的需求，轻松添加或移除特定表情包。
- **简单易用**：通过简单的指令，即可使用丰富的表情包资源。
- **多种地址支持**： 支持`本地文件夹绝对路径`、`本地图片文件绝对路径`、`图片直链`、`本地.txt文件绝对路径`

## 安装指南 🛠️

Koishi插件市场搜索并安装`emojihub-bili`

---

## 使用指南 📘

使用 EmojiHub-bili 插件非常简单！只需在聊天中输入相应的指令，即可随机发送一张相关主题的表情包。例如：

- `2233娘小剧场`：发送与 "2233娘小剧场" 相关的表情包。
- `阿尼亚表情包`：发送与 "阿尼亚表情包" 相关的表情包。
<details>
<summary>点击此处————查看更多指令</summary>
    
| 随机emojihub表情包 |
| ------------------ |
| 本地图库示例       |
| 网络图片示例       |
| 2233娘小剧场表情包 |
| acomu414表情包     |
| ba表情包           |
| capoo表情包        |
| chiikawa表情包     |
| downvote表情包     |
| doro表情包         |
| eveonecat表情包    |
| fufu表情包         |
| girlsbandcry       |
| kemomimi表情包     |
| koishi-meme表情包  |
| mygo表情包         |
| seseren表情包      |
| 阿夸表情包         |
| 阿尼亚表情包       |
| 白圣女表情包       |
| 白圣女漫画表情包   |
| 柴郡表情包         |
| 甘城猫猫表情包     |
| 孤独摇滚表情包     |
| 狗妈表情包         |
| 滑稽表情包         |
| 疾旋鼬表情包       |
| 流萤表情包         |
| 龙图表情包         |
| 小c表情包          |
| 男娘武器库表情包   |
| 千恋万花表情包     |
| 赛马娘表情包       |
| 瑟莉亚表情包       |
| 小黑子表情包       |
| 心海表情包         |
| 绪山真寻表情包     |
| 亚托莉表情包       |
| 永雏小菲表情包     |
| 宇佐紀表情包       |
    
</details>


---


| 功能/设置                            | 详细说明                                                                                                               |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **表情包设置**                       |                                                                                                                        |
| `deleteMsg`                          | 开启后自动撤回表情包                                                                                                   |
| `deleteMsgtime`                      | 自动撤回的秒数                                                                                                         |
| `emojihub_bili_command`              | 自定义表情包指令的父级指令                                                                                             |
| `MoreEmojiHub`                       | 配置您自定义的表情包指令和对应的表情包文件地址。<br />支持多个指令和地址。<br />也可以自定义文件夹路径，从文件夹发图。 |
| `searchSubfolders`                   | 是否递归搜索文件夹。开启后 对于本地文件夹地址 会搜索其子文件夹内全部的图片                                             |
| **进阶设置**                         |                                                                                                                        |
| `autoEmoji`                          | 开启自动表情包功能。<br />当消息数量达到一定阈值时，将自动触发表情包发送。                                             |
| `count`                              | 触发自动表情包的消息数量阈值。                                                                                         |
| `triggerprobability`                 | 触发自动发送表情包的概率，范围是 0 到 1。                                                                              |
| `groupListmapping`                   | 配置哪些群组ID将开启自动表情包功能，可以为每个群组指定默认的表情包。                                                   |
| `allgroupautoEmoji`                  | 配置全部的群组开启自动表情包功能                                                                                       |
| `allgroupemojicommand`               | 自定义全部群组的默认表情包内容                                                                                         |
| **QQ官方bot设置**                    |                                                                                                                        |
| `mdid`                               | 用于定义QQ bot 的MD模板id                                                                                              |
| `zlmdtext_1`, `zlmdtext_2`           | Markdown中`文本`参数。                                                                                                 |
| `zltext_1`, `zltext_2`               | 包含多个文本选项，每次从这些预设文本中随机选择一个发送。                                                               |
| `zlmdp_1`, `zlmdp_2`                 | 定义在Markdown消息中使用的`图片`参数。<br />无需设置图片的具体尺寸。                                                   |
| `ButtonText1`, `ButtonText2`         | 设置消息框中按钮的文本，例如“再来一张”和“返回列表”，方便用户操作。                                                     |
| `MinimumBoundary`, `Magnifymultiple` | 定义图片处理的边界条件，自动调整小于设定界限的图片尺寸，保证图片的清晰度和可视效果。                                   |
| `QQPicToChannelUrl`                  | 本地图片通过频道URL作为群聊MD的图片链接                                                                                |
| `QQbots`                             | 配置转换URL使用的机器人信息和频道                                                                                      |
| **调试设置**                         |                                                                                                                        |
| `consoleinfo`                        | 启用日志调试模式，便于排查问题。                                                                                       |
| `allfileinfo`                        | 输出详细的`MoreEmojiHub 列表内容`                                                                                      |

---

其中有关`MoreEmojiHub`指令对应的地址，如果配置的是一个本地文件夹绝对地址
那就可以使用对应指令搜索该地址下的图片（按文件名）
每次只模糊匹配最接近的一个

比如配置的是

| 指令名称   | 地址             |
| ---------- | ---------------- |
| 本地文件夹 | D:\pics\emojihub |

那你就可以使用 `本地文件夹 关键词` 来搜索是否存在 `关键词`这张图片

- 当开启`searchSubfolders`配置项时，使用文件夹地址搜索图片，将进行递归搜索。


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
            "data": "/再来一张 ",
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
        }
      ]
    },
    {
      "buttons": [
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


此外，以下是一个默认的JSON按钮的指令列表按钮模板示例，可供参考：

```

{
  "rows": [
    {
      "buttons": [
        {
          "render_data": {
            "label": "acomu414",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/acomu414",
            "enter": true
          }
        },
        {
          "render_data": {
            "label": "ba表情包",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/ba表情包",
            "enter": true
          }
        },
        {
          "render_data": {
            "label": "downvote",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/downvote",
            "enter": true
          }
        },
        {
          "render_data": {
            "label": "doro",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/doro",
            "enter": true
          }
        },
        {
          "render_data": {
            "label": "fufu",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/fufu",
            "enter": true
          }
        }
      ]
    },
    {
      "buttons": [
        {
          "render_data": {
            "label": "mygo",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/mygo",
            "enter": true
          }
        },
        {
          "render_data": {
            "label": "seseren",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/seseren",
            "enter": true
          }
        },
        {
          "render_data": {
            "label": "白圣女",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/白圣女",
            "enter": true
          }
        },
        {
          "render_data": {
            "label": "白圣女漫画",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/白圣女漫画",
            "enter": true
          }
        },
        {
          "render_data": {
            "label": "柴郡",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/柴郡",
            "enter": true
          }
        }
      ]
    },
    {
      "buttons": [
        {
          "render_data": {
            "label": "初音Q版",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/初音Q版",
            "enter": true
          }
        },
        {
          "render_data": {
            "label": "孤独摇滚",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/孤独摇滚",
            "enter": true
          }
        },
        {
          "render_data": {
            "label": "疾旋鼬",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/疾旋鼬",
            "enter": true
          }
        },
        {
          "render_data": {
            "label": "流萤",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/流萤",
            "enter": true
          }
        },
        {
          "render_data": {
            "label": "赛马娘",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/赛马娘",
            "enter": true
          }
        }
      ]
    },
    {
      "buttons": [
        {
          "render_data": {
            "label": "藤田琴音",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/藤田琴音",
            "enter": true
          }
        },
        {
          "render_data": {
            "label": "宇佐紀",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/宇佐紀",
            "enter": true
          }
        },
        {
          "render_data": {
            "label": "永雏小菲",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/永雏小菲",
            "enter": true
          }
        },
        {
          "render_data": {
            "label": "塞西莉亚",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/塞西莉亚",
            "enter": true
          }
        },
        {
          "render_data": {
            "label": "图图",
            "style": 2
          },
          "action": {
            "type": 2,
            "permission": {
              "type": 2
            },
            "data": "/图图",
            "enter": true
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

### 默认原生markdown的json文件写法示例
此外，以下是一个默认的原生markdown的json文件模板示例，可供参考：

<details>
<summary>点击此处————查看源码</summary>

#### RAW_MD_command_markdown
```
{
    "msg_type": 2,
    "msg_id": "${session.messageId}",
    "markdown": {
        "content": "## **emoji~😺**\n### 😽来了哦！\n![img#${originalWidth}px #${originalHeight}px](${imageurl})"
    },
    "keyboard": {
        "content": {
            "rows": [
                {
                    "buttons": [
                        {
                            "render_data": {
                                "label": "再来一张😺",
                                "style": 2
                            },
                            "action": {
                                "type": 2,
                                "permission": {
                                    "type": 2
                                },
                                "data": "${command}",
                                "enter": true
                            }
                        },
                        {
                            "render_data": {
                                "label": "返回列表😽",
                                "style": 2
                            },
                            "action": {
                                "type": 2,
                                "permission": {
                                    "type": 2
                                },
                                "data": "${config.emojihub_bili_command}",
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
#### RAW_MD_emojilist_markdown


```
{
    "msg_type": 2,
    "msg_id": "${session.messageId}",
    "markdown": {
        "content": "## **表情包列表**\n### 😻列表如下：点击按钮触发哦！"
    },
    "keyboard": {
        "content": {
            "rows": [
                {
                    "buttons": [
                        {
                            "render_data": {
                                "label": "随机emojihub表情包",
                                "style": 1
                            },
                            "action": {
                                "type": 2,
                                "permission": {
                                    "type": 2
                                },
                                "data": "/随机emojihub表情包",
                                "enter": true
                            }
                        },
                        {
                            "render_data": {
                                "label": "acomu414",
                                "style": 1
                            },
                            "action": {
                                "type": 2,
                                "permission": {
                                    "type": 2
                                },
                                "data": "/acomu414",
                                "enter": true
                            }
                        },
                        {
                            "render_data": {
                                "label": "ba表情包",
                                "style": 1
                            },
                            "action": {
                                "type": 2,
                                "permission": {
                                    "type": 2
                                },
                                "data": "/ba表情包",
                                "enter": true
                            }
                        },
                        {
                            "render_data": {
                                "label": "downvote",
                                "style": 1
                            },
                            "action": {
                                "type": 2,
                                "permission": {
                                    "type": 2
                                },
                                "data": "/downvote",
                                "enter": true
                            }
                        }
                    ]
                },
                {
                    "buttons": [
                        {
                            "render_data": {
                                "label": "doro",
                                "style": 1
                            },
                            "action": {
                                "type": 2,
                                "permission": {
                                    "type": 2
                                },
                                "data": "/doro",
                                "enter": true
                            }
                        },
                        {
                            "render_data": {
                                "label": "eveonecat",
                                "style": 1
                            },
                            "action": {
                                "type": 2,
                                "permission": {
                                    "type": 2
                                },
                                "data": "/eveonecat",
                                "enter": true
                            }
                        },
                        {
                            "render_data": {
                                "label": "fufu",
                                "style": 1
                            },
                            "action": {
                                "type": 2,
                                "permission": {
                                    "type": 2
                                },
                                "data": "/fufu",
                                "enter": true
                            }
                        },
                        {
                            "render_data": {
                                "label": "mygo",
                                "style": 1
                            },
                            "action": {
                                "type": 2,
                                "permission": {
                                    "type": 2
                                },
                                "data": "/mygo",
                                "enter": true
                            }
                        }
                    ]
                },
                {
                    "buttons": [
                        {
                            "render_data": {
                                "label": "seseren",
                                "style": 1
                            },
                            "action": {
                                "type": 2,
                                "permission": {
                                    "type": 2
                                },
                                "data": "/seseren",
                                "enter": true
                            }
                        },
                        {
                            "render_data": {
                                "label": "白圣女",
                                "style": 1
                            },
                            "action": {
                                "type": 2,
                                "permission": {
                                    "type": 2
                                },
                                "data": "/白圣女",
                                "enter": true
                            }
                        },
                        {
                            "render_data": {
                                "label": "白圣女漫画",
                                "style": 1
                            },
                            "action": {
                                "type": 2,
                                "permission": {
                                    "type": 2
                                },
                                "data": "/白圣女漫画",
                                "enter": true
                            }
                        },
                        {
                            "render_data": {
                                "label": "柴郡",
                                "style": 1
                            },
                            "action": {
                                "type": 2,
                                "permission": {
                                    "type": 2
                                },
                                "data": "/柴郡",
                                "enter": true
                            }
                        },
                        {
                            "buttons": [
                                {
                                    "render_data": {
                                        "label": "初音Q版",
                                        "style": 1
                                    },
                                    "action": {
                                        "type": 2,
                                        "permission": {
                                            "type": 2
                                        },
                                        "data": "/初音Q版",
                                        "enter": true
                                    }
                                },
                                {
                                    "render_data": {
                                        "label": "甘城猫猫",
                                        "style": 1
                                    },
                                    "action": {
                                        "type": 2,
                                        "permission": {
                                            "type": 2
                                        },
                                        "data": "/甘城猫猫",
                                        "enter": true
                                    }
                                },
                                {
                                    "render_data": {
                                        "label": "疾旋鼬",
                                        "style": 1
                                    },
                                    "action": {
                                        "type": 2,
                                        "permission": {
                                            "type": 2
                                        },
                                        "data": "/疾旋鼬",
                                        "enter": true
                                    }
                                },
                                {
                                    "render_data": {
                                        "label": "流萤",
                                        "style": 1
                                    },
                                    "action": {
                                        "type": 2,
                                        "permission": {
                                            "type": 2
                                        },
                                        "data": "/流萤",
                                        "enter": true
                                    }
                                }
                            ]
                        }
                    ]
                },
                {
                    "buttons": [
                        {
                            "render_data": {
                                "label": "赛马娘",
                                "style": 1
                            },
                            "action": {
                                "type": 2,
                                "permission": {
                                    "type": 2
                                },
                                "data": "/赛马娘",
                                "enter": true
                            }
                        },
                        {
                            "render_data": {
                                "label": "瑟莉亚",
                                "style": 1
                            },
                            "action": {
                                "type": 2,
                                "permission": {
                                    "type": 2
                                },
                                "data": "/瑟莉亚",
                                "enter": true
                            }
                        },
                        {
                            "render_data": {
                                "label": "藤田琴音",
                                "style": 1
                            },
                            "action": {
                                "type": 2,
                                "permission": {
                                    "type": 2
                                },
                                "data": "/藤田琴音",
                                "enter": true
                            }
                        },
                        {
                            "render_data": {
                                "label": "亚托莉",
                                "style": 1
                            },
                            "action": {
                                "type": 2,
                                "permission": {
                                    "type": 2
                                },
                                "data": "/亚托莉",
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
    
</details>


## 如何额外添加自己喜欢的表情包

添加额外的表情包到 **EmojiHub-bili** 非常简单！只需按照以下步骤操作：

1. **安装扩展（用户脚本管理器）**：  
   在浏览器中添加扩展：[ScriptCat---脚本猫](https://docs.scriptcat.org/)。

2. **安装脚本**：  
   在用户脚本管理器中添加脚本：[点击此处查看 Bilibili专栏原图链接提取2024改版](https://greasyfork.org/zh-CN/scripts/521666-bilibili%E4%B8%93%E6%A0%8F%E5%8E%9F%E5%9B%BE%E9%93%BE%E6%8E%A5%E6%8F%90%E5%8F%962024%E6%94%B9%E7%89%88)。

3. **搜索表情包**：  
   开启扩展后，访问 [哔哩哔哩专栏搜索](https://search.bilibili.com/article/)，在专栏中搜索您需要的表情包。

4. **提取链接**：  
   点击进入具体的某个专栏帖子，屏幕靠近右下角会有一个绿色的【提取链接】按钮。点击该按钮，即可下载包含当前专栏所有图片的 URL 的 txt 文件。按钮按下一次后会变成红色，防止误触，不可二次触发。如需再次下载，请刷新页面。

5. **配置 EmojiHub-bili**：  
   将同一类表情包图片的 URL 整合到同一个 txt 文件中。然后，在 Koishi 的配置项中填入相应的指令名称与 txt 文件路径。无需像自带的 txt 一样省略前缀，写完整 URL 即可。

6. **保存并重载**：  
   完成配置后，保存您的配置并重载插件，您就可以使用自定义的指令发送表情包了！🌟📚

### 温馨提示：

- 请勿将自定义的 txt 文件与本插件放置在同一目录下，以免插件更新导致文件丢失。
- 目前 EmojiHub-bili 默认提供 43 套表情包。若您的配置内容有误差，请在 MoreEmojiHub 表格右上角按钮内选择 **恢复默认值**。
- 若开启插件后，指令不出现，请[重新开关 commands 插件](/market?keyword=commands)。


## 如何删除已添加的表情包指令

如果您需要删除已经添加到 **EmojiHub-bili** 的自定义表情包指令，可以按照以下步骤进行：

1. **在 Koishi 控制台内打开插件**：

   打开您的 Koishi 控制台，并找到 **EmojiHub-bili** 插件。
2. **找到 [基础设置] 里面的 [MoreEmojiHub] 表格**：
   在插件的设置界面中，找到名为 “MoreEmojiHub” 的部分。您会看到类似于 “MoreEmojiHub” 的表格，点击对应的右侧的 [删除] 按钮。
3. **保存更改**：
   完成删除操作后，点击页面右上角的勾号，以保存您的更改并重载插件。这样更改就会生效。

## 免责声明 🤝

### 表情包来源

本插件（**EmojiHub-bili**）中的所有表情包内容均来源于哔哩哔哩（Bilibili）网站。这些表情包的版权归原作者及哔哩哔哩网站所有。本插件仅提供访问这些内容的途径，并不声称对这些表情包内容拥有任何形式的所有权或知识产权。

### 非官方插件

请注意，**EmojiHub-bili** 是一个非官方插件，与哔哩哔哩（Bilibili）公司或其服务没有任何直接关联。本插件的开发旨在为用户提供更便捷的方式来访问和使用哔哩哔哩上的表情包内容。

### 使用责任

用户在使用 **EmojiHub-bili** 插件时，应自行承担所有风险。插件开发者不对任何由于使用本插件而可能引起的直接或间接的损失或损害负责。

### 内容责任

插件开发者不对通过 **EmojiHub-bili** 插件获取的任何表情包内容的准确性、完整性、适用性或合法性负责。所有表情包内容的责任均由内容的原始提供者承担。

### 最终解释权

本免责声明的最终解释权归插件开发者所有。如有疑问或需要进一步信息，请联系插件开发者。🌈 
-  email： 1919892171@qq.com

| 贡献者       | 项目鸣谢：（按首字母排序，不分先后）                                 |
| ------------ | -------------------------------------------------------------------- |
| **Alin**     | [https://github.com/Alin-sky](https://github.com/Alin-sky)           |
| **itzdrli**  | [https://www.npmjs.com/\~itzdrli](https://www.npmjs.com/\~itzdrli)   |
| **sparkuix** | [https://www.npmjs.com/\~sparkuix](https://www.npmjs.com/\~sparkuix) |


## 更新日志


<details>
<summary>点击此处————查看更新日志</summary>

- **1.0.7**
   -  更新`再来一张`的逻辑，修改为自动再次触发本频道的最后一个表情包指令，不需要参数输入
   -  更新`随机表情包`的逻辑，不再写入表情包配置项，而作为单独指令，用于调用session.execute，帮助实现`再来一张`的表情包一致性
   -  保留原有`随机emojihub表情包`的逻辑，作为表情包配置项无任何匹配时的默认处理方法
   -  优化部分模块导入

- **1.0.5**
   -  适配原生markdown发送逻辑
   -  优化 markdown 发送逻辑
   -  优化QQ官方机器人配置项排列
   -  优化 readme 有关官方qq机器人的使用说明

- **1.0.3**
   -  优化 markdown 发送逻辑
   -  新增 json按钮 发送实现
   -  优化 readme 有关官方qq机器人的使用说明
   -  新增`再来一张`指令

- **1.0.1**
   -  兼容私聊markdown的发送

- **1.0.0**
   -  新增`卡拉彼丘`表情包
   -  修复`koishi-meme`表情包链接
   -  完善反馈渠道

- **0.9.9**
   -  新增`藤田琴音`、`鹿乃子`表情包

- **0.9.8**
   -  移除doro表情包内不适宜的部分链接

- **0.9.7**
   -  新增表情包`初音Q版表情包`81张
   -  合并`atri表情包`与`亚托莉表情包`
   -  增量`ba表情包`140张

- **0.9.6**
   -  新增表情包`atri表情包`242张

- **0.9.5**
   -  支持开启对本地文件夹进行递归搜索
   -  优化README说明内容
   -  添加可重用插件的声明
   -  优化部分文字返回方式

- **0.9.4**
   -  `蜜汁工坊表情包`改名为`小c表情包`（qq官方bot好像会屏蔽掉导致发不出去：bad request ， 感谢遂夏提醒咪~）
   -  优化父级列表的发送方式
   -  优化配置项顺序
   -  优化控制台说明文字的超链接，优化为在空白页打开   

- **0.9.3**
   -  重新支持**0.9.1**内容
      -  支持本地文件夹内的搜索（根据文件名）
      -  暂不支持对本地文件夹下子文件夹内图片的搜索
   -  优化日志输出

- **0.9.2**
   -  优化插件的说明文档内容：对插件的说明文档进行了优化，使其更加清晰易懂。
   -  优化控制台说明文字内容：改进了控制台输出的说明文字，使信息更加准确和易于理解。
   -  优化日志输出：改进了日志输出逻辑，确保在 `config.consoleinfo` 开启时能够记录所有相关信息。
   -  重构 `determineImagePath` 函数的逻辑：对 `determineImagePath` 函数进行了重构，提取了判断函数和日志记录函数，使代码更加简洁和清晰。
   -  重构日志输出逻辑：提取了 `logInfo` 和 `logError` 函数，用于统一处理日志记录，确保在不同情况下都能正确记录日志信息。
   -  修复 **0.9.1** 与 **0.9.0** 对于本地txt路径处理错误的bug

- **0.9.1**
   -  优化对于`表情包文件地址`的匹配逻辑
   -  支持本地文件夹内的搜索（根据文件名）
   -  暂不支持对本地文件夹下子文件夹内图片的搜索
   
- **0.9.0**
   -  优化MoreEmojiHub的`表情包文件地址`。现版本支持填入`txt文件绝对路径`或者`文件夹绝对路径`或者`图片直链`或者`图片文件绝对路径`。
   -  优化控制台说明内容

- **0.8.12**
   -  新增`girlsbandcry`表情包2985张（www厨力好强）
   -  优化前缀匹配逻辑，对于前缀是`https:https://i0.hdslb.com/bfs/`的兼容

- **0.8.11**
   -  修复本地化描述修改无效的bug

- **0.8.9**
   -  增量60张`日富美表情包`至`ba表情包`
   -  新增`瑟莉亚表情包`（但是只有50多张，这是最少的一集）
   -  同步koishimeme

- **0.8.8** 新增表情包`eveonecat表情包`（表情包越来越多了...）

- **0.8.7**
   -  优化配置项的默认内容的代码写法（更加清晰）（堆得越来越多，乱起来了）

- **0.8.6**  新增表情包`acomu414表情包`
   -  （真是越来越喜欢找各种作者的的表情包了）

- **0.8.5** 
   -  新增表情包`seseren表情包`
   -  优化指令名称，统一为`XX表情包`

- **0.8.3** 增量53张铁道双子表情包至`ba表情包`

- **0.8.2**
   -  新增表情包`流萤表情`
   -  同步koishi.meme至559张（没变化

- **0.8.1**
   -  优化`QQchannelId`配置项的解释文字，原说明易误解
   -  完善README说明

- **0.8.0**
   -  删除chiikawa.txt中的第303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 375, 376, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386, 387, 388, 389, 390, 391, 392, 393, 394, 395, 396, 397, 398, 399, 400, 401, 402, 403, 404, 405, 406, 407, 457, 458, 459, 460, 461, 462, 463, 464, 465, 466, 467, 468, 469, 470, 471, 472, 473, 474, 475, 476, 477, 478, 479, 480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493, 494, 495, 496, 497, 498, 499, 500, 501, 502, 503, 504, 505, 506, 507, 508, 509行的重复内容。
   -  同步koishi.meme至559张

- **0.7.15**   优化`LocalSendNetworkPictures`功能，替换为`LocalSendNetworkPicturesList`，不再全局下载至本地，可以对单个指令下载

- **0.7.14** 
   -  完善README.md
   -  完善插件描述说明
   -  新增表情包`chiikawa`

- **0.7.13**   尝试新的插件描述

- **0.7.12**   修订

- **0.7.11**
   -  更改临时文件夹位置
   -  查重txt内容
      -  删除心海.txt中的第108, 323, 406, 412, 447, 476, 477, 478, 485, 506, 507, 508, 510, 511, 513, 524, 536, 548, 549, 551, 552, 556, 558, 562, 563, 564, 565, 566, 567, 568, 569, 571, 573, 580, 599, 601, 617, 625行的重复内容。

- **0.7.9**  完善**0.7.4**的尝试性更新


- **0.7.8** 
   -  新增配置项`LocalSendNetworkPictures`与`deletePictime`，允许网络图片使用本地方法发送，且定时删除
   -  完善README说明

- **0.7.6**  
   -  整合部分代码
   -  优化文件夹不存在的处理情况
   -  冗余代码整理
   -  完善模块导入
   -  更新版本号 orz

- **0.7.5**  
   -  新增`MDswitch`，作为QQ官方MD模式总开关
   -  调整部分配置项的顺序位置

- **0.7.4**  
   -  实验性尝试，以频道图片URL作为MD的图片链接
   -  适用于本地图片发送群聊MD的情况

- **0.7.3**  新增配置项`localPicToBase64`，可以调试本地图片以base64的形式发出

- **0.7.2**  优化txt内的URL匹配逻辑，不限制为B站专栏图片URL

- **0.7.1**  增加`心海表情包`指令

- **0.7.0**
   -  配置项加入`.pattern()`，限制错误输入
   -  审核ba表情包，删除部分不合URL

- **0.6.12**
   -  优化`groupListmapping`配置项，加入`enable`开关，允许黑名单屏蔽
   -  去重txt链接
         -  删除Downvote.txt中的第186行的重复内容。
         -  删除mygo.txt中的第101, 106, 322, 323行的重复内容
         -  删除赛马娘.txt中的第52, 125, 163, 213, 214, 755, 839, 975, 1033行的重复内容


- **0.6.11**
   -  新增`Downvote表情包` 、 `赛马娘表情包` 、 `mygo表情包`
   -  同步 `koishi meme`

- **0.6.9**
   -  更新配置项`allgroupautoEmoji` 与 `allgroupemojicommand`，允许全部群组都触发自动表情包
   -  删除`疾旋鼬`与`蜜汁工坊`内部分URL

- **0.6.8**
   -  新增`蜜汁工坊`表情包
   -  增量`ba表情包`至2600+ （经去重，实际2519）
   -  去重部分链接

- **0.6.7**
   -  优化配置项全部为本地文件夹路径情况下的`随机emojihub表情包`指令的发图逻辑
   -  优化控制台说明文字

- **0.6.6**
   -  新增`doro表情包`指令与对应txt
   -  兼容浏览器脚本`模式二`下产生的txt内容（URL前缀为`https:https://i0.hdslb.com/bfs/`）
   -  优化处理txt内容为空的情况
   -  优化日志调试模式，兼容对于其他路径下的txt的文件名提取
   -  优化部分指令，添加`表情包`后缀
   -  调整`本地图库示例`的默认值

- **0.6.5**  优化`随机emojihub表情包`在linux路径下的判断触发条件（更好的方法）

- **0.6.4**  优化`随机emojihub表情包`在linux路径下的判断触发条件

- **0.6.3**  优化`QQ官方bot`中间件发送本地图片的逻辑

- **0.6.2**  优化`QQ官方bot`发送本地图片的逻辑

- **0.6.1**  优化`listTxtCommands`函数为`listAllCommands`，以修复`本地文件夹指令消失`的bug

- **0.6.0**  
   - 支持本地文件夹图库，随机取图
   - 往期更新日志见**0.5.9** 的 `README.md`文件

- **0.5.9**  
   - i18n本地化支持（好像也没什么文本）
   - 纠正最新表情包套数

- **0.5.8** 
   - 加量`白圣女表情包`并且切分为黑白和彩色两种
   - 新增表情包`白圣女漫画表情包`，即漫画/黑白版`白圣女表情包`
   - 新增表情包`永雏小菲表情包`
   - 新增表情包`宇佐紀表情包`   

- **0.5.7** 
   - 移除`幻兽帕鲁梗图`
   - 新增`疾旋鼬表情包`

- **0.5.6** 
   - 新增配置项`emojihub_bili_command` 允许用户自定义注册父级指令
   - 优化官方指令列表MD`返回列表`按钮触发的指令
   - 优化配置项部分文字内容和默认文案

- **0.5.5** 优化README有关官方bot设置的说明

- **0.5.4** 优化README有关官方bot设置的说明

- **0.5.3** 适配官方MD，展示文字优化为数组，每次随机从中选一个展示

- **0.5.2** 哎呀呀呀呀，才发现`白圣女`表情包的前缀没去掉

- **0.5.1** 哎呀呀呀呀，忘记关掉调试的日志输出了

- **0.5.0** `emojihub-bili`指令的返回列表，适配官方MD按钮发送

- **0.4.15** 取消`实验性适配QQ官方平台之外的markdown消息`

- **0.4.14** markdown格式优化，`![img#${originalWidth} #${originalHeight}](${imageUrl})`改为`![img#${originalWidth}px #${originalHeight}px](${imageUrl})`

- **0.4.13** 实验性适配QQ官方平台之外的markdown消息

- **0.4.12** 整理`ba表情包`，增加至2200+条收录

- **0.4.11** 整理`ba表情包`，删除21条图片URL

- **0.4.9** 哎呀呀呀呀，忘记关掉调试的日志输出了

- **0.4.8** 哎呀呀呀呀，忘记注释掉调试URL了

- **0.4.7** 
   - 适配`puppeteer`与`canvas`的`canvas服务`。不再出现undefined。
   - 允许用户自定义按钮文字
   - 官方MD消息，适当放大过小分辨率的图片。并且允许用户自定义。
   - 删除`ba表情包`第1127图。（不合主题）

- **0.4.6** 支持官方MD消息使用`canvas`自动适配图片宽高。

- **0.4.5** 适配QQ官方MarkDown图片与按钮。方便用户调用  
   - [鸣谢Alin的杰出贡献！](https://github.com/Alin-sky)

- **0.4.3** 注释调试内容`session.send(session.content)`

- **0.4.2** 规范`require();`内容

- **0.4.1** 同步Koishi-meme表情包

- **0.4.0** 完善README。

- **0.3.9** 啥也没干

- **0.3.7** 支持配置撤回表情的配置项`deleteMsg`与`deleteMsgtime`

- **0.3.6** 完成**0.3.4**的理想内容，优化配置项`当前配置项不满足约束，请检查配置`的情况

- **0.3.5** 优化配置项`当前配置项不满足约束，请检查配置`的情况

- **0.3.4** 优化日志调试输出

- **0.3.3** `滑稽.txt`精简前缀。新增`孤独摇滚`表情包。

- **0.3.2** 更新注释

- **0.3.1**  
   -  新增`千恋万花`表情包
   -  新增`滑稽`表情包
- **0.3.0**  整体完善说明。

- **0.2.14** 优化`随机emojihub表情包`指令的随机逻辑

- **0.2.13** 同步koishi-meme的内容
   - 注：[相关项目地址](https://github.com/itzdrli/koishi-meme)

- **0.2.12** 支持每个群组配置多套随机表情包。需要填入`指令名称1，指令名称2`的格式，即用逗号相隔。

- **0.2.11** 优化`找不到文件`时的返回内容。

- **0.2.9** 优化调试模式下 日志的输出。

- **0.2.8** 新增随机表情包指令。调整表格位置。

- **0.2.7** 调整指令排序。修改`groupListmapping`表格的默认内容。

- **0.2.6** 更正控制台说明文字，只需要点击`MoreEmojiHub`表格右上角按钮内的`恢复默认值`就可以恢复到匹配的最新内容了

- **0.2.5** 
   - 加入有关koishi的meme哈哈哈哈哈 
   - 鸣谢 [itzdrli](https://github.com/itzdrli) 

- **0.2.4** 增强配置项`consoleinfo`输出的内容。

- **0.2.3** 优化更新
   - 优化了用户自定义指令时出现错误的提示
   - 优化自动回复机制，指令消息将不会被计数

- **0.2.2** 维护更新
   - 调整配置项`count`到`autoEmoji`下方，配置逻辑更合理。
   - 调整独立函数，精简代码。

- **0.2.1** 更正控制台说明，考虑到**0.1.12**版本的更新，更正为17套表情包。

- **0.2.0** 重大更新
   - 1.新增配置项 `autoEmoji`、 `triggerprobability`、 `groupListmapping`、 `count` ，作为进阶设置。
   - 2.支持`自动表情包`功能，可以让机器人接收到一定数量的消息后 概率发送表情包。
   - 3.支持按群组配置自定义的表情包。
   - 4.优化配置项`MoreEmojiHub`等的排布。更整洁。

- **0.1.12** 完善说明文档。增添`ba表情包`指令的默认配置项。

- **0.1.11** 使用.trim()方法，清理txtUrl ， 这样session.platform === 'qq'也可以使用这个插件啦~

- **0.1.10** 修复更新日志**0.1.9**中未完全修复的错误。

- **0.1.9**  修复更新日志**0.1.7**和**0.1.5**中错误显示为可点击的会导致跳转至错误页面的链接。

- **0.1.8**  删除【男娘武器库.txt】的第312,312,315个表情包（因有群号水印）。感谢群友提醒。

- **0.1.7**  优化对于用户自定义添加的txt内容包含【`https://i0.hdslb.com/bfs/`】开头的兼容。解决【0.1.5】版本精简带来的负面影响。

- **0.1.6**  1.一直忘记加上【fufu】表情包指令了（真是粗心呢  2.更新文件夹名称【jsons】为【txts】

- **0.1.5**  精简每个txt文件的图片url的【`https://i0.hdslb.com/bfs/`】部分

- **0.1.4**  删除【男娘武器库.txt】的第316个表情包（因有群号水印）。感谢群友提醒。

- **0.1.3**  1.在控制台添加【如何添加自己喜欢的表情包】这部分的操作说明。  2.删除对于指令的说明，以简化【emojihub-bili】调出来之后【子指令】的内容。

- **0.1.2**  添加【如何添加自己喜欢的表情包】【如何删除表情包】这部分的readme说明。

- **0.1.1**  基本实现指令触发后调用并发送图片。

</details>