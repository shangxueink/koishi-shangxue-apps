import { Context, Schema } from 'koishi'
import { } from 'koishi-plugin-downloads'
import { access, constants, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import * as os from 'node:os'
import { FFmpeg } from './ffmpeg'
export * from './ffmpeg'
import registry from 'get-registry'

const platform = os.platform()
const arch = os.arch()

export const name = 'ffmpeg-path'

export const inject = {
  optional: ['downloads']
};

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
  loggerinfo: boolean
  path?: string
  downloadsFFmpeg: boolean
  pathFormDownloads: boolean
  waitForDownloads: boolean
  resolveTime?: number
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    path: Schema.string().description('指定`ffmpeg可执行文件`的绝对路径'),
    downloadsFFmpeg: Schema.boolean().default(true).description("找不到可执行文件时，自动调用`downloads`下载`ffmpeg.exe`"),
  }).description('基础设置'),
  Schema.object({
    pathFormDownloads: Schema.boolean().default(true).description("指定路径不可用时，检测`./downloads`目录下是否存在可执行文件"),
    waitForDownloads: Schema.boolean().default(true).description("文件不可用 且 `downloads`服务不可用时，监测`downloads`服务状态"),
  }).description('进阶设置'),
  Schema.union([
    Schema.object({
      waitForDownloads: Schema.const(true),
      resolveTime: Schema.number().description("每隔 若干`毫秒` 检测一次`downloads`服务是否可用<br>本插件启动成功 则退出监测").default(3000),
    }),
    Schema.object({
      waitForDownloads: Schema.const(false).required(),
    }),
  ]),

  Schema.object({
    loggerinfo: Schema.boolean().default(false).description("日志调试模式"),
  }).description('开发者选项'),
])
export async function apply(ctx: Context, config: Config) {
  let executable: string | null = null; // 初始值为 null，表示尚未找到可执行文件
  let downloadsServiceRequired = false; // 标记是否需要 downloads 服务

  // 视奸
  ctx.on('ready', () => {
    monitorAvailability();
  });

  // 持续监听 downloads 服务或指定的 path
  async function monitorAvailability() {
    logInfo(config)
    while (!executable) {
      // 检查指定的 path
      if (config.path && await checkPath(config.path)) {
        executable = config.path;
        break; // 退出循环
      }

      // 优先尝试查找 downloads 目录下的 ffmpeg
      const downloadsDirExecutable = await tryFindDownloadsDir();
      if (downloadsDirExecutable) {
        executable = downloadsDirExecutable;
        ctx.logger.warn(`检测到 指定路径不可用，使用 downloads 目录下的 FFmpeg 文件。`);
        break; // 退出循环
      }

      // 尝试使用 downloads 服务
      const downloadsExecutable = await tryUseDownloads();
      if (downloadsExecutable) {
        executable = downloadsExecutable;
        ctx.logger.warn(`downloads 成功下载 FFmpeg: ${executable}`);
        break; // 退出循环
      }

      if (!config.waitForDownloads) break; // 如果不需要等待，则退出循环

      // 等待一段时间后重试
      await new Promise(resolve => ctx.setTimeout(() => resolve(undefined), config.resolveTime)); // 等待 3 秒
    }

    // 如果找到了可执行文件，则启动插件
    if (executable) {
      ctx.logger.info(`使用 FFmpeg 可执行文件: ${executable}`);
      ctx.plugin(FFmpeg, executable);
    } else {
      ctx.logger.error(`无法找到可用的 FFmpeg 可执行文件。插件启动失败。`);
    }
  }

  function logInfo(...args: any[]) {
    if (config.loggerinfo) {
      (ctx.logger.info as (...args: any[]) => void)(...args);
    }
  }

  // 检查指定的 path 是否可用
  async function checkPath(path: string): Promise<boolean> {
    if (!path || !existsSync(path)) {
      return false;
    }
    try {
      const stats = await stat(path);
      if (!stats.isFile()) { // 检查是否是文件
        return false;
      }
      await access(path, constants.F_OK | constants.X_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  // 尝试查找 downloads 目录下的 ffmpeg
  async function tryFindDownloadsDir(): Promise<string | null> {
    if (!config.pathFormDownloads) return null; // 如果配置项禁用，则直接返回 null

    const downloadsDir = './downloads';
    if (!existsSync(downloadsDir)) {
      return null;
    }

    try {
      const files = await readdir(downloadsDir);
      for (const file of files) {
        const fullPath = resolve(downloadsDir, file);
        const stats = await stat(fullPath);
        if (stats.isDirectory()) {
          const ffmpegPath = resolve(fullPath, platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
          if (await checkPath(ffmpegPath)) {
            return ffmpegPath;
          }
        }
      }
    } catch (error) {
      ctx.logger.warn(`查找 downloads 目录下的 FFmpeg 失败: `, error);
      return null;
    }
    return null;
  }

  // 尝试使用 downloads 服务
  async function tryUseDownloads(): Promise<string | null> {
    if (!config.downloadsFFmpeg) return null; // 如果配置项禁用，则直接返回 null

    if (!ctx.downloads) {
      if (downloadsServiceRequired === false) {
        ctx.logger.warn(`缺少 downloads 依赖。请确保已安装并启用该插件。`);
        downloadsServiceRequired = true; // 只提示一次
      }
      return null;
    }
    try {
      const task = ctx.downloads.nereid('ffmpeg', [
        `npm://@koishijs-assets/ffmpeg?registry=${await registry()}`
      ], bucket());
      const path = await task.promise;
      return platform === 'win32' ? `${path}/ffmpeg.exe` : `${path}/ffmpeg`;
    } catch (error) {
      ctx.logger.warn(`使用 downloads 服务下载 FFmpeg 失败: `, error);
      return null;
    }
  }

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
