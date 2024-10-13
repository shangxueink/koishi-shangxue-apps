import { type Context, Session, segment } from 'koishi';
import { Config } from '.';
interface Message {
    type?: string;
    data?: any;
}
interface ToCoreMessage {
    bot_id: string | 'bot';
    bot_self_id: string;
    msg_id: string;
    user_type: string | 'group' | 'direct' | 'channel' | 'sub_channel';
    group_id?: string;
    user_id?: string;
    user_pm: number;
    content: Message[];
}
interface FromCoreMessage {
    bot_id: string | 'bot';
    bot_self_id: string;
    msg_id: string;
    target_type: string | 'group' | 'direct' | 'channel' | 'sub_channel';
    target_id: string;
    content: Message[];
}
export declare const genToCoreMessage: (session: Session, ctx: Context) => Promise<ToCoreMessage>;
export declare const parseMessage: (message: Message, messageId: string, config: Config) => any;
/**
 * parse从core传来的消息
 */
export declare const parseCoreMessage: (message: FromCoreMessage, config: Config) => segment[];
export declare const wrapPassive: (segments: segment[], messageId: string) => segment[];
/**
 * 查询group分组中的id
 */
export declare const findChannelId: (message: FromCoreMessage) => string | null;
export {};
