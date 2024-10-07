import { Context, Service, Schema } from 'koishi';
export interface Config {
}
export declare const name = "QRCodeService";
export declare const Config: Schema<Config>;
declare module 'koishi' {
    interface Context {
        qrcode: qrcode;
    }
}
export declare class qrcode extends Service {
    constructor(ctx: Context);
    generateQRCode(text: string, options: any): Promise<string>;
}
export declare function apply(ctx: Context): void;
