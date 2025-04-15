import { Context, Schema } from 'koishi';
export declare const name = "steam-friend-status";
export declare const inject: string[];
declare module 'koishi' {
    interface Tables {
        SteamUser: SteamUser;
    }
    interface Channel {
        usingSteam: boolean;
        channelName: string;
    }
}
interface SteamUser {
    userId: string;
    userName: string;
    steamId: string;
    steamName: string;
    effectGroups: string[];
    lastPlayedGame: string;
    lastUpdateTime: string;
}
export declare const Config: Schema<Schemastery.ObjectS<{}>, {} & import("cosmokit").Dict>;
export declare function apply(ctx: Context, config: any): void;
export {};
