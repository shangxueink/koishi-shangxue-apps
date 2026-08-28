export function isDebugMode(): boolean {
    try {
        const raw = localStorage.getItem('options')
        if (!raw) return false
        const parsed = JSON.parse(raw) as { log_level?: unknown }
        return parsed.log_level === 'debug'
    } catch {
        return false
    }
}
