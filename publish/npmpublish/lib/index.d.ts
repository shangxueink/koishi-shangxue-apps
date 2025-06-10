import { Schema, Context } from 'koishi';
export declare const name = "spell-wrong";
export declare const inject: {
    required: string[];
};
export declare const usage = "\n\n---\n\n\n\u901A\u8FC7\u666E\u901A\u4E2D\u95F4\u4EF6\u5B9E\u73B0\u76D1\u542C\u6D88\u606F\uFF0C\u6536\u5230\u6D88\u606F\u540E\u5BF9session.content\u8FDB\u884C\u5224\u65AD\uFF0C\u5982\u679C\u4E0D\u662F\u4EE5 \u5168\u5C40\u524D\u7F00+\u6307\u4EE4\u540D\u79F0/\u522B\u540D \u5F00\u5934\u7684\u8BDD\uFF0C\u90A3\u4E48\u5C31\u5BF9\u7528\u6237\u505A\u51FA\u63D0\u793A\uFF01\n\n\u63D0\u793A\u8FD4\u56DE\u5185\u5BB9\u652F\u6301\u5143\u7D20\u6D88\u606F\n\n---\n\n";
export declare const Config: Schema<Schemastery.ObjectS<{
    enablePlugin: Schema<boolean, boolean>;
    onlyHasAt: Schema<boolean, boolean>;
}> | Schemastery.ObjectS<{
    returnNext: Schema<boolean, boolean>;
    tipAction: Schema<string, string>;
}> | Schemastery.ObjectS<{
    loggerinfo: Schema<boolean, boolean>;
}>, {
    enablePlugin: boolean;
    onlyHasAt: boolean;
} & import("cosmokit").Dict & {
    returnNext: boolean;
    tipAction: string;
} & {
    loggerinfo: boolean;
}>;
export declare function apply(ctx: Context, config: any): void;
