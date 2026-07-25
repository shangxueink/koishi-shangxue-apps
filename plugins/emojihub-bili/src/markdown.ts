import { Context } from "koishi";
import { Config } from "./config";
import { replacePlaceholders, logInfo, logError } from "./utils";
import { resolveLocalPath } from "./path";

export function command_list_markdown(session, config: Config) {
  let markdownMessage = {
    msg_id: "",
    msg_type: 2,
    markdown: {},
    keyboard: {},
  };

  try {
    const rawMarkdownContent = config.nestedlist.raw_markdown_button_content;
    const rawMarkdownKeyboard = config.nestedlist.raw_markdown_button_keyboard;

    const replacedMarkdownContent = replacePlaceholders(rawMarkdownContent, { session, config }, true);
    const replacedMarkdownKeyboard = replacePlaceholders(rawMarkdownKeyboard, { session, config }, true)
      .replace(/^[\s\S]*?"keyboard":\s*/, '')
      .replace(/\\n/g, '')
      .replace(/\\"/g, '"')
      .trim();

    const keyboard = JSON.parse(replacedMarkdownKeyboard);

    markdownMessage.markdown = {
      // @ts-ignore
      content: replacedMarkdownContent,
    };
    markdownMessage.keyboard = {
      content: keyboard,
    }
  } catch (error) {
    logError(`解析原生 Markdown 出错: ${error}`);
    return null;
  }
  logInfo(config, `Markdown 模板参数: ${JSON.stringify(markdownMessage, null, 2)}`);
  return markdownMessage;
}


export async function markdown(ctx: Context, session, command, imageUrl, config: Config, localimage?) {
  const markdownMessage = {
    msg_id: "",
    msg_type: 2,
    markdown: {},
    keyboard: {},
  };


  let originalWidth;
  let originalHeight;
  // 尝试从 URL 中解析尺寸
  const sizeMatch = imageUrl.match(/\?px=(\d+)x(\d+)$/);

  if (sizeMatch) {
    originalWidth = parseInt(sizeMatch[1], 10);
    originalHeight = parseInt(sizeMatch[2], 10);
  } else {
    const loadTarget = localimage ? resolveLocalPath(localimage) ?? localimage : resolveLocalPath(imageUrl) ?? imageUrl;
    const canvasimage = await ctx.canvas.loadImage(loadTarget);
    // @ts-ignore
    originalWidth = canvasimage.naturalWidth || canvasimage.width;
    // @ts-ignore
    originalHeight = canvasimage.naturalHeight || canvasimage.height;
  }

  try {
    const rawMarkdownContent = config.nested.raw_markdown_button_content;
    const rawMarkdownKeyboard = config.nested.raw_markdown_button_keyboard;

    const replacedMarkdownContent = replacePlaceholders(rawMarkdownContent, { session, config, img_pxpx: `img#${originalWidth}px #${originalHeight}px`, img_url: imageUrl, command }, true);
    const replacedMarkdownKeyboard = replacePlaceholders(rawMarkdownKeyboard, { session, config, command }, true)
      .replace(/^[\s\S]*?"keyboard":\s*/, '')
      .replace(/\\n/g, '')
      .replace(/\\"/g, '"')
      .trim();

    const keyboard = JSON.parse(replacedMarkdownKeyboard);

    markdownMessage.markdown = {
      // @ts-ignore
      content: replacedMarkdownContent,
    };
    markdownMessage.keyboard = {
      content: keyboard,
    }
  } catch (error) {
    logError(`解析原生 Markdown 出错: ${error}`);
    return null;
  }
  logInfo(config, `Markdown 模板参数: ${JSON.stringify(markdownMessage, null, 2)}`);
  return markdownMessage;
}

// 提取消息发送逻辑为函数
export async function sendmarkdownMessage(ctx, session, message, config?: Config) {
  if (config) logInfo(config, "正在调用sendmarkdownMessage发送md")
  try {
    const { guild, user } = session.event;
    const { qq, qqguild, channelId } = session;

    if (guild?.id) {
      if (qq) {
        await qq.sendMessage(channelId, message);
      } else if (qqguild) {
        await qqguild.sendMessage(channelId, message);
      }
    } else if (user?.id && qq) {
      await qq.sendPrivateMessage(user.id, message);
    }
  } catch (error) {
    ctx.logger.error(`发送markdown消息时出错:`, error);
  }
}
