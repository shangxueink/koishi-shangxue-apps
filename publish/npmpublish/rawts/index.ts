import { Context } from 'koishi'
import { } from '@koishijs/plugin-server'
import { SearchObject, SearchResult } from '@koishijs/registry'
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
    const reportTime = config.reportTime
    const logger = ctx.logger('storeluna')
    const filterRule = await readFilterRule(ctx.baseDir)
    const blacklistCount = (
        filterRule.blacklist.shortname.length +
        filterRule.blacklist.description.length +
        filterRule.blacklist.publisher.length
    )
    const writelistCount = (
        filterRule.writelist.shortname.length +
        filterRule.writelist.description.length +
        filterRule.writelist.publisher.length
    )

    if (!ctx.server) {
        logger.error('server加载失败插件')
        return
    }

    //let visitCountBuffer = new SharedArrayBuffer(4)
    let visitCount = 0
    let syncCount = 0
    let successCount = 0
    let [data, filtereddata]: [SearchResult, SearchObject[]] = (
        await updateFromUpstream(ctx, upstream, config, filterRule)
    )

    syncCount++
    if (data) {
        logger.info(`同步上游: ${upstream}`)
        successCount++
    }

    ctx.setInterval(async () => {
        const [response, filtered]: [SearchResult, SearchObject[]] = (
            await updateFromUpstream(ctx, upstream, config, filterRule)
        )
        syncCount++

        if (response) {
            data = response
            filtereddata = filtered
            successCount++
        }
    }, time * 1000)

    ctx.setInterval(() => {
        const reportContent = config.reportContent
            .replace('{visitCount}', `${visitCount}`)
            .replace('{syncCount}', `${syncCount}`)
            .replace('{successCount}', `${successCount}`)
            .replace('{blacklistCount}', `${blacklistCount}`)
            .replace('{writelistCount}', `${writelistCount}`)
            .replace('{filteredCount}', `${filtereddata.length}`)
        logger.info(reportContent)
    }, reportTime * 1000)

    try {
        ctx.server['get'](serverPath, (ctx) => {
            ctx.status = 200
            ctx.body = data
            visitCount++
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
): Promise<[SearchResult, SearchObject[]]> {
    try {
        const response: SearchResult = await ctx.http.get<SearchResult>(upstream)
        const [data, filtered]: [SearchResult, SearchObject[]] = SearchFilter(response, config, filterRule)
        if (!config.updateNotice) return [data, filtered]

        data.objects.forEach(item => {
            if (item.shortname !== 'storeluna') return

            const Notice = config.Notice.replace('{date}', new Date().toLocaleString())
            item.manifest.description = Notice
            item.rating = 6667
        })
        return [data, filtered]
    } catch (error) {
        ctx.logger('storeluna').error(error)
    }
}