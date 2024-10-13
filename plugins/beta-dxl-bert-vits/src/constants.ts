import path from 'path'
import fs from 'fs'
import { APISpeakers } from './types'

export const APISpeakerList: APISpeakers[] = (function () {
    const dir = path.resolve('data/bert-vits')
    const file = path.resolve(dir, 'speakers.json')

    if (!fs.existsSync(file)) {
        const defaultPath = path.join(__dirname, '../resources/speakers.json')

        try {
            fs.mkdirSync(dir)
        } catch (e) {
            //
        }
        fs.copyFileSync(defaultPath, file)
    }

    return JSON.parse(fs.readFileSync(file, 'utf-8'))
})()

let baseSpeakId = 114514

// as {key:value}
export const SpeakerKeyIdMap = APISpeakerList.flatMap((apiSpeaker) => {
    const entries = Object.entries(apiSpeaker.speakers)

    const result: string[] = []

    for (const [key, value] of entries) {
        if (value.language) {
            result.push(`${key}_${value.language}`)
            continue
        }

        if (value.languages) {
            value.languages.forEach((l) => {
                result.push(`${key}_${l}`)
            })
        }
    }

    return result
})
    .sort((a, b) => (a < b ? 1 : -1))
    .map((k, index) => [k, baseSpeakId++])
    .reduce(
        (acc, [k, v]) => {
            acc[v as number] = k as string
            return acc
        },
        {} as Record<number, string>
    )

// reverse SpeakerKeyIdMap
export const SpeakerKeyMap = Object.fromEntries(
    Object.entries(SpeakerKeyIdMap).map(([k, v]) => [v, k])
)
