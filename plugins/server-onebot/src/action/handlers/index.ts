import { createMessageHandlers } from './message'
import { createSystemHandlers } from './system'
import { createGroupHandlers } from './group'
import { BotFinder } from '../../bot-finder'
import { createUserHandlers } from './user'
import { ActionHandler } from '../../types'
import { Context } from 'koishi'

export function createActionHandlers(ctx: Context, config?: { selfId: string, selfname?: string, groupname?: string }): Record<string, ActionHandler> {
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