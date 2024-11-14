# koishi-plugin-command-creator-extender

[![npm](https://img.shields.io/npm/v/koishi-plugin-command-creator-extender?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-command-creator-extender)


Command Creator Extender 是一个 Koishi 插件，用于将已有的指令映射到其他指令，并允许用户自定义指令。

## 功能

- **指令映射**：通过配置表将输入指令映射到多个输出指令。
- **自定义指令**：用户可以创建自定义指令，指定其行为为回复消息或执行其他指令。
- **日志调试**：启用调试模式以输出详细日志信息。

## 使用方法

您可以在 `table2` 表格中指定【关键词或已经注册的指令】的调用关系。

### 注意事项

- **table2**：在执行完【关键词或原始指令】之后，会自动执行右侧的【下一个指令】。可以指定多个重复的【关键词或原始指令】以实现多重调用。

## 配置项

### 指令设置

- **table2**：指令调用映射表。因为不是注册指令，只是匹配接收到的消息，所以如果希望有前缀触发的话，需要加上前缀。当然也可以写已有的指令名称比如【/help】（需要指令前缀）。

  示例配置：

  ```json
  [
    {
      "rawCommand": "/help",
      "nextCommand": "status"
    },
    {
      "rawCommand": "/一键打卡",
      "nextCommand": "今日运势"
    },
    {
      "rawCommand": "/一键打卡",
      "nextCommand": "签到"
    },
    {
      "rawCommand": "/一键打卡",
      "nextCommand": "鹿"
    }
  ]
  ```

### 调试设置

- **reverse_order**：是否逆序执行指令（先执行下一个指令再执行原始指令）。默认为 `false`。
- **loggerinfo**：日志调试模式。默认为 `false`。

## 许可证

此项目遵循 MIT 许可证。