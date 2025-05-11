import { Schema, Context } from 'koishi';
export declare const name = "gif-reverse";
export declare const inject: {
    required: string[];
};
export declare const usage = "\n---\n\n<table>\n<thead>\n<tr>\n<th>\u9009\u9879</th>\n<th>\u7B80\u5199</th>\n<th>\u63CF\u8FF0</th>\n<th>\u7C7B\u578B</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td><code>--rebound</code></td>\n<td><code>-b</code></td>\n<td>\u56DE\u5F39\u6548\u679C\uFF08\u6B63\u653E+\u5012\u653E\uFF09</td>\n<td><code>boolean</code></td>\n</tr>\n<tr>\n<td><code>--reverse</code></td>\n<td><code>-r</code></td>\n<td>\u5012\u653E GIF</td>\n<td><code>boolean</code></td>\n</tr>\n<tr>\n<td><code>--frame</code></td>\n<td><code>-f</code></td>\n<td>\u6307\u5B9A\u5904\u7406gif\u7684\u5E73\u5747\u5E27\u95F4\u9694</td>\n<td><code>number</code></td>\n</tr>\n<tr>\n<td><code>--slide</code></td>\n<td><code>-l</code></td>\n<td>\u6ED1\u52A8\u65B9\u5411 (\u4E0A/\u4E0B/\u5DE6/\u53F3)</td>\n<td><code>string</code></td>\n</tr>\n<tr>\n<td><code>--rotate</code></td>\n<td><code>-o</code></td>\n<td>\u65CB\u8F6C\u65B9\u5411 (\u987A/\u9006)</td>\n<td><code>string</code></td>\n</tr>\n<tr>\n<td><code>--turn</code></td>\n<td><code>-t</code></td>\n<td>\u8F6C\u5411\u89D2\u5EA6 (\u4E0A/\u4E0B/\u5DE6/\u53F3/0-360)</td>\n<td><code>string</code></td>\n</tr>\n<tr>\n<td><code>--information</code></td>\n<td><code>-i</code></td>\n<td>\u663E\u793A GIF \u4FE1\u606F</td>\n<td><code>boolean</code></td>\n</tr>\n</tbody>\n</table>\n\n---\n\n<h2>\u4F7F\u7528\u793A\u4F8B</h2>\n\n<ul>\n<li><strong>\u56DE\u5F39 GIF:</strong>\n<pre><code>gif -b</code></pre>\n</li>\n<li><strong>\u5012\u653E GIF:</strong>\n<pre><code>gif -r</code></pre>\n</li>\n<li><strong>\u6307\u5B9A\u5E27\u95F4\u9694 20ms:</strong>\n<pre><code>gif -f 20</code></pre>\n</li>\n<li><strong>\u53F3\u6ED1 GIF:</strong>\n<pre><code>gif -l \u53F3</code></pre>\n</li>\n<li><strong>\u9006\u65F6\u9488\u65CB\u8F6C GIF:</strong>\n<pre><code>gif -o \u9006</code></pre>\n</li>\n<li><strong>\u8F6C\u5411 30 \u5EA6:</strong>\n<pre><code>gif -t 30</code></pre>\n</li>\n<li><strong>\u8F6C\u5411\u5411\u4E0A:</strong>\n<pre><code>gif -t \u4E0A</code></pre>\n</li>\n<li><strong>\u53F3\u4E0A\u65B9\u6ED1\u52A8:</strong>\n<pre><code>gif -l \u53F3 -t 45</code></pre>\n</li>\n<li><strong>\u987A\u65F6\u9488\u65CB\u8F6C:</strong>\n<pre><code>gif -o \u987A</code></pre>\n</li>\n<li><strong>\u663E\u793A GIF \u4FE1\u606F:</strong>\n<pre><code>gif -i</code></pre>\n</li>\n</ul>\n\n\n\u66F4\u591A\u4F7F\u7528\u65B9\u6CD5\u8BF7\u4F7F\u7528 <code>gif -h</code> \u67E5\u770B\u6307\u4EE4\u7528\u6CD5\n\n---\n\n";
export declare const Config: Schema<Schemastery.ObjectS<{
    gifCommand: Schema<string, string>;
    waitTimeout: Schema<number, number>;
}> | Schemastery.ObjectS<{
    usedReverse: Schema<boolean, boolean>;
    outputinformation: Schema<boolean, boolean>;
    fillcolor: Schema<string, string>;
    maxFps: Schema<number, number>;
}> | Schemastery.ObjectS<{
    loggerinfo: Schema<boolean, boolean>;
}>, {
    gifCommand: string;
    waitTimeout: number;
} & import("cosmokit").Dict & {
    usedReverse: boolean;
    outputinformation: boolean;
    fillcolor: string;
    maxFps: number;
} & {
    loggerinfo: boolean;
}>;
export declare function apply(ctx: Context, config: any): void;
