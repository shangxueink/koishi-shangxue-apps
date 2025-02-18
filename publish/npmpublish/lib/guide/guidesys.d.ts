import { Context, Schema } from 'koishi';
import { Config } from '..';
export declare const inject: string[];
export interface guide_qq {
    markdown_setting: {
        table: any;
        qqguild: string;
    };
}
export interface guideConfig {
    avatar: boolean;
    logger: boolean;
    time: number;
}
export declare const guide_qq: Schema<guide_qq>;
export declare const guideConfig: Schema<guideConfig>;
export declare const maxmap_sms = 26;
export declare const synonyms: {
    [key: string]: string[];
};
export declare const FMPS_server_download = "https://1145141919810-1317895529.cos.ap-chengdu.myqcloud.com/json%2F";
export declare const guide_systeam: {
    apply(ctx: Context, config: Config): Promise<void>;
};
