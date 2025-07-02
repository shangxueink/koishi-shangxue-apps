# @shangxueink/koishi-plugin-qq-markdown-button

[![npm](https://img.shields.io/npm/v/@shangxueink/koishi-plugin-qq-markdown-button?style=flat-square)](https://www.npmjs.com/package/@shangxueink/koishi-plugin-qq-markdown-button)

---

**让你的 Koishi 机器人拥有强大的 QQ Markdown 按钮菜单功能！**

本插件允许你为 QQ 官方机器人自定义各种类型的交互式菜单，包括 JSON 按钮、被动模板 Markdown 和原生 Markdown，助你打造更丰富、更强大的机器人服务。

### 功能特性

*   **三种菜单类型支持：**
    *   **JSON 按钮：** 发送带有标准 JSON 格式交互按钮的消息，灵活定义按钮样式和动作。
    *   **被动模板 Markdown：** 结合 JSON 配置文件和 Markdown 模板，快速生成结构化的 Markdown 消息，适用于需要参数化配置的场景。
    *   **原生 Markdown：** 发送更自由、更复杂的原生 Markdown 消息，同时支持 JSON 按钮，满足高级定制需求。
*   **灵活的配置方式：** 通过简单的配置文件（`.json` 和 `.md`），即可轻松定制菜单内容和样式，无需编写代码。
*   **变量替换：** 配置文件中支持动态变量，如 `${session.messageId}`、`${markdown}` 等，运行时自动替换为实际值，实现更强大的动态内容生成。
*   **自动回调处理：** 可配置自动执行按钮回调内容，简化交互逻辑。
*   **多实例支持：** 插件可重用，支持创建多个插件实例，配置不同的指令名称和菜单配置，轻松管理多个独立的菜单功能。


### 使用方法

1.  **配置目录：**
    *   安装插件后，在 Koishi 的 `data` 目录下会自动创建 `qq-markdown-button` 文件夹，以及默认的 `按钮菜单配置1` 文件夹（文件夹名称可在插件配置中自定义）。
    *   插件会自动在配置的文件夹下创建 `json`、`markdown` 和 `raw` 三个子目录，分别用于存放不同类型的菜单配置文件。
    *   你可以在 `Koishi控制台` -> `资源管理器` -> `data` -> `qq-markdown-button` -> `按钮菜单配置1` 目录下找到这些文件夹和示例文件。

2.  **编辑配置文件：**
    *   根据你选择的菜单类型（`json`、`markdown` 或 `raw`），编辑对应目录下的 `.json` 和 `.md` 文件。
    *   **JSON 配置文件 (`.json`)：** 定义消息类型、按钮、Markdown 模板参数等。
    *   **Markdown 文件 (`.md`)：** （仅 `raw` 类型需要）编写原生 Markdown 内容。

3.  **配置插件：**
    *   在 Koishi 配置文件中，配置 `qq-markdown-button` 插件，设置指令名称、菜单类型、文件路径等。
    *   **重要配置项：**
        *   `command_name`: 自定义触发菜单的指令名称，例如 `按钮菜单`。
        *   `file_name`: 配置存储文件的文件夹路径，默认为 `["data", "qq-markdown-button", "按钮菜单配置1"]`。
        *   `type_switch`: 选择菜单发送方式，可选 `json`、`markdown` 或 `raw`。
        *   `Allow_INTERACTION_CREATE`: 是否自动执行按钮回调指令。
        *   `consoleinfo`: 是否开启日志调试模式。

4.  **使用指令：**
    *   在 QQ 群或私聊中，使用配置的指令名称（例如 `/按钮菜单`）即可触发菜单。

### 配置文件详解

#### `msg_id` 和 `event_id` 字段

在 JSON 配置文件中，你可能会看到 `msg_id` 和 `event_id` 这两个字段，例如：

```json
{
    "msg_id": "${session.messageId}",
    "event_id": "${INTERACTION_CREATE}",
    // ... 其他配置 ...
}
```

*   **`msg_id`**: 用于**被动消息**，通常在用户发送指令后，机器人回复的消息中需要包含 `msg_id`。`${session.messageId}` 变量会在运行时被替换为**当前会话的消息 ID**。
*   **`event_id` (或 `INTERACTION_CREATE`)**: 用于在某些特定情况下（例如使用 `acknowledgeInteraction`）需要传递的交互事件 ID。

**重要说明：**

*   **`msg_id` 和 `event_id` (或 `INTERACTION_CREATE`) 这两个字段在实际使用中是互斥的，不能同时出现在一个 JSON 配置中。**
*   本插件的代码内部已经处理了这种情况，会根据 `session.messageId` 是否存在来动态删除 JSON 对象中不需要的字段，以确保发送的消息格式正确。
*   **被动消息 (使用 `msg_id`)**: 指用户发送指令后，机器人根据指令回复的消息。

#### 变量替换

配置文件中支持以下变量占位符，插件会在运行时自动替换：

*   `${session.messageId}`: 当前会话的消息 ID。
*   `${INTERACTION_CREATE}`: 运行时会替换为当前回调按钮的interaction_id。
*   `${markdown}`: 会被替换为从对应 `.md` 文件读取的Markdown内容。
*   `${0}`, `${1}`, ...：这些数字占位符用于获取命令参数。例如，如果命令是 `/mycommand arg1 arg2`，那么 `${0}` 会被替换为 `arg1`，`${1}` 会被替换为 `arg2`。
*   当命令没有提供足够的参数时（例如，命令是 `/mycommand arg1`，但模板中使用了 `${1}`），未提供的数字占位符将自动被替换为字符串 `"undefined"`。
*   `${config.xxx}`: 插件配置项的值，例如 `${config.markdown_id}`、`${config.json_button_id}` 等。

### 示例配置

#### 默认 JSON 按钮模板示例

以下是一个默认的 JSON 按钮指令按钮模板示例：

用于申请QQ开放平台的json按钮模板或者用于原生markdown按钮

<details>
<summary>点击此处————查看源码</summary>

```json
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
            "data": "/再来一张",
            "enter": true
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

以下是本插件的 JSON 按钮类型配置文件 (`json/json.json`) 示例：

```json
{
    "msg_id": "${session.messageId}",
    "event_id": "${INTERACTION_CREATE}",
    "msg_type": 2,
    "content": "",
    "keyboard": {
        "id": "${config.json_button_id}"
    }
}
```
</details>

---

#### 默认 Markdown 模板示例

以下是一个默认的 Markdown 模板示例：

用于申请QQ开放平台的被动markdown模板。
<details>
<summary>点击此处————查看源码</summary>

```markdown
{{.text1}}
{{.text2}}
{{.img}}{{.url}}
```

**配置模板参数示例：**

| 参数    | 示例值                           |
| ------- | -------------------------------- |
| `text1` | 这是第一段文字                   |
| `text2` | 这是第二段文字                   |
| `img`   | `![img]`                         |
| `url`   | `(https://koishi.chat/logo.png)` |


</details>


以下是本插件的 Markdown 模板类型配置文件 (`markdown/markdown.json`) 示例：

<details>
<summary>点击此处————查看源码</summary>

```json
{
    "msg_type": 2,
    "msg_id": "${session.messageId}",
    "event_id": "${INTERACTION_CREATE}",
    "markdown": {
        "custom_template_id": "${config.markdown_id}",
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
        ]
    },
    "keyboard": {
        "id": "${config.json_button_id}"
    }
}
```
</details>

---

#### 默认原生 Markdown 示例

以下是一个默认的原生 Markdown 类型示例：

<details>
<summary>点击此处————查看源码</summary>

**JSON 配置文件 (`raw/raw_markdown.json`)：**

```json
{
    "msg_type": 2,
    "msg_id": "${session.messageId}",
    "event_id": "${INTERACTION_CREATE}",
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
                                "data": "${config.command_name}",
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

**Markdown 文件 (`raw/raw_markdown.md`)：**

```markdown
# 你好啊

这是一个 markdown 消息哦~
```

</details>

---

### 许可证

本项目采用 `MIT 许可证`。

---