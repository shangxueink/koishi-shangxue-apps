import { type Context } from "koishi";
import { } from "@koishijs/plugin-server";
import { pathToFileURL } from "node:url";
import { resolveLocalPath } from "./path";

const LOCAL_IMAGE_PROXY_ROUTE = "/emojihub-bili/media";
const registeredProxyContexts = new Set<Context>();

function getProxyBaseUrl(ctx: Context) {
  const server = ctx.server as {
    host?: string;
    port?: number;
    config?: {
      selfUrl?: string;
    };
  };
  const selfUrl = server.config?.selfUrl?.trim();
  if (selfUrl) {
    return selfUrl.endsWith("/") ? selfUrl : `${selfUrl}/`;
  }

  const host = server.host?.trim();
  const normalizedHost = !host || host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host;
  return `http://${normalizedHost}:${server.port || 5140}/`;
}

export function getLocalImageProxyUrl(ctx: Context, source: string) {
  const localPath = resolveLocalPath(source);
  if (!ctx.server || !localPath) return null;
  const url = new URL(LOCAL_IMAGE_PROXY_ROUTE, getProxyBaseUrl(ctx));
  url.searchParams.set("path", localPath);
  return url.toString();
}

export function registerLocalImageProxyRoute(ctx: Context) {
  if (!ctx.server || registeredProxyContexts.has(ctx)) return false;
  registeredProxyContexts.add(ctx);

  ctx.server.get(LOCAL_IMAGE_PROXY_ROUTE, async (koaCtx) => {
    const rawSource = typeof koaCtx.query.path === "string"
      ? koaCtx.query.path
      : typeof koaCtx.query.source === "string"
        ? koaCtx.query.source
        : "";
    const localPath = resolveLocalPath(rawSource);
    if (!localPath) {
      koaCtx.status = 400;
      koaCtx.body = "invalid local path";
      return;
    }

    try {
      const file = await ctx.http.file(pathToFileURL(localPath).href);
      koaCtx.type = file.type || file.mime || "application/octet-stream";
      koaCtx.body = Buffer.from(file.data);
    } catch (error) {
      koaCtx.status = 404;
      koaCtx.body = error instanceof Error ? error.message : "failed to proxy local image";
    }
  });

  ctx.on("dispose", () => {
    registeredProxyContexts.delete(ctx);
  });

  return true;
}
