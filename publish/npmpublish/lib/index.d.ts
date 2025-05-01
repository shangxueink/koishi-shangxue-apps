import { Context, Schema } from "koishi";
export declare const name = "commands-fuck";
export declare const inject: string[];
export declare const usage = "\n---\n\n<h2>\u4F7F\u7528\u65B9\u6CD5</h2>\n<p>\u5F53\u4F60\u8F93\u5165\u4E00\u4E2A\u9519\u8BEF\u7684\u547D\u4EE4\u540E\uFF0C\u53EF\u4EE5\u4F7F\u7528 <code>fuck</code> \u547D\u4EE4\u6765\u5C1D\u8BD5\u7EA0\u6B63\u4F60\u7684\u9519\u8BEF\u5E76\u6267\u884C\u6B63\u786E\u7684\u547D\u4EE4\u3002\u63D2\u4EF6\u4F1A\u4F18\u5148\u5C1D\u8BD5\u7EA0\u6B63\u4F60\u56DE\u590D\u7684\u6D88\u606F\uFF0C\u5982\u679C\u6CA1\u6709\u56DE\u590D\u6D88\u606F\uFF0C\u5219\u4F1A\u5C1D\u8BD5\u7EA0\u6B63\u4F60\u6700\u8FD1\u4E00\u6B21\u8F93\u5165\u7684\u547D\u4EE4\u3002</p>\n\n<h3>\u793A\u4F8B\uFF1A</h3>\n<h4>1. \u56DE\u590D\u6D88\u606F\u8FDB\u884C\u7EA0\u6B63\uFF1A</h4> \n<li><a href=\"https://i0.hdslb.com/bfs/openplatform/af951636c3092d0e19350b324e675d20cb51294b.png\" target=\"_blank\" referrerpolicy=\"no-referrer\">\u70B9\u6211\u67E5\u770B\u6548\u679C\u56FE</a></li>\n<ol>\n<li>\u7528\u6237\u8F93\u5165\uFF1A<code>hekp -H</code>\uFF08\u9519\u8BEF\u7684\u547D\u4EE4\uFF09</li>\n<li>\u7528\u6237\u56DE\u590D\u8FD9\u6761\u6D88\u606F\uFF0C\u5E76\u8F93\u5165\uFF1A<code>fuck</code></li>\n<li>\u63D2\u4EF6\u4F1A\u81EA\u52A8\u6267\u884C\uFF1A<code>help -H</code></li>\n</ol>\n\n<h4>2. \u4F7F\u7528\u6700\u8FD1\u4E00\u6B21\u547D\u4EE4\u8FDB\u884C\u7EA0\u6B63\uFF1A</h4>\n<li><a href=\"https://i0.hdslb.com/bfs/openplatform/d4da3cdb2353ba4902e2697263c963de9d58ea87.png\" target=\"_blank\" referrerpolicy=\"no-referrer\">\u70B9\u6211\u67E5\u770B\u6548\u679C\u56FE</a></li>\n<ol>\n<li>\u7528\u6237\u8F93\u5165\uFF1A<code>hekp -H</code>\uFF08\u9519\u8BEF\u7684\u547D\u4EE4\uFF09</li>\n<li>\u7136\u540E\u8F93\u5165\uFF1A<code>fuck</code></li>\n<li>\u63D2\u4EF6\u4F1A\u81EA\u52A8\u6267\u884C\uFF1A<code>help -H</code></li>\n</ol>\n\n<p>\u5982\u679C\u6709\u591A\u4E2A\u76F8\u4F3C\u7684\u547D\u4EE4\uFF0C\u53EF\u4EE5\u4F7F\u7528\uFF1A</p>\n<li><a href=\"https://i0.hdslb.com/bfs/openplatform/07c2283e70a1f5dc7e96fe95368f0bae8729b824.png\" target=\"_blank\" referrerpolicy=\"no-referrer\">\u70B9\u6211\u67E5\u770B\u6548\u679C\u56FE</a></li>\n<ul>\n<li><code>fuck</code> - \u6267\u884C\u6700\u5339\u914D\u7684\u547D\u4EE4</li>\n<li><code>fuck fuck</code> - \u6267\u884C\u7B2C\u4E8C\u5339\u914D\u7684\u547D\u4EE4</li>\n<li><code>fuck fuck fuck</code> - \u6267\u884C\u7B2C\u4E09\u5339\u914D\u7684\u547D\u4EE4</li>\n<li>\u4EE5\u6B64\u7C7B\u63A8...</li>\n</ul>\n\n---\n";
export declare const Config: Schema<Schemastery.ObjectS<{
    commandName: Schema<string, string>;
    maxHistoryLength: Schema<number, number>;
    similarityThreshold: Schema<number, number>;
    chineseCommandThreshold: Schema<number, number>;
    commandInfo: Schema<boolean, boolean>;
}> | Schemastery.ObjectS<{
    loggerinfo: Schema<boolean, boolean>;
    loggeruserinputinfo: Schema<boolean, boolean>;
}>, {
    commandName: string;
    maxHistoryLength: number;
    similarityThreshold: number;
    chineseCommandThreshold: number;
    commandInfo: boolean;
} & import("cosmokit").Dict & {
    loggerinfo: boolean;
    loggeruserinputinfo: boolean;
}>;
export declare function apply(ctx: Context, config: any): Promise<void>;
