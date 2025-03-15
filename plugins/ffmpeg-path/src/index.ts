import { Context, Schema } from 'koishi'
import { } from 'koishi-plugin-downloads'
import { access, constants } from 'node:fs/promises';
import { existsSync } from 'node:fs'
import * as os from 'node:os'
import { FFmpeg } from './ffmpeg'
export * from './ffmpeg'
import registry from 'get-registry'

const platform = os.platform()
const arch = os.arch()

export const name = 'ffmpeg-path'
export const usage = `

### Termux 环境配置 (重要)

由于 Termux 的特殊文件系统结构，您需要手动指定 FFmpeg 的路径。请按照以下步骤操作：

1.  **安装 FFmpeg:** 在 Termux 中运行以下命令安装 FFmpeg：

    \`\`\`bash
    pkg install ffmpeg -y
    \`\`\`

2.  **查找 FFmpeg 路径:** 安装完成后，使用以下命令找到 FFmpeg 可执行文件的绝对路径：

    \`\`\`bash
    which ffmpeg
    \`\`\`

    通常，您会得到类似于 \`/data/data/com.termux/files/usr/bin/ffmpeg\` 的路径。

3.  **配置插件:** 在\`path\` 选项设置为您在上一步中找到的路径：

    \`/data/data/com.termux/files/usr/bin/ffmpeg\`

4.  **重载插件:** 保存配置文件并重载插件，以使配置生效。

### 其他平台

对于其他平台（Windows、macOS、Linux），支持自动下载。

如果您希望使用特定版本的 FFmpeg，您仍然可以通过 \`path\` 选项指定其绝对路径。

### 自动下载 

如果您没有安装 FFmpeg，或者不想手动配置路径，插件会自动下载 FFmpeg。但是，请注意：

*   自动下载的 FFmpeg 可能不是最新版本。
*   在某些环境中，自动下载可能会失败。
*   自动下载的ffmpeg将会存放在项目目录下的\`download\`文件夹中

---

个人使用咪~ 会在 [原项目的PR11](https://github.com/koishijs/koishi-plugin-ffmpeg/pull/11) 通过时 移除本插件。
`;

export interface Config {
  path?: string
}

export const Config: Schema<Config> = Schema.object({
  path: Schema.string().description('指定ffmpeg可执行文件的绝对路径')
})

export const inject = {
  optional: ['downloads']
};

export async function apply(ctx: Context, config: Config) {
  ctx.on('ready', async () => {
    let executable: string;
    try {
      if (config.path && existsSync(config.path)) {
        ctx.logger.warn(`指定了 ffmpeg 路径: ${config.path}`);
        try {
          await access(config.path, constants.F_OK | constants.X_OK); // 检查 存在和可执行
          executable = config.path;
        } catch (error) {
          ctx.logger.warn(`指定的 FFmpeg 路径 (${config.path}) 不可用: `, error.message);
          // 使用自动下载
        }
      } else if (!executable) { // 如果指定path 但是不可用，则 进入自动下载
        const downloadsAvailable = await waitForDownloads(ctx);
        if (!downloadsAvailable) {
          ctx.logger.warn(`缺少 downloads 依赖，无法自动下载 ffmpeg。无法自动下载，请确保手动安装 ffmpeg 并配置路径。`);
          return; // 退出插件启动
        }
        const task = ctx.downloads.nereid('ffmpeg', [
          `npm://@koishijs-assets/ffmpeg?registry=${await registry()}`
        ], bucket())
        const path = await task.promise
        executable = platform === 'win32' ? `${path}/ffmpeg.exe` : `${path}/ffmpeg`
      }
      ctx.logger.info(`使用 FFmpeg 可执行文件: ${executable}`);
      ctx.plugin(FFmpeg, executable);
    } catch (error) {
      ctx.logger.warn(`插件启动失败： `, error);
    }

    async function waitForDownloads(ctx: Context, timeout = 3000): Promise<boolean> {
      const startTime = Date.now();
      while (!ctx.downloads && Date.now() - startTime < timeout) {
        await new Promise(resolve => setTimeout(resolve, 300)); // 短暂等待
      }
      return !!ctx.downloads; // 返回 downloads 是否可用
    }
  });
}

function bucket() {
  let bucket = 'ffmpeg-';
  switch (platform) {
    case 'win32':
      bucket += 'windows-';
      break;
    case 'linux':
      bucket += 'linux-';
      break;
    case 'darwin':
      bucket += 'macos-';
      break;
    default:
      throw new Error(`不支持的平台: ${platform}`);
  }
  switch (arch) {
    case 'arm':
      bucket += 'armel';
      break;
    case 'arm64':
      bucket += 'arm64';
      break;
    case 'x86':
      bucket += 'i686';
      break;
    case 'x64':
      bucket += 'amd64';
      break;
    default:
      throw new Error(`不支持的架构: ${arch}`);
  }
  return bucket;
}
