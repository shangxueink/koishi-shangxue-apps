import { Context, Session } from "koishi";

declare module "koishi" {

  interface Plugins {
  "poet-craft": PoetCraft
  }

}

interface PoetCraft {
  apply(ctx: Context): void;
}

interface PoemResponse {
  code: number;
  data: string[];
}

declare function apply(ctx: Context): void;

declare namespace apply {

  function action(session: Session, 主题词: string | string[]): Promise<void>;

  namespace action {

  function send(text: string): Promise<void>;

  function get(url: string, options?: {
    timeout: number; 
  }): Promise<{
    status: number;
    data: PoemResponse;
  }>;

  }

}

export = apply;
