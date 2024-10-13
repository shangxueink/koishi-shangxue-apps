# koishi-plugin-dgluna

[![npm](https://img.shields.io/npm/v/koishi-plugin-dgluna?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-dgluna)



---



DgLuna 是一个用于 DG-LAB 游戏的插件，提供了公共放映厅的功能。


## 使用方法

### 连接 DG-LAB 频道

```bash
dgluna.connect [endpoint: string]
```

- **参数**: 
  - `endpoint`: 可选，指定连接的 DG-LAB 频道。
- **触发示例** : `dgluna.connect ws://1.2.3.4:5555` 或者 `dgluna.connect`

### 调整通道强度

```bash
dgluna.strchange <channel: string> <value: number>
```

- **参数**:
  - `channel`: 要调整的通道名称。
  - `value`: 要设定的强度值。
- **触发示例** : `dgluna.strchange A -5`（A通道减弱5）

### 设定通道强度

```bash
dgluna.strset <channel: string> <value: string>
```

- **参数**:
  - `channel`: 要设定的通道名称。
  - `value`: 要设定的强度值。
- **触发示例** : `dgluna.strset A 15`（A通道设定至15）
### 设定通道波形

```bash
dgluna.waveset <channel: string> <wave: number> <time: number>
```

- **参数**:
  - `channel`: 要设定的通道名称。
  - `wave`: 波形编号。
  - `time`: 持续时间。

### 邀请用户加入

```bash
dgluna.invite <user: string>
```

- **参数**:
  - `user`: 要邀请的用户 ID。
- **触发示例** : `dgluna.invite @猫猫`
### 退出频道

```bash
dgluna.exit
```

## 注意事项

- 请确保您已安装并正确配置 `koishi-plugin-qrcode-service` 插件。
- 确保您的环境支持所有必要的依赖项。

## 贡献

欢迎提交问题和贡献代码！请通过 [GitHub 仓库](#) 提交您的贡献。

---

你可以根据需要进一步修改和完善这个 README。