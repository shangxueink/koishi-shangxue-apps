import { Context } from 'koishi'
import {} from '@koishijs/plugin-server'
import * as fs from 'fs/promises'
import * as path from 'path'
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
        const dataPath = path.join(ctx.baseDir, 'data', name)

        fs.mkdir(dataPath, { recursive: true })

        if (ctx.server) {
                logger.info(`同步上游: ${upstream}`)
                await getFromUpstream(ctx, upstream, dataPath)

                const filterRule = await readFilterRule(ctx.baseDir)

                let jsonData = await fs.readFile(path.join(dataPath, 'index.json'), 'utf-8')
                let data: SearchResult = await JSON.parse(jsonData)

                data = SearchFilter(data, config, filterRule)
                
                try {
                        ctx.server.get(serverPath, async (context) => {
                                context.set('Content-Type', 'application/json')
                                context.body = data
                        })
                        logger.info(`监听路径: ${serverPath}`)
                } catch (error) {
                        logger.error(error)
                }

                ctx.setInterval(async () => {
                        logger.info(`同步上游: ${upstream}`)
                        await getFromUpstream(ctx, upstream, dataPath)

                        jsonData = await fs.readFile(path.join(dataPath, 'index.json'), 'utf-8')
                        data = await JSON.parse(jsonData)

                        data = SearchFilter(data, config, filterRule)
                }, time * 1000)
        }
}

//从上游获取信息下载到指定路径
async function getFromUpstream(ctx: Context, upstream: string, dataPath: string) {
        const filePath = path.join(dataPath, 'index.json')
        const file = await fs.open(filePath, 'w')
    
        try {
                const response = await ctx.http.get(upstream)
                const data = JSON.stringify(response)
                await fs.writeFile(filePath, data)
        } finally {
                await file.close()
        }
}