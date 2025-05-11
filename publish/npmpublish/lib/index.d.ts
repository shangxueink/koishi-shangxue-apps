import { Schema, Context } from 'koishi';
export declare const name = "gif-reverse";
export declare const inject: {
    required: string[];
};
export declare const usage = "\n---\n\n## \u5F00\u542F\u63D2\u4EF6\u524D\uFF0C\u8BF7\u786E\u4FDD\u4E00\u4E0B\u63D2\u4EF6\u5DF2\u7ECF\u5B89\u88C5\uFF01\n\n### \u6240\u9700\u4F9D\u8D56\uFF1A\n\n- [ffmpeg\u670D\u52A1](/market?keyword=ffmpeg)  \uFF08\u9700\u8981\u989D\u5916\u5B89\u88C5\uFF09\n\n- [puppeteer\u63D0\u4F9B\u7684canvas\u670D\u52A1](/market?keyword=koishi-plugin-puppeteer+email:shigma10826@gmail.com) \u6216 [canvas\u670D\u52A1](/market?keyword=canvas)  \uFF08\u9700\u8981\u989D\u5916\u5B89\u88C5\uFF09\n\n- [http\u670D\u52A1](/market?keyword=http+email:shigma10826@gmail.com) \uFF08koishi\u81EA\u5E26\uFF09\n\n- [logger\u670D\u52A1](/market?keyword=logger+email:shigma10826@gmail.com) \uFF08koishi\u81EA\u5E26\uFF09\n\n- i18n\u670D\u52A1 \uFF08koishi\u81EA\u5E26\uFF09\n\n---\n\n<table>\n<thead>\n<tr>\n<th>\u9009\u9879</th>\n<th>\u7B80\u5199</th>\n<th>\u63CF\u8FF0</th>\n<th>\u7C7B\u578B</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td><code>--rebound</code></td>\n<td><code>-b</code></td>\n<td>\u56DE\u5F39\u6548\u679C\uFF08\u6B63\u653E+\u5012\u653E\uFF09</td>\n<td><code>boolean</code></td>\n</tr>\n<tr>\n<td><code>--reverse</code></td>\n<td><code>-r</code></td>\n<td>\u5012\u653E GIF</td>\n<td><code>boolean</code></td>\n</tr>\n<tr>\n<td><code>--frame</code></td>\n<td><code>-f</code></td>\n<td>\u6307\u5B9A\u5904\u7406gif\u7684\u5E73\u5747\u5E27\u95F4\u9694</td>\n<td><code>number</code></td>\n</tr>\n<tr>\n<td><code>--slide</code></td>\n<td><code>-l</code></td>\n<td>\u6ED1\u52A8\u65B9\u5411 (\u4E0A/\u4E0B/\u5DE6/\u53F3)</td>\n<td><code>string</code></td>\n</tr>\n<tr>\n<td><code>--rotate</code></td>\n<td><code>-o</code></td>\n<td>\u65CB\u8F6C\u65B9\u5411 (\u987A/\u9006)</td>\n<td><code>string</code></td>\n</tr>\n<tr>\n<td><code>--turn</code></td>\n<td><code>-t</code></td>\n<td>\u8F6C\u5411\u89D2\u5EA6 (\u4E0A/\u4E0B/\u5DE6/\u53F3/0-360)</td>\n<td><code>string</code></td>\n</tr>\n<tr>\n<td><code>--information</code></td>\n<td><code>-i</code></td>\n<td>\u663E\u793A GIF \u4FE1\u606F</td>\n<td><code>boolean</code></td>\n</tr>\n</tbody>\n</table>\n\n---\n\n<h2>\u4F7F\u7528\u793A\u4F8B</h2>\n\n<details>\n<summary>\u70B9\u51FB\u6B64\u5904\u2014\u2014\u2014\u2014\u67E5\u770B\u6307\u4EE4\u4F7F\u7528\u793A\u4F8B</summary>\n    \n<ul>\n<li><strong>\u56DE\u5F39 GIF:</strong>\n<pre><code>gif -b</code></pre>\n</li>\n<li><strong>\u5012\u653E GIF:</strong>\n<pre><code>gif -r</code></pre>\n</li>\n<li><strong>\u6307\u5B9A\u5E27\u95F4\u9694 20ms:</strong>\n<pre><code>gif -f 20</code></pre>\n</li>\n<li><strong>\u53F3\u6ED1 GIF:</strong>\n<pre><code>gif -l \u53F3</code></pre>\n</li>\n<li><strong>\u9006\u65F6\u9488\u65CB\u8F6C GIF:</strong>\n<pre><code>gif -o \u9006</code></pre>\n</li>\n<li><strong>\u8F6C\u5411 30 \u5EA6:</strong>\n<pre><code>gif -t 30</code></pre>\n</li>\n<li><strong>\u8F6C\u5411\u5411\u4E0A:</strong>\n<pre><code>gif -t \u4E0A</code></pre>\n</li>\n<li><strong>\u53F3\u4E0A\u65B9\u6ED1\u52A8:</strong>\n<pre><code>gif -l \u53F3 -t 45</code></pre>\n</li>\n<li><strong>\u987A\u65F6\u9488\u65CB\u8F6C:</strong>\n<pre><code>gif -o \u987A</code></pre>\n</li>\n<li><strong>\u663E\u793A GIF \u4FE1\u606F:</strong>\n<pre><code>gif -i</code></pre>\n</li>\n</ul>\n</details>\n\n\u5B8C\u6574\u4F7F\u7528\u65B9\u6CD5\u8BF7\u4F7F\u7528 <code>gif -h</code> \u67E5\u770B\u6307\u4EE4\u7528\u6CD5\n\n---\n\n";
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
