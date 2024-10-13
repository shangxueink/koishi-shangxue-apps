import { Context, h } from 'koishi';
import Vits from '@initencounter/vits';
import { Config } from './config';
import { SpeakConfig } from './types';
export declare class betavits {
    private ctx;
    private config;
    private logger;
    private _cacheSpeakers;
    constructor(ctx: Context, config: Config);
    say(input: string, options?: Partial<SpeakConfig>): Promise<h>;
    private checkLanguage;
    private findSpeaker;
    private _generatePlayLoad;
    private _request;
}
export declare class betavitsService extends Vits {
    impl: betavits;
    constructor(ctx: Context, impl: betavits);
    say(options: Vits.Result): Promise<h>;
}
