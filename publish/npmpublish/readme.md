# koishi-plugin-change-auth-callme

[![npm](https://img.shields.io/npm/v/koishi-plugin-change-auth-callme)](https://www.npmjs.com/package/koishi-plugin-change-auth-callme)

Koishi 权限管理插件，支持手动指令修改权限和基于角色的自动权限分配。



### 手动修改权限
```
changeauth 5
```

### 自动权限分配
启用自动授权后，插件会根据用户在群组中的角色自动分配权限：
- 群主 (owner) → 权限 4
- 管理员 (admin) → 权限 3  
- 群员 (member) → 权限 1

## 主要配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `Command_Name` | `changeauth` | 指令名称 |
| `MAX_authority_Limit` | `5` | 最大权限值 |
| `enableAutoAuth` | `false` | 启用自动授权 |
| `middleware_true` | `false` | 使用前置中间件 |
| `delayTime` | `1000` | 延迟执行时间(ms) |

## 注意事项

- 建议配置过滤器限制使用用户
- 前置中间件需要延迟执行以确保用户字段正确加载
- 自动授权可能覆盖手动设置的权限

