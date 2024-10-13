import { Context, CommandOptions } from 'koishi';

declare module 'minecraft-rank' {

  export const name: string;
  export const usage: string;


  export function apply(ctx: Context, config?: CommandOptions): void;

  interface Greeting {
  id: number;
  text: string;
  }


  export function getRandomGreeting(greetingsData: Greeting[]): Greeting;


  export namespace ctx {
  function command(name: string, desc?: string): ReturnType<Context['command']>;
  }
}
