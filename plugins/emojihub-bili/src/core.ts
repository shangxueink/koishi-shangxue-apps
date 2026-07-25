import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Context } from "koishi";
import { Config } from "./config";
import { logError, logInfoformat, getAllFiles, getVirtualFilename, logger } from "./utils";
import { isHttpUrl, resolveLocalPath, toFileHref } from "./path";

export interface ImageResult {
  imageUrl: string | null;
  isLocal: boolean;
  imageName?: string;
  imageTime?: Date;
  imageSize?: number;
  imagePath?: string;
}

function isImageFile(filePath: string) {
  const lower = filePath.toLowerCase();
  return lower.endsWith(".jpg") || lower.endsWith(".png") || lower.endsWith(".gif") || lower.endsWith(".bmp") || lower.endsWith(".webp");
}

function isAbsoluteLikePath(input: string) {
  return path.isAbsolute(input) || path.win32.isAbsolute(input) || path.posix.isAbsolute(input);
}

export async function uploadImageToChannel(ctx: Context, consoleinfo, data, appId, secret, channelId) {
  async function refreshToken(bot) {
    const { access_token: accessToken, expires_in: expiresIn } = await ctx.http.post("https://bots.qq.com/app/getAppAccessToken", {
      appId: bot.appId,
      clientSecret: bot.secret,
    });
    bot.token = accessToken;
    ctx.setTimeout(() => refreshToken(bot), (expiresIn - 30) * 1000);
  }

  const bot = { appId, secret, channelId, token: "" };
  await refreshToken(bot);

  if (typeof data === "string") {
    const localPath = resolveLocalPath(data);
    if (localPath) {
      data = await fs.promises.readFile(localPath);
    } else if (isHttpUrl(data)) {
      data = await ctx.http.get(data, { responseType: "arraybuffer" });
      data = Buffer.from(data);
    } else {
      throw new Error(`不支持的图片来源: ${data}`);
    }
  }

  const payload = new FormData();
  payload.append("msg_id", "0");
  payload.append("file_image", new Blob([data], { type: "image/png" }), "image.jpg");

  await ctx.http.post(`https://api.sgroup.qq.com/channels/${bot.channelId}/messages`, payload, {
    headers: {
      Authorization: `QQBot ${bot.token}`,
      "X-Union-Appid": bot.appId,
    },
  });

  const md5 = crypto.createHash("md5").update(data).digest("hex").toUpperCase();
  if (channelId !== undefined && consoleinfo) {
    logger.info(`使用本地图片*QQ频道  发送URL为： https://gchat.qpic.cn/qmeetpic/0/0-0-${md5}/0`);
  }
  return { url: `https://gchat.qpic.cn/qmeetpic/0/0-0-${md5}/0` };
}

export async function getImageAsBase64(imagePath) {
  try {
    const filePath = resolveLocalPath(imagePath) ?? imagePath;
    const imageBuffer = fs.readFileSync(filePath);
    return imageBuffer.toString("base64");
  } catch (error) {
    logger.error("Error converting image to base64:", error);
    return null;
  }
}

