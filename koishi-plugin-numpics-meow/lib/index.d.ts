import { type Context } from 'koishi';

export declare const name = "numpics-meow";
export declare const using: readonly ["puppeteer"];


export declare function apply(ctx: Context): void;


export declare function calculateImageWidth(length: number): number;


export declare function generateHTML(number: string, imgWidth: number): string;


