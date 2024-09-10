import { Context, Service } from 'koishi';
declare module 'koishi' {
    interface Context {
        translator: Translator;
    }
}
declare abstract class Translator<C extends Translator.Config = Translator.Config> extends Service {
    config: C;
    constructor(ctx: Context, config: C);
    abstract translate(options?: Translator.Result): Promise<string>;
}
declare namespace Translator {
    interface Config {
    }
    interface Result {
        input: string;
        output?: string;
        source?: string;
        target?: string;
        detail?: boolean;
    }
}
export default Translator;
