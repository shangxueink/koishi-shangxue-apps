var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  FFmpeg: () => FFmpeg,
  FFmpegBuilder: () => FFmpegBuilder,
  apply: () => apply,
  inject: () => inject,
  name: () => name,
  usage: () => usage
});
module.exports = __toCommonJS(src_exports);
var import_koishi2 = require("koishi");
var import_promises = require("node:fs/promises");
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var os = __toESM(require("node:os"));

// src/ffmpeg.ts
var import_koishi = require("koishi");
var import_node_child_process = require("node:child_process");
var import_node_stream = require("node:stream");
var _FFmpegBuilder = class _FFmpegBuilder {
  constructor(executable) {
    this.executable = executable;
    this.inputOptions = [];
    this.outputOptions = [];
  }
  input(arg) {
    this._input = arg;
    return this;
  }
  inputOption(...option) {
    this.inputOptions.push(...option);
    return this;
  }
  outputOption(...option) {
    this.outputOptions.push(...option);
    return this;
  }
  run(type, path) {
    const options = ["-y"];
    if (typeof this._input === "string") {
      options.push(...[...this.inputOptions, "-i", this._input]);
    } else {
      options.push(...[...this.inputOptions, "-i", "-"]);
    }
    if (type === "file") {
      options.push(...[...this.outputOptions, path]);
    } else if (type !== "info") {
      options.push(...[...this.outputOptions, "-"]);
    }
    const child = (0, import_node_child_process.spawn)(this.executable, options, { stdio: "pipe" });
    if (this._input instanceof Buffer) {
      child.stdin.write(this._input);
      child.stdin.end();
    } else if (this._input instanceof import_node_stream.Readable) {
      this._input.pipe(child.stdin);
    }
    if (type === "stream") {
      return child.stdout;
    } else {
      return new Promise((resolve2, reject) => {
        child.stdin.on("error", function(err) {
          if (!["ECONNRESET", "EPIPE", "EOF"].includes(err["code"])) reject(err);
        });
        child.on("error", reject);
        let stream;
        if (type === "file") {
          child.on("exit", (code) => code === 0 ? resolve2() : reject(new Error(`exited with ${code}`)));
        } else if (type === "buffer") {
          stream = child.stdout;
        } else if (type === "info") {
          stream = child.stderr;
        }
        if (stream) {
          const buffer = [];
          stream.on("data", (data) => buffer.push(data));
          stream.on("end", () => resolve2(Buffer.concat(buffer)));
          stream.on("error", reject);
        }
      });
    }
  }
};
__name(_FFmpegBuilder, "FFmpegBuilder");
var FFmpegBuilder = _FFmpegBuilder;
var _FFmpeg = class _FFmpeg extends import_koishi.Service {
  constructor(ctx, executable) {
    super(ctx, "ffmpeg");
    this.executable = executable;
  }
  builder() {
    return new FFmpegBuilder(this.executable);
  }
};
__name(_FFmpeg, "FFmpeg");
var FFmpeg = _FFmpeg;

