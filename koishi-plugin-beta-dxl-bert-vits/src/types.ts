export interface SpeakConfig {
    speaker: string
    sdp_ratio: number
    noise: number
    noisew: number
    length: number
    prompt: string
    weight: number
    language: string
    input: string
}

export interface Speaker {
    languages?: string[]
    language?: string
    version?: string
    speaker?: string
}

export interface API {
    endpoint: any
    base: string
    is_gradio?: boolean
    params?: {
        [key: string]: string
    }
}

export interface APISpeakers {
    api: API
    speakers: {
        [key: string]: Speaker
    }
}
