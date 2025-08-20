import { Context } from 'koishi'
import { ActionHandler } from '../../types'
import { createMessageHandlers } from './message'
import { createUserHandlers } from './user'
import { createGroupHandlers } from './group'
import { createSystemHandlers } from './system'
import { BotFinder } from '../../bot-finder'

export function createActionHandlers(ctx: Context, config?: { selfId: string, selfname?: string }): Record<string, ActionHandler> {
    // 创建一个共享的 BotFinder 实例
    const sharedBotFinder = new BotFinder(ctx)

    return {
        ...createMessageHandlers(ctx, config, sharedBotFinder),
        ...createUserHandlers(ctx, config, sharedBotFinder),
        ...createGroupHandlers(ctx, config, sharedBotFinder),
        ...createSystemHandlers(ctx, config, sharedBotFinder),
    }
}

export * from './message'
export * from './user'
export * from './group'
export * from './system'