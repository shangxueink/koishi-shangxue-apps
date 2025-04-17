import { Context } from 'koishi';
import CommandManager from '.';
export declare function remove<O, K extends keyof O>(object: O, key: K): O[K];
export default function (ctx: Context, manager: CommandManager): void;
