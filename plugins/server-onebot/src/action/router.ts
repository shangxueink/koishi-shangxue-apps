import {
  ActionHandler,
  ActionMiddleware,
  OneBotActionContext,
  OneBotActionDispatcher,
  OneBotActionError,
  OneBotActionRequest,
  OneBotActionResponse,
  OneBotRequestContext,
  RegisterActionOptions,
} from '../types'
import { logInfo, loggerError } from '../index'
import { createActionHandlers } from './handlers'
import { Context } from 'koishi'

interface RegisteredAction {
  handler: ActionHandler
  source: string
}

export class ActionRouter implements OneBotActionDispatcher {
  private handlers = new Map<string, RegisteredAction>()
  private middlewares = new Map<string, ActionMiddleware[]>()

  constructor(
    private ctx: Context,
    private config?: { selfId: string, selfname?: string, groupname?: string, appName?: string },
  ) {
    this.setupHandlers()
  }

  private setupHandlers() {
    const handlers = createActionHandlers(this.ctx, this.config)
    for (const [action, handler] of Object.entries(handlers)) {
      this.registerAction(action, handler, { source: 'server-onebot' })
    }
  }

  async dispatch(request: OneBotActionRequest, context: OneBotRequestContext): Promise<OneBotActionResponse> {
    const echo = request?.echo
    const action = request?.action

    if (!action || typeof action !== 'string') {
      loggerError('[onebot:invalid-request] Action is missing or invalid: %o', request)
      return {
        status: 'failed',
        retcode: 1400,
        message: 'Missing action field',
        echo,
      }
    }

    const actionContext: OneBotActionContext = {
      ...context,
      request,
      action,
      params: request.params ?? {},
    }
    const registered = this.handlers.get(action)

    if (!registered) {
      loggerError('[onebot:unimplemented-api] Action: %s not implemented.', action)
      return {
        status: 'failed',
        retcode: 1404,
        message: `Unknown action: ${action}`,
        echo,
      }
    }

    const executeHandler = async (): Promise<OneBotActionResponse> => {
      try {
        logInfo('[onebot:handler-call] Calling handler for action: %s', action)
        const data = await registered.handler(actionContext.params, actionContext.client, actionContext)
        return {
          status: 'ok',
          retcode: 0,
          data,
          echo,
        }
      } catch (error) {
        return this.toErrorResponse(error, echo)
      }
    }

    const middleware = [
      ...(this.middlewares.get('*') ?? []),
      ...(this.middlewares.get(action) ?? []),
    ]

    const execute = middleware.reduceRight<ActionNext>((next, current) => {
      return () => current(actionContext, next)
    }, executeHandler)

    return execute()
  }

  async invoke(
    action: string,
    params: Record<string, any> = {},
    context: Partial<OneBotRequestContext> = {},
  ): Promise<any> {
    const request: OneBotActionRequest = { action, params }
    const response = await this.dispatch(request, {
      request,
      client: context.client ?? {
        authorized: true,
        selfId: context.endpoint?.selfId ?? this.config?.selfId,
      },
      endpoint: context.endpoint ?? {
        id: 'internal',
        direction: 'internal',
        transport: 'internal',
        selfId: this.config?.selfId,
        appName: this.config?.appName,
      },
    })

    if (response.status !== 'ok') {
      throw new OneBotActionError(response.message ?? `Action failed: ${action}`, response.retcode, response.data)
    }
    return response.data
  }

  registerAction(action: string, handler: ActionHandler, options: RegisterActionOptions = {}) {
    if (!action || typeof action !== 'string') {
      throw new TypeError('OneBot action must be a non-empty string')
    }
    if (typeof handler !== 'function') {
      throw new TypeError(`Handler for action ${action} must be a function`)
    }
    if (this.handlers.has(action) && !options.override) {
      throw new Error(`OneBot action already registered: ${action}`)
    }

    const previous = this.handlers.get(action)
    this.handlers.set(action, {
      handler,
      source: options.source ?? 'extension',
    })

    return () => {
      const current = this.handlers.get(action)
      if (current?.handler !== handler) return
      if (previous) {
        this.handlers.set(action, previous)
      } else {
        this.handlers.delete(action)
      }
    }
  }

  useAction(action: string | '*', middleware: ActionMiddleware) {
    if (typeof middleware !== 'function') {
      throw new TypeError('OneBot action middleware must be a function')
    }
    const list = this.middlewares.get(action) ?? []
    list.push(middleware)
    this.middlewares.set(action, list)

    return () => {
      const current = this.middlewares.get(action)
      if (!current) return
      const index = current.indexOf(middleware)
      if (index >= 0) current.splice(index, 1)
      if (current.length === 0) this.middlewares.delete(action)
    }
  }

  register(action: string, handler: ActionHandler, options?: RegisterActionOptions) {
    return this.registerAction(action, handler, options)
  }

  use(action: string | '*', middleware: ActionMiddleware) {
    return this.useAction(action, middleware)
  } getActions() {
    return Array.from(this.handlers.keys()).sort()
  }

  private toErrorResponse(error: any, echo?: string): OneBotActionResponse {
    if (error instanceof OneBotActionError) {
      return {
        status: 'failed',
        retcode: error.retcode,
        data: error.data,
        message: error.message,
        echo,
      }
    }

    const message = error instanceof Error ? error.message : String(error)
    return {
      status: 'failed',
      retcode: 1400,
      message,
      echo,
    }
  }
}


type ActionNext = () => Promise<OneBotActionResponse>

export * from './handlers'
