import { Context } from "koishi";
import { Config } from '..';
export declare const inject: {
    required: string[];
};
declare module 'koishi' {
    interface Tables {
        bap_fswith: bap_fswith;
    }
}
export interface bap_fswith {
    id: string;
    guild_id: number;
    gacha: string;
    manga: string;
}
export declare function func_switch(ctx: Context, config: Config): Promise<void>;
