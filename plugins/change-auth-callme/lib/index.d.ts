import { Context, Schema, Session } from 'koishi';
declare module 'koishi' {
    interface Events {
        'common/changeauth'(name: string, session: Session): string | void;
    }
}
export interface Config {
}
export declare const name = "changeauth";
export declare const inject: string[];
export declare const Config: Schema<Config>;
export declare function apply(ctx: Context): void;
