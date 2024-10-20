import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { parse } from 'yaml'
import { SearchObject, SearchResult } from '@koishijs/registry'
import { Config } from './config'

export interface FilterRule {
        blacklist: {
                shortname: string[]
        },
        writelist: {
                shortname: string[]
        }
}

export async function readFilterRule(baseDir: string) : Promise<FilterRule> {
        const dataPath = path.join(baseDir, 'data', 'storeluna')
        const ymlPath = path.join(dataPath, 'filterrule.yml')
        const resourcesPath = path.join(baseDir, 'node_modules', 'koishi-plugin-storeluna', 'resources')

        fs.mkdir(dataPath, { recursive: true })

        if (!(await fs.access(ymlPath).then(() => true).catch(() => false))) {
                await fs.copyFile(path.join(resourcesPath, 'defaultfilterrule.yml'), ymlPath)
        }
        const data = await fs.readFile(ymlPath, 'utf-8')
        const filterRule = parse(data) as FilterRule
        return filterRule
}

export function SearchFilter(data: SearchResult, config: Config, rule: FilterRule) : SearchResult {
        let filtered: SearchObject[] = []
        

        if (config.filterUnsafe) {
                data.objects = data.objects.filter(item => {
                        if (!item.insecure) return true

                        filtered.push(item)
                        return false
                })
        }

        if (!config.filterRule) return data

        if (rule.blacklist.shortname.length !== 0) {
                data.objects = data.objects.filter(item => {
                        if (!rule.blacklist.shortname.includes(item.shortname)) return true
        
                        filtered.push(item)
                        return false
                })
        }

        if (rule.writelist.shortname.length !== 0) {
                filtered.forEach(item => {
                        if (!rule.writelist.shortname.includes(item.shortname)) return

                        data.objects.push(item)
                })
        }

        return data
}