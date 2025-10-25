import path from 'node:path'
import fs from 'node:fs'
import { SpeakerData } from './types'
import { Logger } from 'koishi'

export interface SpeakerInfo {
    api: string
    fileApi: string
    internalName: string
}

export function loadSpeakersData(logger: Logger) {
    const resourcesDir = path.resolve(__dirname, '../resources')

    if (!fs.existsSync(resourcesDir)) {
        fs.mkdirSync(resourcesDir, { recursive: true })
    }

    const files = fs
        .readdirSync(resourcesDir)
        .filter(
            (file) => file.startsWith('speakers_') && file.endsWith('.json')
        )

    const speakersMap = new Map<string, SpeakerInfo>()

    files.forEach((file) => {
        try {
            const filePath = path.join(resourcesDir, file)
            const content = fs.readFileSync(filePath, 'utf-8')
            const data = JSON.parse(content) as SpeakerData
            const fileIdentifier = file
                .replace('speakers_', '')
                .replace('.json', '')

            for (const speakerName in data.speakers) {
                const uniqueName = `${speakerName} (${fileIdentifier})`
                if (speakersMap.has(uniqueName)) {
                    logger.warn(
                        `Duplicate speaker found, skipping: ${uniqueName} in ${file}`
                    )
                    continue
                }
                speakersMap.set(uniqueName, {
                    api: data.api,
                    fileApi: data.fileApi,
                    internalName: data.speakers[speakerName].speaker,
                })
            }
        } catch (error) {
            logger.error(`Error reading or parsing ${file}:`, error)
        }
    })

    const SpeakersList = [...speakersMap.keys()].sort()

    let baseSpeakId = 114514
    const SpeakerIdMap = SpeakersList.reduce(
        (acc, speaker, index) => {
            acc[baseSpeakId + index] = speaker
            return acc
        },
        {} as Record<number, string>
    )

    return { speakersMap, SpeakersList, SpeakerIdMap }
}
