import { Context, Schema } from 'koishi';
export declare const name = "music-voice";
export declare const inject: {
    required: string[];
    optional: string[];
};
export declare const usage = "\n\n---\n\n<a target=\"_blank\" href=\"https://github.com/idranme/koishi-plugin-music-voice?tab=readme-ov-file#%E4%BD%BF%E7%94%A8%E8%AF%A5%E6%8F%92%E4%BB%B6%E6%90%9C%E7%B4%A2%E5%B9%B6%E8%8E%B7%E5%8F%96%E6%AD%8C%E6%9B%B2\">\u27A4 \u98DF\u7528\u65B9\u6CD5\u70B9\u6B64\u83B7\u53D6</a>\n\n\u672C\u63D2\u4EF6\u65E8\u5728 \u5B89\u88C5\u540E\u5373\u53EF\u8BED\u97F3\u70B9\u6B4C\u3002\n\n\u56E0\u5404\u79CD\u4E0D\u53EF\u6297\u529B\u56E0\u7D20\uFF0C\u76EE\u524D\u4EC5\u652F\u6301\u4F7F\u7528\u7F51\u6613\u4E91\u97F3\u4E50\u3002\n\n\n\n---\n\n## \u5F00\u542F\u63D2\u4EF6\u524D\uFF0C\u8BF7\u786E\u4FDD\u4EE5\u4E0B\u670D\u52A1\u5DF2\u7ECF\u542F\u7528\uFF01\n\n### \u6240\u9700\u670D\u52A1\uFF1A\n\n- [puppeteer\u670D\u52A1](/market?keyword=puppeteer) \uFF08\u53EF\u9009\u5B89\u88C5\uFF09\n\n- [http\u670D\u52A1](/market?keyword=http+email:shigma10826@gmail.com) \uFF08\u5DF2\u9ED8\u8BA4\u5F00\u542F\uFF09\n\n- [logger\u670D\u52A1](/market?keyword=logger+email:shigma10826@gmail.com) \uFF08\u5DF2\u9ED8\u8BA4\u5F00\u542F\uFF09\n\n- i18n\u670D\u52A1 \uFF08\u5DF2\u9ED8\u8BA4\u5F00\u542F\uFF09\n\n\u6B64\u5916\u53EF\u80FD\u8FD8\u9700\u8981\u8FD9\u4E9B\u670D\u52A1\u624D\u80FD\u53D1\u9001\u8BED\u97F3\uFF1A\n\n\n- [ffmpeg\u670D\u52A1](/market?keyword=ffmpeg)  \uFF08\u53EF\u9009\u5B89\u88C5\uFF09\n\n- [silk\u670D\u52A1](/market?keyword=silk)  \uFF08\u53EF\u9009\u5B89\u88C5\uFF09\n\n\n---\n";
export declare const Config: Schema<Schemastery.ObjectS<{}>, {} & import("cosmokit").Dict>;
export declare function apply(ctx: Context, config: any): void;
