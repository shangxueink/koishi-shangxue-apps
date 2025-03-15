import { Schema, Context } from 'koishi';
export declare const name = "gif-reverse";
export declare const inject: {
    required: string[];
};
export declare const usage = "\n---\n\n<table>\n<thead>\n<tr>\n<th>\u9009\u9879</th>\n<th>\u7B80\u5199</th>\n<th>\u63CF\u8FF0</th>\n<th>\u7C7B\u578B</th>\n<th>\u9ED8\u8BA4\u503C</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td><code>--rebound</code></td>\n<td><code>-b</code></td>\n<td>\u56DE\u5F39\u64AD\u653E GIF</td>\n<td><code>boolean</code></td>\n<td></td>\n</tr>\n<tr>\n<td><code>--reverse</code></td>\n<td><code>-r</code></td>\n<td>\u5012\u653E GIF</td>\n<td><code>boolean</code></td>\n<td></td>\n</tr>\n<tr>\n<td><code>--speed</code></td>\n<td><code>-s</code></td>\n<td>\u6539\u53D8\u64AD\u653E\u901F\u5EA6 (\u5927\u4E8E 1 \u4E3A\u52A0\u901F\uFF0C\u5C0F\u4E8E\u5219\u4E3A\u51CF\u901F)</td>\n<td><code>number</code></td>\n<td><code>1</code></td>\n</tr>\n<tr>\n<td><code>--slide</code></td>\n<td><code>-l</code></td>\n<td>\u6ED1\u52A8\u65B9\u5411 (\u4E0A/\u4E0B/\u5DE6/\u53F3)</td>\n<td><code>string</code></td>\n<td></td>\n</tr>\n<tr>\n<td><code>--rotate</code></td>\n<td><code>-o</code></td>\n<td>\u65CB\u8F6C\u65B9\u5411 (\u987A/\u9006)</td>\n<td><code>string</code></td>\n</tr>\n<tr>\n<td><code>--mirror</code></td>\n<td><code>-m</code></td>\n<td>\u7FFB\u8F6C\u65B9\u5411 (\u4E0A/\u4E0B/\u5DE6/\u53F3)</td>\n<td><code>string</code></td>\n<td></td>\n</tr>\n</tbody>\n</table>\n\n---\n\n<h2>\u4F7F\u7528\u793A\u4F8B</h2>\n\n<ul>\n<li><strong>\u5012\u653E GIF:</strong>\n<pre><code>gif -r</code></pre>\n</li>\n<li><strong>\u4E24\u500D\u901F\u53F3\u6ED1 GIF:</strong>\n<pre><code>gif -s 2 -l \u53F3</code></pre>\n</li>\n<li><strong>\u5411\u5DE6\u7FFB\u8F6C GIF:</strong>\n<pre><code>gif -m \u5DE6</code></pre>\n</li>\n<li><strong>\u9006\u65F6\u9488\u65CB\u8F6C GIF:</strong>\n<pre><code>gif -o \u9006</code></pre>\n</li>\n</ul>\n\n---\n\n\u8BF7\u786E\u4FDD 'http', 'i18n', 'logger', 'ffmpeg' \u670D\u52A1\u5747\u53EF\u7528\uFF01\n";
export declare const Config: Schema<Schemastery.ObjectS<{
    gifCommand: Schema<string, string>;
    waitTimeout: Schema<number, number>;
}> | Schemastery.ObjectS<{
    usedReverse: Schema<boolean, boolean>;
}> | Schemastery.ObjectS<{
    loggerinfo: Schema<boolean, boolean>;
}>, {
    gifCommand: string;
    waitTimeout: number;
} & import("cosmokit").Dict & {
    usedReverse: boolean;
} & {
    loggerinfo: boolean;
}>;
export declare function apply(ctx: Context, config: any): void;
