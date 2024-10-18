import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { parse } from 'yaml'
import { SearchObject, SearchResult } from '@koishijs/registry'
import { Config } from './config'

interface FilterRule {
        blacklist: {
                shortname: string[]
        },
        writelist: {
                shortname: string[]
        }
}

export async function readFilterRule(baseDir: string): Promise<FilterRule> {
        const ymlDir = path.join(baseDir, 'data', 'storeluna');
        const ymlPath = path.join(ymlDir, 'filterrule.yaml');
        const resourcesPath = path.join(baseDir, 'node_modules', 'koishi-plugin-storeluna', 'lib');

        // 创建目录，而不是文件
        await fs.mkdir(ymlDir, { recursive: true });

        // 检查文件是否存在，不存在则复制
        if (!(await fs.access(ymlPath).then(() => true).catch(() => false))) {
                await fs.copyFile(path.join(resourcesPath, 'defaultfilterrule.yaml'), ymlPath);
        }

        // 读取并解析文件
        const data = await fs.readFile(ymlPath, 'utf-8');
        const filterRule = parse(data) as FilterRule;
        return filterRule;
}

export function SearchFilter(data: SearchResult, config: Config, rule: FilterRule): SearchResult {
        let filtered: SearchObject[] = []


        if (config.filterUnsafe) {
                data.objects = data.objects.filter(item => {
                        if (item.insecure) {
                                filtered.push(item)
                                return false
                        }

                        return true
                })
        }

        if (config.filterRule) {
                data.objects = data.objects.filter(item => {
                        if (rule.blacklist.shortname.includes(item.shortname)) {
                                filtered.push(item)
                                return false
                        }

                        return true
                })
        }

        filtered.forEach(item => {
                if (rule.writelist.shortname.includes(item.shortname)) {
                        data.objects.push(item)
                }
        })

        data.objects.push

        return data
}