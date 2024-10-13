import type { Context } from 'koishi';
import { type Config } from './index';
import WebSocket from 'ws';
export declare class GsuidCoreClient {
    reconnectInterval: number;
    isDispose: boolean;
    ws: WebSocket;
    createWs(ctx: Context, config: Config): void;
}
