import { Context, Schema } from 'koishi';
import { guideConfig, guide_qq } from './guide/guidesys';
export declare const inject: string[];
export declare const name = "ba-plugin";
export declare const usage = "\n<div style=\"font-size:45px; font-weight:bold; font-style: italic; text-align:center;\">\n<span style=\"color: #66ccff;\">BA</span>Plugin\n<div style=\"border:1px solid #CCC\"></div> \n\n</div>\n<div style=\"border:2px solid #CCC\"></div>\n\n<div>\n<div style=\"text-align:center;\"> <h2>\u6CE8\u610F</h2></div>\n<h4>1.0\u7248\u672C\u5BF9\u7EDD\u5927\u90E8\u5206\u529F\u80FD\u8FDB\u884C\u4E86\u91CD\u6784\uFF0C\u6307\u4EE4\u7528\u6CD5\u53EF\u80FD\u6539\u53D8</h4>\n<h4>\u7B2C\u4E00\u6B21\u542F\u52A8\u8BF7\u7B49\u5F85\u4E0B\u8F7D\u8D44\u6E901-2\u5206\u949F\uFF0C\u6307\u4EE4\u52A0\u8F7D\u4E0D\u51FA\u6765\u8BF7\u91CD\u542Fcommands\u63D2\u4EF6</h4>\n<h4>\u5982\u679C\u6709\u62A5\u9519\u53EF\u5C1D\u8BD5\u5F00\u542F\u201C\u6BCF\u6B21\u91CD\u8F7D\u90FD\u4E0B\u8F7D\u8D44\u6E90\u201D\uFF0C\u66F4\u65B0\u4E0B\u8D44\u6E90</h4>\n</div>\n\n<div style=\"border:1px solid #CCC\"></div> \n<h2>\u6570\u636E\u6765\u6E90\u4E8E:</h2>\n<ul>\n  <li> <a href=\"https://ba.gamekee.com/\"> bawiki  </a> </li>\n  <li> <a href=\"https://doc.arona.diyigemt.com/\"> AronaBot </a> </li>\n  <li> <a href=\"https://schale.gg/\"> shale.gg </a> </li>\n  <li> <a href=\"https://github.com/lgc-NB2Dev/bawiki-data\"> \u997C\u5E72\u5927\u4F6C\u7684ba-wiki\u6570\u636E\u5E93  </a> </li>\n  <li> <a href=\"https://arona.ai/\"> Arona.ai </a> </li>\n  <li> <a href=\"https://arona.icu/main\"> \u4EC0\u4EAD\u4E4B\u5323 </a> </li>\n  <li> <a href=\"https://bluearchive.wikiru.jp/\"> \u65E5\u7AD9wiki </a> </li>\n</ul>\n<div style=\"border:1px solid #CCC\"></div> \n\n<h2>\u76EE\u524D\u529F\u80FD:</h2>\n<ul>\n  <li> Aronabot\u7684\u653B\u7565\u56FE </li>\n  <li> \u89D2\u8272\u597D\u611F\u5347\u7EA7\u6240\u9700\u8BA1\u7B97 </li>\n  <li> \u73A9\u5BB6\u5347\u7EA7\u6240\u9700\u8BA1\u7B97 </li>\n  <li> \u603B\u529B\u7AD9\u6863\u7EBF\u53CA\u6392\u540D\u67E5\u8BE2 </li>\n  <li> \u62BD\u5B98\u65B9\u6F2B\u753B </li>\n  <li> \u62BD\u5361\u6A21\u62DF\u5668 </li>\n  <li> bawiki\u63A8\u56FE\u653B\u7565 </li>\n  <li> \u6D3B\u52A8\u67E5\u8BE2 </li>\n  <li> \u6570\u636E\u81EA\u52A8\u66F4\u65B0 </li>\n</ul>\n\n\n<table>\n  <thead>\n    <tr>\n      <th>\u8D21\u732E\u8005</th>\n      <th>\u5185\u5BB9</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td><a href=\"https://github.com/Sanaene\">Sanaene</a></td>\n      <td>\u5B66\u751F\u5339\u914D\u3001\u597D\u611F\u3001\u5347\u7EA7\u7684\u7B97\u6CD5</td>\n    </tr>\n    <tr>\n      <td><a href=\"https://www.npmjs.com/~shangxue\">shangxue</a></td>\n      <td>bawiki\u63A8\u56FE\u653B\u7565\u7684\u6570\u636E\uFF0C\u8FD8\u6709\u4E9B\u6280\u672F\u5E2E\u52A9~</td>\n    </tr>\n  </tbody>\n</table>\n\n\n<a href =\"https://github.com/Alin-sky/koishi-plugin-ba-plugin/blob/main/src/mdreadme.md\"><h4>MD\u6A21\u677F\u4ECB\u7ECD</h4></a>\n\n<div style=\"border:1px solid #CCC\"></div> \n";
export interface plugin_Config {
    autoupd: "本地" | "云端";
    draw_modle: "canvas" | "puppeteer";
    auto_update: boolean;
}
export declare const plugin_Config: Schema<plugin_Config>;
export interface Config {
    plugin_config: plugin_Config;
    qqconfig: guide_qq;
    guide: guideConfig;
}
export declare const Config: Schema<Config>;
export declare const root_all_img: Promise<string>;
export declare function apply(ctx: Context, config: Config): Promise<void>;
