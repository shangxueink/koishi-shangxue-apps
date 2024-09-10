import Translator from './translator';
import { Config } from "./config";
import { Logger } from 'koishi';
export declare class UniversalTranslation extends Translator<Config> {
    logger: Logger;
    translate(options?: Translator.Result): Promise<string>;
}
