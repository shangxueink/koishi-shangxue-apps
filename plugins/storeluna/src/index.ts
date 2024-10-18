import { Context } from 'koishi'
import {} from '@koishijs/plugin-server'
import { SearchResult } from '@koishijs/registry'
import { Config } from './config'
import { SearchFilter, readFilterRule } from './filter'

export const name = 'storeluna'
export * from './config'
export const inject = {
        required: ['server'],
}

export async function apply(ctx: Context, config: Config) {
        const upstream = config.upstream
        const serverPath = config.path
        const time = config.time
        const logger = ctx.logger('storeluna')
        const filterRule = await readFilterRule(ctx.baseDir)

        if (ctx.server) {
                logger.info(`同步上游: ${upstream}`)
                let data: SearchResult = await getFromUpstream(ctx, upstream)
                data = SearchFilter(data, config, filterRule)

                ctx.setInterval(async () => {
                        const response = await getFromUpstream(ctx, upstream)

                        if (response) {
                                data = data = SearchFilter(response, config, filterRule)
                                logger.info(`同步成功: ${upstream}`)
                        } else {
                                logger.warn(`同步失败: ${upstream}`)
                        }
                }, time * 1000)

                try {
                        ctx.server['get'](serverPath, (ctx) => {
                                ctx.set('Content-Type', 'application/json')
                                ctx.status = 200
                                ctx.body = data
                        })
                        logger.info(`监听路径: ${serverPath}`)
                } catch (error) {
                        logger.error(error)
                }

                ctx.on('dispose', () => {
                        ctx.loader.fullReload()
                })
        }
}

//从上游获取信息下载到指定路径
async function getFromUpstream(ctx: Context, upstream: string) : Promise<any> {
        try {
                const response = await ctx.http.get(upstream)
                return response
        } catch (error) {
                ctx.logger('storeluna').error(error)
        }
}
