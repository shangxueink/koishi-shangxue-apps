import { Context, CommandOptions, Session } from 'koishi';

declare module 'divine-oracle' {
  // 导出模块的名称和用法说明
  export const name: string;

  // apply 函数接收一个 Context 对象
  export function apply(ctx: Context): void;

  // readFileContent 函数用于读取文件内容
  export function readFileContent(filePath: string): Promise<string>;
}

// 扩展 koishi 的 Session 类型以支持 send 方法
declare module 'koishi' {
  interface Session {
  send(message: string | koishi.MessageSegment): Promise<void>;
  }
}
