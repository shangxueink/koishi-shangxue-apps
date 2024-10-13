import { Context } from 'koishi';

declare module 'koishi' {
  interface PluginOptions {
  // 插件的配置项定义
  }
}

declare const plugin: Plugin;

export = plugin;

declare interface Plugin {
  name: string;
  apply(ctx: Context, config?: PluginOptions): void;
}