export async function determineImagePath(txtPath, config: Config, channelId, command, ctx: Context, local_picture_name = null): Promise<ImageResult> {
  const localPath = resolveLocalPath(txtPath);
  if (localPath) {
    try {
      const stats = fs.lstatSync(localPath);
      if (stats.isDirectory()) {
        return await getRandomImageFromFolder(localPath, config, channelId, command, ctx, local_picture_name);
      }
      if (stats.isFile()) {
        if (isImageFile(localPath)) {
          logInfoformat(config, channelId, command, `本地图片的绝对路径: ${txtPath}`);
          const fileHref = toFileHref(localPath);
          if (!fileHref) return { imageUrl: null, isLocal: false };
          return {
            imageUrl: fileHref,
            isLocal: true,
            imageName: path.basename(localPath),
            imageTime: stats.mtime,
            imageSize: stats.size,
            imagePath: localPath,
          };
        }
        if (localPath.toLowerCase().endsWith(".txt")) {
          return await getRandomImageUrlFromFile(localPath, config, channelId, command, ctx);
        }
      }
    } catch {
      return { imageUrl: null, isLocal: false };
    }
  }

  if (isHttpUrl(txtPath)) {
    logInfoformat(config, channelId, command, `直接的图片链接 ${txtPath}`);
    return { imageUrl: txtPath, isLocal: false };
  }

  const allValidPaths = getAllValidPaths(config);
  if (config.consoleinfo && config.allfileinfo) {
    logger.info(allValidPaths);
  }
  if (allValidPaths.length === 0) {
    return { imageUrl: null, isLocal: false };
  }

  const pickedPath = allValidPaths[Math.floor(Math.random() * allValidPaths.length)];
  const pickedLocalPath = resolveLocalPath(pickedPath);
  if (!pickedLocalPath) return { imageUrl: null, isLocal: false };

  try {
    const stats = fs.lstatSync(pickedLocalPath);
    if (stats.isDirectory()) {
      return await getRandomImageFromFolder(pickedLocalPath, config, channelId, command, ctx, local_picture_name);
    }
    if (stats.isFile()) {
      if (isImageFile(pickedLocalPath)) {
        logInfoformat(config, channelId, command, `随机选择的本地图片路径: ${pickedPath}`);
        const fileHref = toFileHref(pickedLocalPath);
        if (!fileHref) return { imageUrl: null, isLocal: false };
        return {
          imageUrl: fileHref,
          isLocal: true,
          imageName: path.basename(pickedLocalPath),
          imageTime: stats.mtime,
          imageSize: stats.size,
          imagePath: pickedLocalPath,
        };
      }
      if (pickedLocalPath.toLowerCase().endsWith(".txt")) {
        return await getRandomImageUrlFromFile(pickedLocalPath, config, channelId, command, ctx);
      }
    }
  } catch {
    return { imageUrl: null, isLocal: false };
  }

  return { imageUrl: null, isLocal: false };
}

export function getRandomEmojiHubCommand(config: Config) {
  const commands = config.MoreEmojiHubList.map((emoji) => emoji.command);
  if (commands.length > 0) {
    return commands[Math.floor(Math.random() * commands.length)];
  }
  return null;
}

function getAllValidPaths(config: Config) {
  return config.MoreEmojiHubList.filter((emoji) => {
    const sourceUrl = emoji.source_url;
    return isAbsoluteLikePath(sourceUrl) || isHttpUrl(sourceUrl) || sourceUrl.startsWith("file:");
  }).map((emoji) => emoji.source_url);
}

async function getRandomImageFromFolder(folderPath, config: Config, channelId, command, ctx, local_picture_name) {
  if (!fs.existsSync(folderPath)) {
    logError(`错误:路径不存在: ${folderPath}`);
    return { imageUrl: null, isLocal: false };
  }

  let files = config.searchSubfolders
    ? getAllFiles(folderPath)
    : fs.readdirSync(folderPath).map((file) => path.join(folderPath, file));

  files = files.filter((file) => isImageFile(file));

  if (files.length === 0) {
    logError("文件夹中未找到有效图片文件（jpg,png,gif,webp,bmp）");
    return { imageUrl: null, isLocal: false };
  }

  if (local_picture_name?.length > 0) {
    files = files.filter((file) => {
      let filenameToMatch;
      if (config.searchSubfoldersWithfilename && config.searchSubfolders) {
        filenameToMatch = getVirtualFilename(file, folderPath);
      } else {
        filenameToMatch = path.basename(file);
      }
      const filenameLower = filenameToMatch.toLowerCase();
      return local_picture_name.every((keyword) => filenameLower.includes(keyword.toLowerCase()));
    });
    if (files.length === 0) {
      logError(`未找到匹配关键词 "${local_picture_name.join(" ")}" 的图片文件`);
      return { imageUrl: null, isLocal: false };
    }
  }

  if (config.consoleinfo && config.allfileinfo) {
    logger.info(`文件夹 ${folderPath} 下的所有文件 \n${files.join("\n")}`);
  }

  const imagePath = files[Math.floor(Math.random() * files.length)];
  logInfoformat(config, channelId, command, `使用文件夹 ${folderPath} \n发送本地图片为 ${imagePath}`);
  const stats = fs.statSync(imagePath);
  const fileHref = toFileHref(imagePath);
  if (!fileHref) return { imageUrl: null, isLocal: false };
  return {
    imageUrl: fileHref,
    isLocal: true,
    imageName: path.basename(imagePath),
    imageTime: stats.mtime,
    imageSize: stats.size,
    imagePath,
  };
}

