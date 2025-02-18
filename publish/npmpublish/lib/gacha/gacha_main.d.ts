import { Context } from "koishi";
import { Config } from '..';
export declare const inject: {
    required: string[];
};
declare module 'koishi' {
    interface Tables {
        bap_db: bap_db;
    }
}
export interface bap_db {
    id: string;
    serverid: number;
    gacha_data_jp: string[];
    gacha_data_in: string[];
    gacha_data_cn: string[];
}
export declare function gacha_f(ctx: Context, config: Config): Promise<void>;
