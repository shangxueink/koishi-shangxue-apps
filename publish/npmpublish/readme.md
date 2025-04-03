# koishi-plugin-ffmpeg-path

[![npm](https://img.shields.io/npm/v/koishi-plugin-ffmpeg-path?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-ffmpeg-path)


### Termux 环境配置 (重要)

由于 Termux 的特殊文件系统结构，您需要手动指定 FFmpeg 的路径。请按照以下步骤操作：

1.  **安装 FFmpeg:** 在 Termux 中运行以下命令安装 FFmpeg：

    ```bash
    pkg install ffmpeg -y
    ```

2.  **查找 FFmpeg 路径:** 安装完成后，使用以下命令找到 FFmpeg 可执行文件的绝对路径：

    ```bash
    which ffmpeg
    ```

    通常，您会得到类似于 `/data/data/com.termux/files/usr/bin/ffmpeg` 的路径。

3.  **配置插件:** 在`path` 选项设置为您在上一步中找到的路径：

    `/data/data/com.termux/files/usr/bin/ffmpeg`

4.  **重载插件:** 保存配置文件并重载插件，以使配置生效。

### 其他平台

对于其他平台（Windows、macOS、Linux），支持自动下载。

如果您希望使用特定版本的 FFmpeg，您仍然可以通过 `path` 选项指定其绝对路径。

### 自动下载 

如果您没有安装 FFmpeg，或者不想手动配置路径，插件会自动下载 FFmpeg。但是，请注意：

*   自动下载的 FFmpeg 可能不是最新版本。
*   在某些环境中，自动下载可能会失败。
*   自动下载的ffmpeg将会存放在项目目录下的`download`文件夹中

---

个人使用咪~ 会在 [原项目的PR11](https://github.com/koishijs/koishi-plugin-ffmpeg/pull/11) 通过时 移除本插件。