// src/index.ts
var import_get_registry = __toESM(require("get-registry"));
var platform2 = os.platform();
var arch2 = os.arch();
var name = "ffmpeg-path";
var inject = {
  optional: ["downloads"]
};
var usage = `

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
var Config = import_koishi2.Schema.intersect([
  import_koishi2.Schema.object({
    path: import_koishi2.Schema.string().description("指定ffmpeg可执行文件的绝对路径"),
    downloadsFFmpeg: import_koishi2.Schema.boolean().default(true).description("找不到可执行文件时，自动调用`downloads`下载`ffmpeg.exe`")
  }).description("基础设置"),
  import_koishi2.Schema.object({
    pathFormDownloads: import_koishi2.Schema.boolean().default(true).description("指定路径不可用时，检测`./downloads`目录下是否存在可执行文件"),
    waitForDownloads: import_koishi2.Schema.boolean().default(true).description("文件不可用 且 `downloads`服务不可用时，监测`downloads`服务状态")
  }).description("进阶设置"),
  import_koishi2.Schema.union([
    import_koishi2.Schema.object({
      waitForDownloads: import_koishi2.Schema.const(true),
      resolveTime: import_koishi2.Schema.number().description("每隔 若干`毫秒` 检测一次`downloads`服务是否可用<br>本插件启动成功 则退出监测").default(3e3)
    }),
    import_koishi2.Schema.object({
      waitForDownloads: import_koishi2.Schema.const(false).required()
    })
  ]),
  import_koishi2.Schema.object({
    loggerinfo: import_koishi2.Schema.boolean().default(false).description("日志调试模式")
  }).description("开发者选项")
]);
async function apply(ctx, config) {
  let executable = null;
  let downloadsServiceRequired = false;
  ctx.on("ready", () => {
    monitorAvailability();
  });
  async function monitorAvailability() {
    logInfo(config);
    while (!executable) {
      if (config.path && await checkPath(config.path)) {
        executable = config.path;
        break;
      }
      const downloadsDirExecutable = await tryFindDownloadsDir();
      if (downloadsDirExecutable) {
        executable = downloadsDirExecutable;
        ctx.logger.warn(`检测到 指定路径不可用，使用 downloads 目录下的 FFmpeg 文件。`);
        break;
      }
      const downloadsExecutable = await tryUseDownloads();
      if (downloadsExecutable) {
        executable = downloadsExecutable;
        ctx.logger.warn(`downloads 成功下载 FFmpeg: ${executable}`);
        break;
      }
      if (!config.waitForDownloads) break;
      await new Promise((resolve2) => ctx.setTimeout(() => resolve2(void 0), config.resolveTime));
    }
    if (executable) {
      ctx.logger.info(`使用 FFmpeg 可执行文件: ${executable}`);
      ctx.plugin(FFmpeg, executable);
    } else {
      ctx.logger.error(`无法找到可用的 FFmpeg 可执行文件。插件启动失败。`);
    }
  }
  __name(monitorAvailability, "monitorAvailability");
  function logInfo(...args) {
    if (config.loggerinfo) {
      ctx.logger.info(...args);
    }
  }
  __name(logInfo, "logInfo");
  async function checkPath(path) {
    if (!path || !(0, import_node_fs.existsSync)(path)) {
      return false;
    }
    try {
      await (0, import_promises.access)(path, import_promises.constants.F_OK | import_promises.constants.X_OK);
      return true;
    } catch (error) {
      return false;
    }
  }
  __name(checkPath, "checkPath");
  async function tryFindDownloadsDir() {
    if (!config.pathFormDownloads) return null;
    const downloadsDir = "./downloads";
    if (!(0, import_node_fs.existsSync)(downloadsDir)) {
      return null;
    }
    try {
      const files = await (0, import_promises.readdir)(downloadsDir);
      for (const file of files) {
        const fullPath = (0, import_node_path.resolve)(downloadsDir, file);
        const stats = await (0, import_promises.stat)(fullPath);
        if (stats.isDirectory()) {
          const ffmpegPath = (0, import_node_path.resolve)(fullPath, platform2 === "win32" ? "ffmpeg.exe" : "ffmpeg");
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
  __name(tryFindDownloadsDir, "tryFindDownloadsDir");
  async function tryUseDownloads() {
    if (!config.downloadsFFmpeg) return null;
    if (!ctx.downloads) {
      if (downloadsServiceRequired === false) {
        ctx.logger.warn(`缺少 downloads 依赖。请确保已安装并启用该插件。`);
        downloadsServiceRequired = true;
      }
      return null;
    }
    try {
      const task = ctx.downloads.nereid("ffmpeg", [
        `npm://@koishijs-assets/ffmpeg?registry=${await (0, import_get_registry.default)()}`
      ], bucket());
      const path = await task.promise;
      return platform2 === "win32" ? `${path}/ffmpeg.exe` : `${path}/ffmpeg`;
    } catch (error) {
      ctx.logger.warn(`使用 downloads 服务下载 FFmpeg 失败: `, error);
      return null;
    }
  }
  __name(tryUseDownloads, "tryUseDownloads");
}
__name(apply, "apply");
function bucket() {
  let bucket2 = "ffmpeg-";
  switch (platform2) {
    case "win32":
      bucket2 += "windows-";
      break;
    case "linux":
      bucket2 += "linux-";
      break;
    case "darwin":
      bucket2 += "macos-";
      break;
    default:
      throw new Error(`不支持的平台: ${platform2}`);
  }
  switch (arch2) {
    case "arm":
      bucket2 += "armel";
      break;
    case "arm64":
      bucket2 += "arm64";
      break;
    case "x86":
      bucket2 += "i686";
      break;
    case "x64":
      bucket2 += "amd64";
      break;
    default:
      throw new Error(`不支持的架构: ${arch2}`);
  }
  return bucket2;
}
__name(bucket, "bucket");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  FFmpeg,
  FFmpegBuilder,
  apply,
  inject,
  name,
  usage
});
