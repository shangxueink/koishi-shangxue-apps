import { Bot, Context, HTTP, Schema, Universal } from '@satorijs/core';
import { WsClient } from '../ws';
import * as QQ from '../types';
import { QQGuildBot } from './guild';
import { QQMessageEncoder } from '../message';
import { GroupInternal } from '../internal';
export declare class QQBot<C extends Context = Context> extends Bot<C, QQBot.Config> {
    static MessageEncoder: typeof QQMessageEncoder;
    static inject: string[];
    guildBot: QQGuildBot<C>;
    internal: GroupInternal;
    http: HTTP;
    private _token;
    private _timer;
    constructor(ctx: C, config: QQBot.Config);
    initialize(): Promise<void>;
    stop(): Promise<void>;
    _ensureAccessToken(): Promise<void>;
    getAccessToken(): Promise<string>;
    getLogin(): Promise<Universal.Login>;
    createDirectChannel(id: string): Promise<{
        id: string;
        type: Universal.Channel.Type;
    }>;
    deleteMessage(channelId: string, messageId: string): Promise<void>;
}
export declare namespace QQBot {
    const usage = "\n\n  ---\n\n  \u672C\u63D2\u4EF6\u65E8\u5728\u5B9E\u73B0qq\u5B98\u65B9\u673A\u5668\u4EBA\u7684 webhook \u8F6C\u6362\u4E3A websocket \uFF0C\u8BA9\u4F60\u7684\u673A\u5668\u4EBA\u4F7F\u7528 websocket \u8FC7\u5EA6\u5230 webhook\uFF0C\u9632\u6B6212\u6708\u5E95\u7684\u4E0B\u7EBF\u3002\n  \n  \u672C\u63D2\u4EF6\u4EC5\u505A\u4E34\u65F6\u65B9\u6CD5\u4F7F\u7528\uFF0C\u4E14\u5B58\u5728\u8BF8\u591A\u6F5C\u5728\u7684\u517C\u5BB9\u6027\u95EE\u9898\uFF0C\u8BF7\u614E\u91CD\u4F7F\u7528\u3002\n  \n  \u672C\u63D2\u4EF6\u4F1A\u5728 adapter-qq \u652F\u6301 webhook \u540E \u5220\u9664\u672C\u63D2\u4EF6\u3002\n\n  \u5173\u4E8E\u672C\u63D2\u4EF6\u7684\u4F7F\u7528\u65B9\u6CD5\uFF1A  \u8BF7\u53C2\u8003\u8BBA\u575B\u6559\u7A0B\u6765\u4F7F\u7528\u672C\u63D2\u4EF6\u54E6~\n\n  ---\n";
    interface Config extends QQ.Options, WsClient.Options {
        webhookURL: any;
        intents?: number;
        retryWhen: number[];
        manualAcknowledge: boolean;
    }
    const Config: Schema<Config>;
}
