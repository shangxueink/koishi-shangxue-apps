import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { parse } from 'yaml'
import { SearchObject, SearchResult } from '@koishijs/registry'
import { Config } from './config'
import { Dict } from 'koishi'

export interface FilterRule {
    blacklist: {
        shortname: string[]
        description: (string | Dict<string>)[]
        publisher: string[]
    },
    writelist: {
        shortname: string[]
        description: (string | Dict<string>)[]
        publisher: string[]
    }
}

export async function readFilterRule(baseDir: string): Promise<FilterRule> {
    const dataPath = path.join(baseDir, 'data', 'storeluna')
    const ymlPath = path.join(dataPath, 'filterrule.yml')
    const resourcesPath = path.join(baseDir, 'node_modules', 'koishi-plugin-storeluna', 'resources')

    fs.mkdir(dataPath, { recursive: true })

    if (!(await fs.access(ymlPath).then(() => true).catch(() => false))) {
        await fs.copyFile(path.join(resourcesPath, 'defaultfilterrule.yml'), ymlPath)
    }
    const data = await fs.readFile(ymlPath, 'utf-8')
    return parse(data) as FilterRule
}

export function SearchFilter(data: SearchResult, config: Config, rule: FilterRule): [SearchResult, SearchObject[]] {
    const blacklist = rule.blacklist
    const writelist = rule.writelist
    let filtered: SearchObject[] = []

    if (config.filterUnsafe) {
        data.objects = data.objects.filter(item => {
            if (!item.insecure) return true

            filtered.push(item)
            return false
        })
    }

    if (!config.filterRule) return [data, filtered]

    data.objects = data.objects.filter(item => {
        if (
            !shortnameFilter(item.shortname, blacklist.shortname)
            && !descriptionFilter(item.package.description, blacklist.description)
            && !publisherFilter(item.package.publisher.email, blacklist.publisher)
        ) return true

        filtered.push(item)
        return false
    })

    filtered.forEach(item => {
        if (
            !shortnameFilter(item.shortname, writelist.shortname)
            && !descriptionFilter(item.package.description, writelist.description)
            && !publisherFilter(item.package.publisher.email, writelist.publisher)
        ) return

        data.objects.push(item)
    })

    return [data, filtered]
}

function shortnameFilter(shortname: string, shortnameRule: string[]): boolean {
    return shortnameRule.some(rule => new RegExp(rule).test(shortname))
}

function descriptionFilter(description: string | Dict<string>, descriptionRule: (string | Dict<string>)[]): boolean {
    return descriptionRule.some(rule => {
        if (typeof rule !== typeof description) return false

        if (typeof rule === 'string') {
            return new RegExp(rule).test(description as string)
        } else {
            return Object.entries(rule).every(([key, value]) => {
                return new RegExp(value).test(description[key])
            })
        }
    })
}

function publisherFilter(publisher: string, publisherRule: string[]): boolean {
    return publisherRule.some(rule => new RegExp(rule).test(publisher))
}