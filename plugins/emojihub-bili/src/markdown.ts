import { Context, Session } from "koishi";
import { Config } from "./config";
import { replacePlaceholders, logInfo, logError } from "./utils";
import { resolveLocalPath } from "./path";

function clampPage(page: number, totalPages: number) {
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(Math.floor(page), totalPages);
}

function pickColumns(total: number) {
  if (total < 5) return 1;
  if (total <= 10) return 2;
  if (total <= 15) return 3;
  return 4;
}

function chunk<T>(items: T[], size: number) {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

function getCommandLabel(rootCommandName: string, command: any) {
  const fullName = String(command?.name || command?.displayName || "").trim();
  const root = String(rootCommandName || "").trim();
  if (!fullName) return "";
  if (root && fullName.startsWith(`${root}/`)) return fullName.slice(root.length + 1);
  return fullName.split("/").pop() || fullName;
}

function collectVisibleCommands(ctx: Context, session: Session, rootCommandName: string) {
  const rootCommand = ctx.$commander.get(rootCommandName, session) as any;
  const children = Array.isArray(rootCommand?.children) ? rootCommand.children : [];
  const entries: Array<[string, any]> = [];

  for (const command of children) {
    if (typeof command?.match === "function" && !command.match(session)) continue;
    const label = getCommandLabel(rootCommandName, command);
    if (!label) continue;
    if (entries.some(([existing]) => existing === label)) continue;
    entries.push([label, command]);
  }

  return entries;
}

function buildKeyboardRows(ctx: Context, session: Session, rootCommandName: string, page: number) {
  const commands = collectVisibleCommands(ctx, session, rootCommandName);
  const columns = pickColumns(commands.length);
  const pageSize = columns * 5;
  const totalPages = Math.max(1, Math.ceil(commands.length / pageSize));
  const currentPage = clampPage(page, totalPages);
  const pageItems = commands.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const rows = chunk(pageItems, columns).map((row) => ({
    buttons: row.map(([label]) => ({
      render_data: {
        label,
        style: 1,
      },
      action: {
        type: 2,
        permission: { type: 2 },
        data: `/${label}`,
        enter: true,
      },
    })),
  }));

  if (totalPages > 1) {
    const navButtons: any[] = [];

    if (currentPage > 1) {
      navButtons.push({
        render_data: { label: "上一页", style: 2 },
        action: {
          type: 2,
          permission: { type: 2 },
          data: `/${rootCommandName} ${currentPage - 1}`,
          enter: true,
        },
      });
    }

    if (currentPage < totalPages) {
      navButtons.push({
        render_data: { label: "下一页", style: 2 },
        action: {
          type: 2,
          permission: { type: 2 },
          data: `/${rootCommandName} ${currentPage + 1}`,
          enter: true,
        },
      });
    }

    if (navButtons.length) rows.push({ buttons: navButtons });
  }

  return rows;
}

export function collectVisibleSubcommands(ctx: Context, session: Session, rootCommandName: string) {
  return collectVisibleCommands(ctx, session, rootCommandName).map(([label]) => label);
}

export function command_list_markdown(ctx: Context, session: Session, config: Config, rootCommandName: string, page = 1) {
  const markdownMessage: any = {
    msg_id: "",
    msg_type: 2,
    markdown: {
      content: config.nestedlist.raw_markdown_button_content || "",
    },
    keyboard: {},
  };

  try {
    const rows = buildKeyboardRows(ctx, session, rootCommandName, Number(page) || 1);
    markdownMessage.keyboard = {
      content: { rows },
    };
  } catch (error) {
    logError(`解析列表 Markdown 出错: ${error}`);
    return null;
  }

  logInfo(config, `列表 Markdown 参数: ${JSON.stringify(markdownMessage, null, 2)}`);
  return markdownMessage;
}

export async function markdown(ctx: Context, session: Session, command, imageUrl, config: Config, localimage?) {
  const markdownMessage: any = {
    msg_id: "",
    msg_type: 2,
    markdown: {},
    keyboard: {},
  };

  let originalWidth: number;
  let originalHeight: number;
  const sizeMatch = typeof imageUrl === "string" ? imageUrl.match(/\?px=(\d+)x(\d+)$/) : null;

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

    const replacedMarkdownContent = replacePlaceholders(rawMarkdownContent, {
      session,
      config,
      img_pxpx: `img#${originalWidth}px #${originalHeight}px`,
      img_url: imageUrl,
      command,
    }, true);

    const replacedMarkdownKeyboard = replacePlaceholders(rawMarkdownKeyboard, { session, config, command }, true)
      .replace(/^[\s\S]*?"keyboard":\s*/, "")
      .replace(/\\n/g, "")
      .replace(/\\"/g, '"')
      .trim();

    const keyboard = JSON.parse(replacedMarkdownKeyboard);

    markdownMessage.markdown = {
      content: replacedMarkdownContent,
    };
    markdownMessage.keyboard = {
      content: keyboard,
    };
  } catch (error) {
    logError(`解析原生 Markdown 出错: ${error}`);
    return null;
  }

  logInfo(config, `Markdown 模板参数: ${JSON.stringify(markdownMessage, null, 2)}`);
  return markdownMessage;
}

export async function sendmarkdownMessage(ctx, session, message, config?: Config) {
  if (!message) return;
  if (config) logInfo(config, "正在调用sendmarkdownMessage发送md");
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
    ctx.logger.error(`发送 markdown 消息时出错`, error);
  }
}
