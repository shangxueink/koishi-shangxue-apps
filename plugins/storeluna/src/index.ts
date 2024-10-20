import { Context } from 'koishi'
import {} from '@koishijs/plugin-server'
import { SearchResult } from '@koishijs/registry'
import { Config } from './config'
import { FilterRule, SearchFilter, readFilterRule } from './filter'

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

        if (!ctx.server) {
                logger.error('server加载失败插件')
                return
        }

        let data: SearchResult = await updateFromUpstream(ctx, upstream, config, filterRule)
        logger.info(`同步上游: ${upstream}`)

        ctx.setInterval(async () => {
                const response = await updateFromUpstream(ctx, upstream, config, filterRule)

                if (response) {
                        data = response
                        logger.info(`同步成功: ${upstream}`)
                } else {
                        logger.warn(`同步失败: ${upstream}`)
                }
        }, time * 1000)

        try {
                ctx.server['get'](serverPath, (ctx) => {
                        ctx.status = 200
                        ctx.body = data
                })
                logger.info(`监听路径: ${serverPath}`)
        } catch (error) {
                logger.error(error)
        }
}

async function updateFromUpstream(
        ctx: Context, 
        upstream: string, 
        config: Config, 
        filterRule: FilterRule
) : Promise<SearchResult> {
        try {
                const response: SearchResult = await ctx.http.get<SearchResult>(upstream)
                const data: SearchResult = SearchFilter(response, config, filterRule)
                if (!config.updateNotice) return data
                
                data.objects.forEach(item => {
                        if (item.shortname !== 'storeluna') return

                        const Notice = config.Notice.replace('{date}', new Date().toLocaleString())
                        item.manifest.description = Notice
                        item.rating = 6667
                })
                return data
        } catch (error) {
                ctx.logger('storeluna').error(error)
        }
}
