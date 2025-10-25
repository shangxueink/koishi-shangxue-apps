export interface SpeakConfig {
    speaker: string
    sdp_ratio: number
    noise: number
    noisew: number
    length: number
    prompt: string
    weight: number
    input: string
}

export interface Speaker {
    speaker: string
}

export interface SpeakerData {
    api: string
    fileApi: string
    speakers: {
        [key: string]: Speaker
    }
}
