import WebSocket from 'ws';
import { Context, Logger } from "koishi";
type SendData = {
    type: string;
    clientId: string;
    targetId: string;
    message: string;
};
export declare class WsServer {
    static inject: string[];
    readonly clients: Map<string, WebSocket>;
    readonly relations: Map<string, string>;
    readonly clientTimers: Map<string, NodeJS.Timeout>;
    readonly punishmentDuration = 5;
    readonly punishmentTime = 1;
    readonly heartbeatMsg: {
        type: string;
        clientId: string;
        targetId: string;
        message: string;
    };
    heartbeatInterval: any;
    logger: Logger;
    wsServer?: WebSocket.Server;
    constructor(ctx: Context, port: number);
    MessageOn(socket: WebSocket): void;
    CloseOn(socket: WebSocket): void;
    ErrorOn(socket: WebSocket): void;
    delaySendMsg(clientId: string, client: WebSocket, target: WebSocket, sendData: SendData, totalSends: number, timeSpace: number, channel: string): Promise<void>;
}
export {};
