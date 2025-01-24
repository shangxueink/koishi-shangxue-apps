# koishi-plugin-change-auth-callme

[![npm](https://www.npmjs.com/package/koishi-plugin-change-auth-callme)](https://www.npmjs.com/package/koishi-plugin-change-auth-callme)

本插件允许用户通过指定的命令更改他们的权限级别。此插件特别适用于需要管理用户权限的部署者。

---

#### 用法

插件启用后，用户可以通过以下命令提升权限：

```
changeauth 5
```

以上命令将用户的权限提升至 5。用户可以根据需要调整数字以更改权限级别。

#### 配置项说明

| 配置项              |  默认值        | 描述                       |
|-------------------|------------|--------------------------|
| `Command_Name`    |  changeauth | 注册的指令名称               |
| `MAX_authority_Limit` |  100        | 允许修改的最大权限值            |

