import { Context } from 'koishi';
import { Config } from './config';
export * from './config';
export declare function apply(ctx: Context, config: Config): void;
export declare const inject: {
    optional: string[];
};
