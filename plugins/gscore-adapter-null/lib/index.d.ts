import { Context, Schema, Logger } from 'koishi';
export declare const reusable = true;
export declare const inject: string[];
declare module '@koishijs/plugin-console' {
    namespace Console {
        interface Services {
            ['gscore-custom']: any;
        }
    }
}
export declare const name = "gscore-adapter-null";
export declare const usage = "\n---\n<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>\u65E9\u67DA\u6838\u5FC3 GsCore</title>\n</head>\n<body>\n<div class=\"gs-core-content\">\n<h1>\uD83C\uDF1F \u65E9\u67DA\u6838\u5FC3 GsCore \uD83C\uDF1F</h1>\n<p>\u5C06 <strong>\u65E9\u67DA\u6838\u5FC3</strong> \u673A\u5668\u4EBA\u63A5\u5165\u5230\u4F60\u7684 <strong>koishi</strong> \u4E2D\uFF0C\u4EAB\u53D7\u667A\u80FD\u5316\u7684\u804A\u5929\u4F53\u9A8C\uFF01</p>\n<hr>\n<p>\uD83D\uDCDA \u6587\u6863\u53C2\u8003\uFF1A</p>\n<ul>\n<li><a href=\"https://docs.sayu-bot.com/\" target=\"_blank\">\u65E9\u67DA\u6838\u5FC3 \u6587\u6863</a></li>\n<li><a href=\"https://github.com/TimeRainStarSky/Yunzai\" target=\"_blank\">TRSS\u4E91\u5D3D \u6587\u6863</a></li>\n</ul>\n<hr>\n<p>\u63A5\u5165\u4E0D\u540C\u7684\u673A\u5668\u4EBA\u9700\u8981\u4E0D\u540C\u7684\u914D\u7F6E\uFF0C\u8BF7\u6839\u636E\u5B9E\u9645\u60C5\u51B5\u4FEE\u6539\u914D\u7F6E\u9879\u4E2D\u7684\u3010\u540E\u7AEF\u8BF7\u6C42\u3011\u90E8\u5206\u3002</p>\n<p>\u4EE5\u4E0B\u662F\u51E0\u4E2A\u6846\u67B6\u7684\u793A\u4F8B\u914D\u7F6E\uFF1A</p>\n\n<details>\n<summary>\uD83D\uDD27 \u70B9\u51FB\u6B64\u5904 \u2014\u2014 \u67E5\u770B <strong>\u65E9\u67DA\u6838\u5FC3</strong> \u914D\u7F6E</summary>\n<pre>\nbotId: QQ\u53F7\u5373\u53EF\nhost: \u4E00\u822C\u672C\u5730\u642D\u5EFA\u5373\u4E3A localhost\nport: \u65E9\u67DA\u9ED8\u8BA4\u7AEF\u53E3 8765\nwsPath: ws\n</pre>\n</details>\n\n<details>\n<summary>\uD83D\uDD27 \u70B9\u51FB\u6B64\u5904 \u2014\u2014 \u67E5\u770B <strong>TRSS\u4E91\u5D3D</strong> \u914D\u7F6E</summary>\n<pre>\nbotId: QQ\u5373\u53EF\nhost: \u4E00\u822C\u672C\u5730\u642D\u5EFA\u5373\u4E3A localhost\nport: \u65E9\u67DA\u9ED8\u8BA4\u7AEF\u53E3 2536\nwsPath: GSUIDCore\n</pre>\n</details>\n\n<details>\n<summary>\u51FA\u73B0\u4E86\u91CE\u751Fbot\uFF01</strong> \u70B9\u51FB\u67E5\u770B</summary>\n<pre>\n\u5982\u679C\u4F60\u53EA\u662F\u9700\u8981\u4E00\u4E2A\u57FA\u7840\u7684\u4E91\u5D3D/\u65E9\u67DA\u529F\u80FD\n\u90A3\u4F60\u53EF\u4EE5\n\u5728 host \u914D\u7F6E\u9879\u91CC\u5199 114514 \uFF0C\u4EE5\u83B7\u5F97\u4E91\u5D3D\u529F\u80FD\n\u5728 host \u914D\u7F6E\u9879\u91CC\u5199 1919810 \uFF0C\u4EE5\u83B7\u5F97\u65E9\u67DA\u529F\u80FD\n</pre>\n</details>\n\n</div>\n</body>\n</html>\n\n";
export declare const logger: Logger;
export interface Config {
    isconsole: any;
    isWss: boolean;
    isHttps: boolean;
    botId: string;
    host: string;
    port: number;
    wsPath: string;
    dev: boolean;
    figureSupport: boolean;
    httpPath: string;
    imgType: 'image' | 'img';
    passive: boolean;
}
export declare const Config: Schema<Config>;
export declare function apply(ctx: Context, config: Config): void;
