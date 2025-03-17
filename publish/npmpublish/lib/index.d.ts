import { Context, Schema } from "koishi";
export declare const reusable = true;
export declare const name = "bangbangcai";
export declare const inject: {
    required: string[];
};
export declare const usage = "\n<h1>\u90A6\u591A\u5229\u731C\u731C\u770B\uFF08\u90A6\u90A6\u731C\uFF09</h1>\n\n<p>\u5361\u9762\u56FE\u7247\u6765\u6E90\u4E8E <a href=\"https://bestdori.com\" target=\"_blank\">bestdori.com</a></p>\n\n<div class=\"notice\">\n<h3>Notice</h3>\n<p>\u5728 Onebot \u9002\u914D\u5668\u4E0B\uFF0C\u5076\u5C14\u53D1\u4E0D\u51FA\u6765\u56FE\uFF0CKoishi \u62A5\u9519\u65E5\u5FD7\u4E3A <code>retcode:1200</code> \u65F6\uFF0C\n\n\u8BF7\u67E5\u770B\u534F\u8BAE\u7AEF\u65E5\u5FD7\u81EA\u884C\u89E3\u51B3\uFF01</p>\n\n<p>\u5728 QQ \u9002\u914D\u5668\u4E0B\uFF0C\u5076\u5C14\u53D1\u4E0D\u51FA\u6765\u56FE\uFF0CKoishi \u62A5\u9519\u65E5\u5FD7\u4E3A <code>bad request</code> \u65F6\uFF0C\u5EFA\u8BAE\u53C2\u89C1 \u8BBA\u575B10257\u5E16\uFF01 \n\n-> https://forum.koishi.xyz/t/topic/10257 </p>\n</div>\n\n<hr>\n\n<div class=\"requirement\">\n<h3>Requirement</h3>\n<p>1.1.0\u7248\u672C\u4EE5\u524D\u5B89\u88C5\u8FC7\u7684\u7528\u6237\uFF0C\u8BF7\u5148\u4F7F\u7528 <code>bbcdrop</code> \u6307\u4EE4 \u91CD\u7F6E\u6570\u636E</p>\n<p>\u5361\u9762\u5B58\u653E\u8DEF\u5F84 \u53EF\u66F4\u6539\uFF0C\u9ED8\u8BA4\u503C \u5728 koishi\u6839\u76EE\u5F55 \u521B\u5EFA\u3002</p>\n</div>\n\n<hr>\n\n<div class=\"version\">\n<h3>Version</h3>\n<p>1.3.0</p>\n<ul>\n<li>\u65B0\u589E\u3010\u91CD\u5207\u7247\u3011\u6307\u4EE4\uFF0C\u4F18\u5316\u5207\u7247\u6548\u679C\u3002</li>\n<li>\u65B0\u589E\u3010\u6570\u636E\u8868\u6E05\u9664\u3011\u6307\u4EE4\uFF0C\u53EF\u6E05\u9664\u6570\u636E\u8868\u3002</li>\n<li>\u4F18\u5316\u79C1\u804A\u73AF\u5883\uFF0C\u517C\u5BB9\u7279\u6B8A\u5B57\u7B26\u7684\u9891\u9053ID\u3002</li>\n</ul>\n</div>\n\n<hr>\n\n<div class=\"thanks\">\n<h3>Thanks</h3>\n<p>\u7075\u611F\u53C2\u8003\uFF1A <a href=\"/market?keyword=koishi-plugin-cck\">koishi-plugin-cck</a></p>\n\n<hr>\n\n<h4>\u5982\u679C\u60F3\u7EE7\u7EED\u5F00\u53D1\u4F18\u5316\u672C\u63D2\u4EF6\uFF0C<a href=\"https://github.com/xsjh/koishi-plugin-bangbangcai/pulls\" target=\"_blank\">\u6B22\u8FCE PR</a></h4>\n\n</body>\n";
export declare const Config: Schema<Schemastery.ObjectS<{
    bbc: Schema<string, string>;
    bbc_command: Schema<string, string>;
    bbc_restart_command: Schema<string, string>;
    bbc_bzd_command: Schema<string, string>;
    bbc_drop_command: Schema<string, string>;
    bbc_recrop_command: Schema<string, string>;
}> | Schemastery.ObjectS<{
    textMessage: Schema<string, string>;
    remind_Message: Schema<string, string>;
    phrase_timeout: Schema<string[], string[]>;
    phrase_answered: Schema<string[], string[]>;
    phrase_bzd: Schema<string[], string[]>;
}> | Schemastery.ObjectS<{
    bbctimeout: Schema<number, number>;
    nowtimers: Schema<boolean, boolean>;
    max_recrop_times: Schema<number, number>;
    autocleantemp: Schema<boolean, boolean>;
}> | Schemastery.ObjectS<{
    card_path: Schema<string, string>;
    cutWidth: Schema<number, number>;
    cutLength: Schema<number, number>;
}> | Schemastery.ObjectS<{
    logger_info: Schema<boolean, boolean>;
}>, {
    bbc: string;
    bbc_command: string;
    bbc_restart_command: string;
    bbc_bzd_command: string;
    bbc_drop_command: string;
    bbc_recrop_command: string;
} & import("cosmokit").Dict & {
    textMessage: string;
    remind_Message: string;
    phrase_timeout: string[];
    phrase_answered: string[];
    phrase_bzd: string[];
} & {
    bbctimeout: number;
    nowtimers: boolean;
    max_recrop_times: number;
    autocleantemp: boolean;
} & {
    card_path: string;
    cutWidth: number;
    cutLength: number;
} & {
    logger_info: boolean;
}>;
declare module "koishi" {
    interface Tables {
        bangguess_user: Bangguess_user;
    }
}
export interface Bangguess_user {
    id: number;
    platform: string;
    userId: string;
    channelId: string;
    time: Date;
    img_url: string;
    card: Buffer;
    gaming: boolean;
    nicknames: string[];
    recrop_count: number;
}
export declare function apply(ctx: Context, config: any): Promise<void>;
