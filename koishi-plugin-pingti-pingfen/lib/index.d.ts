import { Context, Schema } from 'koishi';
export declare const name = "pingfen";
export declare const inject: {
    optional: string[];
};
export declare const sleep: (ms: number) => Promise<void>;
export interface Config {
    headers: {
        key: string;
        value: string;
    }[];
}
export declare const Config: Schema<Config>;
declare module 'koishi' {
    interface Tables {
        pingfen: pingfen;
    }
}
export interface pingfen {
    key: string;
    value: string;
}
export declare function apply(ctx: Context, config: Config): void;
