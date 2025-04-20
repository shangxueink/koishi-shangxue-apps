import { Context, Schema } from "koishi";
export declare const reusable = true;
export declare const name = "bangbangcai";
export declare const inject: {
    required: string[];
};
export declare const usage = "\n<h1>\u90A6\u591A\u5229\u731C\u731C\u770B\uFF08\u90A6\u90A6\u731C\uFF09</h1>\n\n<p>\u5361\u9762\u56FE\u7247\u6765\u6E90\u4E8E <a href=\"https://bestdori.com\" target=\"_blank\">bestdori.com</a></p>\n\n<div class=\"notice\">\n<h3>Notice</h3>\n<p>\u5728 Onebot \u9002\u914D\u5668\u4E0B\uFF0C\u5076\u5C14\u53D1\u4E0D\u51FA\u6765\u56FE\uFF0CKoishi \u62A5\u9519\u65E5\u5FD7\u4E3A <code>retcode:1200</code> \u65F6\uFF0C\n\n\u8BF7\u67E5\u770B\u534F\u8BAE\u7AEF\u65E5\u5FD7\u81EA\u884C\u89E3\u51B3\uFF01</p>\n\n<p>\u5728 QQ \u9002\u914D\u5668\u4E0B\uFF0C\u5076\u5C14\u53D1\u4E0D\u51FA\u6765\u56FE\uFF0CKoishi \u62A5\u9519\u65E5\u5FD7\u4E3A <code>bad request</code> \u65F6\uFF0C\u5EFA\u8BAE\u53C2\u89C1 \u8BBA\u575B10257\u5E16\uFF01 \n\n-> https://forum.koishi.xyz/t/topic/10257 </p>\n</div>\n\n<hr>\n\n<div class=\"version\">\n<h3>Version</h3>\n<p>1.6.0</p>\n<ul>\n<li>\u73B0\u5728\u7B54\u6848\u5BF9\u5927\u5C0F\u5199\u4E0D\u654F\u611F\u4E86</li>\n</ul>\n<p>1.5.0</p>\n<ul>\n<li>\u9898\u5E93\u4E2D\u52A0\u5165\u7279\u8BAD\u540E\u5361\u9762</li>\n<li>@\u7684\u540E\u9762\u52A0\u4E86\u4E2A\u7A7A\u683C</li>\n</ul>\n<p>1.4.0</p>\n<ul>\n<li>\u5B8C\u5168\u91CD\u6784\u4E86\u4EE3\u7801</li>\n<li>\u4FEE\u590D\u4E86\u5DF2\u77E5\u7684\u6240\u6709bug</li>\n<li>\u5220\u9664\u4E86\u4E0D\u5FC5\u8981\u7684\u6307\u4EE4\uFF1Abbc\u91CD\u5F00\u3001bbcdrop\u7B49</li>\n</ul>\n</div>\n\n<hr>\n\n<div class=\"thanks\">\n<h3>Thanks</h3>\n<p>\u7075\u611F\u53C2\u8003\uFF1A <a href=\"/market?keyword=koishi-plugin-cck\">koishi-plugin-cck</a></p>\n\n<hr>\n\n<h4>\u5982\u679C\u60F3\u7EE7\u7EED\u5F00\u53D1\u4F18\u5316\u672C\u63D2\u4EF6\uFF0C<a href=\"https://github.com/xsjh/koishi-plugin-bangbangcai/pulls\" target=\"_blank\">\u6B22\u8FCE PR</a></h4>\n\n</body>\n";
export declare const Config: Schema<Schemastery.ObjectS<{
    bbc_command: Schema<string, string>;
    bbc_recrop_command: Schema<string, string>;
}> | Schemastery.ObjectS<{
    textMessage: Schema<string, string>;
    phrase_timeout: Schema<string[], string[]>;
    phrase_answered: Schema<string[], string[]>;
    phrase_bzd: Schema<string[], string[]>;
}> | Schemastery.ObjectS<{
    bbctimeout: Schema<number, number>;
    recrop: Schema<boolean, boolean>;
    max_recrop_times: Schema<number, number>;
}> | Schemastery.ObjectS<{
    cutWidth: Schema<number, number>;
    cutLength: Schema<number, number>;
}>, {
    bbc_command: string;
    bbc_recrop_command: string;
} & import("cosmokit").Dict & {
    textMessage: string;
    phrase_timeout: string[];
    phrase_answered: string[];
    phrase_bzd: string[];
} & {
    bbctimeout: number;
    recrop: boolean;
    max_recrop_times: number;
} & {
    cutWidth: number;
    cutLength: number;
}>;
export declare function apply(ctx: Context, config: any): Promise<void>;
