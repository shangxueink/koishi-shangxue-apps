import { Schema, Context } from 'koishi';
export declare const name = "spell-wrong";
export declare const inject: {
    required: string[];
};
export declare const usage = "\n\n---\n\n\n\u901A\u8FC7\u666E\u901A\u4E2D\u95F4\u4EF6\u5B9E\u73B0\u76D1\u542C\u6D88\u606F\uFF0C\u6536\u5230\u6D88\u606F\u540E\u5BF9 session.content \u8FDB\u884C\u5224\u65AD\uFF0C\n\n\u5982\u679C\u4E0D\u662F\u4EE5 \u5168\u5C40\u524D\u7F00+\u6307\u4EE4\u540D\u79F0/\u522B\u540D \u5F00\u5934\u7684\u8BDD\uFF0C\u90A3\u4E48\u5C31\u5BF9\u7528\u6237\u505A\u51FA\u63D0\u793A\uFF01\n\n\u63D0\u793A\u8FD4\u56DE\u90E8\u5206\u652F\u6301\u81EA\u5B9A\u4E49\u903B\u8F91\n\n---\n\n\u6BD4\u8F83\u9002\u7528\u4E8Eadapter-qq\u7684\u673A\u5668\u4EBA\u3002\n\n\u4F46\u662Fadapter-onebot\u4F7F\u7528\u65F6\uFF0C\u5728\u65E0at\u524D\u7F00\u89E6\u53D1\u7684\u60C5\u51B5\u4E0B\uFF0C\u672A\u505A\u529F\u80FD\u9002\u914D\uFF0C\u6240\u4EE5\u6548\u679C\u4E0D\u5C3D\u4EBA\u610F\u3002\n\n---\n";
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
