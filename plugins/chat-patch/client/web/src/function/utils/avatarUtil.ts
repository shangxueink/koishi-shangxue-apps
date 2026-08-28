export function avatarError(event: Event) {
    const img = event.target as HTMLImageElement
    const fallback = new URL('/img/icons/icon.svg', location.origin).href
    if (img.src !== fallback) img.src = fallback
}
