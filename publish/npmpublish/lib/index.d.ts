import { Context, Schema } from 'koishi';
export declare const name = "music-voice";
export declare const inject: {
    required: string[];
    optional: string[];
};
export declare const usage = "\n<a target=\"_blank\" href=\"https://github.com/idranme/koishi-plugin-music-voice?tab=readme-ov-file#%E4%BD%BF%E7%94%A8%E8%AF%A5%E6%8F%92%E4%BB%B6%E6%90%9C%E7%B4%A2%E5%B9%B6%E8%8E%B7%E5%8F%96%E6%AD%8C%E6%9B%B2\">\u27A4 \u98DF\u7528\u65B9\u6CD5\u70B9\u6B64\u83B7\u53D6</a>\n\n---\n\n\u672C\u63D2\u4EF6\u65E8\u5728 \u5B89\u88C5\u5373\u53EF\u8BED\u97F3\u70B9\u6B4C\u3002\n\n\u56E0\u5404\u79CD\u4E0D\u53EF\u6297\u529B\u56E0\u7D20\uFF0C\u76EE\u524D\u4F7F\u7528 [\u9F99\u73E0API-\u7F51\u6613\u4E91\u97F3\u4E50](https://www.hhlqilongzhu.cn/) \u4F5C\u4E3A\u540E\u7AEF\u670D\u52A1\u3002\n\n\u66F4\u591A\u529F\u80FD\u4E0E\u540E\u7AEF\u9009\u62E9\uFF0C\u6B22\u8FCE\u4F7F\u7528 [\u27A3 music-link](/market?keyword=music-link)\n";
export interface Config {
    generationTip: string;
    waitTimeout: number;
    exitCommand: string;
    menuExitCommandTip: boolean;
    recall: boolean;
    imageMode: boolean;
    darkMode: boolean;
    searchListCount: number;
}
export declare const Config: Schema<Config>;
export declare function apply(ctx: Context, cfg: Config): void;
