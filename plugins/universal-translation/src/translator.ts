import { Context, Service } from 'koishi'

declare module 'koishi' {
    interface Context {
        translator: Translator
    }
}

abstract class Translator<C extends Translator.Config = Translator.Config> extends Service {
    constructor(ctx: Context, public config: C) {
        super(ctx, 'translator', true)
    }

    abstract translate(options?: Translator.Result): Promise<string>
}

namespace Translator {
    export interface Config { }

    export interface Result {
        input: string
        output?: string
        source?: string
        target?: string
        detail?: boolean
    }
}

export default Translator
