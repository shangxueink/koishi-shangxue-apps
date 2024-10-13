import puppeteer, { Browser, ElementHandle, Page } from 'puppeteer-core';
import { Context, Schema, Service } from 'koishi';
import { SVG, SVGOptions } from './svg';
export * from './svg';
declare module 'koishi' {
    interface Context {
        puppeteer: Puppeteer;
    }
}
type RenderCallback = (page: Page, next: (handle?: ElementHandle) => Promise<string>) => Promise<string>;
declare class Puppeteer extends Service {
    config: Puppeteer.Config;
    static [Service.provide]: string;
    static inject: string[];
    browser: Browser;
    executable: string;
    constructor(ctx: Context, config: Puppeteer.Config);
    start(): Promise<void>;
    stop(): Promise<void>;
    page: () => Promise<Page>;
    svg: (options?: SVGOptions) => SVG;
    render: (content: string, callback?: RenderCallback) => Promise<string>;
}
declare namespace Puppeteer {
    export const filter = false;
    type LaunchOptions = Parameters<typeof puppeteer.launch>[0] & {};
    export interface Config extends LaunchOptions {
    }
    export const Config: Schema<Config>;
    export {};
}
export default Puppeteer;
