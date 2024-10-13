import { Context, Service } from "koishi";
import { Config } from "./config";
export type sendMsg = {
    type: string | number;
    clientId: string;
    targetId: string;
    message: string;
};
export type channelMsg = {
    type: string | number;
    clientId: string;
    targetId: string;
    message: string;
    strength: number;
    channel: number;
};
export type feedbackMsg = {
    type: string | number;
    clientId: string;
    targetId: string;
    message: string;
    channel: string;
    time: number;
};
export type statusMsg = {
    channelA: number;
    channelB: number;
    softA: number;
    softB: number;
};
export declare const feedBackMsg: {
    "feedback-0": string;
    "feedback-1": string;
    "feedback-2": string;
    "feedback-3": string;
    "feedback-4": string;
    "feedback-5": string;
    "feedback-6": string;
    "feedback-7": string;
    "feedback-8": string;
    "feedback-9": string;
};
export declare const waveData: {
    "1": string;
    "2": string;
    "3": string;
};
declare module "koishi" {
    interface Context {
        dgluna: DgLuna;
    }
}
declare class DgLab {
    private ctx;
    private ws;
    private endpoint;
    private connectionId;
    private targetWSId;
    private connectUrl;
    private channelA;
    private channelB;
    private softA;
    private softB;
    constructor(ctx: Context, endpoint: string);
    private connectInit;
    GetConnectionId(): Promise<string>;
    GetTargetId(): string;
    GetStatus(): statusMsg;
    Send(message: sendMsg | channelMsg | feedbackMsg): void;
    ChangeStrength(channel: string, value: number): void;
    SetStrength(channel: string, value: number): void;
    SetWave(channel: string, wave: string, time: number): void;
    Close(): void;
}
export default class DgLuna extends Service {
    private dglabs;
    private rooms;
    private endpoint;
    constructor(ctx: Context, config: Config);
    Connect(endpoint?: string): Promise<DgLab>;
    CreateRoom(userId: string, dglab: DgLab): Promise<void>;
    AddUserToRoom(userId: string, invitedUserId: string): void;
    RemoveUserFromRoom(userId: string): void;
    AddDglabToRoom(userId: string, dglab: DgLab): void;
    ChangeStrengthByRoom(userID: string, channel: string, strength: number): void;
    SetStrengthByRoom(userID: string, channel: string, strength: number): void;
    SetWaveByRoom(userID: string, channel: string, wave: string, time: number): void;
    UserExit(userID: string): void;
    IsUserInRoom(userID: string): boolean;
    PopDglab(connectionId: string): DgLab;
    PushDglab(connectionId: string, dglab: DgLab): void;
}
export {};
