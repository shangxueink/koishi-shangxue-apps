import type { Context } from "koishi";
import { resolveLocalPath } from "./path";
import { getLocalImageProxyUrl } from "./media-proxy";

export async function loadCanvasImageSource(ctx: Context, source: string) {
  const localPath = resolveLocalPath(source);
  if (!localPath) {
    return ctx.canvas.loadImage(source);
  }

  const proxyUrl = getLocalImageProxyUrl(ctx, localPath);
  if (!proxyUrl) {
    throw new Error("local image proxy unavailable");
  }
  return ctx.canvas.loadImage(proxyUrl);
}
