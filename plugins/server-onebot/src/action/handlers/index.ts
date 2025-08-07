import { Context } from 'koishi'
import { ActionHandler } from '../../types'
import { createMessageHandlers } from './message'
import { createUserHandlers } from './user'
import { createGroupHandlers } from './group'
import { createSystemHandlers } from './system'

export function createActionHandlers(ctx: Context, config?: { selfId: string }): Record<string, ActionHandler> {
    return {
        ...createMessageHandlers(ctx, config),
        ...createUserHandlers(ctx, config),
        ...createGroupHandlers(ctx, config),
        ...createSystemHandlers(ctx, config),
    }
}

export * from './message'
export * from './user'
export * from './group'
export * from './system'