import { Context, Session } from "koishi";

declare module "koishi" {
  interface Plugins {
  "ai-duilian": AiDuilian
  } 
}

interface AiDuilian {
  apply(ctx: Context): void;
}

interface DuilianResponse {
  up: string;
  under: string;
}

declare function apply(ctx: Context): void;

declare namespace apply {

  function action(session: Session, 上联: string): Promise<void>;

  namespace action {

  function send(text: string): Promise<void>;

  function get(url: string, options?: {
    timeout: number; 
  }): Promise<{
    status: number;
    data: {
    data: DuilianResponse;
    }
  }>;

  }

}

export = apply;