export async function getRandomImageUrlFromFile(txtPath, config: Config, channelId, command, ctx) {
  let urls, imageUrl;
  try {
    urls = fs.readFileSync(txtPath, "utf8").split("\n").filter((url) => url.trim() !== "");
  } catch (error) {
    if (error instanceof Error && error.message === "ENOENT") {
      return { imageUrl: null, isLocal: false };
    }
    logError(error);
    return { imageUrl: null, isLocal: false };
  }

  if (urls.length === 0) {
    logError(`错误！无有效URL可用：${txtPath}`);
    return { imageUrl: null, isLocal: false };
  }

  const index = Math.floor(Math.random() * urls.length);
  let txtUrl = urls[index].trim();

  const extraPrefix = "https:";
  const bilibiliPrefix = "https://i0.hdslb.com/bfs/";
  if (txtUrl.startsWith(extraPrefix + bilibiliPrefix)) {
    txtUrl = txtUrl.replace(extraPrefix, "");
  }
  if (!txtUrl.startsWith("https://") && !txtUrl.startsWith("http://")) {
    txtUrl = bilibiliPrefix + txtUrl;
  }
  imageUrl = txtUrl.trim();

  if (config.LocalSendNetworkPicturesList && config.LocalSendNetworkPicturesList.length > 0) {
    const normalizedList = config.LocalSendNetworkPicturesList.split(/\n|,|，/).map((item) => item.trim().toLowerCase());
    const lowerCaseCommand = command.toLowerCase();
    if (normalizedList.includes(lowerCaseCommand)) {
      const outputPath = path.join(__dirname, `${Date.now()}.png`);
      try {
        const localOutputPath = await downloadImage(txtUrl, outputPath, ctx);
        ctx.setTimeout(() => {
          fs.unlinkSync(localOutputPath);
          logInfoformat(config, null, null, `临时文件已删除：${localOutputPath}`);
        }, config.deletePictime * 1000);
        logInfoformat(config, channelId, command, `下载并发送本地图片: ${localOutputPath}`);
        const fileHref = toFileHref(localOutputPath);
        return { imageUrl: fileHref ?? localOutputPath, isLocal: true, imagePath: localOutputPath };
      } catch (downloadError) {
        logError(`图片下载失败：${downloadError.message}`);
        return { imageUrl: null, isLocal: false };
      }
    }
  }

  logInfoformat(config, channelId, command, `使用文件 ${txtPath} \n发送URL为:${imageUrl}`);
  return { imageUrl, isLocal: false };
}

export async function downloadImage(url, outputPath, ctx) {
  try {
    const response = await ctx.http.get(url, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response);
    await fs.promises.writeFile(outputPath, buffer);
    return outputPath;
  } catch (error) {
    logError(`下载图片失败: ${error.message}`);
    throw error;
  }
}

export function listAllCommands(config: Config) {
  const allCommands = config.MoreEmojiHubList.map((emoji) => emoji.command);
  if (allCommands.length === 0) {
    logError("未找到任何表情包指令。");
  }
  return allCommands;
}
