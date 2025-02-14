import { Context, Schema } from 'koishi';
export declare const name = "music-voice";
export declare const inject: {
    required: string[];
    optional: string[];
};
export declare const usage = "\n<a target=\"_blank\" href=\"https://github.com/idranme/koishi-plugin-music-voice?tab=readme-ov-file#%E4%BD%BF%E7%94%A8%E8%AF%A5%E6%8F%92%E4%BB%B6%E6%90%9C%E7%B4%A2%E5%B9%B6%E8%8E%B7%E5%8F%96%E6%AD%8C%E6%9B%B2\">\u27A4 \u98DF\u7528\u65B9\u6CD5\u70B9\u6B64\u83B7\u53D6</a>\n";
export interface Config {
    xingzhigeAPIkey: string;
    generationTip: string;
    waitTimeout: number;
    exitCommand: string;
    menuExitCommandTip: boolean;
    recall: boolean;
    imageMode: boolean;
    darkMode: boolean;
    maxDuration: number;
}
export declare const Config: Schema<Config>;
export declare function apply(ctx: Context, cfg: Config): void;
