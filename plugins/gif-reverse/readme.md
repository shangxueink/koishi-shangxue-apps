# koishi-plugin-gif-reverse
[![npm](https://img.shields.io/npm/v/koishi-plugin-gif-reverse?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-gif-reverse)

| 位置                 | 仓库地址                                                                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm 包               | [https://www.npmjs.com/package/koishi-plugin-gif-reverse](https://www.npmjs.com/package/koishi-plugin-gif-reverse)                                                     |
| idranme 仓库         | [https://github.com/idranme/koishi-plugin-gif-reverse](https://github.com/idranme/koishi-plugin-gif-reverse)                                                           |
| shangxueink 仓库     | [https://github.com/shangxueink/koishi-plugin-gif-reverse](https://github.com/shangxueink/koishi-plugin-gif-reverse)                                                   |
| shangxueink 发布仓库 | [https://github.com/shangxueink/koishi-shangxue-apps/blob/main/plugins/gif-reverse](https://github.com/shangxueink/koishi-shangxue-apps/blob/main/plugins/gif-reverse) |


处理 GIF 图片，提供倒放/正放、变速、滑动、旋转、翻转功能。

## 指令选项

| 选项        | 简写 | 描述                                       | 类型      | 默认值 |
| ----------- | ---- | ------------------------------------------ | --------- | ------ |
| `--rebound` | `-b` | 回弹播放 GIF                               | `boolean` |        |
| `--reverse` | `-r` | 倒放 GIF                                   | `boolean` |        |
| `--speed`   | `-s` | 改变播放速度 (大于 1 为加速，小于则为减速) | `number`  | `1`    |
| `--slide`   | `-l` | 滑动方向 (左/右/上/下)                     | `string`  |        |
| `--rotate`  | `-o` | 旋转方向 (顺/逆)                           | `string`  |        |
| `--mirror`  | `-m` | 翻转方向 (上/下/左/右)                     | `string`  |        |

## 使用示例

*   **倒放 GIF:**

    ```
    gif -r
    ```

*   **两倍速右滑 GIF:**

    ```
    gif -f -s 2 -l 右
    ```

*   **向左翻转 GIF:**

    ```
    gif -m 左
    ```

*   **逆时针旋转 GIF:**

    ```
    gif -o 逆
    ```