// src/fetch.ts
import { Context } from "koishi";

/**
 * 使用 ctx.http 获取 JSON 数据
 * 代理由 @koishijs/plugin-proxy-agent 统一管理
 */
export async function fetchJson<T = any>(ctx: Context, url: string): Promise<T> {
  return await ctx.http.get(url);
}

/**
 * 使用 ctx.http 获取 ArrayBuffer 数据（用于下载图片等二进制数据）
 * 代理由 @koishijs/plugin-proxy-agent 统一管理
 */
export async function fetchArrayBuffer(ctx: Context, url: string): Promise<ArrayBuffer> {
  return await ctx.http.get(url, { responseType: "arraybuffer" });
}
