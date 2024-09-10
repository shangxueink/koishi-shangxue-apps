import { Context, Schema } from "koishi";

export const name = "common-video-plug-in";

export const usage = "普通的视频插件";

export interface Config {
  // 无任何配置项
}


export const Config: Schema<Config> = Schema.object({});

export interface BeautyHuluxiaContext extends Context {
  command(name: string, desc?: string): Command;
}

export interface Command {
  action(handler: ActionHandler): void; 
}

export interface ActionContext {
  session: Session;
}

export interface Session {
  send(message: string): Promise<void>;
}

export type ActionHandler = (context: ActionContext) => any;

export function apply(ctx: BeautyHuluxiaContext): void;

