import { Context, Session } from "koishi";

declare module "koishi" {
  interface Plugins {
  "bmi-calculator": BmiCalculator;
  }

  interface BmiCalculator {
  apply(ctx: Context): void;
  }

  interface CalculateBmiResponse {
  up: string;
  under: string;
  }

  declare function apply(ctx: Context): void;

  declare namespace apply {
  function action(session: Session, height: string, weight: string): Promise<void>;

  namespace action {
    function send(text: string): Promise<void>;
    function get(url: string, options?: {
    timeout: number;
    }): Promise<{
    status: number;
    data: {
      data: CalculateBmiResponse;
    };
    }>;
  }
  }
}

export = apply;
