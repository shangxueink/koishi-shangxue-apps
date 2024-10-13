import { Context, Schema } from 'koishi';
export declare const name = "deer-pipe";
export interface Config {
    enable_blue_tip: any;
    enable_allchannel: any;
    enable_deerpipe: boolean;
    leaderboard_people_number: number;
    loggerinfo: boolean;
}
export declare const usage = "\n<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>Deer Pipe \u63D2\u4EF6\u4F7F\u7528\u6307\u5357</title>\n</head>\n<body>\n\n<h1>Deer Pipe \u63D2\u4EF6\u4F7F\u7528\u6307\u5357</h1>\n\n<h3>\u7B7E\u5230</h3>\n<ul>\n<li><strong>\u6307\u4EE4</strong>: <code>\uD83E\uDD8C [\u827E\u7279\u7528\u6237]</code> \u6216 <code>\u9E7F\u7BA1 [\u827E\u7279\u7528\u6237]</code></li>\n<li><strong>\u4F5C\u7528</strong>: \u7B7E\u5230\u5F53\u5929\u3002\uFF08\u63A8\u8350\u5728\u3010\u6307\u4EE4\u7BA1\u7406\u3011\u8BBE\u7F6E\u6BCF\u5929\u8C03\u7528\u4E0A\u9650\uFF09</li>\n<li><strong>\u793A\u4F8B</strong>: <code>\uD83E\uDD8C</code>\uFF08\u81EA\u5DF1\u7B7E\u5230\uFF09 / <code>\uD83E\uDD8C @\u732B\u732B</code>\uFF08\u5E2E\u4ED6\u9E7F\uFF09</li>\n</ul>\n\n<h3>\u67E5\u770B\u6392\u884C\u699C</h3>\n<ul>\n<li><strong>\u6307\u4EE4</strong>: <code>\u9E7F\u7BA1\u6392\u884C\u699C</code> \u6216 <code>\uD83E\uDD8C\u699C</code></li>\n<li><strong>\u4F5C\u7528</strong>: \u67E5\u770B\u8C01\u7B7E\u5230\u6700\u591A\u3002</li>\n<li><strong>\u793A\u4F8B</strong>: <code>\u9E7F\u7BA1\u6392\u884C\u699C</code></li>\n</ul>\n\n<h3>\u8865\u7B7E</h3>\n<ul>\n<li><strong>\u6307\u4EE4</strong>: <code>\u8865\uD83E\uDD8C [\u65E5\u671F]</code></li>\n<li><strong>\u4F5C\u7528</strong>: \u8865\u7B7E\u5230\u6307\u5B9A\u65E5\u671F\u3002\u4F8B\u5982\u8865\u7B7E\u5F53\u6708\u768415\u53F7\u3002</li>\n<li><strong>\u793A\u4F8B</strong>: <code>\u8865\uD83E\uDD8C 15</code></li>\n</ul>\n\n<h3>\u53D6\u6D88\u7B7E\u5230</h3>\n<ul>\n<li><strong>\u6307\u4EE4</strong>: <code>\u6212\uD83E\uDD8C [\u65E5\u671F]</code></li>\n<li><strong>\u4F5C\u7528</strong>: \u53D6\u6D88\u67D0\u5929\u7684\u7B7E\u5230\u3002\u4F8B\u5982\u53D6\u6D88\u7B7E\u5230\u5F53\u6708\u768410\u53F7\u3002</li>\n<li><strong>\u793A\u4F8B</strong>: <code>\u6212\uD83E\uDD8C 10</code> \uFF08\u82E5\u7701\u7565<code>10</code>\uFF0C\u4F1A\u53D6\u6D88\u7B7E\u5230\u4ECA\u5929\u7684\uFF09</li>\n</ul>\n\n</body>\n</html>\n";
export declare const Config: Schema<Config>;
interface DeerPipeTable {
    userid: string;
    username: string;
    channelId: string;
    recordtime: string;
    checkindate: string[];
    totaltimes: number;
    resigntimes: number;
}
declare module 'koishi' {
    interface Tables {
        deerpipe: DeerPipeTable;
    }
}
export declare const inject: string[];
export declare function apply(ctx: Context, config: Config): void;
export {};
