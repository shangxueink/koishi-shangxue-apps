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
interface Config {
    showcardmode: string;
    botname: any;
    showuserIdorsteamId: any;
    SteamApiKey: string;
    interval: number;
    useSteamName: boolean;
    broadcastWithImage: boolean;
    useGroupHead: boolean;
}
export declare const Config: Schema<Config>;
export declare function apply(ctx: Context, config: Config): void;
export {};
